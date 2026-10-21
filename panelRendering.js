import {
    getJobInstance
    } from "./fabricAPIs.js";


const itemsWithHistory = ["DataPipeline", "SemanticModel"];
const baseFabricUrl = 'https://app.fabric.microsoft.com/groups'

const fabricRoutes = {
    DataPipeline: "pipelines",
    Lakehouse: "lakehouses",
    Notebook: "synapsenotebooks",
    Environment: "sparkenvironments",
    SemanticModel: "modeling",
    Report: "reports",
    Dashboard: "dashboards",
    Dataflow: "dataflows",
    SQLEndpoint : "mirroredwarehouses",
    SQLDatabase: "sqldatabases",
    Dataflow : "dataflows-gen2",
    UserDataFunction: "userdatafunctions",
    VariableLibrary: "variable-libraries",
    Warehouse: "warehouses",
    Eventstream: "eventstreams",
    KQLDatabase: "databases",
    Eventhouse: "eventhouses"
};



export async function removeFavLink(event, favoriteLinks, favContainer) {
    const button = event.target.closest("button")
    const linkItemAnchor = button.parentElement.querySelector(".link--item--a")
    const linkDisplayName = linkItemAnchor.querySelector(".fav--item-name").textContent;
    const linkUrl = linkItemAnchor.href;

    favoriteLinks = favoriteLinks.filter(item => {
        return !(item.displayName === linkDisplayName && item.url === linkUrl);
    })

    console.log("favoriteLinks", favoriteLinks)

    await browser.storage.local.set({ "fabrizioFavLinks": favoriteLinks });

    if (!favoriteLinks.length) {
        favContainer.innerHTML = '';
    }
    return favoriteLinks;
}

export async function renameFavLink(event, favoriteLinks, favContainer) {
    const button = event.target.closest("button")
    const linkItemDiv = button.parentElement;
    const buttonRemove = linkItemDiv.querySelector(".button--remove--link");
    const buttonRename = linkItemDiv.querySelector(".button--rename--link");
    buttonRemove.style.display = "none";
    buttonRename.style.display = "none";

    const linkItemAnchor = button.parentElement.querySelector(".link--item--a");
    const linkDisplayName = linkItemAnchor.querySelector(".fav--item-name").textContent;
    const linkUrl = linkItemAnchor.href;
    const input = document.createElement("input");
    input.value = linkDisplayName;

    const itemNameDiv = linkItemAnchor.querySelector(".fav--item-name");
    
    

    itemNameDiv.replaceWith(input);
    // linkItemAnchor.replaceWith(input);
    input.focus();
    input.select();

    input.addEventListener("keydown", async (e) => {
        if (e.key === "Enter") {
            await saveNewLinkName(input, linkUrl, favoriteLinks);
            if (input.value.trim() === linkDisplayName) {
                renderFavLinks(favContainer, favoriteLinks);
                return;
            }

        }
    });
    input.addEventListener("blur", async () => {
        await saveNewLinkName(input, linkUrl, favoriteLinks);
        if (input.value.trim() === linkDisplayName) {
            renderFavLinks(favContainer, favoriteLinks);
            return;
        }

    })
}

export function renderFiltWsAndItems(listToRender, whereToRender, itemClassName  ) {
    whereToRender.innerHTML = ''
    if (!listToRender.length) {
        whereToRender.innerHTML =
            '<div class="no-results">No results...</div>';
        return;
    }
    listToRender.forEach(
        item => {
            const foundItem = document.createElement("div");
            foundItem.className = itemClassName;
            if (itemClassName == "fabricItem") {
                const itemName = document.createElement("span");
                itemName.textContent = item.displayName;
                itemName.className = "item-name";
                itemName.dataset.objectType =  item.type;

                const itemType = document.createElement("span");
                itemType.className = "item-type";
                itemType.textContent = item.type;

                foundItem.append(itemName, itemType);

            } else {
                foundItem.textContent = `${item.displayName}`
            }
            whereToRender.appendChild(foundItem)
        }
    )
}

