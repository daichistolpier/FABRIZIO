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
    await browser.scripting.executeScript({
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


