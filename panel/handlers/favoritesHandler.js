
import * as selectors from "../../modules/selectors.js";
import * as rendering from "../panelRendering.js";
import { requireAuth } from "../../modules/authentication.js";

export function favoritesHandler(state) {
    selectors.favContainer.addEventListener("click", async (e) => {
        if (!requireAuth(state.token)) return;

        const button = e.target.closest("button");

        // REMOVE FAVORITE
        if (button?.classList.contains("button--remove--link")) {
            state.favoriteLinks = await rendering.removeFavLink(
                e,
                state.favoriteLinks,
                selectors.favContainer
            );

            // Re-render workspace info
            rendering.renderClickedObject(
                "workspace",
                state.selectedWs,
                selectors.wsInfoContainer,
                state.favoriteLinks
            );

            // Re-render item info
            rendering.renderClickedObject(
                "fabricItem",
                state.selectedItems,
                selectors.itemInfoContainer,
                state.favoriteLinks
            );

            return;
        }

        // RENAME FAVORITE
        if (button?.classList.contains("button--rename--link")) {
            e.preventDefault();

            await rendering.renameFavLink(
                e,
                state.favoriteLinks,
                selectors.favContainer
            );

            return;
        }

        // SHOW FAVORITE ITEM HISTORY
        if (button?.classList.contains("fabricItem--history")) {
            e.preventDefault();

            const itemContainer = e.target.closest(".link--item--div");
            if (!itemContainer) return;

            button.classList.toggle("active");

            await rendering.showFavItemHistoryRuns(
                itemContainer,
                state.token
            );

            return;
        }

        // REFRESH FAVORITE ITEM HISTORY
        if (e.target.closest(".refresh--icon")) {
            e.preventDefault();

            const itemContainer = e.target.closest(".link--item--div");
            if (!itemContainer) return;

            itemContainer
                .querySelector(".run-history-container")
                ?.remove();

            itemContainer
                .querySelector(".no--history--found")
                ?.remove();

            await rendering.showFavItemHistoryRuns(
                itemContainer,
                state.token
            );

            return;
        }

        // SHOW/HIDE FAILURE DETAILS
        if (button?.classList.contains("info--fail--button")) {
            e.preventDefault();

            const failureDiv = button
                .closest(".run-history-item")
                ?.querySelector(".failure");

            if (failureDiv) {
                failureDiv.hidden = !failureDiv.hidden;
            }
        }
    });
}
