import * as selectors from "../../modules/selectors.js";
import * as rendering from "../panelRendering.js";
import { requireAuth } from "../../modules/authentication.js";
import { getConnectionInfo } from "../../modules/fabricAPIs.js";

export function getconnectionHandler(state) {
    selectors.getConnectionInfoDiv.addEventListener("submit", async (e) => {
        e.preventDefault();
    
        if (!requireAuth(state.token)) return;
    
        const inputValue = selectors.inputGetConnectionInfo.value.trim();
    
        if (inputValue.length !== 36) {
            selectors.inputGetConnectionInfo.value = "";
            return;
        }
    
        try {
            const jsonMessage = await getConnectionInfo(inputValue, state.token);
    
            rendering.renderBeautifiedJson(jsonMessage, selectors.getConnectionInfoDiv);
        } catch (error) {
            console.error("Could not get connection info:", error);
    
            rendering.renderBeautifiedJson(
                { error: error.message },
                selectors.getConnectionInfoDiv
            );
        } finally {
            selectors.inputGetConnectionInfo.value = "";
        }
    });
}


