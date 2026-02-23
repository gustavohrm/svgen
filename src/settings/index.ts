import "../ui/components/app-header";
import { db, ApiKeyItem } from "../core/modules/db/index";
import { createDefaultProviderRegistry } from "../core/services/ai/providers/index";
import { showAlert } from "../core/utils/alert";
import { AiProviderId } from "../core/types/index";

const providerRegistry = createDefaultProviderRegistry();
const container = document.getElementById("settings-container");

function render() {
  if (!container) return;
  const providerList = container.querySelector("#provider-list");
  if (!providerList) return;

  const settings = db.getSettings();
  const activeKeys = settings.activeKeys || {};

  providerList.innerHTML = providerRegistry
    .getAllProviders()
    .map((provider) => {
      const keys = settings.apiKeys.filter((k) => k.providerId === provider.id);
      return `
        <div class="card">
          <div class="px-6 py-4 border-b border-border/50 flex items-center justify-between">
            <span class="text-sm font-semibold text-text">${provider.name}</span>
            <button data-action="add-key" data-provider="${provider.id}" class="text-xs font-medium text-text-secondary hover:text-text transition-all cursor-pointer flex items-center gap-1.5">
               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              <span>Add Key</span>
            </button>
          </div>
          <div class="p-6 space-y-6">
            ${
              keys.length === 0
                ? `<div class="flex flex-col items-center justify-center py-8 text-center bg-transparent rounded-xl border border-dashed border-border/50 hover:border-border transition-all">
                     <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-key text-text-muted/30 mb-2"><path d="m21 2-2 2.5-2-2.5"/><path d="M15.5 7.5L14 9l1.5 1.5M10.5 16s1.5 1.5 1.5 3.5c0 2-2 3.5-4 3.5s-4-1.5-4-3.5c0-2 1.5-3.5 1.5-3.5L10.5 16z"/><path d="m10.5 16 3-3"/><path d="m14 9 7-7"/><path d="m16 9 1-1"/></svg>
                     <p class="text-xs text-text-muted">No keys configured for ${provider.name}</p>
                   </div>`
                : keys
                    .map((key) => {
                      const isActive = key.id === activeKeys[key.providerId];
                      return `
              <div class="space-y-4">
                <div class="flex items-center gap-4 group">
                  <label class="flex-1 flex items-center gap-4 cursor-pointer p-4 rounded-xl border ${isActive ? "border-text/30 bg-surface-hover/10" : "border-border/50 bg-transparent hover:bg-surface-hover/5"} transition-all">
                    <input type="radio" name="active-key-${key.providerId}" value="${key.id}" data-provider-id="${key.providerId}" ${isActive ? "checked" : ""} 
                           class="w-4 h-4 accent-primary" 
                           onchange="this.dispatchEvent(new CustomEvent('key-selected', { bubbles: true, detail: { id: '${key.id}' } }))">
                    <div class="flex flex-col min-w-0">
                      <span class="text-sm font-medium ${isActive ? "text-text" : "text-text-secondary"} transition-colors truncate">${key.name}</span>
                      <span class="text-xs text-text-muted font-mono mt-1">${key.value.substring(0, 4)}••••••••${key.value.substring(key.value.length - 4)}</span>
                    </div>
                  </label>
                  <div class="flex items-center gap-2">
                     <button data-action="edit-key" data-key-id="${key.id}" data-key-name="${key.name}" class="p-2 rounded-lg text-text-secondary hover:text-text hover:bg-surface-hover transition-all opacity-0 group-hover:opacity-100" title="Edit Name">
                       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                     </button>
                     <button data-action="fetch-models" data-key-id="${key.id}" class="p-2 rounded-lg text-text-secondary hover:text-text hover:bg-surface-hover transition-all" title="Sync Models">
                       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-refresh-cw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
                    </button>
                    <button data-action="delete-key" data-key-id="${key.id}" class="p-2 rounded-lg text-text-secondary hover:text-error hover:bg-error/10 transition-all opacity-0 group-hover:opacity-100" title="Delete Key">
                       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                    </button>
                  </div>
                </div>

                ${
                  isActive
                    ? `
                  <div class="ml-12 p-5 bg-transparent rounded-xl border border-border/50">
                    <div class="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div class="flex items-center gap-3">
                          <span class="text-sm font-medium text-text">Available Models</span>
                          <div class="flex items-center gap-2 text-xs">
                            <button data-action="select-all" data-key-id="${key.id}" class="text-text-secondary hover:text-text transition-colors cursor-pointer">Select All</button>
                            <span class="text-border">|</span>
                            <button data-action="deselect-all" data-key-id="${key.id}" class="text-text-muted hover:text-text transition-colors cursor-pointer">Deselect All</button>
                          </div>
                        </div>
                        <div class="relative w-full sm:max-w-[200px]">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                          <input type="text" placeholder="Search models..." class="model-search-input w-full bg-transparent border border-border/50 rounded-lg pl-9 pr-3 py-1.5 text-xs text-text placeholder:text-text-muted outline-none focus:border-border transition-all" data-list-id="model-list-${key.id}">
                        </div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2" id="model-list-${key.id}">
                    ${(() => {
                      const models = key.availableModels || [];
                      if (models.length > 0) {
                        return models
                          .map((m) => {
                            const isChecked = key.selectedModels.includes(m);
                            return `
                            <label class="model-item flex items-center gap-3 text-xs font-medium text-text-secondary cursor-pointer hover:text-text transition-colors p-2 rounded-lg hover:bg-surface-hover/10 border border-transparent hover:border-border/20">
                              <input type="checkbox" data-key-id="${key.id}" value="${m}" ${isChecked ? "checked" : ""} class="accent-primary rounded border-border model-checkbox">
                              <span class="truncate">${m}</span>
                            </label>
                          `;
                          })
                          .join("");
                      }
                      return `<div class="col-span-full py-4 text-center">
                               <button data-action="fetch-models" data-key-id="${key.id}" class="text-sm font-medium text-text-secondary hover:text-text transition-all">Click Sync to load models</button>
                              </div>`;
                    })()}
                    </div>
                  </div>
                `
                    : ""
                }
              </div>
            `;
                    })
                    .join("")
            }
          </div>
        </div>
      `;
    })
    .join("");
}

