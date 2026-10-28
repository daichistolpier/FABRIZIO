
import * as selectors from "../../modules/selectors.js";
import * as rendering from "../panelRendering.js";

import {
    getAllItemsFromWorkspace,
    getJobInstance
} from "../../modules/fabricAPIs.js";

import { requireAuth } from "../../modules/authentication.js";

// ITEMS
export function itemHandler(state) {
    const itemsCache = state.itemsCache;

    // LOAD ITEMS ON FOCUS
    selectors.itemFormInput.addEventListener("focus", async () => {
        if (!requireAuth(state.token)) return;
        if (!state.selectedWs) return;

        const workspaceId = state.selectedWs.id;

        // Load items only if they aren't cached.
        if (!itemsCache.has(workspaceId)) {
            try {
                const items = await getAllItemsFromWorkspace(
                    workspaceId,
                    state.token
                );

                itemsCache.set(workspaceId, items);
            } catch (error) {
                console.error("Could not load items:", error);

                if (
                    error.message?.startsWith("AUTH_REQUIRED") ||
                    error.message?.startsWith("AUTH_EXPIRED")
                ) {
                    rendering.showAuthMessage(
                        "Open Microsoft Fabric and make sure you're signed in."
                    );
                } else if (
                    error.message?.startsWith("PERMISSION_DENIED")
                ) {
                    rendering.showAuthMessage(
                        "You don't have permission to access items in this workspace."
                    );
                } else {
                    rendering.showAuthMessage(
                        "Could not load workspace items. Please try again."
                    );
                }

                return;
            }
        }

        state.allItems = itemsCache.get(workspaceId);

        if (!Array.isArray(state.allItems)) {
            rendering.showAuthMessage(
                "Could not load workspace items. Please try again."
            );
            return;
        }

        state.allItems.sort((a, b) =>
            a.displayName.localeCompare(b.displayName)
        );

        rendering.renderTypeFilters(
            selectors.itemTypeFilters,
            state.allItems,
            state.selectedTypeFilter
        );

        rendering.filterWsAndItems(
            state.allItems,
            selectors.itemFormInput,
            selectors.itemFoundContainer,
            "fabricItem",
            state.selectedTypeFilter,
            selectors.itemTypeFilters,
            true
        );

        selectors.showItemDropdown();
        selectors.showTypeFilters();
    });

    // FILTER BY TYPING
    selectors.itemFormInput.addEventListener("input", () => {
        if (!requireAuth(state.token)) return;
        if (!state.selectedWs || !state.allItems) return;

        rendering.filterWsAndItems(
            state.allItems,
            selectors.itemFormInput,
            selectors.itemFoundContainer,
            "fabricItem",
            state.selectedTypeFilter,
            selectors.itemTypeFilters,
            true
        );
    });

    // CLICK ON TYPE FILTER CHIPS
    selectors.itemTypeFilters.addEventListener("click", (e) => {
        if (!requireAuth(state.token)) return;
        if (e.target.tagName !== "BUTTON") return;

        e.preventDefault();

        selectors.itemTypeFilters
            .querySelectorAll("button")
            .forEach(btn => btn.classList.remove("active"));

        e.target.classList.add("active");
        state.selectedTypeFilter = e.target.dataset.type;

        if (!state.allItems) return;

        rendering.filterWsAndItems(
            state.allItems,
            selectors.itemFormInput,
            selectors.itemFoundContainer,
            "fabricItem",
            state.selectedTypeFilter,
            selectors.itemTypeFilters,
            true
        );
    });

    // CLICK ON FOUND ITEMS TO GET INFO
    selectors.itemFoundContainer.addEventListener("click", async (e) => {
        if (!requireAuth(state.token)) return;

        const itemDiv = e.target.closest(".fabricItem");
        if (!itemDiv || !state.allItems) return;

        const name = itemDiv.querySelector(".item-name")?.textContent;
        const type = itemDiv.querySelector(".item-type")?.textContent;

        const itemInfo = state.allItems.find(
            item => item.displayName === name && item.type === type
        );

        if (!itemInfo) return;

        await browser.storage.local.set({
            fabrizioGlobalSearch: {
                workspace: state.selectedWs,
                items: itemInfo
            }
        });

        rendering.renderClickedObject(
            "fabricItem",
            itemInfo,
            selectors.itemInfoContainer,
            state.favoriteLinks
        );

        selectors.itemFormInput.value = "";
        state.selectedTypeFilter = "All";

        selectors.hideItemDropdown();
    });

    // CLICK ON ITEM INFO: SAVE, HISTORY, FAILURE DETAILS
    selectors.itemInfoContainer.addEventListener("click", async (e) => {
        const button = e.target.closest("button");
        if (!button) return;

        // SAVE ITEM TO FAVORITES
        if (button.classList.contains("fabricItem--save")) {
            e.preventDefault();

            if (!requireAuth(state.token)) return;

            const itemCtn = button.closest(".fabricItem--container");
            if (!itemCtn) return;

            const itemLink = itemCtn.querySelector("a")?.href;
            const itemName = itemCtn.querySelector("h4");

            if (!itemLink || !itemName) return;

            const alreadySaved = state.favoriteLinks.some(item =>
                item.objectId === itemCtn.dataset.objectId &&
                item.type === itemCtn.dataset.objectType
            );

            if (alreadySaved) return;

            state.allWorkspaces = await rendering.reloadWorkspaces(
                state.allWorkspaces,
                state.token
            );

            if (!Array.isArray(state.allWorkspaces)) return;

            const workspace = state.allWorkspaces.find(
                item => item.id === itemCtn.dataset.wsId
            );

            if (!workspace) {
                rendering.showAuthMessage(
                    "Could not find the workspace. Please try again."
                );
                return;
            }

            state.favoriteLinks.push({
                displayName: itemName.textContent,
                type: itemCtn.dataset.objectType,
                objectId: itemCtn.dataset.objectId,
                wsId: itemCtn.dataset.wsId,
                url: itemLink,
                wsName: workspace.displayName
            });

            await browser.storage.local.set({
                fabrizioFavLinks: state.favoriteLinks
            });

            const starIcon = itemCtn.querySelector(".save--star-icon");

            if (starIcon) {
                starIcon.src = browser.runtime.getURL(
                    "img/starfill.png"
                );
            }

            return;
        }

        // VIEW OR REFRESH ITEM HISTORY
        if (
            button.classList.contains("fabricItem--history") ||
            button.classList.contains("button--refresh--history")
        ) {
            e.preventDefault();

            if (!requireAuth(state.token)) return;

            const isRefresh = button.classList.contains(
                "button--refresh--history"
            );

            button.classList.toggle("active");

            const itemContainer =
                selectors.itemInfoContainer.querySelector(
                    ".fabricItem--container"
                );

            if (!itemContainer) return;

            const existingHistory =
                selectors.itemInfoContainer.querySelector(
                    ".run-history-container"
                );

            const noHistoryFound =
                selectors.itemInfoContainer.querySelector(
                    ".no--history--found"
                );

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
                    state.token
                );
            } catch (error) {
                console.error("Could not load item history:", error);

                let message;

                if (
                    error.message?.startsWith("AUTH_REQUIRED") ||
                    error.message?.startsWith("AUTH_EXPIRED")
                ) {
                    message =
                        "Open Microsoft Fabric and make sure you're signed in.";
                } else if (
                    error.message?.startsWith("PERMISSION_DENIED")
                ) {
                    message =
                        "You don't have permission to access item history.";
                } else {
                    message =
                        "Could not load item history.";
                }

                rendering.showAuthMessage(message);

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });

                if (
                    message ===
                    "Could not load item history."
                ) {
                    button.classList.toggle("active");

                    setTimeout(() => {
                        document.querySelector(".auth-notice")?.remove();

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

                selectors.itemInfoContainer.append(noHistFound);
                return;
            }

            const runContainer = rendering.renderLatestRuns(
                jobInstJson,
                workspaceId,
                itemId,
                objectType
            );

            if (runContainer) {
                selectors.itemInfoContainer.append(runContainer);
            }

            return;
        }

        // SHOW/HIDE FAILURE DETAILS
        if (button.classList.contains("info--fail--button")) {
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
