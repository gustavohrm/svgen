import { appComposition } from "../../core/app/composition-root";

const providerRegistry = appComposition.providerRegistry;
const settingsRepository = appComposition.settingsRepository;

export class ModelDropdown extends HTMLElement {
  public selectedModel = "";
  public providerId = "";

  private handleDocumentClick = (e: Event) => {
    const modelDropdownBtn = this.querySelector("#model-dropdown-btn") as HTMLButtonElement | null;
    const modelDropdownMenu = this.querySelector("#model-dropdown-menu") as HTMLDivElement | null;
    const modelDropdownIcon = this.querySelector("#model-dropdown-icon") as HTMLElement | null;

    if (
      modelDropdownBtn &&
      modelDropdownMenu &&
      !modelDropdownBtn.contains(e.target as Node) &&
      !modelDropdownMenu.contains(e.target as Node)
    ) {
      modelDropdownMenu.classList.add("hidden");
      modelDropdownMenu.classList.remove("flex");
      if (modelDropdownIcon) modelDropdownIcon.style.transform = "rotate(0deg)";
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
    document.removeEventListener("click", this.handleDocumentClick);
  }

  render() {
    const settings = settingsRepository.getSettings();

    // Create custom dropdown options for models, organized by provider
    let modelOptionsHtml = "";
    let firstModel: string | null = null;
    let firstProviderId: string | null = null;

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
            <button data-tab-target="provider-pane-${provider.id}" class="provider-tab w-full text-left px-4 py-3 text-xs font-semibold ${isFirstProvider ? "text-text bg-surface-hover/30" : "text-text-muted hover:text-text hover:bg-surface-hover/50"} transition-all flex items-center justify-between border-b border-border/10 last:border-b-0">
               <div class="flex items-center gap-2 max-w-full overflow-hidden">
                 <img src="${provider.icon}" alt="${provider.name}" class="w-4 h-4 shrink-0 object-contain" />
                 <span class="truncate">${provider.name}</span>
               </div>
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 opacity-50 shrink-0"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          `;

          // Add Provider Pane
          providerPanesHtml += `
            <div id="provider-pane-${provider.id}" class="provider-pane flex-col gap-1 ${isFirstProvider ? "flex" : "hidden"}">
          `;

          for (const model of providerModels) {
            if (!firstModel) {
              firstModel = model;
              firstProviderId = provider.id;
            }
            providerPanesHtml += `
              <button data-model="${model}" data-provider-id="${provider.id}" class="model-option w-full text-left px-3 py-2.5 text-xs font-medium text-text-secondary hover:text-text hover:bg-surface-hover rounded-lg transition-colors flex items-center gap-2">
                <img src="${provider.icon}" alt="${provider.name}" class="w-4 h-4 shrink-0 object-contain opacity-60" />
                <span class="truncate">${model}</span>
              </button>
            `;
          }
          providerPanesHtml += `</div>`;

          isFirstProvider = false;
        }
      }