let modalsBound = false;

function bindModalEvents() {
  if (!container || modalsBound) return;
  const addModal = container.querySelector("#add-key-modal") as HTMLElement;
  const editModal = container.querySelector("#edit-key-modal") as HTMLElement;

  const closeAddBtn = container.querySelector("#close-modal-btn");
  const saveAddBtn = container.querySelector("#save-new-key");
  const modalProviderId = container.querySelector("#modal-provider-id") as HTMLInputElement;
  const modalKeyName = container.querySelector("#modal-key-name") as HTMLInputElement;
  const modalKeyValue = container.querySelector("#modal-key-value") as HTMLInputElement;

  closeAddBtn?.addEventListener("click", () => {
    addModal.classList.add("hidden");
    addModal.classList.remove("flex");
  });

  saveAddBtn?.addEventListener("click", async () => {
    const providerId = modalProviderId.value as AiProviderId;
    const name = modalKeyName.value.trim();
    const value = modalKeyValue.value.trim();

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
    addModal.classList.add("hidden");
    addModal.classList.remove("flex");
    render();
    attachEvents();
    window.dispatchEvent(new Event("settings-updated"));
  });

  const closeEditBtn = container.querySelector("#close-edit-modal-btn");
  const saveEditBtn = container.querySelector("#save-edit-key");
  const editModalKeyId = container.querySelector("#edit-modal-key-id") as HTMLInputElement;
  const editModalKeyName = container.querySelector("#edit-modal-key-name") as HTMLInputElement;

  closeEditBtn?.addEventListener("click", () => {
    editModal.classList.add("hidden");
    editModal.classList.remove("flex");
  });

  saveEditBtn?.addEventListener("click", () => {
    const id = editModalKeyId.value;
    const newName = editModalKeyName.value.trim();

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
      editModal.classList.add("hidden");
      editModal.classList.remove("flex");
      render();
      attachEvents();
      window.dispatchEvent(new Event("settings-updated"));
    }
  });

  modalsBound = true;
}

