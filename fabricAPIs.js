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

    console.log("reading from API")
    const listAllWorkspacesURL = "https://api.fabric.microsoft.com/v1/workspaces"
    const allWorkspacesResponse = await fetch(listAllWorkspacesURL,
        {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        })

    const { value } = await allWorkspacesResponse.json();
    return value
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
    console.log("reading from API")

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
    let getJobInstancesUrl = ''
    if (type == "SemanticModel") { 
        getJobInstancesUrl = `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/datasets/${itemId}/refreshes`;
    
    }
    else if (type == "DataPipeline") {
        getJobInstancesUrl = `https://api.fabric.microsoft.com/v1/workspaces/${workspaceId}/items/${itemId}/jobs/instances`
    }

    const getJobInstanceResponse = await fetch(getJobInstancesUrl,
        {
            headers: {
                "Authorization": `Bearer ${token}`,
            }
        }
    )

    const getJobInstanceJson = await getJobInstanceResponse.json();
    console.log(getJobInstanceJson)

    if (!getJobInstanceResponse.ok) {
        const httpStatus = getJobInstanceResponse.status;
        const errorText = getJobInstanceJson.message ?? JSON.stringify(getConngetJobInstanceJsonectionJson);

        return `HTTP Status ${httpStatus}\n${errorText}`

    }
    

    return getJobInstanceJson;
}




