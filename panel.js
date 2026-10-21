import {
    getConnectionInfo,
    getAllWorkspaces,
    getAllItemsFromWorkspace,
    getJobInstance
} from "./fabricAPIs.js";

import {
    container,
    inputGetConnectionInfo,
    getConnectionInfoDiv,
    wsFormInput,
    wsFoundContainer,
    wsInfoContainer,
    itemFormContainer,
    itemFormInput,
    itemFoundContainer,
    itemInfoContainer,
    itemTypeFilters,
    favContainer,
    hideItemDropdown,
    showItemDropdown,
    hideWsDropdown,
    showWsDropdown,
    hideTypeFilters,
    showTypeFilters
} from "./selectors.js";

import {
    renderClickedObject,
    removeFavLink,
    renameFavLink,
    renderFiltWsAndItems,
    filterWsAndItems,
    renderFavLinks,
    renderTypeFilters,
    renderLatestRuns,
    showFavItemHistoryRuns,
    saveNewLinkName
} from "./panelRendering.js"

// GET TOKEN
const token = await browser.runtime.sendMessage({
    type: "GET_TOKEN"
});
console.log("Received tokenResponse", token)


// VARS
const itemsCache = new Map();

let { fabrizioGlobalSearch: selectedContext = null} = 
    await browser.storage.local.get("fabrizioGlobalSearch");

let { fabrizioFavLinks : favoriteLinks = [] } = 
    await browser.storage.local.get("fabrizioFavLinks")

let selectedWs = selectedContext?.workspace || null
let selectedItems = selectedContext?.items || null;

let selectedTypeFilter = "All";
let allWorkspaces = null;
let allItems = null;
itemFormInput.disabled = true;

// INIT VISUAL
hideWsDropdown();
hideItemDropdown();

// INIT FAVORITE
if (favoriteLinks && favoriteLinks?.length) {
    renderFavLinks(favContainer, favoriteLinks);
}

//// INIT WS
if (selectedWs) {
    wsFoundContainer.innerHTML = "";
    renderClickedObject("workspace", selectedWs, wsInfoContainer);
    itemFormInput.disabled = false; //
    itemFormContainer.style.display = "block";
}

/// INIT ITEMS
if(selectedItems ){
    console.log(selectedItems, "selectedItems")
    renderClickedObject("fabricItem", selectedItems, itemInfoContainer)
}




async function reloadWorkspaces(allWorkspaces){
    if (!allWorkspaces) {
        allWorkspaces = await getAllWorkspaces(token);
        allWorkspaces.sort((a,b) => a.displayName.localeCompare(b.displayName))
    }
    return allWorkspaces;
}

// EVENT LISTENERS
// WS FOCUS ON INPUT
wsFormInput.addEventListener("focus", async (e) => {
    // empty the selected items
    showWsDropdown();
    allWorkspaces = await reloadWorkspaces();
    renderFiltWsAndItems(allWorkspaces, wsFoundContainer, "fabricWs");
    allItems = null;
    itemFormInput.disabled = true;
    wsFormInput.value = ''

    // reset cache
    selectedWs = null;
    selectedItems = null;
    await browser.storage.local.remove("fabrizioGlobalSearch");
})

// WS INPUT WRITING
wsFormInput.addEventListener("input", async (e) => {
    e.preventDefault();
    if (!allWorkspaces) return;

    filterWsAndItems(allWorkspaces, wsFormInput, wsFoundContainer, "fabricWs", selectedTypeFilter);
});

// WS CLICK ON WS OBJECT
wsFoundContainer.addEventListener("click", async e =>{
    if (!e.target.classList.contains("fabricWs")) return;

    selectedTypeFilter = "All";
    allItems = null;

    itemFormInput.value = "";
    itemInfoContainer.innerHTML = "";

    const wsInfo = allWorkspaces.find(item => item.displayName === e.target.textContent)
    selectedWs = wsInfo;

    // SET IN CACHE THE WORKSPACE ITEMS
    await browser.storage.local.set({
        fabrizioGlobalSearch: {
            workspace: selectedWs,
            items: selectedItems
        }
    });

    renderClickedObject("workspace", wsInfo, wsInfoContainer);
    wsFormInput.value = selectedWs.displayName;

    // resetting item clicked container
    itemInfoContainer.innerHTML = ''
    hideWsDropdown();
    itemFormInput.disabled = false;
    hideItemDropdown();
    hideTypeFilters(); 
})

