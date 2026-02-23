import "../ui/components/app-header";
import "../ui/components/app-modal";
import { db, ApiKeyItem } from "../core/modules/db/index";
import { createDefaultProviderRegistry } from "../core/services/ai/providers/index";
import { showAlert } from "../core/utils/alert";
import { AiProviderId } from "../core/types/index";

const providerRegistry = createDefaultProviderRegistry();
const container = document.getElementById("settings-container");

interface ModelEntry {
  model: string;
  providerId: AiProviderId;
  providerName: string;
  providerIcon: string;
  keyId: string;
  isSelected: boolean;
}

/* ── State ── */
let searchTerm = "";
let filterProvider: AiProviderId | "all" = "all";
let sortDirection: "asc" | "desc" = "asc";

/* ── Helpers ── */
function getAllModels(): ModelEntry[] {
  const settings = db.getSettings();
  const providers = providerRegistry.getAllProviders();
  const entries: ModelEntry[] = [];

  for (const provider of providers) {
    const activeKeyId = settings.activeKeys[provider.id];
    const activeKey = settings.apiKeys.find(
      (k) => k.id === activeKeyId && k.providerId === provider.id,
    );

    if (!activeKey || !activeKey.availableModels) continue;

    for (const model of activeKey.availableModels) {
      entries.push({
        model,
        providerId: provider.id,
        providerName: provider.name,
        providerIcon: provider.icon,
        keyId: activeKey.id,
        isSelected: activeKey.selectedModels.includes(model),
      });
    }
  }

  return entries;
}

function getFilteredModels(models: ModelEntry[]): ModelEntry[] {
  let filtered = models;

  if (filterProvider !== "all") {
    filtered = filtered.filter((m) => m.providerId === filterProvider);
  }

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter((m) => m.model.toLowerCase().includes(term));
  }

  filtered.sort((a, b) => {
    const comparison = a.model.localeCompare(b.model);
    return sortDirection === "asc" ? comparison : -comparison;
  });

  return filtered;
}

/* ── Render: Models Table ── */
function renderModels() {
  if (!container) return;
  const table = container.querySelector("#models-table");
  const emptyState = container.querySelector("#empty-state");
  if (!table || !emptyState) return;

  const allModels = getAllModels();
  const filtered = getFilteredModels(allModels);

  if (filtered.length === 0) {
    table.parentElement?.classList.add("hidden");
    emptyState.classList.remove("hidden");
    emptyState.classList.add("flex");
    return;
  }

  table.parentElement?.classList.remove("hidden");
  emptyState.classList.add("hidden");
  emptyState.classList.remove("flex");

  table.innerHTML = filtered
    .map(
      (entry) => `
      <label class="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-hover/5 transition-all cursor-pointer group">
        <input
          type="checkbox"
          data-key-id="${entry.keyId}"
          value="${entry.model}"
          ${entry.isSelected ? "checked" : ""}
          class="model-checkbox w-4 h-4 accent-primary rounded border-border shrink-0"
        />
        <img
          src="${entry.providerIcon}"
          alt="${entry.providerName}"
          class="w-5 h-5 shrink-0 object-contain opacity-60 group-hover:opacity-100 transition-opacity"
        />
        <span class="text-sm text-text-secondary group-hover:text-text transition-colors truncate">${entry.model}</span>
      </label>
    `,
    )
    .join("");
}

/* ── Render: Provider Filter ── */
function renderFilterDropdown() {
  if (!container) return;
  const dropdown = container.querySelector("#filter-dropdown");
  if (!dropdown) return;

  const providers = providerRegistry.getAllProviders();

  dropdown.innerHTML = `
    <button data-filter="all" class="filter-option w-full text-left px-4 py-2.5 text-sm ${
      filterProvider === "all" ? "text-text" : "text-text-secondary"
    } hover:text-text hover:bg-surface-hover transition-all flex items-center gap-2.5">
      <span class="w-5 h-5 flex items-center justify-center shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>
        </svg>
      </span>
      All Providers
    </button>
    ${providers
      .map(
        (p) => `
      <button data-filter="${p.id}" class="filter-option w-full text-left px-4 py-2.5 text-sm ${
        filterProvider === p.id ? "text-text" : "text-text-secondary"
      } hover:text-text hover:bg-surface-hover transition-all flex items-center gap-2.5">
        <img src="${p.icon}" alt="${p.name}" class="w-5 h-5 object-contain shrink-0" />
        ${p.name}
      </button>
    `,
      )
      .join("")}
  `;
}

