const tenantSelect = document.querySelector("#tenantSelect");
const refreshButton = document.querySelector("#refreshTenants");
const status = document.querySelector("#status");

async function loadTenants() {
  refreshButton.disabled = true;
  tenantSelect.disabled = true;
  status.textContent = "Looking for cached Fabric tenants...";

  try {
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

    if (tenants.length === 0) {
      tenantSelect.add(
        new Option("No cached tenants found", "")
      );
      status.textContent =
        "Open Microsoft Fabric and sign in, then refresh.";
      return;
    }

    // If there are multiple tenants and none is configured,
    // require the user to make an explicit choice.
    if (
      tenants.length > 1 &&
      !tenants.some(t => t.tenantId === savedTenantId)
    ) {
      tenantSelect.add(
        new Option("Select a tenant...", "")
      );
    }

    for (const tenant of tenants) {
      tenantSelect.add(
        new Option(
          `${tenant.tenantId} (${tenant.tokenCount} cached tokens)`,
          tenant.tenantId
        )
      );
    }

    const savedTenantExists = tenants.some(
      tenant => tenant.tenantId === savedTenantId
    );

    if (savedTenantExists) {
      tenantSelect.value = savedTenantId;
      status.textContent = "Saved tenant configuration loaded.";
    } else if (tenants.length === 1) {
      // Automatically configure the only available tenant.
      const tenantId = tenants[0].tenantId;

      tenantSelect.value = tenantId;

      await browser.storage.local.set({
        fabrizioTenantId: tenantId
      });

      await browser.runtime.sendMessage({
        type: "TENANT_CHANGED"
      });

      status.textContent =
        `Automatically configured tenant: ${tenantId}.`;
    } else {
      tenantSelect.value = "";
      status.textContent =
        "Choose a tenant to make it Fabrizio's default.";
    }

    tenantSelect.disabled = false;

  } catch (error) {
    tenantSelect.replaceChildren(
      new Option("Unable to load tenants", "")
    );

    status.textContent = error.message;
  } finally {
    refreshButton.disabled = false;
  }
}

tenantSelect.addEventListener("change", async () => {
  const tenantId = tenantSelect.value;
  if (!tenantId) return;

  try {
    const stored = await browser.storage.local.get(
      "fabrizioTenantId"
    );

    const previousTenantId = stored.fabrizioTenantId;

    // Clear favorites only when switching from one configured
    // tenant to a different tenant.
    if (
      previousTenantId &&
      previousTenantId !== tenantId
    ) {
      await browser.storage.local.remove("fabrizioFavLinks");
      await browser.storage.local.remove("fabrizioGlobalSearch");
    }

    await browser.storage.local.set({
      fabrizioTenantId: tenantId
    });

    const result = await browser.runtime.sendMessage({
      type: "TENANT_CHANGED"
    });

    if (result?.ok === false) {
      status.textContent =
        `Tenant saved, but authentication refresh failed: ${
          result.message ?? result.status ?? "Unknown error"
        }`;
      return;
    }

    status.textContent =
      previousTenantId && previousTenantId !== tenantId
        ? `Tenant changed to ${tenantId}. Favorites cache cleared.`
        : `Saved tenant: ${tenantId}. Fabrizio will use this tenant.`;

  } catch (error) {
    status.textContent =
      `Could not update tenant: ${error.message}`;
  }
});

refreshButton.addEventListener("click", loadTenants);

loadTenants();

document.querySelector("#resetCache").addEventListener("click", async () => {
    const confirmed = confirm(
        "Are you sure you want to reset Fabrizio's cache? This will remove favorites, search history, panel states, and the selected tenant."
    );

    if (!confirmed) return;

    try {
        await browser.storage.local.remove([
            "fabrizioFavLinks",
            "fabrizioGlobalSearch",
            "fabrizioPanelStates",
            "fabrizioTenantId"
        ]);

        console.log("Fabrizio cache reset successfully.");

        const status = document.querySelector("#status");
        if (status) {
            status.textContent = "Cache reset successfully.";
        }
    } catch (error) {
        console.error("Failed to reset Fabrizio cache:", error);

        const status = document.querySelector("#status");
        if (status) {
            status.textContent = "Failed to reset cache.";
        }
    }
});