import "../ui/components/app-header";
import { galleryDb, GalleryItem } from "../core/modules/gallery-db/index";
import { showAlert } from "../core/utils/alert";
import { renderSvgCard, attachSvgCardEvents } from "../core/utils/svg-card";

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
    svgGrid = `<div class="grid grid-cols-1 md:grid-cols-2 gap-6">`;
    svgs.forEach((item) => {
      svgGrid += renderSvgCard({
        svg: item.svg,
        cardId: item.id,
        label: item.prompt || "Generated Artwork",
        sublabel: new Date(item.timestamp).toLocaleDateString(),
        extraActions: [
          {
            id: "delete-svg",
            icon: "trash",
            title: "Delete",
            hoverClass: "hover:text-error hover:bg-error/10",
          },
        ],
      });
    });
    svgGrid += `</div>`;
  }

  gridDiv.innerHTML = svgGrid;
}

function attachEvents(svgs: GalleryItem[]) {
  if (!container) return;

  const svgResolver = (cardId: string): string | undefined => {
    const item = svgs.find((s) => s.id === cardId);
    return item?.svg;
  };

  attachSvgCardEvents(container, svgResolver, [
    {
      actionId: "delete-svg",
      handler: async (cardId: string) => {
        if (confirm("Are you sure you want to delete this SVG?")) {
          await galleryDb.deleteSvg(cardId);
          showAlert({
            type: "success",
            message: "SVG deleted from gallery.",
          });
          loadGallery();
        }
      },
    },
  ]);
}

document.addEventListener("DOMContentLoaded", () => {
  loadGallery();
});
