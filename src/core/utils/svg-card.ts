import { showAlert } from "./alert";

// --- Lucide icon SVG strings (inlined to avoid external deps) ---
const ICONS = {
  copy: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
  download: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`,
  heart: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.54 4.07 3 5.5l7 7Z"/></svg>`,
  trash: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`,
} as const;

// --- Types ---

interface CardAction {
  id: string;
  icon: keyof typeof ICONS;
  title: string;
  /** Custom hover classes, defaults to standard hover */
  hoverClass?: string;
}

interface SvgCardOptions {
  /** Raw SVG markup */
  svg: string;
  /** Unique identifier for the card (used in data attributes) */
  cardId: string;
  /** Primary label shown on the footer (e.g. "Variation 1") */
  label: string;
  /** Optional secondary label (e.g. date, model name) */
  sublabel?: string;
  /** Extra actions beyond copy & download */
  extraActions?: CardAction[];
  /** Whether to include the built-in copy action (default: true) */
  hasCopy?: boolean;
  /** Whether to include the built-in download action (default: true) */
  hasDownload?: boolean;
}

interface SvgCardActionHandler {
  actionId: string;
  handler: (cardId: string) => void;
}

// --- Helpers ---

/**
 * Injects sizing classes into raw SVG markup so it scales
 * properly inside the card preview area.
 */
export function sanitizeSvgForDisplay(rawSvg: string): string {
  return rawSvg.replace(
    /<svg\b([^>]*)>/i,
    '<svg class="w-full h-full max-h-56 drop-shadow-xl" $1>',
  );
}

function buildActionButton(action: CardAction, cardId: string): string {
  const hoverClass = action.hoverClass ?? "hover:text-text hover:bg-surface-hover";

  return `
    <button
      data-action="${action.id}"
      data-card-id="${cardId}"
      class="p-2 rounded-lg text-text-secondary ${hoverClass} transition-all cursor-pointer"
      title="${action.title}"
    >
      ${ICONS[action.icon]}
    </button>
  `;
}

// --- Public API ---

/**
 * Renders the HTML for a single SVG card.
 * Follows the unified dark-mode design language across the app.
 */
export function renderSvgCard(options: SvgCardOptions): string {
  const {
    svg,
    cardId,
    label,
    sublabel,
    extraActions = [],
    hasCopy = true,
    hasDownload = true,
  } = options;

  const builtinActions: CardAction[] = [];

  if (hasCopy) {
    builtinActions.push({
      id: "copy",
      icon: "copy",
      title: "Copy SVG",
    });
  }

  if (hasDownload) {
    builtinActions.push({
      id: "download",
      icon: "download",
      title: "Download SVG",
    });
  }

  const allActions = [...builtinActions, ...extraActions];

  const actionsHtml = allActions.map((action) => buildActionButton(action, cardId)).join("");

  const sublabelHtml = sublabel ? `<span class="text-xs text-text-muted">${sublabel}</span>` : "";

  return `
    <div class="bg-transparent border border-border rounded-xl overflow-hidden hover:bg-surface-hover/5 transition-all duration-300 group hover:border-border flex flex-col">
      <div class="p-8 flex-1 min-h-[220px] flex items-center justify-center relative">
        ${sanitizeSvgForDisplay(svg)}
      </div>
      <div class="px-5 py-4 border-t border-border/50 flex items-center justify-between gap-3">
        <div class="flex flex-col gap-0.5 min-w-0 flex-1">
          <span class="text-sm font-medium text-text truncate" title="${label}">${label}</span>
          ${sublabelHtml}
        </div>
        <div class="flex gap-1 shrink-0">
          ${actionsHtml}
        </div>
      </div>
    </div>
  `;
}

/**
 * Renders the HTML for a skeleton loading card.
 */
export function renderSvgCardSkeleton(): string {
  return `
    <div class="bg-transparent border border-border/50 rounded-xl overflow-hidden transition-all h-[340px] animate-pulse flex flex-col">
      <div class="flex-1"></div>
      <div class="p-5 flex items-center justify-between border-t border-border/50">
        <div class="h-2 w-16 bg-surface-hover/40 rounded-full"></div>
        <div class="flex gap-1">
          <div class="h-8 w-8 bg-surface-hover/40 rounded-lg"></div>
          <div class="h-8 w-8 bg-surface-hover/40 rounded-lg"></div>
          <div class="h-8 w-8 bg-surface-hover/40 rounded-lg"></div>
        </div>
      </div>
    </div>
  `;
}

// --- Built-in action handlers ---

/** Copies raw SVG code to the clipboard. */
export function copySvgToClipboard(svgContent: string): void {
  navigator.clipboard
    .writeText(svgContent)
    .then(() => {
      showAlert({ type: "success", message: "SVG copied to clipboard" });
    })
    .catch(() => {
      showAlert({ type: "error", message: "Failed to copy SVG" });
    });
}

/** Triggers a file download for the given SVG content. */
export function downloadSvg(svgContent: string, filename: string): void {
  const blob = new Blob([svgContent], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Attaches built-in action handlers (copy, download) to all matching
 * buttons within a container. Also accepts custom handlers for any
 * extra actions rendered on the cards.
 *
 * Uses Event Delegation so this can be safely called multiple times
 * without memory leaks (though ideally called once per container).
 *
 * @param container - The parent DOM element containing the cards
 * @param svgResolver - A function that returns the SVG content for a given cardId
 * @param customHandlers - Additional handlers for non-built-in actions
 */
export function attachSvgCardEvents(
  container: HTMLElement,
  svgResolver: (cardId: string) => string | undefined,
  customHandlers: SvgCardActionHandler[] = [],
): void {
  // Prevent duplicate delegated listeners on the same container
  if (container.dataset.svgEventsAttached === "true") return;

  container.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const btn = target.closest("button[data-action]");

    if (!btn) return;

    const actionId = btn.getAttribute("data-action");
    const cardId = btn.getAttribute("data-card-id") ?? "";
    const svg = svgResolver(cardId);

    if (actionId === "copy" && svg) {
      copySvgToClipboard(svg);
      return;
    }

    if (actionId === "download" && svg) {
      downloadSvg(svg, `svgen-${cardId}.svg`);
      return;
    }

    // Try custom handlers
    const customMatch = customHandlers.find((h) => h.actionId === actionId);
    if (customMatch) {
      customMatch.handler(cardId);
    }
  });

  container.dataset.svgEventsAttached = "true";
}
