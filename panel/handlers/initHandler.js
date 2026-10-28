
import * as selectors from "../../modules/selectors.js";
import * as rendering from "../panelRendering.js";


export async function checkActiveTab() {
    try {
        const [tab] = await browser.tabs.query({
            active: true,
            lastFocusedWindow: true
        });

        const isFabric = isFabricUrl(tab?.url);

        setControlsDisabled(!isFabric);

        console.log(
            "[FABRIZIO] Active tab:",
            tab?.url,
            "| Is Fabric:",
            isFabric
        );

        return isFabric;
    } catch (error) {
        console.error("[FABRIZIO] Could not check active tab:", error);
        setControlsDisabled(true);
        return false;
    }
}

export function setControlsDisabled(disabled) {
    // Disable buttons, except those in the JSON beautifier
    document.querySelectorAll("button").forEach(button => {
        if (button.closest("#jsonbeautifierForm")) return;
        button.disabled = disabled;
    });

    // Disable Fabric-related inputs
    [
        selectors.wsFormInput,
        selectors.itemFormInput,
        selectors.inputGetConnectionInfo
    ].forEach(input => {
        if (input) input.disabled = disabled;
    });

    // Disable item type filters
    selectors.itemTypeFilters?.querySelectorAll("button").forEach(button => {
        button.disabled = disabled;
    });

    document.body.classList.toggle(
        "fabric-page-unavailable",
        disabled
    );
}

export function isFabricUrl(url) {
    if (!url) return false;

    try {
        const hostname = new URL(url).hostname;

        return hostname === "fabric.microsoft.com" ||
            hostname.endsWith(".fabric.microsoft.com");
    } catch {
        return false;
    }
}

export async function initVisualPanel(state) {
    // Initialize the UI first.
    selectors.hideWsDropdown();
    selectors.hideItemDropdown();

    if (state.favoriteLinks?.length) {
        rendering.renderFavLinks(
            selectors.favContainer,
            state.favoriteLinks
        );
    } else {
        rendering.renderNoFav(selectors.favContainer);
    }

    if (state.selectedWs) {
        selectors.wsFoundContainer.innerHTML = "";

        rendering.renderClickedObject(
            "workspace",
            state.selectedWs,
            selectors.wsInfoContainer,
            state.favoriteLinks
        );

        selectors.itemFormInput.disabled = !state.token;
        selectors.itemFormInput.placeholder = "item...";
        selectors.itemFormContainer.style.display = "block";
    }

    if (state.selectedItems) {
        rendering.renderClickedObject(
            "fabricItem",
            state.selectedItems,
            selectors.itemInfoContainer,
            state.favoriteLinks
        );
    }

    await rendering.restorePanelStates();

    // Check the active tab only after initialization.
    await checkActiveTab();
}
