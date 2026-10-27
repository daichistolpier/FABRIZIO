console.log("[Fabrizio] Content script loaded:", location.href);
const POWERBI_SCOPE =
    "https://analysis.windows.net/powerbi/api/.default";

function getCachedTokens() {
    return Object.keys(sessionStorage)
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
            entry?.realm &&
            entry.credentialType === "AccessToken" &&
            entry.target?.includes(POWERBI_SCOPE)
        );
}

// Discover tenant IDs represented in the cached Power BI tokens.
function getCachedTenants() {
    const tenants = new Map();

    for (const entry of getCachedTokens()) {
        if (!tenants.has(entry.realm)) {
            tenants.set(entry.realm, {
                tenantId: entry.realm,
                tokenCount: 0
            });
        }

        tenants.get(entry.realm).tokenCount++;
    }

    return [...tenants.values()];
}

// Retrieve the newest unexpired token for one specific tenant.
function getTokenForTenant(tenantId) {
    if (!tenantId) {
        throw new Error("No tenant ID was specified.");
    }

    const now = Math.floor(Date.now() / 1000);

    const tokens = getCachedTokens()
        .filter(entry =>
            entry.realm.toLowerCase() === tenantId.toLowerCase() &&
            Number(entry.expiresOn) > now
        )
        .sort((a, b) =>
            Number(b.cachedAt) - Number(a.cachedAt)
        );

    if (!tokens.length) {
        throw new Error(
            `No unexpired Power BI token found for tenant ${tenantId}.`
        );
    }

    return tokens[0].secret;
}

browser.runtime.onMessage.addListener(message => {
    try {
        if (message?.type === "GET_TENANTS") {
            return Promise.resolve({
                tenants: getCachedTenants()
            });
        }

        if (message?.type === "GET_TOKEN") {
            return Promise.resolve({
                bearer: getTokenForTenant(message.tenantId)
            });
        }
    } catch (error) {
        return Promise.resolve({
            error: error.message
        });
    }
});
