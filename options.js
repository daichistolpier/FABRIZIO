
const tenantSelect = document.querySelector("#tenantSelect");
const refreshButton = document.querySelector("#refreshTenants");
const status = document.querySelector("#status");

async function loadTenants() {
  refreshButton.disabled = true;
  status.textContent = "Looking for cached Fabric tenants...";

  try {
    // The background script queries the active Fabric tab.
    const result = await browser.runtime.sendMessage({
      type: "GET_TENANTS"
    });

    if (!result?.ok) {
      throw new Error(
        result?.message ?? "Could not retrieve tenants."
      );
    }

    const tenants = result.tenants ?? [];
    const saved = await browser.storage.local.get("fabrizioTenantId");
    const savedTenantId = saved.fabrizioTenantId;

    tenantSelect.replaceChildren();

    if (!tenants.length) {
      tenantSelect.add(new Option("No cached tenants found", ""));
      tenantSelect.disabled = true;
      status.textContent =
        "Open Microsoft Fabric and sign in, then refresh.";
      return;
    }

    for (const tenant of tenants) {
      tenantSelect.add(new Option(
        `${tenant.tenantId} (${tenant.tokenCount} cached tokens)`,
        tenant.tenantId
      ));
    }

    tenantSelect.value = tenants.some(
      tenant => tenant.tenantId === savedTenantId
    )
      ? savedTenantId
      : tenants[0].tenantId;

    tenantSelect.disabled = false;

    status.textContent = savedTenantId
      ? "Saved tenant configuration loaded."
      : "Choose a tenant to make it Fabrizio's default.";

  } catch (error) {
    tenantSelect.replaceChildren(
      new Option("Unable to load tenants", "")
    );
    tenantSelect.disabled = true;
    status.textContent = error.message;
  } finally {
    refreshButton.disabled = false;
  }
}

tenantSelect.addEventListener("change", async () => {
  const tenantId = tenantSelect.value;
  if (!tenantId) return;

  try {
    await browser.storage.local.set({
      fabrizioTenantId: tenantId
    });

    status.textContent =
      `Saved tenant: ${tenantId}. Fabrizio will use this tenant.`;

    // Ask the background script to refresh authentication.
    await browser.runtime.sendMessage({
      type: "TENANT_CHANGED"
    });
  } catch (error) {
    status.textContent = `Could not save tenant: ${error.message}`;
  }
});

refreshButton.addEventListener("click", loadTenants);

loadTenants();