/* ── Render: Keys Modal Body ── */
function renderKeysModalBody() {
  if (!container) return;
  const body = container.querySelector("#keys-modal-body");
  if (!body) return;

  const settings = db.getSettings();
  const providers = providerRegistry.getAllProviders();

  body.innerHTML = providers
    .map((provider) => {
      const keys = settings.apiKeys.filter((k) => k.providerId === provider.id);
      const activeKeyId = settings.activeKeys[provider.id];

      return `
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <img src="${provider.icon}" alt="${provider.name}" class="w-5 h-5 object-contain" />
              <span class="text-sm font-semibold text-text">${provider.name}</span>
            </div>
            <button data-action="add-key" data-provider="${provider.id}" class="text-xs font-medium text-text-secondary hover:text-text transition-all cursor-pointer flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              <span>Add Key</span>
            </button>
          </div>

          ${
            keys.length === 0
              ? `<div class="py-4 text-center border border-dashed border-border/50 rounded-xl">
                   <p class="text-xs text-text-muted">No keys configured</p>
                 </div>`
              : keys
                  .map((key) => {
                    const isActive = key.id === activeKeyId;
                    return `
                    <div class="flex items-center gap-3 group">
                      <label class="flex-1 flex items-center gap-3 cursor-pointer p-3 rounded-xl border ${isActive ? "border-text/30 bg-surface-hover/10" : "border-border/50 bg-transparent hover:bg-surface-hover/5"} transition-all">
                        <input type="radio" name="active-key-${provider.id}" value="${key.id}" data-provider-id="${provider.id}" ${isActive ? "checked" : ""} class="w-4 h-4 accent-primary key-radio" />
                        <div class="flex flex-col min-w-0">
                          <span class="text-sm font-medium ${isActive ? "text-text" : "text-text-secondary"} truncate">${key.name}</span>
                          <span class="text-xs text-text-muted font-mono mt-0.5">${key.value.substring(0, 4)}••••${key.value.substring(key.value.length - 4)}</span>
                        </div>
                      </label>
                      <div class="flex items-center gap-1">
                        <button data-action="fetch-models" data-key-id="${key.id}" class="p-2 rounded-lg text-text-secondary hover:text-text hover:bg-surface-hover transition-all" title="Sync Models">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
                        </button>
                        <button data-action="edit-key" data-key-id="${key.id}" data-key-name="${key.name}" class="p-2 rounded-lg text-text-secondary hover:text-text hover:bg-surface-hover transition-all opacity-0 group-hover:opacity-100" title="Edit Name">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                        </button>
                        <button data-action="delete-key" data-key-id="${key.id}" class="p-2 rounded-lg text-text-secondary hover:text-error hover:bg-error/10 transition-all opacity-0 group-hover:opacity-100" title="Delete Key">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                        </button>
                      </div>
                    </div>
                  `;
                  })
                  .join("")
          }
        </div>
      `;
    })
    .join("");
}

/* ── Full render ── */
function render() {
  renderModels();
  renderFilterDropdown();
}

/* ── Modal helpers ── */
function openModal(id: string) {
  const modal = container?.querySelector(`#${id}`) as HTMLElement | null;
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }
}

