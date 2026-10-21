export const container = document.querySelector(".container");
export const inputGetConnectionInfo = document.querySelector(".input--getConnectionInfo");
export const getConnectionInfoDiv = document.querySelector(".getConnectionInfo");

// WS
export const wsFormInput = document.querySelector(".input--global--ws");
export const wsFoundContainer = document.querySelector(".global--found-ws");
export const wsInfoContainer = document.querySelector(".global--clicked-ws");

// Items
export const itemFormContainer = document.querySelector(".global--item");
export const itemFormInput = document.querySelector(".input--global--item");
export const itemFoundContainer = document.querySelector(".global--found-item");
export const itemInfoContainer = document.querySelector(".global--clicked-item");
// button filters
export const itemTypeFilters = document.querySelector(".item-type-filters");

//favorites selector
export const favContainer = document.querySelector(".favorites")


export function hideItemDropdown() {
    itemFoundContainer.style.display = "none";
    itemTypeFilters.style.display = "none";
}

export function showItemDropdown() {
    itemFoundContainer.style.display = "block";
    itemTypeFilters.style.display = "block";
}

export function hideWsDropdown() {
    wsFoundContainer.style.display = "none";
}

export function showWsDropdown() {
    wsFoundContainer.style.display = "block";
}

export function hideTypeFilters() {
    itemTypeFilters.style.display = "none";
}

export function showTypeFilters() {
    itemTypeFilters.style.display = "block";
}