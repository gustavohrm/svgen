import { db } from "../../core/modules/db/index";
import { createDefaultProviderRegistry } from "../../core/services/ai/providers/index";

const providerRegistry = createDefaultProviderRegistry();

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

    // Create custom dropdown options for models, organized by provider
    let modelOptionsHtml = "";
    let firstModel: string | null = null;
    let firstProviderId: string | null = null;
    let selectedModelHtml = "Select an AI model...";

    let providerTabsHtml = "";
    let providerPanesHtml = "";
    let isFirstProvider = true;

    if (settings.apiKeys.length > 0) {
      const providers = providerRegistry.getAllProviders();

      for (const provider of providers) {
        // Group all models from this provider's configured keys
        const keys = settings.apiKeys.filter((k) => k.providerId === provider.id);
        const providerModels = new Set<string>();

        for (const key of keys) {
          if (key.selectedModels) {
            for (const m of key.selectedModels) {
              providerModels.add(m);
            }
          }
        }

        if (providerModels.size > 0) {
          // Add Provider Tab
          providerTabsHtml += `
            <button data-tab-target="provider-pane-${provider.id}" class="provider-tab w-full text-left px-4 py-3 text-xs font-semibold ${isFirstProvider ? "text-primary-light bg-surface" : "text-text-muted hover:text-text hover:bg-surface-hover/50"} transition-all flex items-center justify-between border-b border-border/10 last:border-b-0">
               <div class="flex items-center gap-2 max-w-full overflow-hidden">
                 <i data-lucide="cloud" class="w-4 h-4 shrink-0"></i>
                 <span class="truncate">${provider.name}</span>
               </div>
               <i data-lucide="chevron-right" class="w-3 h-3 opacity-50 shrink-0"></i>
            </button>
          `;

          // Add Provider Pane
          providerPanesHtml += `
            <div id="provider-pane-${provider.id}" class="provider-pane flex-col gap-1 ${isFirstProvider ? "flex" : "hidden"}">
              <div class="sticky -top-3 -mt-3 -mx-3 px-4 py-2.5 mb-2 bg-surface z-10 text-xs font-semibold text-text-secondary border-b border-border/10">${provider.name} Models</div>
          `;

          for (const model of providerModels) {
            if (!firstModel) {
              firstModel = model;
              firstProviderId = provider.id;
            }
            providerPanesHtml += `
              <button data-model="${model}" data-provider-id="${provider.id}" class="model-option w-full text-left px-3 py-2.5 text-xs font-medium text-text-secondary hover:text-text hover:bg-surface-hover rounded-lg transition-colors flex items-center gap-2">
                 <i data-lucide="sparkles" class="w-3.5 h-3.5 text-text-muted shrink-0"></i>
                 <span class="truncate">${model}</span>
              </button>
            `;
          }
          providerPanesHtml += `</div>`;

          isFirstProvider = false;
        }
      }

      if (!providerTabsHtml) {
        modelOptionsHtml = `<div class="p-4 w-[300px] text-xs text-text-muted text-center">No models enabled in API Keys</div>`;
      } else {
        modelOptionsHtml = `
          <div class="flex flex-col w-[500px]">
            <div class="p-3 border-b border-border/10 bg-surface shrink-0">
              <div class="relative w-full">
                <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"></i>
                <input type="text" id="model-dropdown-search" autocomplete="off" placeholder="Search models..." class="w-full bg-surface-hover/30 border border-border/50 rounded-lg pl-9 pr-3 py-2 text-xs text-text placeholder:text-text-muted outline-none focus:border-primary-light transition-all">
              </div>
            </div>
            <div class="flex h-[320px]">
              <!-- Sidebar -->
              <div class="w-[180px] shrink-0 border-r border-border bg-surface-hover/10 overflow-y-auto custom-scrollbar flex flex-col">
                ${providerTabsHtml}
              </div>
              <!-- Models Area -->
              <div class="flex-1 overflow-y-auto custom-scrollbar p-3 bg-surface relative">
                ${providerPanesHtml}
              </div>
            </div>
          </div>
        `;
      }
    } else {
      modelOptionsHtml = `<div class="p-4 w-[300px] text-xs text-text-muted text-center">Configure an API Key first</div>`;
    }

    // Try to load last selected from settings if we add it, otherwise default to first.
    // For now we don't have it in settings, so we can just let UI store state in a data attribute
    this.innerHTML = `
      <div class="max-w-3xl mx-auto w-full pt-16">
        <div class="bg-surface border border-border/50 rounded-2xl p-2 transition-all duration-300 focus-within:border-primary/30 shadow-2xl relative z-20">
          <textarea id="prompt-input" rows="3" class="w-full bg-transparent px-5 py-4 text-text placeholder-text-muted outline-none resize-none leading-relaxed" placeholder="Describe the SVG you want to generate (e.g., a glowing isometric cube)..."></textarea>
          
          <div class="flex items-center justify-between px-3 pb-2 pt-1 border-t border-border/10">
            <div class="flex items-center gap-4 px-2 pt-2">
              
              <!-- Custom Model Selection Dropdown -->
              <div class="relative" id="model-dropdown-container">
                <button id="model-dropdown-btn" data-selected-model="${firstModel || ""}" data-provider-id="${firstProviderId || ""}" class="flex items-center gap-2 bg-surface-hover/30 hover:bg-surface-hover/50 border border-transparent hover:border-border-bright rounded-full px-4 py-2 cursor-pointer transition-all">
                  <i data-lucide="bot" class="w-4 h-4 text-primary-light"></i>
                  <span class="text-xs font-semibold text-text max-w-[150px] truncate" id="model-dropdown-text">${firstModel ? firstModel : selectedModelHtml}</span>
                  <i data-lucide="chevron-down" class="w-3 h-3 text-text-muted ml-1 transition-transform" id="model-dropdown-icon"></i>
                </button>
                
                <div id="model-dropdown-menu" class="absolute left-0 top-[calc(100%+8px)] bg-surface border border-border rounded-xl shadow-xl hidden flex-col overflow-hidden transform origin-top-left transition-all z-50">
                  ${modelOptionsHtml}
                </div>
              </div>

              <!-- Attach Pill -->
              <div class="flex items-center gap-2">
                <label class="flex items-center gap-2 bg-surface-hover/30 hover:bg-surface-hover/50 border border-transparent hover:border-border-bright rounded-full px-4 py-2 cursor-pointer transition-all group" title="Attach reference SVG">
                  <i data-lucide="paperclip" class="w-4 h-4 text-text-muted group-hover:text-text-secondary"></i>
                  <span class="text-xs font-medium text-text-secondary group-hover:text-text">Attach</span>
                  <input type="file" id="reference-input" accept=".svg" multiple class="hidden">
                </label>
              </div>
            </div>

            <button id="generate-btn" class="bg-primary/20 hover:bg-primary text-primary-light hover:text-white w-10 h-10 mt-2 rounded-xl flex items-center justify-center transition-all scale-100 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed">
               <i data-lucide="arrow-up" class="w-5 h-5"></i>
            </button>
          </div>
        </div>
        <div id="attachments-container" class="flex flex-wrap gap-4 mt-6 empty:hidden"></div>
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
    const promptInput = this.querySelector("#prompt-input") as HTMLTextAreaElement;
    const referenceInput = this.querySelector("#reference-input") as HTMLInputElement;
    const generateBtn = this.querySelector("#generate-btn") as HTMLButtonElement;
    const attachmentsContainer = this.querySelector("#attachments-container") as HTMLDivElement;

    // Custom Dropdown logic
    const modelDropdownBtn = this.querySelector("#model-dropdown-btn") as HTMLButtonElement | null;
    const modelDropdownMenu = this.querySelector("#model-dropdown-menu") as HTMLDivElement | null;
    const modelDropdownText = this.querySelector("#model-dropdown-text") as HTMLSpanElement | null;
    const modelDropdownIcon = this.querySelector("#model-dropdown-icon") as HTMLElement | null;

    if (modelDropdownBtn && modelDropdownMenu) {
      modelDropdownBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isHidden = modelDropdownMenu.classList.contains("hidden");

        if (isHidden) {
          modelDropdownMenu.classList.remove("hidden");
          modelDropdownMenu.classList.add("flex");
          if (modelDropdownIcon) modelDropdownIcon.style.transform = "rotate(180deg)";

          setTimeout(() => {
            const searchInp = this.querySelector(
              "#model-dropdown-search",
            ) as HTMLInputElement | null;
            if (searchInp) searchInp.focus();
          }, 50);
        } else {
          modelDropdownMenu.classList.add("hidden");
          modelDropdownMenu.classList.remove("flex");
          if (modelDropdownIcon) modelDropdownIcon.style.transform = "rotate(0deg)";
        }
      });

      document.addEventListener("click", (e) => {
        if (
          !modelDropdownBtn.contains(e.target as Node) &&
          !modelDropdownMenu.contains(e.target as Node)
        ) {
          modelDropdownMenu.classList.add("hidden");
          modelDropdownMenu.classList.remove("flex");
          if (modelDropdownIcon) modelDropdownIcon.style.transform = "rotate(0deg)";
        }
      });

      this.querySelectorAll(".provider-tab").forEach((tab) => {
        tab.addEventListener("click", (e) => {
          e.stopPropagation(); // keep menu open
          const target = e.currentTarget as HTMLElement;
          const paneId = target.dataset.tabTarget;

          // Reset all tabs
          this.querySelectorAll(".provider-tab").forEach((t) => {
            t.classList.remove("text-primary-light", "bg-surface");
            t.classList.add("text-text-muted");
          });

          // Set active tab
          target.classList.add("text-primary-light", "bg-surface");
          target.classList.remove("text-text-muted");

          // Hide all panes
          this.querySelectorAll(".provider-pane").forEach((p) => {
            p.classList.remove("flex");
            p.classList.add("hidden");
          });

          // Show active pane
          if (paneId) {
            const activePane = this.querySelector(`#${paneId}`);
            if (activePane) {
              activePane.classList.remove("hidden");
              activePane.classList.add("flex");
            }

            // Re-initialize icons inside the pane just in case, or rather they are already initialized globally, but if any new we can handle it
          }
        });
      });

      this.querySelectorAll(".model-option").forEach((option) => {
        option.addEventListener("click", (e) => {
          e.stopPropagation();
          const target = e.currentTarget as HTMLElement;
          const model = target.dataset.model;
          const providerId = target.dataset.providerId;

          if (model && providerId && modelDropdownText) {
            modelDropdownBtn.dataset.selectedModel = model;
            modelDropdownBtn.dataset.providerId = providerId;
            modelDropdownText.textContent = model;

            modelDropdownMenu.classList.add("hidden");
            modelDropdownMenu.classList.remove("flex");
            if (modelDropdownIcon) modelDropdownIcon.style.transform = "rotate(0deg)";
          }
        });
      });

      // Search Filtering
      const searchInput = this.querySelector("#model-dropdown-search") as HTMLInputElement | null;
      if (searchInput) {
        searchInput.addEventListener("input", (e) => {
          const searchTerm = (e.target as HTMLInputElement).value.toLowerCase();
          this.querySelectorAll(".model-option").forEach((opt) => {
            const modelName = opt.querySelector("span")?.textContent?.toLowerCase() || "";
            if (modelName.includes(searchTerm)) {
              (opt as HTMLElement).style.display = "flex";
            } else {
              (opt as HTMLElement).style.display = "none";
            }
          });
        });
      }
    }

    const renderAttachments = async () => {
      attachmentsContainer.innerHTML = "";
      for (let i = 0; i < this.referenceFiles.length; i++) {
        const file = this.referenceFiles[i];
        const text = await file.text();
        const base64 = btoa(unescape(encodeURIComponent(text)));
        const dataUrl = `data:image/svg+xml;base64,${base64}`;

        const div = document.createElement("div");
        div.className =
          "relative group w-20 h-20 rounded-xl border border-border/50 overflow-hidden bg-surface-hover flex items-center justify-center";
        div.innerHTML = `
          <img src="${dataUrl}" class="w-full h-full object-contain p-2" alt="attachment" />
          <button data-index="${i}" class="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
            <i data-lucide="x" class="w-3.5 h-3.5"></i>
          </button>
        `;
        attachmentsContainer.appendChild(div);
      }

      // @ts-ignore
      if (typeof lucide !== "undefined") lucide.createIcons({ root: attachmentsContainer });

      // Add remove events
      attachmentsContainer.querySelectorAll("button[data-index]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const idx = parseInt((e.currentTarget as HTMLButtonElement).dataset.index!);
          this.referenceFiles.splice(idx, 1);
          renderAttachments();

          if (this.referenceFiles.length === 0) {
            referenceInput.value = "";
          }
        });
      });
    };

    // Handle file uploads
    referenceInput?.addEventListener("change", (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      // Filter out non-svg files explicitly
      const newFiles = files.filter(
        (f) => f.type === "image/svg+xml" || f.name.endsWith(".svg") || f.name.endsWith(".SVG"),
      );

      // Append new files
      this.referenceFiles = [...this.referenceFiles, ...newFiles];

      renderAttachments();
    });

    // Handle Generation
    generateBtn?.addEventListener("click", async () => {
      const prompt = promptInput.value.trim();
      const model = modelDropdownBtn?.dataset.selectedModel;
      const providerId = modelDropdownBtn?.dataset.providerId;

      if (!prompt) return;

      const svgsAsText = await Promise.all(this.referenceFiles.map((file) => file.text()));

      this.dispatchEvent(
        new CustomEvent("start-generation", {
          detail: {
            prompt,
            referenceSvgs: svgsAsText,
            model,
            providerId,
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
      generateBtn.innerHTML = `
        <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
      `;
    };

    const onGenFinish = () => {
      if (!generateBtn) return;
      generateBtn.disabled = false;
      generateBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-up"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
      `;
    };

    window.removeEventListener("generation-started", onGenStart);
    window.removeEventListener("generation-finished", onGenFinish);

    window.addEventListener("generation-started", onGenStart);
    window.addEventListener("generation-finished", onGenFinish);
  }
}

customElements.define("generator-controls", GeneratorControls);
