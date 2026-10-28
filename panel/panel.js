import {
    getConnectionInfo,
    getAllItemsFromWorkspace,
    getJobInstance
} from "../modules/fabricAPIs.js";

import {
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


import {
    initVisualPanel,
    checkActiveTab,
    setControlsDisabled,
    isFabricUrl
} from "./handlers/initHandler.js";import { workspaceHandler } from "./handlers/workspaceHandler.js";
import { itemHandler} from "./handlers/itemHandler.js";
import { favoritesHandler} from "./handlers/favoritesHandler.js";


// VARS
const itemsCache = new Map();

let {
    fabrizioGlobalSearch: selectedContext = null,
    fabrizioFavLinks: favoriteLinks = []
} = await browser.storage.local.get([
    "fabrizioGlobalSearch",
    "fabrizioFavLinks"
]);

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


const state = {
    favoriteLinks,
    selectedWs,
    selectedItems,
    token,
    allWorkspaces,
    allItems,
    selectedTypeFilter,
    itemsCache
};

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

    itemFormInput.disabled = !state.token;
    itemFormInput.placeholder = "item...";
    itemFormContainer.style.display = "block";
}

/// INIT ITEMS
if(selectedItems ){
    renderClickedObject("fabricItem", selectedItems, itemInfoContainer, favoriteLinks)
}

// EVENT LISTENERS
// WS
workspaceHandler(state);

// ITEMS 
itemHandler(state);

// favorites
favoritesHandler(state);

// Restore previously saved states
await restorePanelStates();


// GET CONNECTION INFO
getConnectionInfoDiv.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!requireAuth(state.token)) return;

    const inputValue = inputGetConnectionInfo.value.trim();

    if (inputValue.length !== 36) {
        inputGetConnectionInfo.value = "";
        return;
    }

    try {
        const jsonMessage = await getConnectionInfo(inputValue, state.token);

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
document.querySelectorAll(".refresh-cachedObj").forEach((button) => {
    button.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!requireAuth(state.token)) return;

        if (button.closest(".workspace--header")) {
            allWorkspaces = null;

            allWorkspaces = await reloadWorkspaces(allWorkspaces, state.token);

            if (Array.isArray(allWorkspaces)) {
                renderFiltWsAndItems(
                    allWorkspaces,
                    wsFoundContainer,
                    "fabricWs"
                );
            }

            return;
        }

        if (button.closest(".item--header")) {
            if (!selectedWs) return;

            const workspaceId = selectedWs.id;

            itemsCache.delete(workspaceId);
            allItems = null;

            try {
                allItems = await getAllItemsFromWorkspace(
                    workspaceId,
                    state.token
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



