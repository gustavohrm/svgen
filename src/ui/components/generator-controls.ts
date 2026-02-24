import { APP_EVENTS } from "../../core/constants/events";
import { emitAppEvent } from "../../core/events/app-events";
import type { AiProviderId } from "../../core/types";
import { ModelDropdown } from "./model-dropdown";
import { DEFAULT_SYSTEM_PROMPT } from "../../core/services/ai/index";
import { appComposition } from "../../core/app/composition-root";

const settingsRepository = appComposition.settingsRepository;

export class GeneratorControls extends HTMLElement {
  private referenceFiles: File[] = [];
  private isGenerating: boolean = false;

  private handleDocumentClick = (e: Event) => {
    const settingsBtn = this.querySelector("#settings-btn") as HTMLButtonElement | null;
    const settingsMenu = this.querySelector("#settings-menu") as HTMLDivElement | null;

    if (
      settingsBtn &&
      settingsMenu &&
      !settingsBtn.contains(e.target as Node) &&
      !settingsMenu.contains(e.target as Node)
    ) {
      settingsMenu.classList.add("hidden");
    }
  };

  private handleGenerationStarted = () => {
    this.isGenerating = true;
    const generateBtn = this.querySelector("#generate-btn") as HTMLButtonElement | null;
    if (generateBtn) {
      generateBtn.disabled = true;
      generateBtn.innerHTML = `
                <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            `;
    }
  };

