import { showAlert } from "../../core/utils/alert";
import { galleryDb, GalleryItem } from "../../core/modules/gallery-db/index";

export class ResultsGrid extends HTMLElement {
  private svgs: string[] = [];
  private currentPrompt: string = "";
  private currentModel: string = "";

  constructor() {
    super();
  }

  connectedCallback() {
    this.classList.add("hidden");
    this.render();
    this.attachEvents();
  }

  setResults(svgs: string[], prompt: string, model: string) {
    this.classList.remove("hidden");
    this.svgs = svgs;
    this.currentPrompt = prompt;
    this.currentModel = model;
    this.render();
  }

  render() {
    if (this.svgs.length === 0) {
      return;
    }

    this.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-12 pb-20">
        ${this.svgs
          .map(
            (svgCode, i) => `
          <div class="card group hover:border-primary/30 transition-all duration-300">
            <div class="p-8 bg-surface-hover/10 flex-1 min-h-[280px] flex items-center justify-center relative">
              ${this.sanitizeSvgDisplay(svgCode)}
            </div>
            
            <div class="px-5 py-4 bg-surface border-t border-border flex items-center justify-between gap-3">
              <span class="text-[10px] font-bold text-text-muted uppercase tracking-widest">Variation ${i + 1}</span>
              <div class="flex gap-1">
                <button data-action="copy" data-index="${i}" class="p-2 rounded-lg text-text-secondary hover:text-text hover:bg-surface-hover transition-all cursor-pointer" title="Copy SVG">
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                </button>
                <button data-action="download" data-index="${i}" class="p-2 rounded-lg text-text-secondary hover:text-text hover:bg-surface-hover transition-all cursor-pointer" title="Download SVG">
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-download"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                </button>
                <button data-action="save-to-gallery" data-index="${i}" class="p-2 rounded-lg text-text-secondary hover:text-text hover:bg-surface-hover transition-all cursor-pointer" title="Save to Gallery">
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.54 4.07 3 5.5l7 7Z"/></svg>
                </button>
              </div>
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
    `;

    // Initialize icons
    // @ts-ignore
    if (typeof lucide !== "undefined") {
      // @ts-ignore
      lucide.createIcons();
    }

    this.attachGridEvents();
  }

  // Ensures dangerous SVG payloads are visually somewhat contained,
  // though for real app we might want DOMPurify, here we just enforce dimensions constraints temporarily
  private sanitizeSvgDisplay(rawSvg: string): string {
    return rawSvg.replace(
      /<svg\b([^>]*)>/i,
      '<svg class="w-full h-full max-h-56 drop-shadow-xl" $1>',
    );
  }

  attachEvents() {
    window.addEventListener("svgen-results", (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.svgs) {
        this.setResults(
          customEvent.detail.svgs,
          customEvent.detail.prompt,
          customEvent.detail.model,
        );
      }
    });

    // Also clear results on start
    window.addEventListener("generation-started", () => {
      this.classList.remove("hidden");
      this.svgs = [];
      this.currentPrompt = "";
      this.currentModel = "";

      // Render a loading skeleton
      this.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-12 pb-20">
          ${Array.from({ length: 4 })
            .map(
              () => `
            <div class="card h-[340px] animate-pulse flex flex-col">
              <div class="flex-1 bg-surface-hover/20"></div>
              <div class="p-5 flex items-center justify-between border-t border-border">
                <div class="h-2 w-16 bg-surface-hover/40 rounded-full"></div>
                <div class="flex gap-1">
                  <div class="h-8 w-8 bg-surface-hover/40 rounded-lg"></div>
                  <div class="h-8 w-8 bg-surface-hover/40 rounded-lg"></div>
                  <div class="h-8 w-8 bg-surface-hover/40 rounded-lg"></div>
                </div>
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
      `;
    });
  }

  attachGridEvents() {
    this.querySelectorAll("button[data-action='copy']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = parseInt((btn as HTMLButtonElement).dataset.index || "0");
        const svgContent = this.svgs[index];
        navigator.clipboard
          .writeText(svgContent)
          .then(() => {
            showAlert({ type: "success", message: "SVG copied to clipboard" });
          })
          .catch(() => {
            showAlert({ type: "error", message: "Failed to copy SVG" });
          });
      });
    });

    this.querySelectorAll("button[data-action='download']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = parseInt((btn as HTMLButtonElement).dataset.index || "0");
        const svgContent = this.svgs[index];
        const blob = new Blob([svgContent], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `svgen-result-${Date.now()}-${index + 1}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    });

    this.querySelectorAll("button[data-action='save-to-gallery']").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const index = parseInt((btn as HTMLButtonElement).dataset.index || "0");
        const svgContent = this.svgs[index];

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
        } catch (error) {
          console.error("Failed to save SVG to gallery:", error);
          showAlert({ type: "error", message: "Failed to save SVG to gallery." });
        }
      });
    });
  }
}

customElements.define("results-grid", ResultsGrid);