export function filterWsAndItems(listToFilter, inputForm, filteredItemsContainer, itemClassName,  currentTypeFilter, typeFilter = false ) {
    // click filter button
    let items = [...listToFilter];

    const searchInput = inputForm.value.toLowerCase();

    // text filter

    items = items.filter(
        item => {
            return item.displayName.toLowerCase()?.includes(searchInput?.toLowerCase()) ||
            item.id.toLowerCase()?.includes(searchInput?.toLowerCase())
        }
    )

    //type filter
    if (typeFilter && currentTypeFilter !== "All") {
        items = items.filter(item =>
            item.type === currentTypeFilter
        );
    }

    renderFiltWsAndItems(items, filteredItemsContainer, itemClassName);

}

export function renderClickedObject(fabricObjectType, item, whereToRender, favLinkList) {
    if (!item) return;
    console.log("item", item)
    let favStarIcon = null;
    let goToAnchor = null;
    let historyButton = null;

    const itemContainer = document.createElement("div");
    itemContainer.classList.add(`${fabricObjectType}--container`);
    const title = document.createElement("h4");
    title.textContent = item.displayName;

    const IdDiv = document.createElement("div");
    IdDiv.textContent = item.id;

    
    if (fabricObjectType === "workspace") {
        itemContainer.dataset.objectType = "workspace";
        itemContainer.dataset.objectId = item.id;

        const fullFabricUrl = `${baseFabricUrl}/${item.id}?experience=fabric-developer`;
        ({favStarIcon, goToAnchor} = createSaveIcon(fabricObjectType, fullFabricUrl, favLinkList,  item.id ));        
    }
    else if (fabricObjectType === "fabricItem"){
        itemContainer.dataset.objectType = item.type;
        itemContainer.dataset.objectId = item.id;
        itemContainer.dataset.wsId = item.workspaceId;

        const urlMapping = fabricRoutes[item.type];
        const isItemWithHistory = itemsWithHistory.includes(item.type)
        // does it have history?
        if (isItemWithHistory){
            historyButton = createHistoryIcon();

        }
        // does it have a goto?
        if (urlMapping){
            const fullFabricUrl = `${baseFabricUrl}/${item.workspaceId}/${urlMapping}/${item.id}?experience=fabric-developer`;
            ({favStarIcon, goToAnchor} = createSaveIcon(fabricObjectType, fullFabricUrl, favLinkList, item.id ));
        }
    }
    itemContainer.append(title);
    if (favStarIcon) {itemContainer.append(favStarIcon);}
    if (historyButton) {itemContainer.append(historyButton);}
    if (goToAnchor) {itemContainer.append(goToAnchor);}
    itemContainer.append(IdDiv);

    whereToRender.innerHTML = "" 
    whereToRender.append(itemContainer);

}

function createSaveIcon(type, fullFabricUrl, favLinkList, itemId) {
    const favStarIcon = document.createElement("button");
    // favStarIcon.textContent = "⭐";
    favStarIcon.classList.add(`${type}--save`);

    const starImg = document.createElement("img");
    // fill in or empty the star
    // console.log("star icon", itemId)
    const foundInFav = favLinkList.find(
        item => item.objectId === itemId
    )
    if (foundInFav) {
        starImg.classList.add("saved")
        starImg.src = chrome.runtime.getURL("img/starfill.png");
    }
    else {
        starImg.classList.add("not-saved")
        starImg.src = chrome.runtime.getURL("img/star.png");
    }

    starImg.alt = "Save to favorites";
    starImg.classList.add("save--star-icon");
    favStarIcon.appendChild(starImg);

    const goToAnchor = createGoToIcon(fullFabricUrl)
    return {favStarIcon, goToAnchor}
}

