import { db } from "../../core/modules/db/index";
import { showAlert } from "../../core/utils/alert";
import { providers, getProvider } from "../../core/services/ai/providers/index";

export class SettingsModal extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
    this.attachEvents();
  }

  render() {
    const settings = db.getSettings();
    const providerId = settings.selectedProvider || providers[0]?.id;

    const providerOptions = providers
      .map(
        (p) =>
          `<option value="${p.id}" ${p.id === providerId ? "selected" : ""}>${p.name}</option>`,
      )
      .join("");

    const configGroups = providers
      .map((p) => {
        const isHidden = p.id !== providerId;
        const apiKeyValue = settings.apiKeys?.[p.id] || "";
        return `
        <div id="config-group-${p.id}" class="config-group ${isHidden ? "hidden" : ""}">
          ${p.configFields
            .map(
              (field) => `
            <div class="mb-3">
              <label class="block text-sm font-medium mb-1">${field.label}</label>
              <input type="${field.type}" id="config-${p.id}-${field.id}" value="${field.id === "apiKey" ? apiKeyValue : ""}" data-provider="${p.id}" data-field="${field.id}" class="w-full bg-surface border border-border rounded-lg px-3 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-text placeholder-text-secondary provider-input" placeholder="${field.placeholder}" />
            </div>
          `,
            )
            .join("")}
        </div>
      `;
      })
      .join("");

    this.innerHTML = `
      <div id="settings-backdrop" class="fixed inset-0 bg-neutral-950/50 hidden z-40 items-center justify-center backdrop-blur-sm transition-opacity">
        <div class="bg-background rounded-xl shadow-xl w-full max-w-md p-6 border border-border">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-bold">Settings</h2>
            <button id="close-settings" class="text-text-secondary hover:text-text p-1 cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-1">Provider</label>
              <select id="provider-select" class="w-full bg-surface border border-border rounded-lg px-3 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer text-text">
                ${providerOptions}
              </select>
            </div>

            <div id="dynamic-config-container">
              ${configGroups}
            </div>

            <div>
              <label class="text-sm font-medium mb-1 flex justify-between items-center">
                <span>Model</span>
                <span id="model-loading" class="text-xs text-text-secondary hidden">Loading...</span>
              </label>
              <select id="model-select" class="w-full bg-surface border border-border rounded-lg px-3 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer text-text disabled:opacity-50">
                <option value="${settings.selectedModel}">${settings.selectedModel}</option>
              </select>
            </div>
            
            <button id="save-settings" class="w-full bg-primary text-primary-contrast font-medium py-2 rounded-lg hover:opacity-90 transition-opacity mt-4 cursor-pointer">
              Save Settings
            </button>
          </div>
        </div>
      </div>
    `;
  }

  attachEvents() {
    const backdrop = this.querySelector("#settings-backdrop")!;
    const closeBtn = this.querySelector("#close-settings")!;
    const providerSelect = this.querySelector("#provider-select") as HTMLSelectElement;
    const modelSelect = this.querySelector("#model-select") as HTMLSelectElement;
    const saveBtn = this.querySelector("#save-settings")!;
    const modelLoading = this.querySelector("#model-loading")!;
    const configGroups = this.querySelectorAll(".config-group");
    const providerInputs = this.querySelectorAll(".provider-input");

    const getApiKeyForProvider = (providerId: string) => {
      const input = this.querySelector(`#config-${providerId}-apiKey`) as HTMLInputElement;
      return input ? input.value : "";
    };

    const loadDynamicModels = async () => {
      const providerId = providerSelect.value;
      const key = getApiKeyForProvider(providerId);

      const provider = getProvider(providerId);
      if (!provider) return;

      modelLoading.classList.remove("hidden");
      modelSelect.disabled = true;

      const models = await provider.fetchModels(key);

      modelLoading.classList.add("hidden");
      modelSelect.disabled = false;

      const settings = db.getSettings();
      let selectedModel = settings.selectedModel;

      if (models.length > 0) {
        if (!models.includes(selectedModel)) {
          selectedModel = models[0]; // fallback safely
        }
        modelSelect.innerHTML = models
          .map((m) => `<option value="${m}" ${m === selectedModel ? "selected" : ""}>${m}</option>`)
          .join("");
      } else {
        modelSelect.innerHTML = !key
          ? `<option value="">Requires valid API Key</option>`
          : `<option value="">No models found</option>`;
      }
    };

    window.addEventListener("open-settings", () => {
      backdrop.classList.remove("hidden");
      backdrop.classList.add("flex");
      loadDynamicModels();
    });

    closeBtn.addEventListener("click", () => {
      backdrop.classList.add("hidden");
      backdrop.classList.remove("flex");
    });

    providerSelect.addEventListener("change", (e) => {
      const target = e.target as HTMLSelectElement;
      const providerId = target.value;

      configGroups.forEach((group) => {
        if (group.id === `config-group-${providerId}`) {
          group.classList.remove("hidden");
        } else {
          group.classList.add("hidden");
        }
      });

      loadDynamicModels();
    });

    let timeout: ReturnType<typeof setTimeout>;
    const onKeyInput = () => {
      clearTimeout(timeout);
      timeout = setTimeout(loadDynamicModels, 500);
    };

    providerInputs.forEach((input) => {
      input.addEventListener("input", onKeyInput);
    });

    saveBtn.addEventListener("click", () => {
      const settings = db.getSettings();
      const apiKeys = { ...settings.apiKeys };

      providerInputs.forEach((el) => {
        const input = el as HTMLInputElement;
        const pId = input.dataset.provider;
        const fId = input.dataset.field;
        if (pId && fId === "apiKey") {
          apiKeys[pId] = input.value;
        }
      });

      db.saveSettings({
        selectedProvider: providerSelect.value,
        selectedModel: modelSelect.value,
        apiKeys,
      });

      showAlert({ type: "success", message: "Settings saved successfully" });
      backdrop.classList.add("hidden");
      backdrop.classList.remove("flex");
      window.dispatchEvent(new Event("settings-updated"));
    });
  }
}

customElements.define("settings-modal", SettingsModal);
