import { galleryDb, GalleryItem } from "../../core/modules/gallery-db/index";
import { showAlert } from "../../core/utils/alert";
import {
  renderSvgCard,
  renderSvgCardSkeleton,
  attachSvgCardEvents,
} from "../../core/utils/svg-card";
import { APP_EVENTS } from "../../core/constants/events";

export class ResultsGrid extends HTMLElement {
  private currentSvgs: string[] = [];
  private currentPrompt: string = "";
  private currentModel: string = "";
  private isGenerating: boolean = false;

  private handleGenerationStarted = () => {
    this.currentSvgs = [];
    this.currentPrompt = "";
    this.currentModel = "";
    this.isGenerating = true;
    this.render();
  };

  private handleGenerationFinished = () => {
    this.isGenerating = false;
    // Don't render here, rely on SVGEN_RESULTS to populate and render
  };

  private handleSVGenResults = (e: Event) => {
    const customEvent = e as CustomEvent;
    if (customEvent.detail?.svgs) {
      this.currentSvgs = customEvent.detail.svgs;
      this.currentPrompt = customEvent.detail.prompt || "";
      this.currentModel = customEvent.detail.model || "";
      this.isGenerating = false;
      this.render();
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
    window.removeEventListener(APP_EVENTS.SVGEN_RESULTS, this.handleSVGenResults);
  }

  private render() {
    if (this.currentSvgs.length === 0 && !this.isGenerating) {
      this.innerHTML = "";
      this.classList.add("hidden");
      return;
    }

    this.classList.remove("hidden");

    let contentHtml = "";

    if (this.isGenerating) {
      contentHtml = Array.from({ length: 4 })
        .map(() => renderSvgCardSkeleton())
        .join("");
    } else {
      contentHtml = this.currentSvgs
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
    }

    this.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6" id="results-grid-inner">
        ${contentHtml}
      </div>
    `;

    if (!this.isGenerating && this.currentSvgs.length > 0) {
      this.attachSvgEvents();
    }
  }

  private attachEvents() {
    // Listen to global app events
    window.addEventListener(APP_EVENTS.GENERATION_STARTED, this.handleGenerationStarted);
    window.addEventListener(APP_EVENTS.GENERATION_FINISHED, this.handleGenerationFinished);
    window.addEventListener(APP_EVENTS.SVGEN_RESULTS, this.handleSVGenResults);
  }

  private resolveSvgByCardId = (cardId: string): string | undefined => {
    const index = parseInt(cardId.replace("result-", ""), 10);
    return this.currentSvgs[index];
  };

  private attachSvgEvents() {
    attachSvgCardEvents(this, {
      svgResolver: this.resolveSvgByCardId,
      customHandlers: [
        {
          actionId: "save-to-gallery",
          handler: async (cardId: string) => {
            const svgContent = this.resolveSvgByCardId(cardId);

            if (!svgContent) {
              showAlert({ type: "error", message: "No SVG content to save." });
              return;
            }

            const galleryItem: GalleryItem = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              svg: svgContent,
              prompt: this.currentPrompt,
              model: this.currentModel,
              timestamp: Date.now(),
            };

            try {
              await galleryDb.saveSvg(galleryItem);
              showAlert({ type: "success", message: "SVG saved to gallery!" });
            } catch (error: unknown) {
              console.error("Failed to save SVG to gallery:", error);
              showAlert({
                type: "error",
                message: "Failed to save SVG to gallery.",
              });
            }
          },
        },
      ],
    });
  }
}

customElements.define("results-grid", ResultsGrid);
