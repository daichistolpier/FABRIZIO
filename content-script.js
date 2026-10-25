// console.log("CONTENT SCRIPT LOADED");

const getToken = function() {
    const sessionStorageKey = Object.keys(sessionStorage).find(key => {
        try{
            return key.includes("https://analysis.windows.net/powerbi/api/.default")
        } catch {
            return null;
        }
    })
    if (!sessionStorageKey) throw new Error(`Error in reading the storage default powerBi API`);

    const secret = sessionStorage.getItem(sessionStorageKey)
    if (!secret) throw new Error(`Error in reading the secret`);

    const bearer = JSON.parse(sessionStorage.getItem(sessionStorageKey)).secret
    return bearer;

}

// let the panel knows that the cs is loaded
// browser.runtime.sendMessage({
//     type:"CS_READY"
// })


browser.runtime.onMessage.addListener(async message =>{
    if (message?.type !== "GET_TOKEN") return;
    // console.log("received")
    let token = getToken()
    return {
        bearer: token
    }
})