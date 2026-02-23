import "./ui/components/app-header";
import "./ui/components/model-dropdown";
import { ModelDropdown } from "./ui/components/model-dropdown";
import { createAiService } from "./core/services/ai/index";
import { createDefaultProviderRegistry } from "./core/services/ai/providers/index";
import { db } from "./core/modules/db/index";
import { galleryDb, GalleryItem } from "./core/modules/gallery-db/index";
import { showAlert } from "./core/utils/alert";
import { renderSvgCard, renderSvgCardSkeleton, attachSvgCardEvents } from "./core/utils/svg-card";
import { APP_EVENTS } from "./core/constants/events";

// Dependency Injection Setup
const providerRegistry = createDefaultProviderRegistry();
const aiService = createAiService(db, providerRegistry);

/** --- GENERATOR CONTROLS LOGIC --- */
let referenceFiles: File[] = [];
const genContainer = document.getElementById("generator-controls-container");

function renderGenerator() {
  if (!genContainer) return;
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

  // Handled internally by <model-dropdown> now

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

    const selector = document.getElementById("model-selector") as ModelDropdown | null;
    const model = selector?.selectedModel;
    const providerId = selector?.providerId;

    if (!prompt) return;

    const svgsAsText = await Promise.all(referenceFiles.map((file) => file.text()));

    window.dispatchEvent(
      new CustomEvent(APP_EVENTS.START_GENERATION, {
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

  window.addEventListener(APP_EVENTS.START_GENERATION, async (e: Event) => {
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

    window.dispatchEvent(new Event(APP_EVENTS.GENERATION_STARTED));

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
        new CustomEvent(APP_EVENTS.SVGEN_RESULTS, { detail: { svgs: results, prompt, model } }),
      );
      showAlert({ type: "success", message: "SVGs generated successfully" });
    } catch (error: Error | unknown) {
      // Use stricter error type than any
      const errorMessage =
        error instanceof Error ? error.message : "Failed to generate SVG. Please try again.";
      console.error("Generation failed:", error);
      showAlert({
        type: "error",
        message: errorMessage,
      });
      // clear the skeleton
      window.dispatchEvent(new CustomEvent(APP_EVENTS.SVGEN_RESULTS, { detail: { svgs: [] } }));
    } finally {
      window.dispatchEvent(new Event(APP_EVENTS.GENERATION_FINISHED));
    }
  });

  window.addEventListener(APP_EVENTS.SVGEN_RESULTS, (e: Event) => {
    const customEvent = e as CustomEvent;
    if (customEvent.detail?.svgs) {
      currentSvgs = customEvent.detail.svgs;
      currentPrompt = customEvent.detail.prompt || "";
      currentModel = customEvent.detail.model || "";
      renderResults();
    }
  });

  // Also clear results on start
  window.addEventListener(APP_EVENTS.GENERATION_STARTED, () => {
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

  window.addEventListener(APP_EVENTS.GENERATION_FINISHED, () => {
    const generateBtn = genContainer?.querySelector("#generate-btn") as HTMLButtonElement | null;
    if (generateBtn) {
      generateBtn.disabled = false;
      generateBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-up"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
        `;
    }
  });
});
