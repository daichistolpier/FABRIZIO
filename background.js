
browser.sidePanel.setPanelBehavior({
    openPanelOnActionClick: true
});

function isFabricTab(url = "") {
    try {
        const parsedUrl = new URL(url);

        return (
            parsedUrl.protocol === "https:" &&
            parsedUrl.hostname === "app.fabric.microsoft.com"
        );
    } catch {
        return false;
    }
}

// async function getActiveTab() {
//     const [tab] = await browser.tabs.query({
//         active: true,
//         currentWindow: true
//     });
    
//     return tab;
// }

async function getActiveTab() {
    // Check the active tab in the current window.
    const [activeTab] = await browser.tabs.query({
        active: true,
        currentWindow: true
    });

    if (activeTab?.url?.startsWith("https://app.fabric.microsoft.com/")) {
        return activeTab;
    }

    // If the active tab isn't Fabric, find an existing Fabric tab.
    const fabricTabs = await browser.tabs.query({
        url: ["https://app.fabric.microsoft.com/*"]
    });

    if (!fabricTabs.length) {
        return null;
    }

    // 3. Prefer a Fabric tab active in its own window.
    return fabricTabs.find(tab => tab.active) ?? fabricTabs[0];
}

// Send a message to the Fabric content script.
// If it is not loaded yet, inject it and retry.


async function sendToFabricTab(tabId, url, message) {
    if (!isFabricTab(url)) {
        throw new Error("The active tab is not Microsoft Fabric.");
    }

    try {
        return await browser.tabs.sendMessage(tabId, message);
    } catch (firstError) {
        console.warn(
            "Fabrizio content script not responding; attempting injection.",
            firstError.message
        );
    }

    // Use the native Chrome/Edge scripting API.
    await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content-script.js"]
    });

    // Retry after injection.
    return await browser.tabs.sendMessage(tabId, message);
}



// Retrieve the available tenants from the active Fabric tab.
async function getTenantsForTab(tabId, url) {
    if (!isFabricTab(url)) {
        return {
            ok: false,
            status: "NOT_FABRIC",
            message: "Open Microsoft Fabric to discover available tenants."
        };
    }

    try {
        const response = await sendToFabricTab(
            tabId,
            url,
            { type: "GET_TENANTS" }
        );

        if (response?.error) {
            return {
                ok: false,
                status: "TENANT_LOOKUP_FAILED",
                message: response.error
            };
        }

        return {
            ok: true,
            tenants: response?.tenants ?? []
        };
    } catch (error) {
        console.warn("Unable to retrieve Fabric tenants:", error);

        return {
            ok: false,
            status: "CONTENT_SCRIPT_UNAVAILABLE",
            message: "Could not read Fabric tenants. Refresh the Fabric tab and try again."
        };
    }
}

// Retrieve a token belonging ONLY to the selected tenant.
async function getTokenForTab(tabId, url, tenantId = null) {
    if (!isFabricTab(url)) {
        return {
            ok: false,
            status: "NOT_FABRIC",
            message: "Open Microsoft Fabric to use Fabrizio."
        };
    }

    // Use the saved tenant when no explicit tenant was supplied.
    if (!tenantId) {
        const saved = await browser.storage.local.get(
            "fabrizioTenantId"
        );

        tenantId = saved.fabrizioTenantId;
    }

    if (!tenantId) {
        return {
            ok: false,
            status: "TENANT_NOT_CONFIGURED",
            message: "Choose a tenant in Fabrizio's Options page."
        };
    }

    try {
        const response = await sendToFabricTab(
            tabId,
            url,
            {
                type: "GET_TOKEN",
                tenantId
            }
        );

        if (response?.error || !response?.bearer) {
            return {
                ok: false,
                status: "TOKEN_NOT_FOUND",
                tenantId,
                message: response?.error ??
                    "No usable token found for the selected tenant."
            };
        }

        return {
            ok: true,
            status: "AUTHENTICATED",
            tenantId,
            token: response.bearer
        };
    } catch (error) {
        console.warn("Unable to retrieve Fabric token:", error);

        return {
            ok: false,
            status: "TOKEN_LOOKUP_FAILED",
            tenantId,
            message: "Could not retrieve a token. Refresh the Fabric tab and try again."
        };
    }
}

// Refresh authentication and notify the side panel.
async function refreshActiveTabAuth(tabId) {
    try {
        const tab = await browser.tabs.get(tabId);

        const [activeTab] = await browser.tabs.query({
            active: true,
            windowId: tab.windowId
        });

        if (activeTab?.id !== tabId) return;

        // getTokenForTab reads the saved tenant ID.
        const auth = await getTokenForTab(tabId, tab.url);

        // Do not publish stale results if the user switched tabs.
        const [currentTab] = await browser.tabs.query({
            active: true,
            windowId: tab.windowId
        });

        if (currentTab?.id !== tabId) return;

        await browser.runtime.sendMessage({
            type: "AUTH_STATE_CHANGED",
            auth
        }).catch(() => {
            // The side panel may not be open.
        });
    } catch (error) {
        console.warn("Unable to refresh authentication:", error);
    }
}