function closeModal(id: string) {
  const modal = container?.querySelector(`#${id}`) as HTMLElement | null;
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

/* ── Event Bindings ── */
let isInitialized = false;

function bindStaticEvents() {
  if (!container || isInitialized) return;

  // 3-dot menu toggle
  const menuTrigger = container.querySelector("#menu-trigger");
  const menuDropdown = container.querySelector("#menu-dropdown") as HTMLElement;

  menuTrigger?.addEventListener("click", (e) => {
    e.stopPropagation();
    menuDropdown.classList.toggle("hidden");
  });

  document.addEventListener("click", () => {
    menuDropdown?.classList.add("hidden");
  });

  // Open Keys Modal from menu
  container.querySelector("#open-keys-modal-btn")?.addEventListener("click", () => {
    menuDropdown.classList.add("hidden");
    renderKeysModalBody();
    openModal("keys-modal");
    attachKeysModalEvents();
  });

  // Close buttons for modals
  container.querySelector("#close-keys-modal-btn")?.addEventListener("click", () => {
    closeModal("keys-modal");
    render();
    attachDynamicEvents();
  });

  container.querySelector("#close-add-key-btn")?.addEventListener("click", () => {
    closeModal("add-key-modal");
  });

  container.querySelector("#close-edit-key-btn")?.addEventListener("click", () => {
    closeModal("edit-key-modal");
  });

  // Save new key
  container.querySelector("#save-new-key")?.addEventListener("click", async () => {
    const providerIdInput = container?.querySelector("#modal-provider-id") as HTMLInputElement;
    const nameInput = container?.querySelector("#modal-key-name") as HTMLInputElement;
    const valueInput = container?.querySelector("#modal-key-value") as HTMLInputElement;

    const providerId = providerIdInput.value as AiProviderId;
    const name = nameInput.value.trim();
    const value = valueInput.value.trim();

    if (!name || !value) {
      showAlert({ type: "error", message: "Name and Key are required." });
      return;
    }

    const settings = db.getSettings();
    const newKey: ApiKeyItem = {
      id: Date.now().toString(),
      providerId,
      name,
      value,
      createdAt: Date.now(),
      selectedModels: [],
    };

    settings.apiKeys.push(newKey);
    if (!settings.activeKeys[providerId]) settings.activeKeys[providerId] = newKey.id;
    db.saveSettings(settings);

    showAlert({ type: "success", message: "Key added." });
    closeModal("add-key-modal");
    renderKeysModalBody();
    attachKeysModalEvents();
    window.dispatchEvent(new Event("settings-updated"));
  });

  // Save edit key
  container.querySelector("#save-edit-key")?.addEventListener("click", () => {
    const keyIdInput = container?.querySelector("#edit-modal-key-id") as HTMLInputElement;
    const nameInput = container?.querySelector("#edit-modal-key-name") as HTMLInputElement;

    const id = keyIdInput.value;
    const newName = nameInput.value.trim();

    if (!newName) {
      showAlert({ type: "error", message: "Key Name is required." });
      return;
    }

    const settings = db.getSettings();
    const keyToEdit = settings.apiKeys.find((k) => k.id === id);
    if (keyToEdit) {
      keyToEdit.name = newName;
      db.saveSettings(settings);
      showAlert({ type: "success", message: "Key name updated." });
      closeModal("edit-key-modal");
      renderKeysModalBody();
      attachKeysModalEvents();
      window.dispatchEvent(new Event("settings-updated"));
    }
  });

  // Search
  const searchInput = container.querySelector("#model-search") as HTMLInputElement;
  searchInput?.addEventListener("input", (e) => {
    searchTerm = (e.target as HTMLInputElement).value;
    renderModels();
    attachDynamicEvents();
  });

  // Filter dropdown toggle
  const filterBtn = container.querySelector("#filter-btn");
  const filterDropdown = container.querySelector("#filter-dropdown") as HTMLElement;

  filterBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    filterDropdown.classList.toggle("hidden");
  });

  document.addEventListener("click", (e) => {
    if (!filterBtn?.contains(e.target as Node)) {
      filterDropdown?.classList.add("hidden");
    }
  });

  // Sort toggle
  const sortBtn = container.querySelector("#sort-btn");
  const sortLabel = container.querySelector("#sort-label");

  sortBtn?.addEventListener("click", () => {
    sortDirection = sortDirection === "asc" ? "desc" : "asc";
    if (sortLabel) sortLabel.textContent = sortDirection === "asc" ? "A → Z" : "Z → A";
    renderModels();
    attachDynamicEvents();
  });

  isInitialized = true;
}

function attachDynamicEvents() {
  if (!container) return;

  // Model checkboxes
  container.querySelectorAll(".model-checkbox").forEach((cb) => {
    cb.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement;
      const keyId = target.dataset.keyId;
      const model = target.value;
      const settings = db.getSettings();
      const key = settings.apiKeys.find((k) => k.id === keyId);
      if (key) {
        if (target.checked) {
          if (!key.selectedModels.includes(model)) key.selectedModels.push(model);
        } else {
          key.selectedModels = key.selectedModels.filter((m) => m !== model);
        }
        db.saveSettings(settings);
        window.dispatchEvent(new Event("settings-updated"));
      }
    });
  });

  // Filter options
  container.querySelectorAll(".filter-option").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const target = e.currentTarget as HTMLElement;
      const value = target.dataset.filter as AiProviderId | "all";
      filterProvider = value;

      const filterLabel = container?.querySelector("#filter-label");
      if (filterLabel) {
        filterLabel.textContent =
          value === "all"
            ? "All Providers"
            : (providerRegistry.getProvider(value)?.name ?? "All Providers");
      }

      const filterDropdown = container?.querySelector("#filter-dropdown") as HTMLElement;
      filterDropdown?.classList.add("hidden");

      render();
      attachDynamicEvents();
    });
  });
}