function createGoToIcon(url){
    const goToAnchor = document.createElement("a");
    goToAnchor.href = url;
    goToAnchor.target = "_blank";
    goToAnchor.rel = "noopener noreferrer";
    // goToAnchor.textContent = "🔗";

    const anchorImg = document.createElement("img");
    anchorImg.src = chrome.runtime.getURL("img/link.png");
    anchorImg.alt = "Go To";
    anchorImg.classList.add("go--to-icon");
    goToAnchor.appendChild(anchorImg)
    return goToAnchor;
}

function createRemoveButton() {
    const removeLinkButton = document.createElement("button");
    removeLinkButton.classList.add("button--remove--link")

    const removeImg = document.createElement("img");
    removeImg.src = chrome.runtime.getURL("img/close.png");
    removeImg.alt = "remove link";
    removeImg.classList.add("remove--icon");

    removeLinkButton.appendChild(removeImg);
    return removeLinkButton
}

function createRenameButton() {
    const renameLinkName = document.createElement("button");
    renameLinkName.classList.add("button--rename--link")

    const editImg = document.createElement("img");
    editImg.src = chrome.runtime.getURL("img/pencil.png");
    editImg.alt = "Edit link name";
    editImg.classList.add("edit--icon");

    renameLinkName.appendChild(editImg);
    return renameLinkName;
}


export function renderFavLinks(whereToRender, favoriteLinksList){
    whereToRender.innerHTML = '';
    // const favHeader = document.createElement("h3");
    // favHeader.textContent = "Favorites";
    // whereToRender.append(favHeader)
    const favLinkList = document.createElement("div");
    favLinkList.classList.add("favLinkList");

    favoriteLinksList.forEach(favLink =>{
        const linkItemDiv = document.createElement("div");
        const linkItemAnch = document.createElement("a");
        linkItemAnch.href = favLink.url;

        const itemNameDiv = document.createElement("div");
        itemNameDiv.classList.add("fav--item-name");

        itemNameDiv.textContent = favLink.displayName;
        itemNameDiv.title = favLink.displayName;

        linkItemAnch.append(itemNameDiv);

        // show history
        if (favLink.type === "DataPipeline" || favLink.type === 'SemanticModel'){
            const historyButton = createHistoryIcon();
            linkItemDiv.append(historyButton);
        }

        const removeLinkButton = createRemoveButton()
        const renameLinkName = createRenameButton()


        // CREATE LINK ANCHOR
        linkItemAnch.classList.add("link--item--a");
        linkItemAnch.target = "_blank";
        linkItemAnch.rel = "noopener noreferrer";
        if (favLink?.wsName){
            console.log()
            const workspaceNameDiv = document.createElement("div");
            workspaceNameDiv.classList.add("fav--ws-name")
            workspaceNameDiv.textContent = favLink?.wsName;
            linkItemAnch.append(workspaceNameDiv);

        }
        
        linkItemDiv.classList.add("link--item--div")
        linkItemDiv.dataset.objectId = favLink.objectId;
        linkItemDiv.dataset.type = favLink.type;
        if (favLink.wsId) linkItemDiv.dataset.wsId = favLink.wsId


        linkItemDiv.append(linkItemAnch, renameLinkName, removeLinkButton);

        favLinkList.append(linkItemDiv);

    })
    whereToRender.append(favLinkList);
}

export function renderTypeFilters(itemTypeFilters, items) {
    
    itemTypeFilters.innerHTML = '';

    const typeSet = new Set(
        items.map(item => item.type)
    );

    const buttonALL = document.createElement("button");
    buttonALL.textContent = "All";
    buttonALL.dataset.type = "All";
    itemTypeFilters.appendChild(buttonALL);

    [...typeSet]
        .sort((a, b) => a.localeCompare(b))
        .forEach(type => {
            const buttonType = document.createElement("button");
            buttonType.textContent = type;
            buttonType.dataset.type = type;
            itemTypeFilters.appendChild(buttonType);
        });
}


