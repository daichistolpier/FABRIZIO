import {
    showAuthMessage
} from "../panel/panelRendering.js"

import {
    hideWsDropdown, 
    hideItemDropdown,
    hideTypeFilters,
    inputGetConnectionInfo,
    itemFormInput,
    wsFormInput
} from "./selectors.js"

export function requireAuth(token ) {
    if (token) return true;

    showAuthMessage(
        "Open an authenticated Microsoft Fabric tab to use this feature."
    );

    return false;
}



export function updateAuthState(auth, selectedWs = null) {
    const token = auth?.ok ? auth.token : null;

    const authenticated = Boolean(token);

    const notice = document.querySelector("#auth-notice");

    if (authenticated) {
        if (notice) notice.hidden = true;
    } else {
        showAuthMessage(
            auth?.message ??
            "Open an authenticated Microsoft Fabric tab to continue."
        );
    }

    // Workspace search requires authentication.
    wsFormInput.disabled = !authenticated;

    itemFormInput.disabled = !authenticated;
    inputGetConnectionInfo.disabled = !authenticated;

    if (!authenticated) {
        hideWsDropdown();
        hideItemDropdown();
        hideTypeFilters();
    } else {
        itemFormInput
            ? "item or id..."
            : "Select a workspace first...";
    }
    return token;
}

