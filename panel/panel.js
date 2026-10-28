import {
    getConnectionInfo,
    getAllWorkspaces,
    getAllItemsFromWorkspace,
    getJobInstance
} from "../modules/fabricAPIs.js";

import {
    // container,
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
    showTypeFilters,
    jsonBeautifierInput,
    jsonbeautifierDiv,
    jsonbeautifierForm
} from "../modules/selectors.js";

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
    renderNoFav,
    renderBeautifiedJson,
    restorePanelStates,
    savePanelStates,
    showAuthMessage,
    reloadWorkspaces
} from "./panelRendering.js"


import {
    updateAuthState,
    requireAuth
} from "../modules/authentication.js"




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
itemFormInput.placeholder = 'Select a workspace first...';

// GET TOKEN ON PANEL INITIALIZATION
let token = null;

const auth = await browser.runtime.sendMessage({
    type: "GET_TOKEN"
});

token = updateAuthState(auth, selectedWs);

// RECEIVE AUTOMATIC AUTHENTICATION UPDATES
browser.runtime.onMessage.addListener((message) => {
    if (message.type !== "AUTH_STATE_CHANGED") return;

    token = updateAuthState(message.auth, selectedWs);
});


// INIT VISUAL
hideWsDropdown();
hideItemDropdown();

// INIT FAVORITE
if (favoriteLinks && favoriteLinks?.length) {
    renderFavLinks(favContainer, favoriteLinks);
}
else {
    renderNoFav(favContainer)
}

//// INIT WS
if (selectedWs) {
    wsFoundContainer.innerHTML = "";

    renderClickedObject(
        "workspace",
        selectedWs,
        wsInfoContainer,
        favoriteLinks
    );

    itemFormInput.disabled = !token;
    itemFormInput.placeholder = "item...";
    itemFormContainer.style.display = "block";
}

/// INIT ITEMS
if(selectedItems ){
    renderClickedObject("fabricItem", selectedItems, itemInfoContainer, favoriteLinks)
}

// EVENT LISTENERS
// WS FOCUS ON INPUT
wsFormInput.addEventListener("focus", async (e) => {
    if (!requireAuth(token)) return;
    // empty the selected items
    showWsDropdown();
    allWorkspaces = await reloadWorkspaces(allWorkspaces, token);
    renderFiltWsAndItems(allWorkspaces, wsFoundContainer, "fabricWs");
    allItems = null;
    itemFormInput.disabled = true;
    itemFormInput.placeholder = 'Select a workspace first...';
    wsFormInput.value = ''

    // reset cache
    selectedWs = null;
    selectedItems = null;
    await browser.storage.local.remove("fabrizioGlobalSearch");
})

// WS INPUT WRITING
wsFormInput.addEventListener("input", async (e) => {
    e.preventDefault();
    if (!requireAuth(token)) return;
    if (!allWorkspaces) return;

    filterWsAndItems(allWorkspaces, wsFormInput, wsFoundContainer, "fabricWs", selectedTypeFilter);
});

// WS CLICK ON WS OBJECT
wsFoundContainer.addEventListener("click", async e =>{
    if (!requireAuth(token)) return;
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

    renderClickedObject("workspace", wsInfo, wsInfoContainer, favoriteLinks);
    wsFormInput.value = selectedWs.displayName;

    // resetting item clicked container
    itemInfoContainer.innerHTML = ''
    hideWsDropdown();
    itemFormInput.disabled = false;
    itemFormInput.placeholder = 'item...';
    hideItemDropdown();
    hideTypeFilters(); 
})

// WS CLICK ON WS INFO SAVE BUTTON
wsInfoContainer.addEventListener("click", async (e) => {
    if (!requireAuth(token)) return;
    if (!e.target.closest("button")?.classList.contains("workspace--save")) return;

    e.preventDefault();
    const button = e.target.closest("button");
    const wsLink = button.parentElement.querySelector('a');
    const wsName = button.parentElement.querySelector("h4");
    const wsId = e.target.closest(".workspace--container").dataset.objectId;
    

    // save in cache only if not present
    // if ( favoriteLinks.find(item => item.url === wsLink.href) ) return;
    if ( favoriteLinks.find(item => item.objectId === wsId && item.type === "workspace") ) return;
    
    // change star color
    button.querySelector("img").src = chrome.runtime.getURL("../img/starfill.png")
    
    //save to favorites
    favoriteLinks.push({
        displayName : wsName.textContent, 
        type: "workspace",
        objectId: wsId,
        url: wsLink.href
    })

    await browser.storage.local.set({ "fabrizioFavLinks": favoriteLinks });
    // renderFavLinks(favContainer, favoriteLinks);

})