function createHistoryIcon() {
    const historyButton = document.createElement("button");
    const histImg = document.createElement("img");
    histImg.src = chrome.runtime.getURL("img/history.png");
    histImg.alt = "history icon";
    histImg.classList.add("history-icon");
    historyButton.appendChild(histImg)
    historyButton.classList.add("fabricItem--history");
    return historyButton
}


export async function showFavItemHistoryRuns(itemContainer, token) {
    const existingHistory =
        itemContainer.querySelector(".run-history-container");

    if (existingHistory) {
        existingHistory.hidden = !existingHistory.hidden;
        return;
    }

    const noHistory =
        itemContainer.querySelector(".no--history--found");

    if (noHistory) {
        noHistory.hidden = !noHistory.hidden;
        return;
    }

    const workspaceId = itemContainer.dataset.wsId;
    const itemId = itemContainer.dataset.objectId;
    const objectType = itemContainer.dataset.type;

    const jobInstJson = await getJobInstance(
        workspaceId,
        itemId,
        objectType,
        token
    );

    if (!jobInstJson?.value?.length) {
        const noHistFound = document.createElement("div");

        noHistFound.classList.add("no--history--found");
        noHistFound.classList.add("run-history-container")
        noHistFound.textContent = "No runs were found...";

        itemContainer.append(noHistFound);

        return;
    }

    const runContainer = renderLatestRuns(
        jobInstJson,
        workspaceId,
        itemId, 
        objectType
    );

    if (runContainer) {
        itemContainer.append(runContainer);
    }
}

function createRefreshHistoryButton(){
    const refreshHistoryBtn = document.createElement("button");
    refreshHistoryBtn.classList.add("button--refresh--history")

    const refreshIcon = document.createElement("img");
    refreshIcon.src = chrome.runtime.getURL("img/refresh.png");
    refreshIcon.alt = "refresh history icon";
    refreshIcon.classList.add("refresh--icon");

    refreshHistoryBtn.appendChild(refreshIcon);
    return refreshHistoryBtn 
}

export function renderLatestRuns (jobInstJson, workspaceId, itemId, objectType) {
    const latestRuns = jobInstJson.value
        .sort((a, b) => new Date(b.startTimeUtc) - new Date(a.startTimeUtc))
        .slice(0, 15);

    const runContainer = document.createElement("div");
    runContainer.classList.add("run-history-container")
    // add refresh history button
    const refreshHistoryBtn = createRefreshHistoryButton();
    runContainer.append(refreshHistoryBtn)


    const runContainerTitle = document.createElement("h4");
    runContainerTitle.classList.add("history--title")
    runContainerTitle.textContent = "History"
    runContainer.append(runContainerTitle)

    latestRuns.forEach(run => {
        const runItem = renderSingleRun(run, objectType, workspaceId, itemId);
        runContainer.append(runItem);
    })
    return runContainer;
}


export function renderSingleRun(run, objectType,  workspaceId, itemId) {
    const runItem = document.createElement("div");
    runItem.classList.add("run-history-item");

    const statusdiv = document.createElement("div");
    statusdiv.classList.add("status");

    let runActionBar = document.createElement("div");
    runActionBar.classList.add("run--action-bar")

    let statusName = document.createElement("div");
    statusName.classList.add("status--name")

    statusdiv.append(statusName, runActionBar)

    const runTimediv = document.createElement("div");
    runTimediv.classList.add("run-time");

    const invokeTypediv = document.createElement("div");
    invokeTypediv.classList.add("invoke-type");

    const failurediv = document.createElement("div");
    failurediv.classList.add("failure");

    const { statusNameElem, stateImg, failMessage } = getStatusTitle(run);
    if (stateImg) {
        statusName.append(stateImg)
    }
    statusName.append(statusNameElem);


    runItem.append(statusdiv);

    // fill runtime

    runTimediv.textContent = getRuntimeInfo(run);
    runItem.append(runTimediv);

    //fill invoke type
    if (run.invokeType) {
        invokeTypediv.textContent = `Invoke type: ${run.invokeType}`
        runItem.append(invokeTypediv)}


    if (failMessage) {
        failurediv.textContent = failMessage;
        failurediv.hidden = true;

        const infoFailButton = document.createElement('button');
        infoFailButton.classList.add("info--fail--button");

        const infoImg = addImage("img/info.png", "", "error-info");

        infoFailButton.appendChild(infoImg)
        
        statusName.append(infoFailButton)
        // statusdiv.append(infoFailButton)
        runItem.append(failurediv)
    }

    // append goTo
    let runLinkUrl = ''
    if(objectType === "DataPipeline") runLinkUrl = `https://app.fabric.microsoft.com/workloads/data-pipeline/monitoring/workspaces/${workspaceId}/pipelines/${itemId}/${run.id}?experience=fabric-developer`
    else if(objectType === "SemanticModel") runLinkUrl = `https://app.fabric.microsoft.com/groups/${workspaceId}/datasets/${itemId}/refreshdetails/${run.id}?experience=fabric-developer`
    const goToAnchor = createGoToIcon(runLinkUrl);
    runActionBar.append(goToAnchor);
    return runItem;

}

