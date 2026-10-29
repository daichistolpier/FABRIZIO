import {
    getConnectionInfo,
    getAllItemsFromWorkspace
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
    hideWsDropdown,
    jsonBeautifierInput,
    jsonbeautifierDiv,
    jsonbeautifierForm
} from "../modules/selectors.js";

import {
    renderClickedObject,
    renderFiltWsAndItems,
    filterWsAndItems,
    renderFavLinks,
    renderTypeFilters,
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



import { workspaceHandler } from "./handlers/workspaceHandler.js";
import { itemHandler} from "./handlers/itemHandler.js";
import { favoritesHandler} from "./handlers/favoritesHandler.js";
import { getconnectionHandler} from "./handlers/connectionInfoHandler.js";


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
if (state.favoriteLinks && state.favoriteLinks?.length) {
    renderFavLinks(favContainer, state.favoriteLinks);
}
else {
    renderNoFav(favContainer)
}

//// INIT WS
if (state.selectedWs) {
    wsFoundContainer.innerHTML = "";

    renderClickedObject(
        "workspace",
        state.selectedWs,
        wsInfoContainer,
        state.favoriteLinks
    );

    itemFormInput.disabled = !state.token;
    itemFormInput.placeholder = "item or id...";
    itemFormContainer.style.display = "block";
}

/// INIT ITEMS
if(state.selectedItems ){
    renderClickedObject("fabricItem", state.selectedItems, itemInfoContainer, state.favoriteLinks)
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

getconnectionHandler(state);
// getConnectionInfoDiv.addEventListener("submit", async (e) => {
//     e.preventDefault();

//     if (!requireAuth(state.token)) return;

//     const inputValue = inputGetConnectionInfo.value.trim();

//     if (inputValue.length !== 36) {
//         inputGetConnectionInfo.value = "";
//         return;
//     }

//     try {
//         const jsonMessage = await getConnectionInfo(inputValue, state.token);

//         renderBeautifiedJson(jsonMessage, getConnectionInfoDiv);
//     } catch (error) {
//         console.error("Could not get connection info:", error);

//         renderBeautifiedJson(
//             { error: error.message },
//             getConnectionInfoDiv
//         );
//     } finally {
//         inputGetConnectionInfo.value = "";
//     }
// });



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
        state.favoriteLinks = changes.fabrizioFavLinks.newValue ?? [];

        if (state.favoriteLinks.length === 0) {
            renderNoFav(favContainer);
        } else {
            renderFavLinks(favContainer, state.favoriteLinks);
        }

        renderClickedObject(
            "workspace",
            state.selectedWs,
            wsInfoContainer,
            state.favoriteLinks
        );

        renderClickedObject(
            "fabricItem",
            state.selectedItems,
            itemInfoContainer,
            state.favoriteLinks
        );
    }

    if (changes.fabrizioGlobalSearch) {
        const context = changes.fabrizioGlobalSearch.newValue;

        state.selectedWs = context?.workspace ?? null;
        state.selectedItems = context?.items ?? null;

        if (state.selectedWs) {
            renderClickedObject(
                "workspace",
                state.selectedWs,
                wsInfoContainer,
                state.favoriteLinks
            );
        } else {
            wsInfoContainer.innerHTML = "";
            wsFormInput.value = "";
        }

        if (state.selectedItems) {
            renderClickedObject(
                "fabricItem",
                state.selectedItems,
                itemInfoContainer,
                state.favoriteLinks
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
            state.allWorkspaces = null;

            state.allWorkspaces = await reloadWorkspaces(allWorkspaces, state.token);

            if (Array.isArray(state.allWorkspaces)) {
                renderFiltWsAndItems(
                    state.allWorkspaces,
                    wsFoundContainer,
                    "fabricWs"
                );
            }

            return;
        }

        if (button.closest(".item--header")) {
            if (!state.selectedWs) return;

            const workspaceId = state.selectedWs.id;

            state.itemsCache.delete(workspaceId);
            state.allItems = null;

            try {
                state.allItems = await getAllItemsFromWorkspace(
                    workspaceId,
                    state.token
                );

                state.itemsCache.set(workspaceId, state.allItems);

                state.allItems.sort((a, b) =>
                    a.displayName.localeCompare(b.displayName)
                );

                renderTypeFilters(
                    itemTypeFilters,
                    state.allItems,
                    state.selectedTypeFilter
                );

                filterWsAndItems(
                    state.allItems,
                    itemFormInput,
                    itemFoundContainer,
                    "fabricItem",
                    state.selectedTypeFilter,
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