// ITEMS 
// LOAD ITEMS ON FOCUS
itemFormInput.addEventListener("focus", async () => {
    if (!requireAuth(token)) return;
    if (!selectedWs) return;

    const workspaceId = selectedWs.id;

    // Load items if they aren't cached
    if (!itemsCache.has(workspaceId)) {
        try {
            const items = await getAllItemsFromWorkspace(
                workspaceId,
                token
            );
            itemsCache.set(workspaceId, items);

        } catch (error) {
            console.error("Could not load items:", error);

            if (
                error.message.startsWith("AUTH_REQUIRED") ||
                error.message.startsWith("AUTH_EXPIRED")
            ) {
                showAuthMessage(
                    "Open Microsoft Fabric and make sure you're signed in."
                );
            } else if (error.message.startsWith("PERMISSION_DENIED")) {
                showAuthMessage(
                    "You don't have permission to access items in this workspace."
                );
            } else {
                showAuthMessage(
                    "Could not load workspace items. Please try again."
                );
            }

            return;
        }
    }

    // Ensure items exist before rendering
    allItems = itemsCache.get(workspaceId);

    if (!Array.isArray(allItems)) {
        showAuthMessage("Could not load workspace items. Please try again.");
        return;
    }

    allItems.sort((a, b) =>
        a.displayName.localeCompare(b.displayName)
    );

    renderTypeFilters(
        itemTypeFilters,
        allItems,
        selectedTypeFilter
    );

    filterWsAndItems(
        allItems,
        itemFormInput,
        itemFoundContainer,
        "fabricItem",
        selectedTypeFilter,
        itemTypeFilters,
        true
    );

    showItemDropdown();
    showTypeFilters();
});

// FILTER BY TYPING
itemFormInput.addEventListener("input", () => {
    if (!requireAuth(token)) return;
    if (!selectedWs) return;
    filterWsAndItems(allItems, itemFormInput, itemFoundContainer, "fabricItem", selectedTypeFilter,  itemTypeFilters, true);
    // renderTypeFilters(itemTypeFilters, allItems, selectedTypeFilter);

});

// CLICK ON CHIPS
itemTypeFilters.addEventListener("click", e => {
    if (!requireAuth(token)) return;
    if (e.target.tagName !== "BUTTON") return;
    e.preventDefault();
    const button = e.target;
    itemTypeFilters
        .querySelectorAll("button")
        .forEach(btn => btn.classList.remove("active"));

    button.classList.add("active");
    selectedTypeFilter = e.target.dataset.type;
    filterWsAndItems(allItems, itemFormInput, itemFoundContainer, "fabricItem", selectedTypeFilter, itemTypeFilters, true);
});

// CLICK ON FOUND ITEMS TO GET INFO
itemFoundContainer.addEventListener("click", async e =>{
    if (!requireAuth(token)) return;
    const itemDiv = e.target.closest(".fabricItem");
    if (!itemDiv) return;

    const name = itemDiv.querySelector(".item-name").textContent;
    const type = itemDiv.querySelector(".item-type").textContent;

    const itemInfo = allItems.find(item => item.displayName === name && item.type === type )


    await browser.storage.local.set({
        fabrizioGlobalSearch: {
            workspace: selectedWs,
            items: itemInfo
        }
    }); 

    renderClickedObject("fabricItem", itemInfo, itemInfoContainer, favoriteLinks)

    itemFormInput.value = '';
    selectedTypeFilter = "All";
    // itemFormInput.value = name;
    hideItemDropdown();


})


