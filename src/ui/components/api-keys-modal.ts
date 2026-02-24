import { ApiKeyItem } from "../../core/modules/db/index";
import { showAlert } from "../../core/utils/alert";
import { AiProviderId } from "../../core/types/index";
import "./app-modal";
import { appComposition } from "../../core/app/composition-root";
import { createId } from "../../core/utils/id";
import { renderApiKeysBody, renderApiKeysModalShell } from "./api-keys-modal.template";
import { applyActiveKeySelectionUI, hideModalById, showModalById } from "./api-keys-modal.dom";

const providerRegistry = appComposition.providerRegistry;
const settingsRepository = appComposition.settingsRepository;

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
    this.innerHTML = renderApiKeysModalShell();

    // Only render the body after initial mount
    requestAnimationFrame(() => this.renderBody());
  }

  // Exposed method to open the main keys modal
  public open() {
    this.openModal("keys-modal");
    this.renderBody();
  }

  private openModal(id: string) {
    showModalById(id);
  }

  private closeModal(id: string) {
    hideModalById(id);
  }

  private renderBody() {
    const body = this.querySelector("#keys-modal-body");
    if (!body) return;

    const settings = settingsRepository.getSettings();
    body.innerHTML = renderApiKeysBody(settings, providerRegistry.getAllProviders());
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
          settingsRepository.setActiveKey(providerId as AiProviderId, id);
          applyActiveKeySelectionUI(this, providerId, id);
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
          const settings = settingsRepository.getSettings();
          const keyToDelete = settings.apiKeys.find((k) => k.id === id);
          if (keyToDelete) {
            const apiKeys = settings.apiKeys.filter((k) => k.id !== id);
            const activeKeys = { ...settings.activeKeys };

            if (activeKeys[keyToDelete.providerId] === id) {
              const remaining = apiKeys.filter((k) => k.providerId === keyToDelete.providerId);
              if (remaining.length > 0) {
                activeKeys[keyToDelete.providerId] = remaining[0].id;
              } else {
                delete activeKeys[keyToDelete.providerId];
              }
            }

            settingsRepository.saveSettings({ apiKeys, activeKeys });
          }
          this.renderBody();
        }
        return;
      }

      // Sync models
      if (action === "fetch-models") {
        const keyId = (btn as HTMLElement).dataset.keyId;
        const settings = settingsRepository.getSettings();
        const key = settings.apiKeys.find((k) => k.id === keyId);
        if (!key) return;

        const provider = providerRegistry.getProvider(key.providerId);
        if (!provider) return;

        const btnEl = btn as HTMLButtonElement;
        btnEl.disabled = true;
        btnEl.classList.add("opacity-50", "pointer-events-none", "animate-spin");

        try {
          const models = await provider.fetchModels(key.value);
          const latestSettings = settingsRepository.getSettings();
          const apiKeys = latestSettings.apiKeys.map((entry) => {
            if (entry.id !== key.id) {
              return entry;
            }

            return {
              ...entry,
              availableModels: [...models],
              selectedModels:
                entry.selectedModels.length === 0 ? [...models] : [...entry.selectedModels],
            };
          });

          settingsRepository.saveSettings({
            ...latestSettings,
            apiKeys,
          });
          showAlert({ type: "success", message: "Models synced." });
          this.renderBody();
        } catch (err: unknown) {
          console.error("Failed to sync models:", err);
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

      const settings = settingsRepository.getSettings();
      const newKey: ApiKeyItem = {
        id: createId("key"),
        providerId,
        name,
        value,
        createdAt: Date.now(),
        selectedModels: [],
      };

      settingsRepository.saveSettings({
        apiKeys: [...settings.apiKeys, newKey],
        activeKeys: settings.activeKeys[providerId]
          ? { ...settings.activeKeys }
          : { ...settings.activeKeys, [providerId]: newKey.id },
      });

      showAlert({ type: "success", message: "Key added." });
      this.closeModal("add-key-modal");
      this.renderBody();
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

      const settings = settingsRepository.getSettings();
      const keyExists = settings.apiKeys.some((k) => k.id === id);
      if (keyExists) {
        const apiKeys = settings.apiKeys.map((key) => {
          if (key.id !== id) {
            return key;
          }

          return {
            ...key,
            name: newName,
          };
        });

        settingsRepository.saveSettings({ apiKeys });
        showAlert({ type: "success", message: "Key name updated." });
        this.closeModal("edit-key-modal");
        this.renderBody();
      }
    });
  }
}

customElements.define("api-keys-modal", ApiKeysModal);
