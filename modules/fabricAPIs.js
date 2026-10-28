// let cachedAllWorkspaces = null;
// add tenant lookup https://management.azure.com/tenants?api-version=2022-12-01


export async function getConnectionInfo(id, token) {
    if (!id) return null;

    const url = `https://api.fabric.microsoft.com/v1/connections/${id}`;

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            `HTTP Status ${response.status}\n${
                data.message ?? JSON.stringify(data)
            }`
        );
    }

    return data;
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




export async function getAllItemsFromWorkspace(workspaceId, token) {
    if (!token || typeof token !== "string") {
        throw new Error("AUTH_REQUIRED: No authentication token provided.");
    }

    if (!workspaceId) return [];

    const getItemsfromWsURL =
        `https://api.fabric.microsoft.com/v1/workspaces/${encodeURIComponent(workspaceId)}/items`;

    const response = await fetch(getItemsfromWsURL, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (response.status === 401) {
        throw new Error(
            "AUTH_EXPIRED: Your session has expired. Reopen or refresh Microsoft Fabric."
        );
    }

    if (response.status === 403) {
        throw new Error(
            "PERMISSION_DENIED: You don't have permission to access items in this workspace."
        );
    }

    if (!response.ok) {
        throw new Error(
            `FABRIC_API_ERROR: ${response.status} ${response.statusText}`
        );
    }

    const data = await response.json();
    return data.value ?? [];
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




