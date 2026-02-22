import { db, ApiKeyItem } from "../../core/modules/db/index";
import { createDefaultProviderRegistry } from "../../core/services/ai/providers/index";
import { showAlert } from "../../core/utils/alert";
import { AiProviderId } from "../../core/types/index";

const providerRegistry = createDefaultProviderRegistry();

export class ApiKeysManager extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
    this.attachEvents();
    window.addEventListener("settings-updated", () => {
      this.render();
      this.attachEvents();
    });
  }

  render() {
    const settings = db.getSettings();
    const activeKeys = settings.activeKeys || {};

    this.innerHTML = `
      <div class="max-w-3xl mx-auto py-12 px-6">
        <div class="flex items-center justify-between mb-10">
            <h2 class="text-2xl font-semibold text-text tracking-tight">API Management</h2>
        </div>

        <div class="space-y-8">
          ${providerRegistry
            .getAllProviders()
            .map((provider) => {
              const keys = settings.apiKeys.filter((k) => k.providerId === provider.id);
              return `
                <div class="card">
                  <div class="px-6 py-4 bg-surface-hover/20 border-b border-border flex items-center justify-between">
                    <span class="text-xs font-bold text-text-muted uppercase tracking-widest">${provider.name}</span>
                    <button data-action="add-key" data-provider="${provider.id}" class="text-[10px] font-bold text-primary-light hover:text-primary uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5">
                       <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                      <span>Add Key</span>
                    </button>
                  </div>
                  <div class="p-6 space-y-6">
                    ${
                      keys.length === 0
                        ? `<div class="flex flex-col items-center justify-center py-8 text-center bg-surface-hover/10 rounded-xl border border-dashed border-border">
                             <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-key text-text-muted/30 mb-2"><path d="m21 2-2 2.5-2-2.5"/><path d="M15.5 7.5L14 9l1.5 1.5M10.5 16s1.5 1.5 1.5 3.5c0 2-2 3.5-4 3.5s-4-1.5-4-3.5c0-2 1.5-3.5 1.5-3.5L10.5 16z"/><path d="m10.5 16 3-3"/><path d="m14 9 7-7"/><path d="m16 9 1-1"/></svg>
                             <p class="text-xs text-text-muted">No keys configured for ${provider.name}</p>
                           </div>`
                        : keys
                            .map((key) => {
                              const isActive = key.id === activeKeys[key.providerId];
                              return `
                      <div class="space-y-4">
                        <div class="flex items-center gap-4 group">
                          <label class="flex-1 flex items-center gap-4 cursor-pointer p-4 rounded-xl border ${isActive ? "border-primary/50 bg-primary/5" : "border-border bg-surface-hover/5 hover:bg-surface-hover/10"} transition-all">
                            <input type="radio" name="active-key-${key.providerId}" value="${key.id}" data-provider-id="${key.providerId}" ${isActive ? "checked" : ""} 
                                   class="w-4 h-4 accent-primary" 
                                   onchange="this.dispatchEvent(new CustomEvent('key-selected', { bubbles: true, detail: { id: '${key.id}' } }))">
                            <div class="flex flex-col min-w-0">
                              <span class="text-sm font-semibold ${isActive ? "text-text" : "text-text-secondary"} transition-colors truncate">${key.name}</span>
                              <span class="text-[10px] font-medium text-text-muted font-mono mt-1">${key.value.substring(0, 4)}••••••••${key.value.substring(key.value.length - 4)}</span>
                            </div>
                          </label>
                          <div class="flex items-center gap-2">
                             <button data-action="fetch-models" data-key-id="${key.id}" class="p-2 rounded-lg text-text-secondary hover:text-text hover:bg-surface-hover transition-all" title="Sync Models">
                               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-refresh-cw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
                            </button>
                            <button data-action="delete-key" data-key-id="${key.id}" class="p-2 rounded-lg text-text-secondary hover:text-error hover:bg-error/10 transition-all opacity-0 group-hover:opacity-100">
                               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                            </button>
                          </div>
                        </div>

                        ${
                          isActive
                            ? `
                          <div class="ml-12 p-5 bg-surface-hover/20 rounded-xl border border-border">
                            <div class="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <span class="text-sm font-medium text-text">Available Models</span>
                                <div class="relative w-full sm:max-w-[200px]">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                                  <input type="text" placeholder="Search models..." class="model-search-input w-full bg-background border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-text placeholder:text-text-muted outline-none focus:border-primary-light transition-all" data-list-id="model-list-${key.id}">
                                </div>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" id="model-list-${key.id}">
                            ${(() => {
                              const models = key.availableModels || [];
                              if (models.length > 0) {
                                return models
                                  .map((m) => {
                                    const isChecked = key.selectedModels.includes(m);
                                    return `
                                    <label class="model-item flex items-center gap-3 text-xs font-medium text-text-secondary cursor-pointer hover:text-text transition-colors p-2 rounded-lg hover:bg-surface-hover/30">
                                      <input type="checkbox" data-key-id="${key.id}" value="${m}" ${isChecked ? "checked" : ""} class="accent-primary rounded border-border model-checkbox">
                                      <span class="truncate">${m}</span>
                                    </label>
                                  `;
                                  })
                                  .join("");
                              }
                              return `<div class="col-span-full py-4 text-center">
                                       <button data-action="fetch-models" data-key-id="${key.id}" class="text-sm font-medium text-primary-light hover:text-primary transition-all">Click Sync to load models</button>
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
            .join("")}
        </div>
      </div>

      <!-- Add Key Modal -->
      <div id="add-key-modal" class="fixed inset-0 z-50 items-center justify-center p-4 bg-background/80 hidden backdrop-blur-md transition-all duration-300">
        <div class="bg-surface border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl scale-100">
          <div class="px-8 py-6 border-b border-border flex items-center justify-between">
            <h3 class="text-lg font-semibold text-text" id="add-key-title">Add API Key</h3>
            <button id="close-modal-btn" class="p-2 text-text-secondary hover:text-text transition-all rounded-lg hover:bg-surface-hover">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
          <div class="p-8 space-y-6">
            <input type="hidden" id="modal-provider-id">
            <div class="space-y-2">
              <label class="block text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Key Name</label>
              <input type="text" id="modal-key-name" placeholder="e.g. Primary Key" class="w-full bg-surface-hover/20 border border-border rounded-xl px-4 py-3 text-sm text-text placeholder:text-text-muted focus:border-primary-light outline-none transition-all">
            </div>
            <div class="space-y-2">
              <label class="block text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Key Value</label>
              <input type="password" id="modal-key-value" placeholder="sk-••••••••••••••••••••••••" class="w-full bg-surface-hover/20 border border-border rounded-xl px-4 py-3 text-sm text-text placeholder:text-text-muted focus:border-primary-light outline-none transition-all">
            </div>
          </div>
          <div class="px-8 py-6 bg-surface-hover/20 border-t border-border flex justify-end">
            <button id="save-new-key" class="btn-primary px-8 py-3">
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    `;

    // Initialize icons
    // @ts-ignore
    if (typeof lucide !== "undefined") {
      // @ts-ignore
      lucide.createIcons();
    }
  }

  attachEvents() {
    // Modal controls
    const modal = this.querySelector("#add-key-modal") as HTMLElement;
    const closeBtn = this.querySelector("#close-modal-btn");
    const saveBtn = this.querySelector("#save-new-key");
    const modalTitle = this.querySelector("#add-key-title")!;
    const modalProviderId = this.querySelector("#modal-provider-id") as HTMLInputElement;
    const modalKeyName = this.querySelector("#modal-key-name") as HTMLInputElement;
    const modalKeyValue = this.querySelector("#modal-key-value") as HTMLInputElement;

    this.querySelectorAll('[data-action="add-key"]').forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const providerId = (e.currentTarget as HTMLElement).dataset.provider as AiProviderId;
        const provider = providerRegistry.getProvider(providerId);
        if (provider) {
          modalTitle.textContent = `Add ${provider.name} Key`;
          modalProviderId.value = provider.id;
          modalKeyName.value = "";
          modalKeyValue.value = "";
          modal.classList.remove("hidden");
          modal.classList.add("flex");
        }
      });
    });

    closeBtn?.addEventListener("click", () => {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    });

    saveBtn?.addEventListener("click", async () => {
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
      modal.classList.add("hidden");
      modal.classList.remove("flex");
      this.render();
      this.attachEvents();
      window.dispatchEvent(new Event("settings-updated"));
    });

    // Active key selection
    this.querySelectorAll('input[type="radio"][data-provider-id]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        const id = (e.target as HTMLInputElement).value;
        const providerId = (e.target as HTMLInputElement).dataset.providerId;
        if (providerId) {
          const settings = db.getSettings();
          settings.activeKeys[providerId] = id;
          db.saveSettings(settings);
          this.render();
          this.attachEvents();
          window.dispatchEvent(new Event("settings-updated"));
        }
      });
    });

    // Delete key
    this.querySelectorAll('[data-action="delete-key"]').forEach((btn) => {
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
          this.render();
          this.attachEvents();
          window.dispatchEvent(new Event("settings-updated"));
        }
      });
    });

    // Sync models
    this.querySelectorAll('[data-action="fetch-models"]').forEach((btn) => {
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
          this.render();
          this.attachEvents();
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
    this.querySelectorAll(".model-checkbox").forEach((cb) => {
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
    this.querySelectorAll(".model-search-input").forEach((input) => {
      input.addEventListener("input", (e) => {
        const target = e.target as HTMLInputElement;
        const searchTerm = target.value.toLowerCase();
        const listId = target.dataset.listId;
        if (listId) {
          const list = this.querySelector(`#${listId}`);
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
  }
}

customElements.define("api-keys-manager", ApiKeysManager);