// Central message handler for the Options page and side panel.
browser.runtime.onMessage.addListener((message) => {
    if (!message?.type) return;

    return (async () => {
        switch (message.type) {
            case "GET_TOKEN": {
                const tab = await getActiveTab();

                if (!tab?.id) {
                    return {
                        ok: false,
                        status: "NO_ACTIVE_TAB",
                        message: "No active tab was found."
                    };
                }

                // Ignore any tenant selection sent by the side panel.
                // The saved Options-page selection is authoritative.
                return getTokenForTab(tab.id, tab.url);
            }

            case "GET_TENANTS": {
                const tab = await getActiveTab();

                if (!tab?.id) {
                    return {
                        ok: false,
                        status: "NO_ACTIVE_TAB",
                        message: "No active tab was found."
                    };
                }

                return getTenantsForTab(tab.id, tab.url);
            }

            case "TENANT_CHANGED": {
                const tab = await getActiveTab();

                if (tab?.id) {
                    await refreshActiveTabAuth(tab.id);
                }

                return { ok: true };
            }

            default:
                return;
        }
    })();
});

// Automatically refresh authentication when switching tabs.
browser.tabs.onActivated.addListener(({ tabId }) => {
    refreshActiveTabAuth(tabId);
});

// Refresh when a page finishes loading or its URL changes.
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" || changeInfo.url) {
        refreshActiveTabAuth(tabId);
    }
});




// console.log("background loaded");


// browser.runtime.onInstalled.addListener(() => {
//     browser.contextMenus.create({
//         id: "MENU_ID_URL",
//         title: "Save to Fabrizio",
//         contexts: ["page", "selection"],
//     });
//     browser.contextMenus.create({
//         id: "MENU_ID_LINK",
//         title: "Save to Fabrizio",
//         contexts: ["link"],
//     });
//     // console.log("created contextMenus")
// });


// let workspaces = null;


// let fabrizioFavLinks = []
// browser.contextMenus.onClicked.addListener(async (info, tab) => {
//     let favObject = {}
//     let favUrl = null;
//     let wsId = null;
//     let itemId = null;
//     let runId = null;

//     let wsName = null;
//     let itemName = null;
//     // let runName = null;
//     let itemType = null;

//     switch (info.menuItemId) {
//         case "MENU_ID_URL":
//             favUrl = info.pageUrl;
//             // favODisplayName = tab.title;
//             break;
//         case "MENU_ID_LINK":
//             favUrl = info.linkUrl;
//             // favODisplayName = info.linkUrl;
//             break;
//         default:
//             return;
//     }

//     if (!tab?.id || !isFabricTab(tab.url)) return;

//     const auth = await getTokenForTab(tab.id, tab.url);

//     if (!auth.ok) {
//         console.warn(auth.message);
//         return;
//     }

//     currentToken = auth.token;


//     if (!favUrl || !favUrl.includes("https://app.fabric.microsoft.com")) return;
//     favObject.url = favUrl;

//     const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;
//     const uuids = favUrl.match(uuidRegex) || [];

//     if (uuids.length === 0) return
//     else if (uuids.length === 1) wsId = uuids[0]
//     else if (uuids.length === 2) wsId = uuids[0], itemId = uuids[1]
//     else if (uuids.length === 3) wsId = uuids[0], itemId = uuids[1], runId = uuids[2]
    
//     // convert ID to display name
//     if (wsId) {
//         try {
//             if (!Array.isArray(workspaces)) {
//                 workspaces = await getAllWorkspaces(currentToken);
//             }

//             const wsObj = workspaces.find(item => item.id === wsId);

//             if (!wsObj) {
//                 console.warn("Workspace not found:", wsId);
//                 return;
//             }

//             wsName = wsObj.displayName;
//         } catch (error) {
//             console.error("Could not load workspaces:", error);
//             return;
//         }
//     }

//     if(itemId){
//         const itemsInWs = await getAllItemsFromWorkspace(wsId, currentToken);
//         const itemObj = itemsInWs.find(item => item.id === itemId);
//         itemName = itemObj.displayName;
//         itemType = itemObj.type;
//     }
//     if (runId){
//         //.... to be defined ...
//     }

//     if (wsId && !itemId){
//         favObject.displayName = wsName;
//         favObject.objectId = wsId;
//         favObject.type = "workspace";
//         favObject.displayName = wsName;
//     }

//     if (wsId && itemId){
//         if (!runId){
//             favObject.displayName = itemName;
//             favObject.objectId = itemId;
//             favObject.type = itemType;
//             favObject.wsName = wsName;
//             favObject.wsId = wsId;
//         }
//         else{
//             favObject.displayName = itemName;
//             favObject.objectId = itemId;
//             favObject.type = itemType;
//             favObject.wsName = wsName;
//             favObject.wsId = wsId;
//             favObject.runId = runId
//         }
//     }

//     // console.log(favObject)
    
//     const fabrizioFavLinksObj = await browser.storage.local.get("fabrizioFavLinks");
//     fabrizioFavLinks = fabrizioFavLinksObj.fabrizioFavLinks || [];

//     // if (fabrizioFavLinks.some(item => item.url.split("?")[0] === favObject.url.split("?")[0])) return
//     if (fabrizioFavLinks.some(item => item.objectId === favObject.objectId && item.type === favObject.type)) return

//     fabrizioFavLinks.push(favObject);

//     await browser.storage.local.set({
//         fabrizioFavLinks
//     });
// })

