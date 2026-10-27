// console.log("CONTENT SCRIPT LOADED");

const getToken = function() {
    const POWERBI_SCOPE =
        "https://analysis.windows.net/powerbi/api/.default";

    const tokens = Object.keys(sessionStorage)
        .filter(key => key.includes(POWERBI_SCOPE))
        .map(key => {
            try {
                return JSON.parse(sessionStorage.getItem(key));
            } catch {
                return null;
            }
        })
        .filter(entry =>
            entry?.secret &&
            entry.target?.includes(POWERBI_SCOPE)
        )
        .sort((a, b) =>
            Number(b.cachedAt) - Number(a.cachedAt)
        );

    if (!tokens.length) {
        throw new Error("No Power BI API token found in sessionStorage.");
    }

    // The newest cached token is now first.
    return tokens[0].secret;
};



browser.runtime.onMessage.addListener(async message =>{
    if (message?.type !== "GET_TOKEN") return;
    // console.log("received")
    let token = getToken()
    return {
        bearer: token
    }
})