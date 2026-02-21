import { db } from "../../core/modules/db/index";
import { showAlert } from "../../core/utils/alert";

export class SettingsModal extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
    this.attachEvents();
  }

  async fetchModels(provider: "openrouter" | "gcp", apiKey: string): Promise<string[]> {
    try {
      if (provider === "openrouter") {
        const res = await fetch("https://openrouter.ai/api/v1/models");
        if (!res.ok) throw new Error("Failed to fetch OpenRouter models");
        const data = await res.json();
        return data.data.map((m: any) => m.id);
      } else {
        if (!apiKey) return [];
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        );
        if (!res.ok) throw new Error("Failed to fetch GCP models");
        const data = await res.json();
        return data.models.map((m: any) => m.name.replace("models/", ""));
      }
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  render() {
    const settings = db.getSettings();
    const isGcp = settings.selectedProvider === "gcp";

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
                <option value="openrouter" ${!isGcp ? "selected" : ""}>OpenRouter</option>
                <option value="gcp" ${isGcp ? "selected" : ""}>Google Cloud (Gemini)</option>
              </select>
            </div>

            <div id="openrouter-key-group" class="${isGcp ? "hidden" : ""}">
              <label class="block text-sm font-medium mb-1">OpenRouter API Key</label>
              <input type="password" id="openrouter-key" value="${settings.openRouterKey}" class="w-full bg-surface border border-border rounded-lg px-3 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-text placeholder-text-secondary" placeholder="sk-or-v1-..." />
            </div>

            <div id="gcp-key-group" class="${!isGcp ? "hidden" : ""}">
              <label class="block text-sm font-medium mb-1">GCP API Key</label>
              <input type="password" id="gcp-key" value="${settings.gcpKey}" class="w-full bg-surface border border-border rounded-lg px-3 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-text placeholder-text-secondary" placeholder="AIzaSy..." />
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
    const openRouterGroup = this.querySelector("#openrouter-key-group")!;
    const gcpGroup = this.querySelector("#gcp-key-group")!;
    const openRouterKey = this.querySelector("#openrouter-key") as HTMLInputElement;
    const gcpKey = this.querySelector("#gcp-key") as HTMLInputElement;
    const saveBtn = this.querySelector("#save-settings")!;
    const modelLoading = this.querySelector("#model-loading")!;

    const loadDynamicModels = async () => {
      const provider = providerSelect.value as "openrouter" | "gcp";
      const key = provider === "openrouter" ? openRouterKey.value : gcpKey.value;

      modelLoading.classList.remove("hidden");
      modelSelect.disabled = true;

      const models = await this.fetchModels(provider, key);

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
        modelSelect.innerHTML =
          provider === "gcp" && !key
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
      const isGcp = target.value === "gcp";

      if (isGcp) {
        gcpGroup.classList.remove("hidden");
        openRouterGroup.classList.add("hidden");
      } else {
        openRouterGroup.classList.remove("hidden");
        gcpGroup.classList.add("hidden");
      }

      loadDynamicModels();
    });

    // Handle key changes
    let timeout: ReturnType<typeof setTimeout>;
    const onKeyInput = () => {
      clearTimeout(timeout);
      timeout = setTimeout(loadDynamicModels, 500);
    };

    openRouterKey.addEventListener("input", onKeyInput);
    gcpKey.addEventListener("input", onKeyInput);

    saveBtn.addEventListener("click", () => {
      db.saveSettings({
        selectedProvider: providerSelect.value as "openrouter" | "gcp",
        selectedModel: modelSelect.value,
        openRouterKey: openRouterKey.value,
        gcpKey: gcpKey.value,
      });

      showAlert({ type: "success", message: "Settings saved successfully" });
      backdrop.classList.add("hidden");
      backdrop.classList.remove("flex");
      window.dispatchEvent(new Event("settings-updated"));
    });
  }
}

customElements.define("settings-modal", SettingsModal);
