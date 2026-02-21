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
    this.render();
    this.attachEvents();
  }

  setResults(svgs: string[], prompt: string, model: string) {
    this.svgs = svgs;
    this.currentPrompt = prompt;
    this.currentModel = model;
    this.render();
  }

  render() {
    if (this.svgs.length === 0) {
      this.innerHTML = `
        <div class="flex flex-col items-center justify-center p-12 text-text-secondary border-2 border-dashed border-border rounded-xl mt-8">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-4 opacity-50"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>
          <p class="text-lg">Your generated SVGs will appear here.</p>
        </div>
      `;
      return;
    }

    this.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
        ${this.svgs
          .map(
            (svgCode, i) => `
          <div class="bg-surface border border-border rounded-xl overflow-hidden flex flex-col group relative">
            <div class="p-6 bg-checkerboard flex-1 min-h-64 flex items-center justify-center relative bg-[#e5e5e5] bg-[linear-gradient(45deg,#ccc_25%,transparent_25%),linear-gradient(-45deg,#ccc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#ccc_75%),linear-gradient(-45deg,transparent_75%,#ccc_75%)] bg-size-[20px_20px] bg-position-[0_0,0_10px,10px_-10px,-10px_0px]">
              ${this.sanitizeSvgDisplay(svgCode)}
            </div>
            
            <div class="p-3 bg-background border-t border-border flex items-center justify-between gap-2">
              <span class="text-xs font-semibold text-text-secondary whitespace-nowrap overflow-hidden text-ellipsis">Result ${i + 1}</span>
              <div class="flex gap-2">
                <button data-action="copy" data-index="${i}" class="p-2 rounded hover:bg-surface text-text-secondary hover:text-text transition-colors cursor-pointer" title="Copy raw SVG">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>
                </button>
                <button data-action="download" data-index="${i}" class="p-2 rounded hover:bg-surface text-text-secondary hover:text-text transition-colors cursor-pointer" title="Download SVG">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line></svg>
                </button>
                <button data-action="save-to-gallery" data-index="${i}" class="p-2 rounded hover:bg-surface text-text-secondary hover:text-text transition-colors cursor-pointer" title="Save to Gallery">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </button>
              </div>
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
    `;

    this.attachGridEvents();
  }

  // Ensures dangerous SVG payloads are visually somewhat contained,
  // though for real app we might want DOMPurify, here we just enforce dimensions constraints temporarily
  private sanitizeSvgDisplay(rawSvg: string): string {
    return rawSvg.replace(
      /<svg\b([^>]*)>/i,
      '<svg class="w-full h-full max-h-48 drop-shadow-md" $1>',
    );
  }

  attachEvents() {
    window.addEventListener("svgen-results", (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.svgs) {
        this.setResults(customEvent.detail.svgs, customEvent.detail.prompt, customEvent.detail.model);
      }
    });

    // Also clear results on start
    window.addEventListener("generation-started", () => {
      this.svgs = [];
      this.currentPrompt = "";
      this.currentModel = "";
      this.render();

      // Render a loading skeleton
      this.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
          ${Array.from({ length: 4 })
            .map(
              () => `
            <div class="bg-surface border border-border rounded-xl h-72 animate-pulse flex items-center justify-center">
              <div class="w-12 h-12 bg-border rounded-full opacity-50"></div>
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
