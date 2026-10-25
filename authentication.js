import {
    showAuthMessage
} from "./panelRendering.js"

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
    console.log("item form disables")

    if (!authenticated) {
        hideWsDropdown();
        hideItemDropdown();
        hideTypeFilters();
    } else {
        itemFormInput
            ? "item..."
            : "Select a workspace first...";
    }
    console.log("token", token)
    return token;
}
