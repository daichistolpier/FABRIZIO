// let cachedAllWorkspaces = null;

export async function getConnectionInfo(id, token) {
    if (!id) return null;

    const getConnectionInfoURL = "https://api.fabric.microsoft.com/v1/connections/"

    const getConnectionInfoResponse = await fetch(getConnectionInfoURL + id,
        {
            headers: {
                "Authorization": `Bearer ${token}`,
            }
        }
    )

    const getConnectionJson = await getConnectionInfoResponse.json();

    if (!getConnectionInfoResponse.ok) {
        const httpStatus = getConnectionInfoResponse.status;
        const errorText = getConnectionJson.message ?? JSON.stringify(getConnectionJson);


        return `HTTP Status ${httpStatus}\n${errorText}`

    }
    

    return getConnectionJson;
}


export async function getAllWorkspaces(token) {
    if (!token || typeof token !== "string") {
        throw new Error("AUTH_REQUIRED: No authentication token provided.");
    }

    const listAllWorkspacesURL =
        "https://api.fabric.microsoft.com/v1/workspaces";

    const response = await fetch(listAllWorkspacesURL, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (response.status === 401) {
        throw new Error("AUTH_EXPIRED: Your session has expired. Reopen or refresh Microsoft Fabric.");
    }

    if (response.status === 403) {
        throw new Error("PERMISSION_DENIED: You don't have permission to access workspaces.");
    }

    if (!response.ok) {
        throw new Error(
            `FABRIC_API_ERROR: ${response.status} ${response.statusText}`
        );
    }

    const data = await response.json();
    return data.value ?? [];
}

export async function getWorkspaceIdFromName  (inputValue, allWorkspaces, token) {
    // const allWorspaces = await getAllWorkspaces(token)
    
    if (!allWorkspaces) return;

    return allWorkspaces.filter(
        ws => ws.displayName?.toLowerCase().includes(inputValue.toLowerCase())
    );
    
}


export async function getWorkspaceNameFromId(workspaceName, token) {
    if (!workspaceName) return null;

    const getWorkspaceNameFromIdURL = "https://api.fabric.microsoft.com/v1/workspaces/"

    const getWorkspaceNameFromIdResponse = await fetch(getWorkspaceNameFromIdURL + workspaceName,
        {
            headers: {
                "Authorization": `Bearer ${token}`,
            }
        }
    )

    const getworkspaceJson = await getWorkspaceNameFromIdResponse.json();

    if (!getWorkspaceNameFromIdResponse.ok) {
        const httpStatus = getWorkspaceNameFromIdResponse.status;
        const errorText = getworkspaceJson.message ?? JSON.stringify(getworkspaceJson);


        return `HTTP Status ${httpStatus}\n${errorText}`

    }
    

    return getworkspaceJson;
}


export async function getAllItemsFromWorkspace(workspaceId, token) {
    if (!workspaceId) return [];
    // console.log("reading from API")

    const getItemsfromWsURL = `https://api.fabric.microsoft.com/v1/workspaces/${workspaceId}/items/`

    const getItemsResponse = await fetch(getItemsfromWsURL,
        {
            headers: {
                "Authorization": `Bearer ${token}`,
            }
        }
    )
    const { value } = await getItemsResponse.json();
    return value;
}




export async function getJobInstance(workspaceId, itemId, type, token) {

    if (!token || typeof token !== "string") {
        throw new Error("AUTH_REQUIRED: No authentication token provided.");
    }

    if (!workspaceId || !itemId) {
        throw new Error("INVALID_PARAMETERS: Workspace ID and item ID are required.");
    }

    let getJobInstancesUrl = "";

    if (type === "SemanticModel") {
        getJobInstancesUrl =
            `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/datasets/${itemId}/refreshes`;
    } else if (type === "DataPipeline") {
        getJobInstancesUrl =
            `https://api.fabric.microsoft.com/v1/workspaces/${workspaceId}/items/${itemId}/jobs/instances`;
    } else {
        throw new Error(`UNSUPPORTED_TYPE: Job history is not supported for "${type}".`);
    }

    const response = await fetch(getJobInstancesUrl, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const responseText = await response.text();

    let data;
    try {
        data = responseText ? JSON.parse(responseText) : {};
    } catch {
        data = { message: responseText || response.statusText };
    }

    if (response.status === 401) {
        throw new Error("AUTH_EXPIRED: Your session has expired. Reopen or refresh Microsoft Fabric.");
    }

    if (response.status === 403) {
        throw new Error("PERMISSION_DENIED: You don't have permission to access this job history.");
    }

    if (!response.ok) {
        const errorMessage =
            data.message ?? data.error?.message ?? JSON.stringify(data);

        throw new Error(`FABRIC_API_ERROR: HTTP ${response.status} - ${errorMessage}`);
    }

    return data;
}




