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


browser.runtime.onMessage.addListener(async message =>{
    if(message.type != "GET_TOKEN"){
        return;
    }
    const tab = await getActiveTab();
    // console.log(tab.id)

    // sending message to cs on active tab
    const responseToken = await browser.tabs.sendMessage(
        tab.id, {
            type: "GET_TOKEN"
        }
    )
    currentToken = responseToken.bearer;
    return responseToken.bearer;

    })

console.log("background loaded");


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
    console.log("created contextMenus")
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
        if (!workspaces) workspaces = await getAllWorkspaces(currentToken);
        const wsObj = workspaces.find(item => item.id === wsId);
        wsName = wsObj.displayName;
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