function getFailureMessage(run) {
    if (run.failureReason?.message) {
        return run.failureReason.message;
    }

    if (run.serviceExceptionJson) {
        try {
            return JSON.parse(
                run.serviceExceptionJson
            ).errorDescription;
        } catch {
            return run.serviceExceptionJson;
        }
    }

    return null;
}

function getStatusTitle(run) {
    let statusInfo = '';
    let failMessage = null;
    let stateImg = null;
    switch (run.status.toLowerCase()) {
        case "notstarted":
            stateImg = addImage("img/notstarted.png", "notstarted", "not-started")
            statusInfo = "Not Started";
            break;
        case "inprogress":
            stateImg = addImage("img/running.png", "running", "running")
            statusInfo = "Running";
            break;
        case "failed":
            stateImg = addImage("img/error.png", "error", "error")
            statusInfo = "Failed";
            // failMessage = run?.failureReason?.message || null
            failMessage = getFailureMessage(run)
            break;
        case "completed":
            statusInfo = "Completed";
            stateImg = addImage("img/done.png", "done", "done")
            break;
        case "cancelled":
            statusInfo = "Cancelled";
            stateImg = addImage("img/disabled.png", "disabled", "disabled")
            break;
        default:
            statusInfo = run.status;
            break;
    }
    const statusNameElem = document.createElement("div")
    statusNameElem.textContent = statusInfo

    
    return {statusNameElem, stateImg, failMessage }
}

function addImage(imgPath, alt, className) {
    const img = document.createElement("img");
    img.src = chrome.runtime.getURL(imgPath);
    img.alt = alt;
    img.classList.add(className);
    return img
}

function getRuntimeInfo(run) {
    const startTime =
        run.startTimeUtc ?? run.startTime;

    const endTime =
        run.endTimeUtc ?? run.endTime;

    if (!endTime) {
        return `${formatDateTimeHistory(startTime)} → Running`;
    }

    return `${formatDateTimeHistory(startTime)} → ${new Date(endTime)
        .toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        })}`;
}

// function getRuntimeInfo(run) {
//     return run.endTimeUtc
//         ? `${formatDateTimeHistory(run.startTimeUtc || run.startTime)} → ${new Date(run.endTimeUtc || run.startTime).toLocaleTimeString([], {
//             hour: "2-digit",
//             minute: "2-digit"
//         })}`
//         : `${formatDateTimeHistory(run.startTimeUtc)} → Running`;

// }

export const formatDateTimeHistory = (dateString) =>
new Date(dateString).toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
});


export async function saveNewLinkName(input, linkUrl, favoriteLinks) {
    const newName = input.value.trim();

    if (!newName) return;
    favoriteLinks = favoriteLinks.map(item =>
        item.url === linkUrl
            ? { ...item, displayName: newName }
            : item
    );

    await browser.storage.local.set({
        fabrizioFavLinks: favoriteLinks
    })

}