function attachEvents() {
  if (!container) return;
  const addModal = container.querySelector("#add-key-modal") as HTMLElement;
  const editModal = container.querySelector("#edit-key-modal") as HTMLElement;
  const modalTitle = container.querySelector("#add-key-title")!;
  const modalProviderId = container.querySelector("#modal-provider-id") as HTMLInputElement;
  const modalKeyName = container.querySelector("#modal-key-name") as HTMLInputElement;
  const modalKeyValue = container.querySelector("#modal-key-value") as HTMLInputElement;
  const editModalKeyId = container.querySelector("#edit-modal-key-id") as HTMLInputElement;
  const editModalKeyName = container.querySelector("#edit-modal-key-name") as HTMLInputElement;

  container.querySelectorAll('[data-action="add-key"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const providerId = (e.currentTarget as HTMLElement).dataset.provider as AiProviderId;
      const provider = providerRegistry.getProvider(providerId);
      if (provider) {
        modalTitle.textContent = `Add ${provider.name} Key`;
        modalProviderId.value = provider.id;
        modalKeyName.value = "";
        modalKeyValue.value = "";
        addModal.classList.remove("hidden");
        addModal.classList.add("flex");
      }
    });
  });

  // Active key selection
  container.querySelectorAll('input[type="radio"][data-provider-id]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      const id = (e.target as HTMLInputElement).value;
      const providerId = (e.target as HTMLInputElement).dataset.providerId;
      if (providerId) {
        const settings = db.getSettings();
        settings.activeKeys[providerId] = id;
        db.saveSettings(settings);
        render();
        attachEvents();
        window.dispatchEvent(new Event("settings-updated"));
      }
    });
  });

  // Delete key
  container.querySelectorAll('[data-action="delete-key"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.keyId;
      if (confirm("Delete this key?")) {
        const settings = db.getSettings();
        const keyToDelete = settings.apiKeys.find((k) => k.id === id);
        if (keyToDelete) {
          settings.apiKeys = settings.apiKeys.filter((k) => k.id !== id);
          if (settings.activeKeys[keyToDelete.providerId] === id) {
            const remainingKeys = settings.apiKeys.filter(
              (k) => k.providerId === keyToDelete.providerId,
            );
            if (remainingKeys.length > 0)
              settings.activeKeys[keyToDelete.providerId] = remainingKeys[0].id;
            else delete settings.activeKeys[keyToDelete.providerId];
          }
          db.saveSettings(settings);
        }
        render();
        attachEvents();
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

      const btnEl = e.currentTarget as HTMLElement;
      const originalText = btnEl.textContent;
      btnEl.textContent = "Syncing...";
      btnEl.classList.add("opacity-50", "pointer-events-none");

      try {
        const models = await provider.fetchModels(key.value);
        key.availableModels = models;
        if (key.selectedModels.length === 0) key.selectedModels = [...models];
        db.saveSettings(settings);
        showAlert({ type: "success", message: "Models synced." });
        render();
        attachEvents();
        window.dispatchEvent(new Event("settings-updated"));
      } catch (err: any) {
        showAlert({ type: "error", message: `Sync failed: ${err.message}` });
      } finally {
        btnEl.textContent = originalText;
        btnEl.classList.remove("opacity-50", "pointer-events-none");
      }
    });
  });

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

  // Model Search Filter
  container.querySelectorAll(".model-search-input").forEach((input) => {
    input.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      const searchTerm = target.value.toLowerCase();
      const listId = target.dataset.listId;
      if (listId && container) {
        const list = container.querySelector(`#${listId}`);
        if (list) {
          const labels = list.querySelectorAll("label.model-item");
          labels.forEach((label) => {
            const modelName = label.querySelector("span")?.textContent?.toLowerCase() || "";
            if (modelName.includes(searchTerm)) {
              (label as HTMLElement).style.display = "flex";
            } else {
              (label as HTMLElement).style.display = "none";
            }
          });
        }
      }
    });
  });

  // Select all / Deselect all models
  container.querySelectorAll('[data-action="select-all"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const keyId = (e.currentTarget as HTMLElement).dataset.keyId;
      const settings = db.getSettings();
      const key = settings.apiKeys.find((k) => k.id === keyId);
      if (key && key.availableModels) {
        key.selectedModels = [...key.availableModels];
        db.saveSettings(settings);
        render();
        attachEvents();
        window.dispatchEvent(new Event("settings-updated"));
      }
    });
  });

  container.querySelectorAll('[data-action="deselect-all"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const keyId = (e.currentTarget as HTMLElement).dataset.keyId;
      const settings = db.getSettings();
      const key = settings.apiKeys.find((k) => k.id === keyId);
      if (key) {
        key.selectedModels = [];
        db.saveSettings(settings);
        render();
        attachEvents();
        window.dispatchEvent(new Event("settings-updated"));
      }
    });
  });

  container.querySelectorAll('[data-action="edit-key"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.keyId;
      const currentName = (e.currentTarget as HTMLElement).dataset.keyName;
      if (id && currentName) {
        editModalKeyId.value = id;
        editModalKeyName.value = currentName;
        editModal.classList.remove("hidden");
        editModal.classList.add("flex");
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  render();
  bindModalEvents();
  attachEvents();
});