  private handleGenerationFinished = () => {
    this.isGenerating = false;
    const generateBtn = this.querySelector("#generate-btn") as HTMLButtonElement | null;
    if (generateBtn) {
      generateBtn.disabled = false;
      generateBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-up"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
            `;
    }
  };

  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
    this.attachEvents();
  }

  disconnectedCallback() {
    window.removeEventListener(APP_EVENTS.GENERATION_STARTED, this.handleGenerationStarted);
    window.removeEventListener(APP_EVENTS.GENERATION_FINISHED, this.handleGenerationFinished);
    document.removeEventListener("click", this.handleDocumentClick);
  }

  private render() {
    this.classList.add("block", "w-full");
    // Preserve existing structure. Render skeleton. Inner dynamic parts handle themselves.
    this.innerHTML = `
      <div id="generator-controls-container" class="max-w-5xl mx-auto w-full py-0">
        <div
          class="bg-surface border border-transparent rounded-xl p-4 transition-all duration-400 focus-within:border-border relative z-20"
        >
          <textarea
            id="prompt-input"
            rows="3"
            class="w-full bg-transparent text-text placeholder-text-muted outline-none resize-none leading-relaxed"
            placeholder="Describe the SVG you want to generate (e.g., a glowing isometric cube)..."
          ></textarea>

          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4 pt-2">
              <model-dropdown id="model-selector"></model-dropdown>

              <label
                class="cursor-pointer"
                title="Attach reference SVG"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="w-4 h-4 text-text-secondary hover:text-text transition duration-400"
                >
                  <path
                    d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"
                  />
                </svg>
                <input type="file" id="reference-input" accept=".svg" multiple class="hidden" />
              </label>

              <div class="relative flex items-center" id="settings-container">
                <button
                  id="settings-btn"
                  class="cursor-pointer text-text-secondary hover:text-text transition duration-400 flex items-center"
                  title="Settings"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="size-4"
                  >
                    <path d="M14 17H5"/><path d="M19 7h-9"/>
                    <circle cx="17" cy="17" r="3"/>
                    <circle cx="7" cy="7" r="3"/>
                  </svg>
                </button>
                <div
                  id="settings-menu"
                  class="absolute left-1/2 -top-4 -translate-x-1/2 -translate-y-full bg-surface border border-border rounded-xl hidden flex-col gap-3 p-3 shadow-2xl z-50 min-w-3xs duration-200"
                >
                  <div class="flex items-center justify-between gap-3">
                    <label class="text-sm font-medium text-text-secondary whitespace-nowrap" for="variation-input">Variations</label>
                    <input
                      type="number"
                      id="variation-input"
                      min="1"
                      max="4"
                      value="${settingsRepository.getSettings().variations}"
                      class="bg-background rounded-lg px-2 py-1.5 text-xs text-text outline-none focus:border-border-bright transition-all w-14 font-medium"
                    />
                  </div>

                  <div class="flex items-center justify-between gap-3">
                    <label class="text-sm font-medium text-text-secondary whitespace-nowrap" for="temperature-input">Temperature</label>
                    <input
                      type="number"
                      id="temperature-input"
                      min="0"
                      max="2"
                      step="0.1"
                      value="${settingsRepository.getSettings().temperature.toFixed(1)}"
                      class="bg-background rounded-lg px-2 py-1.5 text-xs text-text outline-none focus:border-border-bright transition-all w-14 font-medium"
                    />
                  </div>

                  <div class="flex items-center justify-between gap-3">
                    <span class="text-sm font-medium text-text-secondary">System prompt</span>
                    <button
                      id="edit-system-prompt-btn"
                      type="button"
                      class="text-xs text-text-secondary hover:text-text transition cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              id="generate-btn"
              class="bg-surface-hover hover:bg-text text-text hover:text-background w-10 h-10 mt-2 rounded-lg flex items-center justify-center transition-all scale-100 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="w-5 h-5"
              >
                <path d="m5 12 7-7 7 7" />
                <path d="M12 19V5" />
              </svg>
            </button>
          </div>
        </div>
        <div id="attachments-container" class="flex flex-wrap gap-4 mt-6 empty:hidden"></div>
      </div>

      <div
        id="system-prompt-modal"
        class="fixed inset-0 z-50 hidden items-center justify-center p-4 bg-background/80 backdrop-blur-md"
      >
        <div class="bg-background border border-border rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col">
          <div class="p-4 border-b border-border flex items-center justify-between">
            <h3 class="text-base font-semibold">System Prompt</h3>
            <button
              id="close-system-prompt-modal-btn"
              type="button"
              class="p-1 rounded-lg hover:bg-surface-hover cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
          <div class="p-4">
            <textarea
              id="system-prompt-modal-input"
              rows="12"
              class="w-full bg-transparent border border-border rounded-xl px-3 py-2.5 text-sm text-text outline-none resize-y leading-relaxed"
            ></textarea>
          </div>
          <div class="p-4 border-t border-border flex items-center justify-end gap-2">
            <button
              id="cancel-system-prompt-btn"
              type="button"
              class="px-3 py-1.5 text-sm text-text-secondary hover:text-text transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-system-prompt-btn"
              type="button"
              class="px-3 py-1.5 text-sm bg-surface-hover hover:bg-text text-text hover:text-background rounded-lg transition cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    `;

    // Delay attach until element is painted
    requestAnimationFrame(() => this.renderAttachments());
  }

  private async renderAttachments() {
    const container = this.querySelector("#attachments-container") as HTMLDivElement;
    if (!container) return;

    container.innerHTML = "";

    for (let i = 0; i < this.referenceFiles.length; i++) {
      const file = this.referenceFiles[i];
      const text = await file.text();
      const base64 = btoa(unescape(encodeURIComponent(text)));
      const dataUrl = `data:image/svg+xml;base64,${base64}`;

      const div = document.createElement("div");
      div.className =
        "relative group w-20 h-20 rounded-xl border border-border/50 overflow-hidden bg-transparent flex items-center justify-center";
      div.innerHTML = `
            <img src="${dataUrl}" class="w-full h-full object-contain p-2" alt="attachment" />
            <button data-index="${i}" class="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
        `;
      container.appendChild(div);
    }
  }

  private attachEvents() {
    // Component level events
    const referenceInput = this.querySelector("#reference-input") as HTMLInputElement;
    const attachmentsContainer = this.querySelector("#attachments-container") as HTMLDivElement;
    const settingsBtn = this.querySelector("#settings-btn") as HTMLButtonElement;
    const settingsMenu = this.querySelector("#settings-menu") as HTMLDivElement;
    const variationInput = this.querySelector("#variation-input") as HTMLInputElement;
    const temperatureInput = this.querySelector("#temperature-input") as HTMLInputElement;
    const editSystemPromptBtn = this.querySelector("#edit-system-prompt-btn") as HTMLButtonElement;
    const systemPromptModal = this.querySelector("#system-prompt-modal") as HTMLDivElement;
    const systemPromptModalInput = this.querySelector(
      "#system-prompt-modal-input",
    ) as HTMLTextAreaElement;
    const closeSystemPromptModalBtn = this.querySelector(
      "#close-system-prompt-modal-btn",
    ) as HTMLButtonElement;
    const cancelSystemPromptBtn = this.querySelector(
      "#cancel-system-prompt-btn",
    ) as HTMLButtonElement;
    const saveSystemPromptBtn = this.querySelector("#save-system-prompt-btn") as HTMLButtonElement;

    const closeSystemPromptModal = () => {
      systemPromptModal?.classList.add("hidden");
      systemPromptModal?.classList.remove("flex");
    };

    settingsBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      const isHidden = settingsMenu?.classList.contains("hidden");
      if (isHidden) {
        settingsMenu?.classList.remove("hidden");
        settingsMenu?.classList.add("flex");
      } else {
        settingsMenu?.classList.add("hidden");
        settingsMenu?.classList.remove("flex");
      }
    });

