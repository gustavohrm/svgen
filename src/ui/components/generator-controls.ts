import { db } from "../../core/modules/db/index";

export class GeneratorControls extends HTMLElement {
  private referenceFiles: File[] = [];

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
    const activeKey = settings.apiKeys.find((k) => k.id === settings.activeKeyId);

    // Create options for models
    let modelOptionsStr = `<option disabled selected value="">Select a model...</option>`;
    if (activeKey) {
      if (activeKey.selectedModels && activeKey.selectedModels.length > 0) {
        modelOptionsStr = activeKey.selectedModels
          .map((m) => `<option value="${m}">${m}</option>`)
          .join("");
      } else {
        modelOptionsStr = `<option disabled selected value="">No models enabled in API Keys for ${activeKey.name}</option>`;
      }
    } else {
      modelOptionsStr = `<option disabled selected value="">Configure an API Key first</option>`;
    }

    this.innerHTML = `
      <div class="bg-surface rounded-xl p-6 border border-border shadow-sm mb-6">
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <textarea id="prompt-input" rows="4" class="w-full bg-background border border-border rounded-lg p-4 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-text placeholder-text-secondary resize-none" placeholder="Describe the SVG illustration you want to generate..."></textarea>
          </div>

          <div class="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            
            <div class="flex flex-wrap gap-4 w-full sm:w-auto">
              <div class="flex flex-col gap-1 w-full sm:w-auto">
                <label class="text-xs font-semibold text-text-secondary uppercase">Model</label>
                <div class="flex items-center gap-2">
                  <select id="model-select" class="bg-background border border-border rounded-lg px-3 py-2 text-sm w-48 outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer">
                    ${modelOptionsStr}
                  </select>
                </div>
              </div>

              <div class="flex flex-col gap-1 w-full sm:w-auto">
                <label class="text-xs font-semibold text-text-secondary uppercase">Variations</label>
                <div class="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2">
                  <input type="range" id="variations-slider" min="1" max="4" value="${settings.variations}" class="w-24 cursor-pointer">
                  <span id="variations-display" class="w-4 text-center text-sm font-medium">${settings.variations}</span>
                </div>
              </div>

              <div class="flex flex-col gap-1 w-full sm:w-auto">
                <label class="text-xs font-semibold text-text-secondary uppercase">Reference Files</label>
                <label class="flex items-center justify-center gap-2 bg-background border border-border rounded-lg px-4 py-2 cursor-pointer hover:bg-surface transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                  <span id="file-count" class="text-sm font-medium">Upload SVGs</span>
                  <input type="file" id="reference-input" accept=".svg" multiple class="hidden">
                </label>
              </div>
            </div>

            <button id="generate-btn" class="w-full sm:w-auto bg-primary text-primary-contrast font-medium px-8 py-3 rounded-lg hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-2 shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path><path d="M5 3v4"></path><path d="M19 17v4"></path><path d="M3 5h4"></path><path d="M17 19h4"></path></svg>
              Generate
            </button>
          </div>
          
        </div>
      </div>
    `;
  }

  attachEvents() {
    const promptInput = this.querySelector("#prompt-input") as HTMLTextAreaElement;
    const variationsSlider = this.querySelector("#variations-slider") as HTMLInputElement;
    const variationsDisplay = this.querySelector("#variations-display")!;
    const referenceInput = this.querySelector("#reference-input") as HTMLInputElement;
    const fileCount = this.querySelector("#file-count")!;
    const generateBtn = this.querySelector("#generate-btn") as HTMLButtonElement;
    const modelSelect = this.querySelector("#model-select") as HTMLSelectElement;

    // Update variations db and ui
    variationsSlider?.addEventListener("input", (e) => {
      const val = (e.target as HTMLInputElement).value;
      variationsDisplay.textContent = val;
      db.saveSettings({ variations: parseInt(val) });
    });

    // Handle file uploads
    referenceInput?.addEventListener("change", (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      // Filter out non-svg files explicitly
      this.referenceFiles = files.filter(
        (f) => f.type === "image/svg+xml" || f.name.endsWith(".svg"),
      );
      if (this.referenceFiles.length > 0) {
        fileCount.textContent = `${this.referenceFiles.length} files`;
      } else {
        fileCount.textContent = "Upload SVGs";
      }
    });

    // Handle Generation
    generateBtn?.addEventListener("click", async () => {
      const prompt = promptInput.value.trim();
      const model = modelSelect?.value;
      if (!prompt) return;

      const svgsAsText = await Promise.all(this.referenceFiles.map((file) => file.text()));

      this.dispatchEvent(
        new CustomEvent("start-generation", {
          detail: {
            prompt,
            referenceSvgs: svgsAsText,
            model,
          },
          bubbles: true,
          composed: true,
        }),
      );
    });

    // Loading State handling (listen to external events or parent)
    const onGenStart = () => {
      if (!generateBtn) return;
      generateBtn.disabled = true;
      generateBtn.classList.add("opacity-50", "cursor-not-allowed");
      generateBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-primary-contrast" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        Generating...
      `;
    };

    const onGenFinish = () => {
      if (!generateBtn) return;
      generateBtn.disabled = false;
      generateBtn.classList.remove("opacity-50", "cursor-not-allowed");
      generateBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path><path d="M5 3v4"></path><path d="M19 17v4"></path><path d="M3 5h4"></path><path d="M17 19h4"></path></svg>
        Generate
      `;
    };

    window.removeEventListener("generation-started", onGenStart);
    window.removeEventListener("generation-finished", onGenFinish);

    window.addEventListener("generation-started", onGenStart);
    window.addEventListener("generation-finished", onGenFinish);
  }
}

customElements.define("generator-controls", GeneratorControls);
