
import * as selectors from "../../modules/selectors.js";
import * as rendering from "../panelRendering.js";
import { requireAuth } from "../../modules/authentication.js";

export function workspaceHandler(state) {
    // WORKSPACE INPUT FOCUS
    selectors.wsFormInput.addEventListener("focus", async () => {
        if (!requireAuth(state.token)) return;

        selectors.showWsDropdown();

        state.allWorkspaces = await rendering.reloadWorkspaces(
            state.allWorkspaces,
            state.token
        );

        rendering.renderFiltWsAndItems(
            state.allWorkspaces,
            selectors.wsFoundContainer,
            "fabricWs"
        );

        state.allItems = null;
        state.selectedWs = null;
        state.selectedItems = null;

        selectors.itemFormInput.disabled = true;
        selectors.itemFormInput.placeholder = "Select a workspace first...";
        selectors.wsFormInput.value = "";

        await browser.storage.local.remove("fabrizioGlobalSearch");
    });

    // WORKSPACE INPUT WRITING
    selectors.wsFormInput.addEventListener("input", (e) => {
        e.preventDefault();

        if (!requireAuth(state.token)) return;
        if (!state.allWorkspaces) return;

        rendering.filterWsAndItems(
            state.allWorkspaces,
            selectors.wsFormInput,
            selectors.wsFoundContainer,
            "fabricWs",
            state.selectedTypeFilter
        );
    });

    // WORKSPACE SELECTION
    selectors.wsFoundContainer.addEventListener("click", async (e) => {
        if (!requireAuth(state.token)) return;
        if (!e.target.classList.contains("fabricWs")) return;

        const wsInfo = state.allWorkspaces.find(
            item => item.displayName === e.target.textContent
        );

        if (!wsInfo) return;

        state.selectedTypeFilter = "All";
        state.allItems = null;
        state.selectedItems = null;
        state.selectedWs = wsInfo;

        selectors.itemFormInput.value = "";
        selectors.itemInfoContainer.innerHTML = "";

        await browser.storage.local.set({
            fabrizioGlobalSearch: {
                workspace: state.selectedWs,
                items: state.selectedItems
            }
        });

        rendering.renderClickedObject(
            "workspace",
            wsInfo,
            selectors.wsInfoContainer,
            state.favoriteLinks
        );

        selectors.wsFormInput.value = wsInfo.displayName;

        selectors.hideWsDropdown();

        selectors.itemFormInput.disabled = false;
        selectors.itemFormInput.placeholder = "item...";

        selectors.hideItemDropdown();
        selectors.hideTypeFilters();
    });

    // SAVE WORKSPACE TO FAVORITES
    selectors.wsInfoContainer.addEventListener("click", async (e) => {

        console.log(state)
        
        if (!requireAuth(state.token)) return;

        const button = e.target.closest("button");

        if (!button?.classList.contains("workspace--save")) return;
        e.preventDefault();

        const container = button.closest(".workspace--container");
        if (!container) return;
        const wsLink = container.querySelector("a");
        const wsName = container.querySelector("h4");
        const wsId = container.dataset.objectId;

        if (!wsLink || !wsName || !wsId) return;

        const alreadySaved = state.favoriteLinks.some(
            item => item.objectId === wsId && item.type === "workspace"
        );

        
        if (alreadySaved) return;
        const star = button.querySelector("img");
        if (star) {
            star.src = browser.runtime.getURL("../img/starfill.png");
        }

        state.favoriteLinks.push({
            displayName: wsName.textContent,
            type: "workspace",
            objectId: wsId,
            url: wsLink.href
        });

        await browser.storage.local.set({
            fabrizioFavLinks: state.favoriteLinks
        });
    });
}