    variationInput?.addEventListener("input", (e) => {
      let val = parseInt((e.target as HTMLInputElement).value);
      if (isNaN(val)) return;
      if (val < 1) val = 1;
      if (val > 4) val = 4;
      settingsRepository.saveSettings({ variations: val });
    });

    variationInput?.addEventListener("blur", (e) => {
      let val = parseInt((e.target as HTMLInputElement).value);
      if (isNaN(val) || val < 1) val = 1;
      if (val > 4) val = 4;
      (e.target as HTMLInputElement).value = val.toString();
      settingsRepository.saveSettings({ variations: val });
    });

    const clampTemperature = (value: number): number => {
      if (value < 0) return 0;
      if (value > 2) return 2;
      return Math.round(value * 10) / 10;
    };

    temperatureInput?.addEventListener("input", (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      if (isNaN(value)) return;
      settingsRepository.saveSettings({ temperature: clampTemperature(value) });
    });

    temperatureInput?.addEventListener("blur", (e) => {
      const target = e.target as HTMLInputElement;
      const value = parseFloat(target.value);
      const normalized = isNaN(value) ? 0.7 : clampTemperature(value);
      target.value = normalized.toFixed(1);
      settingsRepository.saveSettings({ temperature: normalized });
    });

    editSystemPromptBtn?.addEventListener("click", () => {
      if (!systemPromptModal || !systemPromptModalInput) return;

      const savedPrompt = settingsRepository.getSettings().systemPrompt?.trim();
      systemPromptModalInput.value = savedPrompt || DEFAULT_SYSTEM_PROMPT;

      settingsMenu?.classList.add("hidden");
      settingsMenu?.classList.remove("flex");

      systemPromptModal.classList.remove("hidden");
      systemPromptModal.classList.add("flex");
      requestAnimationFrame(() => systemPromptModalInput.focus());
    });

    closeSystemPromptModalBtn?.addEventListener("click", closeSystemPromptModal);
    cancelSystemPromptBtn?.addEventListener("click", closeSystemPromptModal);

    saveSystemPromptBtn?.addEventListener("click", () => {
      if (!systemPromptModalInput) return;

      const value = systemPromptModalInput.value.trim();
      const normalizedDefault = DEFAULT_SYSTEM_PROMPT.trim();
      settingsRepository.saveSettings({ systemPrompt: value === normalizedDefault ? "" : value });
      closeSystemPromptModal();
    });

    systemPromptModal?.addEventListener("click", (e) => {
      if (e.target === systemPromptModal) {
        closeSystemPromptModal();
      }
    });

    document.addEventListener("click", this.handleDocumentClick);

    // File uploads
    referenceInput?.addEventListener("change", (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      const newFiles = files.filter(
        (f) => f.type === "image/svg+xml" || f.name.endsWith(".svg") || f.name.endsWith(".SVG"),
      );
      this.referenceFiles = [...this.referenceFiles, ...newFiles];
      this.renderAttachments();
    });

    // Remove file (Event delegation for attachments)
    attachmentsContainer?.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest("button[data-index]");
      if (!btn) return;

      const idx = parseInt(btn.getAttribute("data-index")!);
      this.referenceFiles.splice(idx, 1);
      this.renderAttachments();

      if (this.referenceFiles.length === 0 && referenceInput) {
        referenceInput.value = "";
      }
    });

    // Generation Submit
    this.addEventListener("click", async (e) => {
      const btn = (e.target as HTMLElement).closest("#generate-btn");
      if (!btn) return;

      const promptInput = this.querySelector("#prompt-input") as HTMLTextAreaElement | null;
      if (!promptInput || this.isGenerating) return;

      const prompt = promptInput.value.trim();
      const selector = this.querySelector("#model-selector") as ModelDropdown | null;
      const model = selector?.selectedModel;
      const providerId = (selector?.providerId || undefined) as AiProviderId | undefined;

      if (!prompt) return;

      const svgsAsText = await Promise.all(this.referenceFiles.map((file) => file.text()));
      const variations = settingsRepository.getSettings().variations || 1;

      emitAppEvent(APP_EVENTS.START_GENERATION, {
        prompt,
        referenceSvgs: svgsAsText,
        model,
        providerId,
        variations,
      });
    });

    // Subscribing to global events generated by index.ts Orchestrator
    window.addEventListener(APP_EVENTS.GENERATION_STARTED, this.handleGenerationStarted);
    window.addEventListener(APP_EVENTS.GENERATION_FINISHED, this.handleGenerationFinished);
  }
}

customElements.define("generator-controls", GeneratorControls);