// WS CLICK ON WS INFO SAVE BUTTON
wsInfoContainer.addEventListener("click", async (e) => {
    if (!e.target.closest("button")?.classList.contains("workspace--save")) return;
    e.preventDefault();
    const button = e.target.closest("button");
    const wsLink = button.parentElement.querySelector('a');
    const wsName = button.parentElement.querySelector("h4");
    const wsId = e.target.closest(".workspace--container").dataset.objectId;
    

    // save in cache only if not present
    // if ( favoriteLinks.find(item => item.url === wsLink.href) ) return;
    if ( favoriteLinks.find(item => item.objectId === wsId && item.type === "workspace") ) return;
    
    favoriteLinks.push({
        displayName : wsName.textContent, 
        type: "workspace",
        objectId: wsId,
        url: wsLink.href
    })

    await browser.storage.local.set({ "fabrizioFavLinks": favoriteLinks });
    renderFavLinks(favContainer, favoriteLinks);

})


// ITEMS 
// LOAD ITEMS ON FOCUS
itemFormInput.addEventListener("focus", async () => {
    // ON FOCUS, LOAD EVERYHTING AND RENDER EVERYTHING AND EVERY ITEM TYPE
    if (!selectedWs) return;

    if (!itemsCache.has(selectedWs.id)) {
        const items = await getAllItemsFromWorkspace(
            selectedWs.id,
            token
        );
        itemsCache.set(selectedWs.id, items);
    }

    if (!allItems) {
        allItems = itemsCache.get(selectedWs.id);

        allItems.sort((a, b) =>
            a.displayName.localeCompare(b.displayName)
        );
    }
    // render type filters
    renderTypeFilters(itemTypeFilters, allItems);
    filterWsAndItems(allItems, itemFormInput, itemFoundContainer, "fabricItem", selectedTypeFilter,  true);
    showItemDropdown();
    showTypeFilters();
});

// FILTER BY TYPING
itemFormInput.addEventListener("input", () => {
    filterWsAndItems(allItems, itemFormInput, itemFoundContainer, "fabricItem", selectedTypeFilter,  true);

});

// CLICK ON CHIPS
itemTypeFilters.addEventListener("click", e => {
    e.preventDefault();
    if (e.target.tagName !== "BUTTON") return;
    selectedTypeFilter = e.target.dataset.type;
    filterWsAndItems(allItems, itemFormInput, itemFoundContainer, "fabricItem", selectedTypeFilter, true);
});

// CLICK ON FOUND ITEMS TO GET INFO
itemFoundContainer.addEventListener("click", async e =>{
    const itemDiv = e.target.closest(".fabricItem");
    if (!itemDiv) return;

    const name = itemDiv.querySelector(".item-name").textContent;
    const type = itemDiv.querySelector(".item-type").textContent;

    const itemInfo = allItems.find(item => item.displayName === name && item.type === type )

    selectedTypeFilter = itemInfo;

    await browser.storage.local.set({
        fabrizioGlobalSearch: {
            workspace: selectedWs,
            items: selectedTypeFilter
        }
    }); 

    renderClickedObject("fabricItem", itemInfo, itemInfoContainer)

    itemFormInput.value = name;
    hideItemDropdown();


})


