import { galleryDb, GalleryItem } from "../../core/modules/gallery-db/index";
import { showAlert } from "../../core/utils/alert";

export class GalleryView extends HTMLElement {
  private svgs: GalleryItem[] = [];

  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
    this.loadSvgs();
    this.attachEvents();

    window.addEventListener("gallery-opened", () => this.loadSvgs());
  }

  async loadSvgs() {
    this.svgs = await galleryDb.getAllSvgs();
    this.render(); // Re-render to display loaded SVGs
    this.attachEvents(); // Re-attach events for new DOM elements
  }

  render() {
    let svgGrid = "";
    if (this.svgs.length === 0) {
      svgGrid = `
        <div class="flex flex-col items-center justify-center py-24 bg-surface-hover/10 rounded-2xl border border-dashed border-border transition-all">
          <i data-lucide="image-off" class="w-12 h-12 text-text-muted/20 mb-4"></i>
          <p class="text-sm font-medium text-text-muted uppercase tracking-widest">Gallery is currently empty</p>
        </div>
      `;
    } else {
      svgGrid = `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">`;
      this.svgs.forEach((item) => {
        svgGrid += `
          <div class="card group hover:border-primary/40 transition-all duration-300">
            <div class="px-5 py-3 border-b border-border bg-surface-hover/20">
                <p class="text-[10px] font-bold text-text-muted truncate uppercase tracking-wider" title="${item.prompt}">${item.prompt || "Generated Artwork"}</p>
            </div>
            <div class="flex-1 flex items-center justify-center p-8 bg-surface-hover/5 relative min-h-[220px]">
                ${item.svg.replace(/<svg\b([^>]*)>/i, '<svg class="max-h-32 w-full drop-shadow-2xl" $1>')}
            </div>
            <div class="px-5 py-3 bg-surface border-t border-border flex justify-between items-center gap-2">
              <span class="text-[9px] font-bold text-text-muted uppercase tracking-widest">${new Date(item.timestamp).toLocaleDateString()}</span>
              <div class="flex gap-1.5">
                <button data-action="copy-svg" data-id="${item.id}" class="p-2 rounded-lg text-text-secondary hover:text-text hover:bg-surface-hover transition-all" title="Copy SVG">
                   <i data-lucide="copy" class="w-4 h-4"></i>
                </button>
                <button data-action="download-svg" data-id="${item.id}" class="p-2 rounded-lg text-text-secondary hover:text-text hover:bg-surface-hover transition-all" title="Download SVG">
                   <i data-lucide="download" class="w-4 h-4"></i>
                </button>
                <button data-action="delete-svg" data-id="${item.id}" class="p-2 rounded-lg text-text-secondary hover:text-error hover:bg-error/10 transition-all" title="Delete">
                   <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
              </div>
            </div>
          </div>
        `;
      });
      svgGrid += `</div>`;
    }

    this.innerHTML = `
      <div class="max-w-7xl mx-auto py-12 px-6">
        <div class="flex items-center justify-between mb-10">
            <h2 class="text-2xl font-semibold text-text tracking-tight">Gallery</h2>
            <div class="text-[10px] font-bold text-text-muted uppercase tracking-widest">${this.svgs.length} Artifacts</div>
        </div>
        ${svgGrid}
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
    this.querySelectorAll('[data-action="copy-svg"]').forEach((button) => {
      button.addEventListener("click", async (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.id;
        const svgItem = this.svgs.find((s) => s.id === id);
        if (svgItem) {
          try {
            await navigator.clipboard.writeText(svgItem.svg);
            showAlert({ type: "success", message: "SVG copied to clipboard!" });
          } catch (err) {
            showAlert({ type: "error", message: "Failed to copy SVG." });
            console.error("Failed to copy SVG:", err);
          }
        }
      });
    });

    this.querySelectorAll('[data-action="download-svg"]').forEach((button) => {
      button.addEventListener("click", (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.id;
        const svgItem = this.svgs.find((s) => s.id === id);
        if (svgItem) {
          const blob = new Blob([svgItem.svg], { type: "image/svg+xml" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `svgen-gallery-${svgItem.id}.svg`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      });
    });

    this.querySelectorAll('[data-action="delete-svg"]').forEach((button) => {
      button.addEventListener("click", async (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.id;
        if (id && confirm("Are you sure you want to delete this SVG?")) {
          await galleryDb.deleteSvg(id);
          showAlert({ type: "success", message: "SVG deleted from gallery." });
          this.loadSvgs(); // Reload and re-render the gallery
        }
      });
    });
  }
}

customElements.define("gallery-view", GalleryView);
