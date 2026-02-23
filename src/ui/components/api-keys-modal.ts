import { db, ApiKeyItem } from "../../core/modules/db/index";
import { createDefaultProviderRegistry } from "../../core/services/ai/providers/index";
import { showAlert } from "../../core/utils/alert";
import { AiProviderId } from "../../core/types/index";
import { APP_EVENTS } from "../../core/constants/events";
import "./app-modal";

const providerRegistry = createDefaultProviderRegistry();

export class ApiKeysModal extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
    setTimeout(() => {
      this.attachEvents();
    }, 50);
  }

  private render() {
    this.innerHTML = `
      <!-- API Keys Modal -->
      <app-modal
        modal-id="keys-modal"
        title-id="keys-modal-title"
        modal-title="API Keys"
        close-btn-id="close-keys-modal-btn"
      >
        <div
          id="keys-modal-body"
          class="px-4 py-6 space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar"
        >
          <!-- populated dynamically -->
        </div>
      </app-modal>

      <!-- Add Key Modal -->
      <app-modal
        modal-id="add-key-modal"
        title-id="add-key-title"
        modal-title="Add API Key"
        close-btn-id="close-add-key-btn"
      >
        <div class="px-4 py-6 space-y-6">
          <input type="hidden" id="modal-provider-id" />
          <div class="space-y-2">
            <label class="block text-sm font-medium text-text-secondary ml-1">Key Name</label>
            <input
              type="text"
              id="modal-key-name"
              placeholder="e.g. Primary Key"
              class="w-full bg-transparent border border-border/50 rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-muted outline-none focus:border-border transition-all"
            />
          </div>
          <div class="space-y-2">
            <label class="block text-sm font-medium text-text-secondary ml-1">Key Value</label>
            <input
              type="password"
              id="modal-key-value"
              placeholder="sk-••••••••••••••••••••••••"
              class="w-full bg-transparent border border-border/50 rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-muted outline-none focus:border-border transition-all"
            />
          </div>
        </div>
        <div class="p-4 border-t border-border flex justify-end">
          <button
            id="save-new-key"
            class="bg-text text-background px-4 py-2 font-semibold text-sm rounded-lg hover:bg-primary-dark transition-all cursor-pointer"
          >
            Save Configuration
          </button>
        </div>
      </app-modal>

      <!-- Edit Key Name Modal -->
      <app-modal
        modal-id="edit-key-modal"
        title-id="edit-key-title"
        modal-title="Edit API Key Name"
        close-btn-id="close-edit-key-btn"
      >
        <div class="p-4 space-y-6">
          <input type="hidden" id="edit-modal-key-id" />
          <div class="space-y-2">
            <label class="block text-sm font-medium text-text-secondary ml-1">Key Name</label>
            <input
              type="text"
              id="edit-modal-key-name"
              placeholder="e.g. Primary Key"
              class="w-full bg-transparent border border-border/50 rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-muted outline-none focus:border-border transition-all"
            />
          </div>
        </div>
        <div class="p-4 border-t border-border flex justify-end">
          <button
            id="save-edit-key"
            class="bg-text text-background px-4 py-2 font-semibold text-sm rounded-lg hover:bg-primary-dark transition-all cursor-pointer"
          >
            Save Changes
          </button>
        </div>
      </app-modal>
    `;

    // Only render the body after initial mount
    requestAnimationFrame(() => this.renderBody());
  }

  // Exposed method to open the main keys modal
  public open() {
    this.openModal("keys-modal");
    this.renderBody();
  }

  private openModal(id: string) {
    // app-modal defines the ID inside a child div, so querying either "this" or "document" works.
    const modal = document.getElementById(id) as HTMLElement | null;
    if (modal) {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
    }
  }

  private closeModal(id: string) {
    const modal = document.getElementById(id) as HTMLElement | null;
    if (modal) {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }
  }

  private renderBody() {
    const body = this.querySelector("#keys-modal-body");
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
                        <label class="flex-1 flex items-center gap-3 p-2 cursor-pointer rounded-lg transition-all hover:bg-surface">
                          <input type="radio" name="active-key-${provider.id}" value="${key.id}" data-provider-id="${provider.id}" ${isActive ? "checked" : ""} class="w-4 h-4 accent-primary key-radio cursor-pointer" />
                          <div class="flex flex-col min-w-0">
                            <span class="text-sm font-medium ${isActive ? "text-text" : "text-text-secondary"} truncate">${key.name}</span>
                            <span class="text-xs text-text-muted font-mono mt-0.5">${key.value.substring(0, 4)}••••${key.value.substring(key.value.length - 4)}</span>
                          </div>
                        </label>
                        <div class="flex items-center gap-1">
                          <button data-action="edit-key" data-key-id="${key.id}" data-key-name="${key.name}" class="p-2 rounded-lg text-text-secondary hover:text-text hover:bg-surface-hover transition-all opacity-0 group-hover:opacity-100 cursor-pointer" title="Edit Name">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                          </button>
                          <button data-action="delete-key" data-key-id="${key.id}" class="p-2 rounded-lg text-text-secondary hover:text-error hover:bg-error/10 transition-all opacity-0 group-hover:opacity-100 cursor-pointer" title="Delete Key">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                          </button>
                          <button data-action="fetch-models" data-key-id="${key.id}" class="p-2 rounded-lg text-text-secondary hover:text-text hover:bg-surface-hover transition-all cursor-pointer" title="Sync Models">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
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

  private attachEvents() {
    this.attachDynamicEvents();
    this.attachStaticEvents();
  }

  private attachDynamicEvents() {
    this.addEventListener("click", async (e) => {
      const target = e.target as HTMLElement;

      // Active Key Selection (radio buttons)
      if (target.matches("input.key-radio")) {
        const radio = target as HTMLInputElement;
        const id = radio.value;
        const providerId = radio.dataset.providerId;
        if (providerId) {
          const settings = db.getSettings();
          settings.activeKeys[providerId] = id;
          db.saveSettings(settings);
          this.renderBody();
          window.dispatchEvent(new Event(APP_EVENTS.SETTINGS_UPDATED));
        }
        return;
      }

      // Buttons
      const btn = target.closest("button[data-action]");
      if (!btn) return;

      const action = btn.getAttribute("data-action");

      // Add key
      if (action === "add-key") {
        const providerId = (btn as HTMLElement).dataset.provider as AiProviderId;
        const provider = providerRegistry.getProvider(providerId);
        if (provider) {
          const titleEl = this.querySelector("#add-key-title");
          const providerInput = this.querySelector("#modal-provider-id") as HTMLInputElement;
          const nameInput = this.querySelector("#modal-key-name") as HTMLInputElement;
          const valueInput = this.querySelector("#modal-key-value") as HTMLInputElement;

          if (titleEl) titleEl.textContent = `Add ${provider.name} Key`;
          if (providerInput) providerInput.value = provider.id;
          if (nameInput) nameInput.value = "";
          if (valueInput) valueInput.value = "";
          this.openModal("add-key-modal");
        }
        return;
      }

      // Delete keys
      if (action === "delete-key") {
        const id = (btn as HTMLElement).dataset.keyId;
        if (confirm("Delete this key?")) {
          const settings = db.getSettings();
          const keyToDelete = settings.apiKeys.find((k) => k.id === id);
          if (keyToDelete) {
            settings.apiKeys = settings.apiKeys.filter((k) => k.id !== id);
            if (settings.activeKeys[keyToDelete.providerId] === id) {
              const remaining = settings.apiKeys.filter(
                (k) => k.providerId === keyToDelete.providerId,
              );
              if (remaining.length > 0)
                settings.activeKeys[keyToDelete.providerId] = remaining[0].id;
              else delete settings.activeKeys[keyToDelete.providerId];
            }
            db.saveSettings(settings);
          }
          this.renderBody();
          window.dispatchEvent(new Event(APP_EVENTS.SETTINGS_UPDATED));
        }
        return;
      }

      // Sync models
      if (action === "fetch-models") {
        const keyId = (btn as HTMLElement).dataset.keyId;
        const settings = db.getSettings();
        const key = settings.apiKeys.find((k) => k.id === keyId);
        if (!key) return;

        const provider = providerRegistry.getProvider(key.providerId);
        if (!provider) return;

        const btnEl = btn as HTMLButtonElement;
        btnEl.disabled = true;
        btnEl.classList.add("opacity-50", "pointer-events-none", "animate-spin");

        try {
          const models = await provider.fetchModels(key.value);
          key.availableModels = models;
          if (key.selectedModels.length === 0) key.selectedModels = [...models];
          db.saveSettings(settings);
          showAlert({ type: "success", message: "Models synced." });
          this.renderBody();
          window.dispatchEvent(new Event(APP_EVENTS.SETTINGS_UPDATED));
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Unknown error";
          showAlert({ type: "error", message: `Sync failed: ${message}` });
        } finally {
          btnEl.disabled = false;
          btnEl.classList.remove("opacity-50", "pointer-events-none", "animate-spin");
        }
        return;
      }

      // Edit key name
      if (action === "edit-key") {
        const id = (btn as HTMLElement).dataset.keyId;
        const currentName = (btn as HTMLElement).dataset.keyName;
        if (id && currentName) {
          const keyIdInput = this.querySelector("#edit-modal-key-id") as HTMLInputElement;
          const nameInput = this.querySelector("#edit-modal-key-name") as HTMLInputElement;
          if (keyIdInput) keyIdInput.value = id;
          if (nameInput) nameInput.value = currentName;
          this.openModal("edit-key-modal");
        }
        return;
      }
    });
  }

  private attachStaticEvents() {
    // Close modals natively (handled mostly by app-modal but adding specific explicit closes for these nested modals)
    this.querySelector("#close-keys-modal-btn")?.addEventListener("click", () => {
      this.closeModal("keys-modal");
      window.dispatchEvent(new Event(APP_EVENTS.SETTINGS_UPDATED));
    });

    this.querySelector("#close-add-key-btn")?.addEventListener("click", () => {
      this.closeModal("add-key-modal");
    });

    this.querySelector("#close-edit-key-btn")?.addEventListener("click", () => {
      this.closeModal("edit-key-modal");
    });

    // Save New Key
    this.querySelector("#save-new-key")?.addEventListener("click", async () => {
      const providerIdInput = this.querySelector("#modal-provider-id") as HTMLInputElement;
      const nameInput = this.querySelector("#modal-key-name") as HTMLInputElement;
      const valueInput = this.querySelector("#modal-key-value") as HTMLInputElement;

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
      this.closeModal("add-key-modal");
      this.renderBody();
      window.dispatchEvent(new Event(APP_EVENTS.SETTINGS_UPDATED));
    });

    // Save edit key
    this.querySelector("#save-edit-key")?.addEventListener("click", () => {
      const keyIdInput = this.querySelector("#edit-modal-key-id") as HTMLInputElement;
      const nameInput = this.querySelector("#edit-modal-key-name") as HTMLInputElement;

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
        this.closeModal("edit-key-modal");
        this.renderBody();
        window.dispatchEvent(new Event(APP_EVENTS.SETTINGS_UPDATED));
      }
    });
  }
}

customElements.define("api-keys-modal", ApiKeysModal);
