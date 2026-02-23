import "../ui/components/app-header";
import { galleryDb, GalleryItem } from "../core/modules/gallery-db/index";
import { showAlert } from "../core/utils/alert";

const container = document.getElementById("gallery-container");

async function loadGallery() {
  if (!container) return;
  const svgs = await galleryDb.getAllSvgs();
  renderGallery(svgs);
  attachEvents(svgs);
}

function renderGallery(svgs: GalleryItem[]) {
  if (!container) return;

  const countDiv = container.querySelector("#gallery-count");
  if (countDiv) countDiv.textContent = `${svgs.length} Artifacts`;

  const gridDiv = container.querySelector("#gallery-grid");
  if (!gridDiv) return;

  let svgGrid = "";
  if (svgs.length === 0) {
    svgGrid = `
      <div class="flex flex-col items-center justify-center py-24 bg-transparent rounded-2xl border border-dashed border-border/50 mt-8">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-12 h-12 text-text-muted mb-4 opacity-50"><line x1="2" x2="22" y1="2" y2="22"/><path d="M10.41 10.41a2 2 0 1 1-2.83-2.83"/><line x1="13.5" x2="6" y1="13.5" y2="21"/><line x1="18" x2="21" y1="12" y2="15"/><path d="M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.05-.22 1.41-.59"/><path d="M21 15V5a2 2 0 0 0-2-2H9"/></svg>
        <p class="text-base text-text-muted">No artifacts generated yet.</p>
      </div>
    `;
  } else {
    svgGrid = `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">`;
    svgs.forEach((item) => {
      svgGrid += `
        <div class="flex flex-col bg-transparent border border-border/50 rounded-xl overflow-hidden hover:border-border transition-all hover:bg-surface-hover/5">
          <div class="flex-1 flex items-center justify-center p-8 relative min-h-[220px]">
              ${item.svg.replace(/<svg\b([^>]*)>/i, '<svg class="max-h-32 w-full" $1>')}
          </div>
          <div class="px-5 py-4 border-t border-border/50 flex flex-col gap-3">
            <p class="text-sm font-medium text-text truncate" title="${item.prompt}">${item.prompt || "Generated Artwork"}</p>
            <div class="flex justify-between items-center">
              <span class="text-xs text-text-muted">${new Date(item.timestamp).toLocaleDateString()}</span>
              <div class="flex gap-1">
                <button data-action="copy-svg" data-id="${item.id}" class="p-1.5 rounded-md text-text-secondary hover:text-text hover:bg-surface-hover transition-all" title="Copy SVG">
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                </button>
                <button data-action="download-svg" data-id="${item.id}" class="p-1.5 rounded-md text-text-secondary hover:text-text hover:bg-surface-hover transition-all" title="Download SVG">
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                </button>
                <button data-action="delete-svg" data-id="${item.id}" class="p-1.5 rounded-md text-text-secondary hover:text-error hover:bg-error/10 transition-all" title="Delete">
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    });
    svgGrid += `</div>`;
  }

  gridDiv.innerHTML = svgGrid;
}

function attachEvents(svgs: GalleryItem[]) {
  if (!container) return;
  container.querySelectorAll('[data-action="copy-svg"]').forEach((button) => {
    button.addEventListener("click", async (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.id;
      const svgItem = svgs.find((s) => s.id === id);
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

  container.querySelectorAll('[data-action="download-svg"]').forEach((button) => {
    button.addEventListener("click", (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.id;
      const svgItem = svgs.find((s) => s.id === id);
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

  container.querySelectorAll('[data-action="delete-svg"]').forEach((button) => {
    button.addEventListener("click", async (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.id;
      if (id && confirm("Are you sure you want to delete this SVG?")) {
        await galleryDb.deleteSvg(id);
        showAlert({ type: "success", message: "SVG deleted from gallery." });
        loadGallery(); // Reload and re-render the gallery
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadGallery();
});