// CLICK ON ITEM INFO (SAVE AND HISTORY)
itemInfoContainer.addEventListener("click", async (e) => {
    const button = e.target.closest("button");
    if (!button) return;

    // SAVE ITEM
    if (button.classList.contains("fabricItem--save")) {
        e.preventDefault();
        if (!requireAuth(token)) return;

        const itemCtn = button.closest(".fabricItem--container");
        if (!itemCtn) return;

        const itemLink = itemCtn.querySelector("a")?.href;
        const itemName = itemCtn.querySelector("h4");

        if (!itemLink || !itemName) return;

        const alreadySaved = favoriteLinks.find(item =>
            item.objectId === itemCtn.dataset.objectId &&
            item.type === itemCtn.dataset.objectType
        );

        if (alreadySaved) return;

        allWorkspaces = await reloadWorkspaces(allWorkspaces, token);
        if (!Array.isArray(allWorkspaces)) return;

        const workspaceName = allWorkspaces.find(item =>
            item.id === itemCtn.dataset.wsId
        );

        if (!workspaceName) {
            showAuthMessage("Could not find the workspace. Please try again.");
            return;
        }

        favoriteLinks.push({
            displayName: itemName.textContent,
            type: itemCtn.dataset.objectType,
            objectId: itemCtn.dataset.objectId,
            wsId: itemCtn.dataset.wsId,
            url: itemLink,
            wsName: workspaceName.displayName
        });

        await browser.storage.local.set({
            fabrizioFavLinks: favoriteLinks
        });

        const starIcon = itemCtn.querySelector(".save--star-icon");
        if (starIcon) {
            starIcon.src = chrome.runtime.getURL("img/starfill.png");
        }
    }

    // SEE ITEM HISTORY / REFRESH HISTORY
    else if (
        button.classList.contains("fabricItem--history") ||
        button.classList.contains("button--refresh--history")
    ) {
        e.preventDefault();
        if (!requireAuth(token)) return;

        const isRefresh = button.classList.contains("button--refresh--history");
        button.classList.toggle("active");

        const itemContainer =
            itemInfoContainer.querySelector(".fabricItem--container");

        if (!itemContainer) return;

        const existingHistory =
            itemInfoContainer.querySelector(".run-history-container");

        const noHistoryFound =
            itemInfoContainer.querySelector(".no--history--found");

        if (!isRefresh) {
            if (existingHistory) {
                existingHistory.classList.toggle("hidden");
                return;
            }

            if (noHistoryFound) {
                noHistoryFound.classList.toggle("hidden");
                return;
            }
        } else {
            existingHistory?.remove();
            noHistoryFound?.remove();
        }

        const workspaceId = itemContainer.dataset.wsId;
        const itemId = itemContainer.dataset.objectId;
        const objectType = itemContainer.dataset.objectType;

        let jobInstJson;

        try {
            jobInstJson = await getJobInstance(
                workspaceId,
                itemId,
                objectType,
                token
            );
        } catch (error) {
            console.error("Could not load item history:", error);

            let message;

            if (
                error.message?.startsWith("AUTH_REQUIRED") ||
                error.message?.startsWith("AUTH_EXPIRED")
            ) {
                message = "Open Microsoft Fabric and make sure you're signed in.";
            } else if (error.message?.startsWith("PERMISSION_DENIED")) {
                message = "You don't have permission to access item history.";
            } else {
                message = "Could not load item history. Please try again.";
            }

            showAuthMessage(message);

            // Scroll to the top of the page.
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

            // Remove the error message after 3 seconds,
            // but only for the generic loading error.
            if (message === "Could not load item history. Please try again.") {
                button.classList.toggle("active");
                setTimeout(() => {
                    // Adjust this selector to match the element created by showAuthMessage().
                    const errorElement = document.querySelector(".auth-notice");

                    if (errorElement) {
                        errorElement.remove();
                    }

                    // Ensure the page is back at the top.
                    window.scrollTo({
                        top: 0,
                        behavior: "smooth"
                    });
                }, 3000);
            }

            return;
        }

        if (!jobInstJson?.value?.length) {
            const noHistFound = document.createElement("div");
            noHistFound.classList.add("no--history--found");
            noHistFound.textContent = "No runs were found...";
            itemInfoContainer.append(noHistFound);
            return;
        }

        const runContainer = renderLatestRuns(
            jobInstJson,
            workspaceId,
            itemId,
            objectType
        );

        if (runContainer) {
            itemInfoContainer.append(runContainer);
        }
    }

    // SEE FAILURE MESSAGE
    else if (button.classList.contains("info--fail--button")) {
        e.preventDefault();

        const failurediv = button
            .closest(".run-history-item")
            ?.querySelector(".failure");

        if (failurediv) {
            failurediv.hidden = !failurediv.hidden;
        }
    }
});

// FAVORITES
favContainer.addEventListener("click", async (e) => {
    if (!requireAuth(token)) return;
    switch (true) {
        case e.target.closest("button")?.classList.contains("button--remove--link"): {
            favoriteLinks = await removeFavLink(e, favoriteLinks, favContainer);
            // re-render the ws info
            renderClickedObject("workspace", selectedWs, wsInfoContainer, favoriteLinks);

            // re-render the item info
            renderClickedObject("fabricItem", selectedItems, itemInfoContainer, favoriteLinks)
            break;
        }
        case e.target.closest("button")?.classList.contains("button--rename--link"): {
            e.preventDefault();
            await renameFavLink(e,favoriteLinks, favContainer )
            break;
        }
        case e.target.closest("button")?.classList.contains("fabricItem--history"): {
            e.preventDefault();
            const itemContainer = e.target.closest(".link--item--div");
            const button = e.target.closest("button");
            button.classList.toggle("active");
            await showFavItemHistoryRuns(itemContainer, token);
            break;
        }
        // refresh history
        case e.target.classList.contains("refresh--icon"): {
            e.preventDefault();

            const itemContainer = e.target.closest(".link--item--div");

            const existingHistory =
                itemContainer?.querySelector(".run-history-container");

            const noHistoryFound =
                itemContainer?.querySelector(".no--history--found");

            existingHistory?.remove();
            noHistoryFound?.remove();

            await showFavItemHistoryRuns(itemContainer, token);
            break;
        }
        case (e.target.closest("button")?.classList.contains("info--fail--button")): 
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


// GET CONNECTION INFO
getConnectionInfoDiv.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!requireAuth(token)) return;

    const inputValue = inputGetConnectionInfo.value.trim();

    if (inputValue.length !== 36) {
        inputGetConnectionInfo.value = "";
        return;
    }

    try {
        const jsonMessage = await getConnectionInfo(inputValue, token);

        renderBeautifiedJson(jsonMessage, getConnectionInfoDiv);
        renderBeautifiedJson(jsonMessage, getConnectionInfoDiv);
    } catch (error) {
        console.error("Could not get connection info:", error);

        renderBeautifiedJson(
            { error: error.message },
            getConnectionInfoDiv
        );
    } finally {
        inputGetConnectionInfo.value = "";
    }
});



