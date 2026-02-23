import "./ui/components/app-header";
import { createAiService } from "./core/services/ai/index";
import { createDefaultProviderRegistry } from "./core/services/ai/providers/index";
import { db } from "./core/modules/db/index";
import { galleryDb, GalleryItem } from "./core/modules/gallery-db/index";
import { showAlert } from "./core/utils/alert";
import { renderSvgCard, renderSvgCardSkeleton, attachSvgCardEvents } from "./core/utils/svg-card";

// Dependency Injection Setup
const providerRegistry = createDefaultProviderRegistry();
const aiService = createAiService(db, providerRegistry);

/** --- GENERATOR CONTROLS LOGIC --- */
let referenceFiles: File[] = [];
const genContainer = document.getElementById("generator-controls-container");

function renderGenerator() {
  if (!genContainer) return;

  const settings = db.getSettings();

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
      modelOptionsHtml = `<div class="p-4 w-[300px] text-xs text-text-muted text-center">No models enabled in API Keys</div>`;
    } else {
      modelOptionsHtml = `
        <div class="flex flex-col w-[500px]">
          <div class="p-3 border-b border-border/10 bg-background shrink-0">
            <div class="relative w-full">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input type="text" id="model-dropdown-search" autocomplete="off" placeholder="Search models..." class="w-full bg-surface-hover/30 border border-border/50 rounded-lg pl-9 pr-3 py-2 text-xs text-text placeholder:text-text-muted outline-none focus:border-border-bright transition-all">
            </div>
          </div>
          <div class="flex h-[320px]">
            <!-- Sidebar -->
            <div class="w-[180px] shrink-0 border-r border-border bg-surface-hover/10 overflow-y-auto custom-scrollbar flex flex-col">
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
    modelOptionsHtml = `<div class="p-4 w-[300px] text-xs text-text-muted text-center">Configure an API Key first</div>`;
  }

  const menu = genContainer.querySelector("#model-dropdown-menu");
  if (menu) {
    menu.innerHTML = modelOptionsHtml;
  }

  // Restore saved model or fall back to first available
  const savedModel = settings.lastSelectedModel;
  const savedProviderId = settings.lastSelectedProviderId;
  const hasSavedModel =
    savedModel &&
    savedProviderId &&
    genContainer.querySelector(
      `.model-option[data-model="${savedModel}"][data-provider-id="${savedProviderId}"]`,
    ) !== null;

  const activeModel = hasSavedModel ? savedModel : firstModel;
  const activeProviderId = hasSavedModel ? savedProviderId : firstProviderId;

  const textBtn = genContainer.querySelector("#model-dropdown-text");
  const modelBtn = genContainer.querySelector("#model-dropdown-btn") as HTMLElement;
  if (textBtn && modelBtn) {
    if (activeModel) {
      textBtn.textContent = activeModel;
      modelBtn.dataset.selectedModel = activeModel;
      modelBtn.dataset.providerId = activeProviderId || "";
    } else {
      textBtn.textContent = "Select an AI model...";
      modelBtn.dataset.selectedModel = "";
      modelBtn.dataset.providerId = "";
    }
  }

  // Activate the correct provider tab/pane for the selected model
  if (activeProviderId && hasSavedModel) {
    const targetPaneId = `provider-pane-${activeProviderId}`;

    genContainer.querySelectorAll(".provider-tab").forEach((t) => {
      const isTarget = (t as HTMLElement).dataset.tabTarget === targetPaneId;
      t.classList.toggle("text-text", isTarget);
      t.classList.toggle("bg-surface-hover/30", isTarget);
      t.classList.toggle("text-text-muted", !isTarget);
    });

    genContainer.querySelectorAll(".provider-pane").forEach((p) => {
      const isTarget = p.id === targetPaneId;
      p.classList.toggle("flex", isTarget);
      p.classList.toggle("hidden", !isTarget);
    });
  }

  attachGeneratorEvents();
}

const renderAttachments = async () => {
  if (!genContainer) return;
  const attachmentsContainer = genContainer.querySelector(
    "#attachments-container",
  ) as HTMLDivElement;
  if (!attachmentsContainer) return;
  attachmentsContainer.innerHTML = "";
  const referenceInput = genContainer.querySelector("#reference-input") as HTMLInputElement;

  for (let i = 0; i < referenceFiles.length; i++) {
    const file = referenceFiles[i];
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
    attachmentsContainer.appendChild(div);
  }

  // Add remove events
  attachmentsContainer.querySelectorAll("button[data-index]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt((e.currentTarget as HTMLButtonElement).dataset.index!);
      referenceFiles.splice(idx, 1);
      renderAttachments();

      if (referenceFiles.length === 0 && referenceInput) {
        referenceInput.value = "";
      }
    });
  });
};

function attachGeneratorEvents() {
  if (!genContainer) return;

  const promptInput = genContainer.querySelector("#prompt-input") as HTMLTextAreaElement;
  const referenceInput = genContainer.querySelector("#reference-input") as HTMLInputElement;
  const generateBtn = genContainer.querySelector("#generate-btn") as HTMLButtonElement;

  // Custom Dropdown logic
  const modelDropdownBtn = genContainer.querySelector(
    "#model-dropdown-btn",
  ) as HTMLButtonElement | null;
  const modelDropdownMenu = genContainer.querySelector(
    "#model-dropdown-menu",
  ) as HTMLDivElement | null;
  const modelDropdownText = genContainer.querySelector(
    "#model-dropdown-text",
  ) as HTMLSpanElement | null;
  const modelDropdownIcon = genContainer.querySelector(
    "#model-dropdown-icon",
  ) as HTMLElement | null;

  if (modelDropdownBtn && modelDropdownMenu) {
    modelDropdownBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isHidden = modelDropdownMenu.classList.contains("hidden");

      if (isHidden) {
        modelDropdownMenu.classList.remove("hidden");
        modelDropdownMenu.classList.add("flex");
        if (modelDropdownIcon) modelDropdownIcon.style.transform = "rotate(180deg)";

        setTimeout(() => {
          const searchInp = genContainer.querySelector(
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

    genContainer.querySelectorAll(".provider-tab").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        e.stopPropagation(); // keep menu open
        const target = e.currentTarget as HTMLElement;
        const paneId = target.dataset.tabTarget;

        // Reset all tabs
        genContainer.querySelectorAll(".provider-tab").forEach((t) => {
          t.classList.remove("text-text", "bg-surface-hover/30");
          t.classList.add("text-text-muted");
        });

        // Set active tab
        target.classList.add("text-text", "bg-surface-hover/30");
        target.classList.remove("text-text-muted");

        // Hide all panes
        genContainer.querySelectorAll(".provider-pane").forEach((p) => {
          p.classList.remove("flex");
          p.classList.add("hidden");
        });

        // Show active pane
        if (paneId) {
          const activePane = genContainer.querySelector(`#${paneId}`);
          if (activePane) {
            activePane.classList.remove("hidden");
            activePane.classList.add("flex");
          }
        }
      });
    });

    genContainer.querySelectorAll(".model-option").forEach((option) => {
      option.addEventListener("click", (e) => {
        e.stopPropagation();
        const target = e.currentTarget as HTMLElement;
        const model = target.dataset.model;
        const providerId = target.dataset.providerId;

        if (model && providerId && modelDropdownText) {
          modelDropdownBtn.dataset.selectedModel = model;
          modelDropdownBtn.dataset.providerId = providerId;
          modelDropdownText.textContent = model;

          // Persist selection across sessions
          db.saveSettings({
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
    const searchInput = genContainer.querySelector(
      "#model-dropdown-search",
    ) as HTMLInputElement | null;
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        const searchTerm = (e.target as HTMLInputElement).value.toLowerCase();
        genContainer.querySelectorAll(".model-option").forEach((opt) => {
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

  // Handle file uploads
  referenceInput?.addEventListener("change", (e) => {
    const files = Array.from((e.target as HTMLInputElement).files || []);
    // Filter out non-svg files explicitly
    const newFiles = files.filter(
      (f) => f.type === "image/svg+xml" || f.name.endsWith(".svg") || f.name.endsWith(".SVG"),
    );

    // Append new files
    referenceFiles = [...referenceFiles, ...newFiles];

    renderAttachments();
  });

  // Handle Generation
  generateBtn?.addEventListener("click", async () => {
    const prompt = promptInput.value.trim();
    const model = modelDropdownBtn?.dataset.selectedModel;
    const providerId = modelDropdownBtn?.dataset.providerId;

    if (!prompt) return;

    const svgsAsText = await Promise.all(referenceFiles.map((file) => file.text()));

    window.dispatchEvent(
      new CustomEvent("start-generation", {
        detail: {
          prompt,
          referenceSvgs: svgsAsText,
          model,
          providerId,
        },
      }),
    );
  });

  // render attachments on re-render
  renderAttachments();
}

/** --- RESULTS GRID LOGIC --- */
const resultsContainer = document.getElementById("results-grid-container");
let currentSvgs: string[] = [];
let currentPrompt: string = "";
let currentModel: string = "";

function renderResults() {
  if (!resultsContainer) return;

  const resultsInner = resultsContainer.querySelector("#results-grid-inner");
  if (!resultsInner) return;

  if (currentSvgs.length === 0) {
    resultsInner.innerHTML = "";
    resultsContainer.classList.add("hidden");
    return;
  }

  resultsContainer.classList.remove("hidden");

  resultsInner.innerHTML = currentSvgs
    .map((svgCode, i) =>
      renderSvgCard({
        svg: svgCode,
        cardId: `result-${i}`,
        label: `Variation ${i + 1}`,
        extraActions: [
          {
            id: "save-to-gallery",
            icon: "heart",
            title: "Save to Gallery",
          },
        ],
      }),
    )
    .join("");

  attachResultsEvents();
}

function renderResultsSkeleton() {
  if (!resultsContainer) return;
  const resultsInner = resultsContainer.querySelector("#results-grid-inner");
  if (!resultsInner) return;

  resultsContainer.classList.remove("hidden");

  resultsInner.innerHTML = Array.from({ length: 4 })
    .map(() => renderSvgCardSkeleton())
    .join("");
}

function resolveSvgByCardId(cardId: string): string | undefined {
  const index = parseInt(cardId.replace("result-", ""), 10);
  return currentSvgs[index];
}

function attachResultsEvents() {
  if (!resultsContainer) return;

  attachSvgCardEvents(resultsContainer, resolveSvgByCardId, [
    {
      actionId: "save-to-gallery",
      handler: async (cardId: string) => {
        const svgContent = resolveSvgByCardId(cardId);

        if (!svgContent) {
          showAlert({ type: "error", message: "No SVG content to save." });
          return;
        }

        const galleryItem: GalleryItem = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          svg: svgContent,
          prompt: currentPrompt,
          model: currentModel,
          timestamp: Date.now(),
        };

        try {
          await galleryDb.saveSvg(galleryItem);
          showAlert({ type: "success", message: "SVG saved to gallery!" });
        } catch (error) {
          console.error("Failed to save SVG to gallery:", error);
          showAlert({
            type: "error",
            message: "Failed to save SVG to gallery.",
          });
        }
      },
    },
  ]);
}

/** --- ORCHESTRATION --- */
document.addEventListener("DOMContentLoaded", () => {
  renderGenerator();

  window.addEventListener("start-generation", async (e: Event) => {
    const customEvent = e as CustomEvent;
    const { prompt, referenceSvgs, model, providerId } = customEvent.detail;

    if (!model || !providerId) {
      showAlert({
        type: "error",
        message: "Please select a model to generate with.",
      });
      return;
    }

    // Check if configuration exists
    const settings = db.getSettings();
    const activeKeyId = settings.activeKeys[providerId];
    const activeKey = settings.apiKeys.find((k) => k.id === activeKeyId);

    if (!activeKey) {
      showAlert({
        type: "error",
        message: `Please configure and select an API key for the chosen provider in the API Keys tab.`,
      });
      window.location.href = "/settings/";
      return;
    }

    const provider = providerRegistry.getProvider(providerId);

    if (!provider) {
      showAlert({
        type: "error",
        message: `Provider ${providerId} not found`,
      });
      return;
    }

    window.dispatchEvent(new Event("generation-started"));

    try {
      const results = await aiService.generateMultiple(
        {
          prompt,
          referenceSvgs,
          model,
          providerId,
        },
        4, // Fixed at 4 variations
      );

      window.dispatchEvent(
        new CustomEvent("svgen-results", { detail: { svgs: results, prompt, model } }),
      );
      showAlert({ type: "success", message: "SVGs generated successfully" });
    } catch (error: any) {
      console.error("Generation failed:", error);
      showAlert({
        type: "error",
        message: error.message || "Failed to generate SVG. Please try again.",
      });
      // clear the skeleton
      window.dispatchEvent(new CustomEvent("svgen-results", { detail: { svgs: [] } }));
    } finally {
      window.dispatchEvent(new Event("generation-finished"));
    }
  });

  window.addEventListener("svgen-results", (e: Event) => {
    const customEvent = e as CustomEvent;
    if (customEvent.detail?.svgs) {
      currentSvgs = customEvent.detail.svgs;
      currentPrompt = customEvent.detail.prompt || "";
      currentModel = customEvent.detail.model || "";
      renderResults();
    }
  });

  // Also clear results on start
  window.addEventListener("generation-started", () => {
    currentSvgs = [];
    currentPrompt = "";
    currentModel = "";

    const generateBtn = genContainer?.querySelector("#generate-btn") as HTMLButtonElement | null;
    if (generateBtn) {
      generateBtn.disabled = true;
      generateBtn.innerHTML = `
          <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        `;
    }

    renderResultsSkeleton();
  });

  window.addEventListener("generation-finished", () => {
    const generateBtn = genContainer?.querySelector("#generate-btn") as HTMLButtonElement | null;
    if (generateBtn) {
      generateBtn.disabled = false;
      generateBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-up"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
        `;
    }
  });
});
