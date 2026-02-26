import { showAlert } from "./alert";
import { escapeHtml } from "./html-escape";
import { sanitizeSvgMarkup } from "./svg-sanitizer";

// --- Lucide icon SVG strings (inlined to avoid external deps) ---
const ICONS = {
  copy: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
  download: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`,
  heart: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.54 4.07 3 5.5l7 7Z"/></svg>`,
  trash: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`,
  more: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>`,
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

const INVALID_SVG_FALLBACK =
  `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">` +
  `<rect x="4" y="4" width="40" height="40" rx="8" stroke="#9ca3af" stroke-opacity="0.4" stroke-width="2"/>` +
  `<path d="M16 16L32 32" stroke="#9ca3af" stroke-opacity="0.8" stroke-width="2.5" stroke-linecap="round"/>` +
  `<path d="M32 16L16 32" stroke="#9ca3af" stroke-opacity="0.8" stroke-width="2.5" stroke-linecap="round"/>` +
  `</svg>`;

interface PreviewRenderResult {
  iframeHtml: string;
  hasAutoViewportFix: boolean;
}

interface ViewportNormalizationResult {
  svgMarkup: string;
  hasAutoViewportFix: boolean;
}

// --- Helpers ---

/**
 * Sanitizes raw SVG markup and renders it inside a sandboxed iframe,
 * preventing generated CSS from affecting the app UI.
 */
export function sanitizeSvgForDisplay(rawSvg: string): string {
  return buildSvgPreview(rawSvg).iframeHtml;
}

function buildSvgPreview(rawSvg: string): PreviewRenderResult {
  const safeSvg = sanitizeSvgMarkup(rawSvg) ?? INVALID_SVG_FALLBACK;
  const normalizedSvg = ensurePreviewViewBox(safeSvg);
  const iframeDocument = buildSandboxedSvgDocument(normalizedSvg.svgMarkup);
  const safeSrcDoc = escapeHtml(iframeDocument);

  return {
    iframeHtml: `<iframe class="w-full h-full max-h-56 border-0 pointer-events-none" sandbox loading="lazy" referrerpolicy="no-referrer" title="SVG preview" aria-hidden="true" tabindex="-1" srcdoc="${safeSrcDoc}"></iframe>`,
    hasAutoViewportFix: normalizedSvg.hasAutoViewportFix,
  };
}

function ensurePreviewViewBox(svgMarkup: string): ViewportNormalizationResult {
  const doc = new DOMParser().parseFromString(svgMarkup, "image/svg+xml");
  const root = doc.documentElement;

  if (!root || root.nodeName.toLowerCase() !== "svg") {
    return { svgMarkup, hasAutoViewportFix: false };
  }

  if (root.getAttribute("viewBox")?.trim()) {
    return { svgMarkup: root.outerHTML, hasAutoViewportFix: false };
  }

  const width = parseSvgDimension(root.getAttribute("width"));
  const height = parseSvgDimension(root.getAttribute("height"));

  if (!width || !height) {
    return { svgMarkup: root.outerHTML, hasAutoViewportFix: false };
  }

  root.setAttribute("viewBox", `0 0 ${width} ${height}`);
  return { svgMarkup: root.outerHTML, hasAutoViewportFix: true };
}

function parseSvgDimension(rawValue: string | null): string | null {
  if (!rawValue) {
    return null;
  }

  const trimmed = rawValue.trim();
  const match = trimmed.match(/^(?:\+)?(\d+(?:\.\d+)?|\.\d+)(?:px)?$/i);
  if (!match) {
    return null;
  }

  const parsed = Number.parseFloat(match[1]);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed.toString();
}

function buildSandboxedSvgDocument(svgMarkup: string): string {
  return [
    "<!doctype html>",
    '<html><head><meta charset="utf-8">',
    "<style>",
    "html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent}",
    "body{display:flex;align-items:center;justify-content:center}",
    "svg{display:block;width:100%;height:100%;max-width:100%;max-height:100%}",
    "</style></head>",
    `<body>${svgMarkup}</body></html>`,
  ].join("");
}

function buildActionButton(action: CardAction, cardId: string): string {
  const hoverClass = action.hoverClass ?? "hover:text-text hover:bg-surface-hover";
  const safeActionId = escapeHtml(action.id);
  const safeCardId = escapeHtml(cardId);
  const safeTitle = escapeHtml(action.title);

  return `
    <button
      data-action="${safeActionId}"
      data-card-id="${safeCardId}"
      class="p-2 rounded-lg text-text-secondary ${hoverClass} transition-all cursor-pointer"
      title="${safeTitle}"
    >
      ${ICONS[action.icon]}
    </button>
  `;
}

function buildMenuActionButton(action: CardAction, cardId: string): string {
  const hoverClass = action.hoverClass ?? "hover:text-text hover:bg-surface-hover";
  const safeActionId = escapeHtml(action.id);
  const safeCardId = escapeHtml(cardId);
  const safeTitle = escapeHtml(action.title);

  return `
    <button
      data-action="${safeActionId}"
      data-card-id="${safeCardId}"
      class="w-full px-3 py-2 rounded-md text-sm text-text-secondary ${hoverClass} transition-all flex items-center gap-2"
      title="${safeTitle}"
    >
      ${ICONS[action.icon]}
      <span>${safeTitle}</span>
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

  const actionsHtml =
    allActions.length > 0
      ? `
      <div class="relative shrink-0" data-menu-wrapper>
        ${buildActionButton({ id: "toggle-menu", icon: "more", title: "Options" }, cardId)}
        <div class="svg-card-menu hidden absolute right-0 bottom-11 z-20 min-w-44 rounded-lg border border-border bg-surface p-1 shadow-xl">
          ${allActions.map((action) => buildMenuActionButton(action, cardId)).join("")}
        </div>
      </div>
    `
      : "";

  const safeLabel = escapeHtml(label);
  const safeSublabel = sublabel ? escapeHtml(sublabel) : "";
  const sublabelHtml = safeSublabel
    ? `<span class="text-xs text-text-muted">${safeSublabel}</span>`
    : "";
  const preview = buildSvgPreview(svg);
  const viewportBadgeHtml = preview.hasAutoViewportFix
    ? '<span class="absolute top-3 left-3 rounded-full border border-amber-400/40 bg-amber-400/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-200" title="Preview auto-added a viewBox from width and height.">Auto-fit viewBox</span>'
    : "";

  return `
    <div class="bg-transparent border border-border rounded-xl overflow-hidden hover:bg-surface-hover/5 transition-all duration-300 group hover:border-border flex flex-col">
      <div class="p-8 flex-1 min-h-[220px] flex items-center justify-center relative">
        ${preview.iframeHtml}
        ${viewportBadgeHtml}
      </div>
      <div class="px-5 py-4 border-t border-border/50 flex items-center justify-between gap-3">
        <div class="flex flex-col gap-0.5 min-w-0 flex-1">
          <span class="text-sm font-medium text-text truncate" title="${safeLabel}">${safeLabel}</span>
          ${sublabelHtml}
        </div>
        <div class="flex gap-1 shrink-0 items-center">
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
export interface AttachSvgCardEventsOptions {
  svgResolver: (cardId: string) => string | undefined;
  customHandlers?: SvgCardActionHandler[];
}

export function attachSvgCardEvents(
  container: HTMLElement,
  options: AttachSvgCardEventsOptions,
): void {
  const { svgResolver, customHandlers = [] } = options;
  // Prevent duplicate delegated listeners on the same container
  if (container.dataset.svgEventsAttached === "true") return;

  const closeAllMenus = () => {
    container.querySelectorAll<HTMLElement>(".svg-card-menu").forEach((menu) => {
      menu.classList.add("hidden");
    });
  };

  const toggleMenu = (button: HTMLElement) => {
    const wrapper = button.closest<HTMLElement>("[data-menu-wrapper]");
    const menu = wrapper?.querySelector<HTMLElement>(".svg-card-menu");
    if (!menu) return;

    const willOpen = menu.classList.contains("hidden");
    closeAllMenus();
    if (willOpen) {
      menu.classList.remove("hidden");
    }
  };

  container.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const btn = target.closest("button[data-action]");

    if (!btn) {
      if (!target.closest("[data-menu-wrapper]")) {
        closeAllMenus();
      }
      return;
    }

    const actionId = btn.getAttribute("data-action");

    if (actionId === "toggle-menu") {
      toggleMenu(btn as HTMLElement);
      return;
    }

    const cardId = btn.getAttribute("data-card-id") ?? "";
    const svg = svgResolver(cardId);

    if (actionId === "copy" && svg) {
      copySvgToClipboard(svg);
      closeAllMenus();
      return;
    }

    if (actionId === "download" && svg) {
      downloadSvg(svg, `svgen-${cardId}.svg`);
      closeAllMenus();
      return;
    }

    // Try custom handlers
    const customMatch = customHandlers.find((h) => h.actionId === actionId);
    if (customMatch) {
      customMatch.handler(cardId);
      closeAllMenus();
    }
  });

  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (!container.contains(target)) {
      closeAllMenus();
    }
  });

  container.dataset.svgEventsAttached = "true";
}