// CLOSE CARDS LISTENER
document.addEventListener("mousedown", (e) => {
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

// Save panel states whenever a section is opened or closed
document.querySelectorAll("details.panel-section").forEach(panel => {
    panel.addEventListener("toggle", savePanelStates);
});

// Restore previously saved states
await restorePanelStates();
await restorePanelStates();


// JSON beautifier
jsonbeautifierForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const input = jsonBeautifierInput.value.trim();

    let jsonBeautifierOutput =
        document.querySelector(".jsonBeautifier--output");

    if (!jsonBeautifierOutput) {
        jsonBeautifierOutput = document.createElement("div");
        jsonBeautifierOutput.classList.add("jsonBeautifier--output");

        jsonbeautifierDiv.appendChild(jsonBeautifierOutput);
    }

    jsonBeautifierOutput.innerHTML = "";

    renderBeautifiedJson(input, jsonBeautifierOutput);
});

// CACHE HANDLING
browser.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;

    if (changes.fabrizioFavLinks) {
        favoriteLinks = changes.fabrizioFavLinks.newValue ?? [];

        if (favoriteLinks.length === 0) {
            renderNoFav(favContainer);
        } else {
            renderFavLinks(favContainer, favoriteLinks);
        }

        // Update the rendered objects using the latest favorites.
        renderClickedObject(
            "workspace",
            selectedWs,
            wsInfoContainer,
            favoriteLinks
        );

        renderClickedObject(
            "fabricItem",
            selectedItems,
            itemInfoContainer,
            favoriteLinks
        );
    }

    if (changes.fabrizioGlobalSearch) {
        const context = changes.fabrizioGlobalSearch.newValue;

        selectedWs = context?.workspace ?? null;
        selectedItems = context?.items ?? null;

        // Re-render the clicked objects using the updated context.
        if (selectedWs) {
            renderClickedObject(
                "workspace",
                selectedWs,
                wsInfoContainer,
                favoriteLinks
            );
        } else {
            wsInfoContainer.innerHTML = "";
            wsFormInput.value = "";
        }

        if (selectedItems) {
            renderClickedObject(
                "fabricItem",
                selectedItems,
                itemInfoContainer,
                favoriteLinks
            );
        } else {
            itemInfoContainer.innerHTML = "";
        }
    }
});
// Refresh cached workspaces and items
document.querySelectorAll(".refresh-cachedObj").forEach((button) => {
    button.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!requireAuth(token)) return;

        // Refresh workspace list
        if (button.closest(".workspace--header")) {
            allWorkspaces = null;

            allWorkspaces = await reloadWorkspaces(allWorkspaces, token);

            if (Array.isArray(allWorkspaces)) {
                renderFiltWsAndItems(
                    allWorkspaces,
                    wsFoundContainer,
                    "fabricWs"
                );
            }

            return;
        }

        // Refresh items for the currently selected workspace
        if (button.closest(".item--header")) {
            if (!selectedWs) return;

            const workspaceId = selectedWs.id;

            // Remove cached items for this workspace
            itemsCache.delete(workspaceId);
            allItems = null;

            try {
                // Fetch fresh items from Fabric
                allItems = await getAllItemsFromWorkspace(
                    workspaceId,
                    token
                );

                itemsCache.set(workspaceId, allItems);

                allItems.sort((a, b) =>
                    a.displayName.localeCompare(b.displayName)
                );

                renderTypeFilters(
                    itemTypeFilters,
                    allItems,
                    selectedTypeFilter
                );

                filterWsAndItems(
                    allItems,
                    itemFormInput,
                    itemFoundContainer,
                    "fabricItem",
                    selectedTypeFilter,
                    itemTypeFilters,
                    true
                );
            } catch (error) {
                console.error("Could not refresh workspace items:", error);

                showAuthMessage(
                    "Could not refresh workspace items. Please try again."
                );
            }
        }
    });
});