      if (!providerTabsHtml) {
        modelOptionsHtml = `<div class="p-4 w-75 text-xs text-text-muted text-center">No models enabled in API Keys</div>`;
      } else {
        modelOptionsHtml = `
          <div class="flex flex-col w-125">
            <div class="p-3 border-b border-border bg-background shrink-0">
              <div class="relative w-full">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <input type="text" id="model-dropdown-search" autocomplete="off" placeholder="Search models..." class="w-full bg-surface-hover/30 border border-border/50 rounded-lg pl-9 pr-3 py-2 text-xs text-text placeholder:text-text-muted outline-none focus:border-border-bright transition-all">
              </div>
            </div>
            <div class="flex h-80">
              <!-- Sidebar -->
              <div class="w-45 shrink-0 border-r border-border bg-surface-hover/10 overflow-y-auto custom-scrollbar flex flex-col">
                ${providerTabsHtml}
              </div>
              <!-- Models Area -->
              <div class="flex-1 overflow-y-auto custom-scrollbar p-3 bg-background relative">
                ${providerPanesHtml}
              </div>
            </div>
          </div>
        `;
      }
    } else {
      modelOptionsHtml = `<div class="p-4 w-75 text-xs text-text-muted text-center">Configure an API Key first</div>`;
    }

    // Restore saved model or fall back to first available
    const savedModel = settings.lastSelectedModel;
    const savedProviderId = settings.lastSelectedProviderId;

    // We can confidently assume if we found the model in the available list, it's valid.
    const hasSavedModel = !!savedModel && !!savedProviderId;

    this.selectedModel = hasSavedModel ? savedModel : firstModel || "";
    this.providerId = hasSavedModel ? savedProviderId : firstProviderId || "";

    this.innerHTML = `
      <div class="relative" id="model-dropdown-container">
        <button
          id="model-dropdown-btn"
          class="flex items-center gap-2 bg-transparent hover:bg-surface-hover rounded-lg px-3 py-2 cursor-pointer transition-all"
        >
          <span
            class="text-xs font-semibold text-text max-w-37.5 truncate"
            id="model-dropdown-text"
          >
            ${this.selectedModel ? this.selectedModel : "Select an AI model..."}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="size-4 text-text-muted ml-1 transition-transform"
            id="model-dropdown-icon"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        <div
          id="model-dropdown-menu"
          class="absolute left-0 top-[calc(100%+8px)] bg-background rounded-xl hidden flex-col overflow-hidden transform origin-top-left transition-all z-50 border border-border"
        >
          ${modelOptionsHtml}
        </div>
      </div>
    `;

    // Activate the correct provider tab/pane for the selected model
    if (this.providerId && hasSavedModel) {
      const targetPaneId = `provider-pane-${this.providerId}`;

      this.querySelectorAll(".provider-tab").forEach((t) => {
        const isTarget = (t as HTMLElement).dataset.tabTarget === targetPaneId;
        t.classList.toggle("text-text", isTarget);
        t.classList.toggle("bg-surface-hover/30", isTarget);
        t.classList.toggle("text-text-muted", !isTarget);
      });

      this.querySelectorAll(".provider-pane").forEach((p) => {
        const isTarget = p.id === targetPaneId;
        p.classList.toggle("flex", isTarget);
        p.classList.toggle("hidden", !isTarget);
      });
    }
  }

  attachEvents() {
    const modelDropdownBtn = this.querySelector("#model-dropdown-btn") as HTMLButtonElement | null;
    const modelDropdownMenu = this.querySelector("#model-dropdown-menu") as HTMLDivElement | null;
    const modelDropdownText = this.querySelector("#model-dropdown-text") as HTMLSpanElement | null;
    const modelDropdownIcon = this.querySelector("#model-dropdown-icon") as HTMLElement | null;

    if (!modelDropdownBtn || !modelDropdownMenu) return;

    modelDropdownBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isHidden = modelDropdownMenu.classList.contains("hidden");

      if (isHidden) {
        modelDropdownMenu.classList.remove("hidden");
        modelDropdownMenu.classList.add("flex");
        if (modelDropdownIcon) modelDropdownIcon.style.transform = "rotate(180deg)";

        setTimeout(() => {
          const searchInp = this.querySelector("#model-dropdown-search") as HTMLInputElement | null;
          if (searchInp) searchInp.focus();
        }, 50);
      } else {
        modelDropdownMenu.classList.add("hidden");
        modelDropdownMenu.classList.remove("flex");
        if (modelDropdownIcon) modelDropdownIcon.style.transform = "rotate(0deg)";
      }
    });

    document.addEventListener("click", this.handleDocumentClick);

    this.querySelectorAll(".provider-tab").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        e.stopPropagation(); // keep menu open
        const target = e.currentTarget as HTMLElement;
        const paneId = target.dataset.tabTarget;

        // Reset all tabs
        this.querySelectorAll(".provider-tab").forEach((t) => {
          t.classList.remove("text-text", "bg-surface-hover/30");
          t.classList.add("text-text-muted");
        });

        // Set active tab
        target.classList.add("text-text", "bg-surface-hover/30");
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
          this.selectedModel = model;
          this.providerId = providerId;
          modelDropdownText.textContent = model;

          // Persist selection across sessions
          settingsRepository.saveSettings({
            lastSelectedModel: model,
            lastSelectedProviderId: providerId,
          });

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
}

customElements.define("model-dropdown", ModelDropdown);
