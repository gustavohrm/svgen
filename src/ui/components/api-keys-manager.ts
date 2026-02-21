import { db, ApiKeyItem } from "../../core/modules/db/index";
import { providers, getProvider } from "../../core/services/ai/providers/index";
import { showAlert } from "../../core/utils/alert";

export class ApiKeysManager extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
    this.attachEvents();
    // Re-render when tab is switched to ensure state is fresh
    window.addEventListener("settings-updated", () => {
      this.render();
      this.attachEvents();
    });
  }

  render() {
    // Capture scroll positions of model lists
    const scrollPositions: { [id: string]: number } = {};
    this.querySelectorAll('[id^="models-list-"]').forEach((el) => {
      scrollPositions[el.id] = el.scrollTop;
    });

    const settings = db.getSettings();
    const activeKeyId = settings.activeKeyId;

    let content = `
      <div class="bg-surface rounded-xl p-6 border border-border shadow-sm mb-6">
        <h2 class="text-xl font-bold mb-4">API Keys Manager</h2>
        <p class="text-text-secondary text-sm mb-6">Add and manage your API keys. Select the active key you want to use for generation.</p>
        
        <div class="space-y-6">
    `;

    // Render each provider
    providers.forEach((provider) => {
      const providerKeys = settings.apiKeys.filter((k) => k.providerId === provider.id);

      content += `
        <div class="border border-border rounded-lg p-4 bg-background">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-semibold text-lg flex items-center gap-2">
              ${provider.name}
            </h3>
            <button data-action="add-key" data-provider="${provider.id}" class="text-sm bg-primary text-primary-contrast px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity flex items-center gap-1 cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Add Key
            </button>
          </div>
      `;

      if (providerKeys.length === 0) {
        content += `<p class="text-sm text-text-secondary italic">No keys added yet.</p>`;
      } else {
        content += `<div class="space-y-3">`;
        providerKeys.forEach((key) => {
          const isActive = key.id === activeKeyId;
          const maskedValue =
            key.value.substring(0, 4) + "..." + key.value.substring(key.value.length - 4);

          content += `
            <div class="border ${isActive ? "border-primary bg-primary/5" : "border-border"} rounded-md p-3 flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <label class="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="active-key" value="${key.id}" ${isActive ? "checked" : ""} class="w-4 h-4 text-primary focus:ring-primary border-border bg-surface cursor-pointer">
                  <div>
                    <div class="font-medium text-sm flex items-center gap-2">
                       ${key.name}
                       ${isActive ? '<span class="text-xs bg-primary text-primary-contrast px-1.5 py-0.5 rounded-full">Active</span>' : ""}
                    </div>
                    <div class="text-xs text-text-secondary font-mono">${maskedValue}</div>
                  </div>
                </label>
                <button data-action="delete-key" data-key-id="${key.id}" class="text-red-500 hover:text-red-600 p-1 cursor-pointer" title="Delete Key">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                </button>
              </div>
              
              <div class="mt-2 pt-2 border-t border-border/50">
                <div class="flex justify-between items-center mb-2">
                   <h4 class="text-xs font-semibold uppercase text-text-secondary">Enabled Models</h4>
                   <div class="flex items-center gap-3">
                     <button data-action="select-all" data-key-id="${key.id}" class="text-xs text-text-secondary hover:text-text cursor-pointer transition-colors" title="Select All Models">
                       Select All
                     </button>
                     <button data-action="deselect-all" data-key-id="${key.id}" class="text-xs text-text-secondary hover:text-text cursor-pointer transition-colors" title="Deselect All Models">
                       Deselect All
                     </button>
                     <button data-action="fetch-models" data-key-id="${key.id}" class="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1">
                       <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 1 0 2.81-6.53L2 9"></path></svg>
                       Refresh Models
                     </button>
                   </div>
                </div>
                
                <div id="models-list-${key.id}" class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  ${(() => {
                    const listToRender =
                      key.availableModels && key.availableModels.length > 0
                        ? key.availableModels
                        : key.selectedModels || [];

                    if (listToRender.length > 0) {
                      return listToRender
                        .map((m) => {
                          const isChecked = key.selectedModels.includes(m);
                          return `
                          <label class="flex items-center gap-2 text-sm cursor-pointer hover:bg-surface/50 p-1.5 rounded truncate">
                            <input type="checkbox" data-key-id="${key.id}" value="${m}" ${isChecked ? "checked" : ""} class="rounded border-border text-primary focus:ring-primary cursor-pointer model-checkbox">
                            <span class="truncate" title="${m}">${m}</span>
                          </label>
                        `;
                        })
                        .join("");
                    } else {
                      return `<div class="text-xs text-text-secondary col-span-full">No models available. Click refresh to load.</div>`;
                    }
                  })()}
                </div>
              </div>
            </div>
          `;
        });
        content += `</div>`;
      }
      content += `</div>`;
    });

    content += `
        </div>
      </div>
      
      <!-- Add Key Modal -->
      <div id="add-key-modal" class="fixed inset-0 bg-neutral-950/50 hidden z-50 items-center justify-center backdrop-blur-sm transition-opacity">
        <div class="bg-background rounded-xl shadow-xl w-full max-w-md p-6 border border-border">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-bold" id="add-key-title">Add API Key</h2>
            <button id="close-modal" class="text-text-secondary hover:text-text p-1 cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          
          <div class="space-y-4">
            <input type="hidden" id="modal-provider-id">
            <div>
              <label class="block text-sm font-medium mb-1">Key Name</label>
              <input type="text" id="modal-key-name" class="w-full bg-surface border border-border rounded-lg px-3 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-text placeholder-text-secondary" placeholder="e.g. My Project Key" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">API Key</label>
              <input type="password" id="modal-key-value" class="w-full bg-surface border border-border rounded-lg px-3 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-text placeholder-text-secondary" placeholder="sk-..." />
            </div>
            
            <button id="save-new-key" class="w-full bg-primary text-primary-contrast font-medium py-2 rounded-lg hover:opacity-90 transition-opacity mt-4 cursor-pointer flex items-center justify-center gap-2">
              Save Key
            </button>
          </div>
        </div>
      </div>
    `;

    this.innerHTML = content;

    // Restore scroll positions
    Object.keys(scrollPositions).forEach((id) => {
      const el = this.querySelector(`#${id}`);
      if (el) {
        el.scrollTop = scrollPositions[id];
      }
    });
  }

  attachEvents() {
    // Active Key selection
    const radioButtons = this.querySelectorAll('input[name="active-key"]');
    radioButtons.forEach((radio) => {
      radio.addEventListener("change", (e) => {
        const target = e.target as HTMLInputElement;
        if (target.checked) {
          db.saveSettings({ activeKeyId: target.value });
          this.render();
          this.attachEvents();
          window.dispatchEvent(new Event("settings-updated")); // Trigger app components
        }
      });
    });

    // Delete Key
    const deleteButtons = this.querySelectorAll('[data-action="delete-key"]');
    deleteButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const target = e.currentTarget as HTMLElement;
        const keyId = target.dataset.keyId;
        if (confirm("Are you sure you want to delete this key?")) {
          const settings = db.getSettings();
          const newKeys = settings.apiKeys.filter((k) => k.id !== keyId);
          let newActiveKeyId = settings.activeKeyId;
          if (newActiveKeyId === keyId) {
            newActiveKeyId = newKeys.length > 0 ? newKeys[0].id : null;
          }
          db.saveSettings({ apiKeys: newKeys, activeKeyId: newActiveKeyId });
          this.render();
          this.attachEvents();
          window.dispatchEvent(new Event("settings-updated"));
        }
      });
    });

    // Model checkboxes
    const modelCheckboxes = this.querySelectorAll(".model-checkbox");
    modelCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        const target = e.target as HTMLInputElement;
        const keyId = target.dataset.keyId;
        const modelValue = target.value;

        const settings = db.getSettings();
        const keyIndex = settings.apiKeys.findIndex((k) => k.id === keyId);
        if (keyIndex !== -1) {
          const key = settings.apiKeys[keyIndex];
          if (target.checked) {
            if (!key.selectedModels.includes(modelValue)) key.selectedModels.push(modelValue);
          } else {
            key.selectedModels = key.selectedModels.filter((m) => m !== modelValue);
          }
          db.saveSettings({ apiKeys: settings.apiKeys });
          window.dispatchEvent(new Event("settings-updated"));
        }
      });
    });

    // Deselect All Models
    const deselectButtons = this.querySelectorAll('[data-action="deselect-all"]');
    deselectButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const target = e.currentTarget as HTMLElement;
        const keyId = target.dataset.keyId;
        const settings = db.getSettings();
        const keyIndex = settings.apiKeys.findIndex((k) => k.id === keyId);

        if (keyIndex !== -1) {
          settings.apiKeys[keyIndex].selectedModels = [];
          db.saveSettings({ apiKeys: settings.apiKeys });
          this.render();
          this.attachEvents();
          window.dispatchEvent(new Event("settings-updated"));
        }
      });
    });

    // Select All Models
    const selectAllButtons = this.querySelectorAll('[data-action="select-all"]');
    selectAllButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const target = e.currentTarget as HTMLElement;
        const keyId = target.dataset.keyId;
        const settings = db.getSettings();
        const keyIndex = settings.apiKeys.findIndex((k) => k.id === keyId);

        if (keyIndex !== -1) {
          const key = settings.apiKeys[keyIndex];
          key.selectedModels = [...(key.availableModels || [])];
          db.saveSettings({ apiKeys: settings.apiKeys });
          this.render();
          this.attachEvents();
          window.dispatchEvent(new Event("settings-updated"));
        }
      });
    });

    // Fetch Models
    const fetchButtons = this.querySelectorAll('[data-action="fetch-models"]');
    fetchButtons.forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const target = e.currentTarget as HTMLElement;
        const keyId = target.dataset.keyId;
        const settings = db.getSettings();
        const keyIndex = settings.apiKeys.findIndex((k) => k.id === keyId);

        if (keyIndex !== -1) {
          const key = settings.apiKeys[keyIndex];
          const provider = getProvider(key.providerId);
          if (provider) {
            // UI feedback
            const originalHtml = target.innerHTML;
            target.innerHTML = `<svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg> Loading...`;
            target.style.pointerEvents = "none";
            target.classList.add("opacity-50");

            try {
              const models = await provider.fetchModels(key.value);
              if (models.length > 0) {
                const isFirstFetch = !key.availableModels || key.availableModels.length === 0;
                key.availableModels = models;

                if (isFirstFetch) {
                  // Select all by default when fresh
                  key.selectedModels = models;
                } else {
                  // Keep only models that still exist in the new list
                  key.selectedModels = key.selectedModels.filter((m) => models.includes(m));
                }

                db.saveSettings({ apiKeys: settings.apiKeys });
                showAlert({
                  type: "success",
                  message: `Fetched ${models.length} models for ${key.name}`,
                });
                this.render();
                this.attachEvents();
                window.dispatchEvent(new Event("settings-updated"));
              } else {
                showAlert({ type: "error", message: "No models found or invalid API key." });
              }
            } catch (err: any) {
              showAlert({ type: "error", message: "Failed to fetch models: " + err.message });
            } finally {
              target.innerHTML = originalHtml;
              target.style.pointerEvents = "auto";
              target.classList.remove("opacity-50");
            }
          }
        }
      });
    });

    // Add Key Modal Logic
    const modal = this.querySelector("#add-key-modal") as HTMLElement;
    const closeModalBtn = this.querySelector("#close-modal") as HTMLButtonElement;
    const saveNewKeyBtn = this.querySelector("#save-new-key") as HTMLButtonElement;
    const addKeyButtons = this.querySelectorAll('[data-action="add-key"]');

    const modalProviderId = this.querySelector("#modal-provider-id") as HTMLInputElement;
    const modalKeyName = this.querySelector("#modal-key-name") as HTMLInputElement;
    const modalKeyValue = this.querySelector("#modal-key-value") as HTMLInputElement;
    const modalTitle = this.querySelector("#add-key-title") as HTMLElement;

    addKeyButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const target = e.currentTarget as HTMLElement;
        const providerId = target.dataset.provider;
        const provider = getProvider(providerId!);
        if (provider) {
          modalTitle.textContent = `Add ${provider.name} Key`;
          modalProviderId.value = provider.id;
          modalKeyName.value = `${provider.name} key`;
          modalKeyValue.value = "";
          modal.classList.remove("hidden");
          modal.classList.add("flex");
        }
      });
    });

    closeModalBtn.addEventListener("click", () => {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    });

    saveNewKeyBtn.addEventListener("click", async () => {
      const pId = modalProviderId.value;
      const name = modalKeyName.value.trim();
      const value = modalKeyValue.value.trim();

      if (!name || !value) {
        showAlert({ type: "error", message: "Name and Key Value are required" });
        return;
      }

      const settings = db.getSettings();
      const newKey: ApiKeyItem = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        providerId: pId,
        name,
        value,
        createdAt: Date.now(),
        selectedModels: [],
      };

      settings.apiKeys.push(newKey);

      // Auto-select if it's the first key
      if (!settings.activeKeyId) {
        settings.activeKeyId = newKey.id;
      }

      db.saveSettings(settings);

      showAlert({ type: "success", message: `Key '${name}' added successfully` });
      modal.classList.add("hidden");
      modal.classList.remove("flex");

      this.render();
      this.attachEvents();
      window.dispatchEvent(new Event("settings-updated"));

      // Auto-trigger fetch models for user convenience
      setTimeout(() => {
        const fetchBtn = this.querySelector(
          `[data-action="fetch-models"][data-key-id="${newKey.id}"]`,
        ) as HTMLElement;
        if (fetchBtn) fetchBtn.click();
      }, 100);
    });
  }
}

customElements.define("api-keys-manager", ApiKeysManager);
