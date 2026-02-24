import { appComposition } from "../../core/app/composition-root";
import { setDropdownOpenState, activateProviderPane } from "./model-dropdown.dom";
import { buildModelOptions } from "./model-dropdown.options";

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
    const { firstModel, firstProviderId, modelOptionsHtml } = buildModelOptions({
      settings,
      providers: providerRegistry.getAllProviders(),
    });

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
      activateProviderPane(this, `provider-pane-${this.providerId}`);
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
        setDropdownOpenState(modelDropdownMenu, modelDropdownIcon, true);
        setTimeout(() => {
          const searchInp = this.querySelector("#model-dropdown-search") as HTMLInputElement | null;
          if (searchInp) searchInp.focus();
        }, 50);
      } else {
        setDropdownOpenState(modelDropdownMenu, modelDropdownIcon, false);
      }
    });

    document.addEventListener("click", this.handleDocumentClick);

    this.querySelectorAll(".provider-tab").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        e.stopPropagation(); // keep menu open
        const target = e.currentTarget as HTMLElement;
        const paneId = target.dataset.tabTarget;
        if (paneId) {
          activateProviderPane(this, paneId);
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
          setDropdownOpenState(modelDropdownMenu, modelDropdownIcon, false);
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
