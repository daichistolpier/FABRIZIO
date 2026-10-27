import {getAllWorkspaces, getAllItemsFromWorkspace} from "./fabricAPIs.js"

browser.sidePanel.setPanelBehavior({openPanelOnActionClick: true})

let currentToken = null;
// let csReady = false;

// browser.runtime.onMessage.addListener(message =>{
//     if (message.type == "CS_READY")
//     csReady = true;
// })



async function getActiveTab() {
    const [tab] = await browser.tabs.query({
        active : true,
        currentWindow: true
    })
    return tab;

}

function isFabricTab(url = ""){
    try {
        const parsedUrl = new URL(url);
        return (
            parsedUrl.protocol === "https:" &&
            (
                parsedUrl.hostname === "app.fabric.microsoft.com"
            )
        )
    } catch {
        return false;
    }
}


async function getTokenForTab(tabId, url) {
    if (!isFabricTab(url)) {
        return {
            ok: false,
            status: "NOT_FABRIC",
            message: "Open Microsoft Fabric to use Fabrizio."
        };
    }

    try {
        const response = await browser.tabs.sendMessage(tabId, {
            type: "GET_TOKEN"
        });

        if (!response?.bearer) {
            return {
                ok: false,
                status: "NOT_AUTHENTICATED",
                message: "Sign in to Microsoft Fabric to continue."
            };
        }

        return {
            ok: true,
            status: "AUTHENTICATED",
            token: response.bearer
        };
    } catch (error) {
        console.warn("Unable to retrieve Fabric token:", error);

        return {
            ok: false,
            status: "CONTENT_SCRIPT_UNAVAILABLE",
            message: "Refresh the Fabric tab and try again."
        };
    }
}

async function refreshActiveTabAuth(tabId) {
    try {
        const tab = await browser.tabs.get(tabId);

        // Ignore results for tabs that are no longer active.
        const [activeTab] = await browser.tabs.query({
            active: true,
            windowId: tab.windowId
        });

        if (activeTab?.id !== tabId) return;

        const auth = await getTokenForTab(tabId, tab.url);

        // Check again in case the user switched tabs while fetching.
        const [currentTab] = await browser.tabs.query({
            active: true,
            windowId: tab.windowId
        });

        if (currentTab?.id !== tabId) return;

        await browser.runtime.sendMessage({
            type: "AUTH_STATE_CHANGED",
            auth
        }).catch(() => {
            // The side panel may not currently be open.
        });
    } catch (error) {
        console.warn("Unable to refresh authentication:", error);
    }
}

// Initial request from panel.js
browser.runtime.onMessage.addListener((message) => {
    if (message.type !== "GET_TOKEN") return;

    return (async () => {
        const [tab] = await browser.tabs.query({
            active: true,
            currentWindow: true
        });

        if (!tab?.id) {
            return {
                ok: false,
                status: "NO_ACTIVE_TAB",
                message: "No active tab was found."
            };
        }

        return getTokenForTab(tab.id, tab.url);
    })();
});

// Automatically detect tab switches.
browser.tabs.onActivated.addListener(({ tabId }) => {
    refreshActiveTabAuth(tabId);
});

// Detect navigation to Fabric and completed page loads.
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" || changeInfo.url) {
        refreshActiveTabAuth(tabId);
    }
});




// console.log("background loaded");


browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
        id: "MENU_ID_URL",
        title: "Save to Fabrizio",
        contexts: ["page", "selection"],
    });
    browser.contextMenus.create({
        id: "MENU_ID_LINK",
        title: "Save to Fabrizio",
        contexts: ["link"],
    });
    // console.log("created contextMenus")
});


let workspaces = null;


let fabrizioFavLinks = []
browser.contextMenus.onClicked.addListener(async (info, tab) => {
    let favObject = {}
    let favUrl = null;
    let wsId = null;
    let itemId = null;
    let runId = null;

    let wsName = null;
    let itemName = null;
    // let runName = null;
    let itemType = null;

    switch (info.menuItemId) {
        case "MENU_ID_URL":
            favUrl = info.pageUrl;
            // favODisplayName = tab.title;
            break;
        case "MENU_ID_LINK":
            favUrl = info.linkUrl;
            // favODisplayName = info.linkUrl;
            break;
        default:
            return;
    }

    if (!tab?.id || !isFabricTab(tab.url)) return;

    const auth = await getTokenForTab(tab.id, tab.url);

    if (!auth.ok) {
        console.warn(auth.message);
        return;
    }

    currentToken = auth.token;


    if (!favUrl || !favUrl.includes("https://app.fabric.microsoft.com")) return;
    favObject.url = favUrl;

    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;
    const uuids = favUrl.match(uuidRegex) || [];

    if (uuids.length === 0) return
    else if (uuids.length === 1) wsId = uuids[0]
    else if (uuids.length === 2) wsId = uuids[0], itemId = uuids[1]
    else if (uuids.length === 3) wsId = uuids[0], itemId = uuids[1], runId = uuids[2]
    
    // convert ID to display name
    if (wsId) {
        try {
            if (!Array.isArray(workspaces)) {
                workspaces = await getAllWorkspaces(currentToken);
            }

            const wsObj = workspaces.find(item => item.id === wsId);

            if (!wsObj) {
                console.warn("Workspace not found:", wsId);
                return;
            }

            wsName = wsObj.displayName;
        } catch (error) {
            console.error("Could not load workspaces:", error);
            return;
        }
    }

    if(itemId){
        const itemsInWs = await getAllItemsFromWorkspace(wsId, currentToken);
        const itemObj = itemsInWs.find(item => item.id === itemId);
        itemName = itemObj.displayName;
        itemType = itemObj.type;
    }
    if (runId){
        //.... to be defined ...
    }

    if (wsId && !itemId){
        favObject.displayName = wsName;
        favObject.objectId = wsId;
        favObject.type = "workspace";
        favObject.displayName = wsName;
    }

    if (wsId && itemId){
        if (!runId){
            favObject.displayName = itemName;
            favObject.objectId = itemId;
            favObject.type = itemType;
            favObject.wsName = wsName;
            favObject.wsId = wsId;
        }
        else{
            favObject.displayName = itemName;
            favObject.objectId = itemId;
            favObject.type = itemType;
            favObject.wsName = wsName;
            favObject.wsId = wsId;
            favObject.runId = runId
        }
    }

    // console.log(favObject)
    
    const fabrizioFavLinksObj = await browser.storage.local.get("fabrizioFavLinks");
    fabrizioFavLinks = fabrizioFavLinksObj.fabrizioFavLinks || [];

    // if (fabrizioFavLinks.some(item => item.url.split("?")[0] === favObject.url.split("?")[0])) return
    if (fabrizioFavLinks.some(item => item.objectId === favObject.objectId && item.type === favObject.type)) return

    fabrizioFavLinks.push(favObject);

    await browser.storage.local.set({
        fabrizioFavLinks
    });
})