function attachKeysModalEvents() {
  if (!container) return;

  // Add key buttons
  container.querySelectorAll('[data-action="add-key"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const providerId = (e.currentTarget as HTMLElement).dataset.provider as AiProviderId;
      const provider = providerRegistry.getProvider(providerId);
      if (provider) {
        const titleEl = container?.querySelector("#add-key-title");
        const providerInput = container?.querySelector("#modal-provider-id") as HTMLInputElement;
        const nameInput = container?.querySelector("#modal-key-name") as HTMLInputElement;
        const valueInput = container?.querySelector("#modal-key-value") as HTMLInputElement;

        if (titleEl) titleEl.textContent = `Add ${provider.name} Key`;
        providerInput.value = provider.id;
        nameInput.value = "";
        valueInput.value = "";
        openModal("add-key-modal");
      }
    });
  });

  // Active key selection
  container.querySelectorAll(".key-radio").forEach((radio) => {
    radio.addEventListener("change", (e) => {
      const id = (e.target as HTMLInputElement).value;
      const providerId = (e.target as HTMLInputElement).dataset.providerId;
      if (providerId) {
        const settings = db.getSettings();
        settings.activeKeys[providerId] = id;
        db.saveSettings(settings);
        renderKeysModalBody();
        attachKeysModalEvents();
        render();
        attachDynamicEvents();
        window.dispatchEvent(new Event("settings-updated"));
      }
    });
  });

  // Delete keys
  container.querySelectorAll('[data-action="delete-key"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.keyId;
      if (confirm("Delete this key?")) {
        const settings = db.getSettings();
        const keyToDelete = settings.apiKeys.find((k) => k.id === id);
        if (keyToDelete) {
          settings.apiKeys = settings.apiKeys.filter((k) => k.id !== id);
          if (settings.activeKeys[keyToDelete.providerId] === id) {
            const remaining = settings.apiKeys.filter(
              (k) => k.providerId === keyToDelete.providerId,
            );
            if (remaining.length > 0) settings.activeKeys[keyToDelete.providerId] = remaining[0].id;
            else delete settings.activeKeys[keyToDelete.providerId];
          }
          db.saveSettings(settings);
        }
        renderKeysModalBody();
        attachKeysModalEvents();
        render();
        attachDynamicEvents();
        window.dispatchEvent(new Event("settings-updated"));
      }
    });
  });

  // Sync models
  container.querySelectorAll('[data-action="fetch-models"]').forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const keyId = (e.currentTarget as HTMLElement).dataset.keyId;
      const settings = db.getSettings();
      const key = settings.apiKeys.find((k) => k.id === keyId);
      if (!key) return;

      const provider = providerRegistry.getProvider(key.providerId);
      if (!provider) return;

      const btnEl = e.currentTarget as HTMLButtonElement;
      btnEl.disabled = true;
      btnEl.classList.add("opacity-50", "pointer-events-none", "animate-spin");

      try {
        const models = await provider.fetchModels(key.value);
        key.availableModels = models;
        if (key.selectedModels.length === 0) key.selectedModels = [...models];
        db.saveSettings(settings);
        showAlert({ type: "success", message: "Models synced." });
        renderKeysModalBody();
        attachKeysModalEvents();
        render();
        attachDynamicEvents();
        window.dispatchEvent(new Event("settings-updated"));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        showAlert({ type: "error", message: `Sync failed: ${message}` });
      } finally {
        btnEl.disabled = false;
        btnEl.classList.remove("opacity-50", "pointer-events-none", "animate-spin");
      }
    });
  });

  // Edit key name
  container.querySelectorAll('[data-action="edit-key"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.keyId;
      const currentName = (e.currentTarget as HTMLElement).dataset.keyName;
      if (id && currentName) {
        const keyIdInput = container?.querySelector("#edit-modal-key-id") as HTMLInputElement;
        const nameInput = container?.querySelector("#edit-modal-key-name") as HTMLInputElement;
        keyIdInput.value = id;
        nameInput.value = currentName;
        openModal("edit-key-modal");
      }
    });
  });
}

/* ── Init ── */
document.addEventListener("DOMContentLoaded", () => {
  render();
  bindStaticEvents();
  attachDynamicEvents();
});