// CLICK ON ITEM INFO (SAVE AND HISTORY)
itemInfoContainer.addEventListener("click", async (e) => {
    // SAVE ITEM
    if (e.target.closest("button")?.classList.contains("fabricItem--save")){
        e.preventDefault();
        const itemCtn = e.target.closest(".fabricItem--container")
        const itemLink = itemCtn.parentElement.querySelector('a').href;
        const itemName = itemCtn.parentElement.querySelector("h4");
        // if ( favoriteLinks.find(item => item.url === itemLink) ) return;
        if ( favoriteLinks.find(item => item.objectId === itemCtn.dataset.objectId && item.type === itemCtn.dataset.objectType ) ) return;
        
        allWorkspaces = await reloadWorkspaces();

        const workspaceName = allWorkspaces.find(item => {
            return item.id === itemCtn.dataset.wsId;
        } )
        favoriteLinks.push({
            displayName : itemName.textContent,
            type: itemCtn.dataset.objectType, 
            objectId: itemCtn.dataset.objectId,
            wsId: itemCtn.dataset.wsId,
            url: itemLink,
            wsName : workspaceName.displayName
        })
    
        await browser.storage.local.set({ "fabrizioFavLinks": favoriteLinks });
        renderFavLinks(favContainer, favoriteLinks);
    }
    //SEE ITEM HISTORY
    else if (e.target.closest("button")?.classList.contains("fabricItem--history")) {
        e.preventDefault();

        const existingHistory = itemInfoContainer.querySelector(".run-history-container");
        const noHistoryFound = itemInfoContainer.querySelector(".no--history--found");

        if (existingHistory) {
            existingHistory.hidden = !existingHistory.hidden;
            return;
        }
        if (noHistoryFound) {
            noHistoryFound.hidden = !noHistoryFound.hidden;
            return;
        }
        
        const itemContainer = e.target.closest(".global--clicked-item").querySelector(".fabricItem--container");

        const workspaceId = itemContainer.dataset.wsId;
        const itemId = itemContainer.dataset.objectId;
        const objectType = itemContainer.dataset.objectType;
        console.log("objectType", objectType)
        const jobInstJson = await getJobInstance(workspaceId, itemId, objectType, token);
        // console.log("jobInstJson", workspaceId, itemId, jobInstJson);

        if (!jobInstJson?.value?.length) {
            const noHistFound = document.createElement("div");
            noHistFound.classList.add("no--history--found");
            noHistFound.textContent = "No runs were found..."
            itemInfoContainer.append(noHistFound)
            // itemInfoDiv.append(noHistFound)
            return
        };

        // render history runs
        const runContainer = renderLatestRuns (jobInstJson, workspaceId, itemId, objectType)
        if (runContainer) itemInfoContainer.append(runContainer);
    }
    // SEE FAIL MESSAGE
    else if (e.target.closest("button")?.classList.contains("info--fail--button")) {
        e.preventDefault();
        const failurediv = e.target.closest(".run-history-item").querySelector(".failure");
        failurediv.hidden = !failurediv.hidden;
    }
    
})


// FAVORITES
favContainer.addEventListener("click", async (e) => {
    switch (true) {
        case e.target.closest("button")?.classList.contains("button--remove--link"): {
            favoriteLinks = await removeFavLink(e, favoriteLinks, favContainer)
            break;
        }
        case e.target.closest("button")?.classList.contains("button--rename--link"): {
            e.preventDefault();
            await renameFavLink(e,favoriteLinks, favContainer )
            break;
        }
        case e.target.classList.contains("history-icon"): {
            e.preventDefault();
            await showFavItemHistoryRuns(e, token);
            break;
        }
        case (e.target.classList.contains("error-info")): 
            const failureDiv =
                e.target
                    .closest(".run-history-item")
                    .querySelector(".failure");
    
            failureDiv.hidden = !failureDiv.hidden;
    
            break;
        
        default:
            return;
    }
})

// CACHE

browser.storage.onChanged.addListener(async (changes, area) => {
    if (area !== "local") return;

    if (changes?.fabrizioFavLinks) {
        favoriteLinks = changes.fabrizioFavLinks.newValue;
        renderFavLinks(favContainer, favoriteLinks);
    }

    if (changes?.fabrizioGlobalSearch) {
        const context = changes.fabrizioGlobalSearch.newValue;

        selectedWs = context?.workspace || null;
        selectedItems = context?.items || null;
    }
});

// GET CONNECTION INFO
getConnectionInfoDiv.addEventListener("submit", async (e) =>{
    e.preventDefault();
    const inputValue = inputGetConnectionInfo.value;
    if (inputValue.length  !== 36){
        inputGetConnectionInfo.value = '';
        return;
    }
    const jsonMessage = await getConnectionInfo(inputValue, token);

    const connectionResponseDiv = document.createElement("div");
    connectionResponseDiv.textContent = JSON.stringify(jsonMessage);
    getConnectionInfoDiv.appendChild(connectionResponseDiv);
    inputGetConnectionInfo.value = '';
})



// CLOSE CARDS LISTENER
document.addEventListener("click", (e) => {
    const insideWsSearch =
        wsFormInput.contains(e.target) ||
        wsFoundContainer.contains(e.target);

    const insideItemSearch =
        itemFormInput.contains(e.target) ||
        itemFoundContainer.contains(e.target) ||
        itemTypeFilters.contains(e.target);

    if (!insideWsSearch) {
        hideWsDropdown();
    }

    if (!insideItemSearch) {
        hideItemDropdown();
    }
});