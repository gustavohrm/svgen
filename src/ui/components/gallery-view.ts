import { db } from "../../core/modules/db/index";
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
      svgGrid = `<p class="text-text-secondary text-center mt-8">Your gallery is empty. Generate some SVGs first!</p>`;
    } else {
      svgGrid = `<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">`;
      this.svgs.forEach((item) => {
        svgGrid += `
          <div class="bg-surface rounded-lg border border-border shadow-sm overflow-hidden flex flex-col">
            <div class="p-4 border-b border-border">
                <p class="text-sm font-medium text-text-primary mb-1">${item.prompt}</p>
                <p class="text-xs text-text-secondary">Generated on: ${new Date(item.timestamp).toLocaleDateString()}</p>
            </div>
            <div class="flex-1 flex items-center justify-center p-4 bg-background">
              <div class="w-full h-32 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-md p-2">
                ${item.svg}
              </div>
            </div>
            <div class="p-4 bg-surface flex justify-end gap-2">
              <button data-action="copy-svg" data-id="${item.id}" class="text-xs bg-primary text-primary-contrast px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity cursor-pointer">
                Copy
              </button>
              <button data-action="download-svg" data-id="${item.id}" class="text-xs bg-accent text-primary-contrast px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity cursor-pointer">
                Download
              </button>
              <button data-action="delete-svg" data-id="${item.id}" class="text-xs bg-red-500 text-primary-contrast px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity cursor-pointer">
                Delete
              </button>
            </div>
          </div>
        `;
      });
      svgGrid += `</div>`;
    }

    this.innerHTML = `
      <div class="bg-surface rounded-xl p-6 border border-border shadow-sm mb-6">
        <h2 class="text-xl font-bold mb-4">SVG Gallery</h2>
        <p class="text-text-secondary text-sm mb-6">Your collection of generated SVG images.</p>
        ${svgGrid}
      </div>
    `;
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
