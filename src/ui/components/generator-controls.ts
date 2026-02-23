import { APP_EVENTS } from "../../core/constants/events";
import { ModelDropdown } from "./model-dropdown";

export class GeneratorControls extends HTMLElement {
  private referenceFiles: File[] = [];
  private isGenerating: boolean = false;

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
  }

  private render() {
    this.classList.add("block", "w-full");
    // Preserve existing structure. Render skeleton. Inner dynamic parts handle themselves.
    this.innerHTML = `
      <div id="generator-controls-container" class="max-w-5xl mx-auto w-full py-0">
        <div
          class="bg-transparent border border-border hover:bg-surface-hover/10 rounded-xl p-2 transition-all duration-300 focus-within:border-border-bright relative z-20"
        >
          <textarea
            id="prompt-input"
            rows="3"
            class="w-full bg-transparent px-3 py-4 text-text placeholder-text-muted outline-none resize-none leading-relaxed"
            placeholder="Describe the SVG you want to generate (e.g., a glowing isometric cube)..."
          ></textarea>

          <div class="flex items-center justify-between px-2 pb-2 pt-1">
            <div class="flex items-center gap-4 pt-2">
              <model-dropdown id="model-selector"></model-dropdown>

              <div class="flex items-center gap-2">
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
      const providerId = selector?.providerId;

      if (!prompt) return;

      const svgsAsText = await Promise.all(this.referenceFiles.map((file) => file.text()));

      window.dispatchEvent(
        new CustomEvent(APP_EVENTS.START_GENERATION, {
          detail: { prompt, referenceSvgs: svgsAsText, model, providerId },
        }),
      );
    });

    // Subscribing to global events generated by index.ts Orchestrator
    window.addEventListener(APP_EVENTS.GENERATION_STARTED, this.handleGenerationStarted);
    window.addEventListener(APP_EVENTS.GENERATION_FINISHED, this.handleGenerationFinished);
  }
}

customElements.define("generator-controls", GeneratorControls);
