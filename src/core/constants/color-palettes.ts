export type ColorPaletteId = "monochrome" | "ocean" | "sunset" | "forest" | "ai-choice";

export interface ColorPaletteOption {
  id: ColorPaletteId;
  label: string;
  description: string;
  swatches: string[];
  promptDirective: string;
}

export const DEFAULT_COLOR_PALETTE_ID: ColorPaletteId = "ai-choice";

export const COLOR_PALETTE_OPTIONS: readonly ColorPaletteOption[] = [
  {
    id: "monochrome",
    label: "Monochrome",
    description: "Neutral grayscale for app-consistent output",
    swatches: ["#f5f5f5", "#a3a3a3", "#525252", "#171717"],
    promptDirective:
      "Use a strict neutral monochrome palette. Keep fills, strokes, gradients, and accents within these neutral tones.",
  },
  {
    id: "ocean",
    label: "Ocean",
    description: "Cool blue and cyan tones",
    swatches: ["#082f49", "#0369a1", "#0ea5e9", "#67e8f9"],
    promptDirective:
      "Use a strict ocean palette with deep blue to cyan tones and balanced contrast.",
  },
  {
    id: "sunset",
    label: "Sunset",
    description: "Warm amber, orange, and red hues",
    swatches: ["#7f1d1d", "#dc2626", "#f97316", "#facc15"],
    promptDirective: "Use a strict sunset palette with warm reds, oranges, and golden highlights.",
  },
  {
    id: "forest",
    label: "Forest",
    description: "Grounded green and earth tones",
    swatches: ["#14532d", "#15803d", "#65a30d", "#d9f99d"],
    promptDirective: "Use a strict forest palette with green-driven tones and natural contrast.",
  },
  {
    id: "ai-choice",
    label: "AI choice",
    description: "Auto palette to encourage creative exploration",
    swatches: ["#7dd3fc", "#a78bfa", "#f9a8d4", "#fca5a5"],
    promptDirective:
      "Select a cohesive color direction autonomously based on the prompt and visual intent.",
  },
] as const;

/**
 * Checks whether a value is a valid ColorPaletteId.
 *
 * @param value - The value to test
 * @returns `true` if `value` matches one of the known `ColorPaletteId` literals, `false` otherwise.
 */
export function isColorPaletteId(value: unknown): value is ColorPaletteId {
  return COLOR_PALETTE_OPTIONS.some((palette) => palette.id === value);
}

/**
 * Retrieve the color palette option that corresponds to the given palette id.
 *
 * @returns The matching ColorPaletteOption; if no palette matches `paletteId`, returns the declared default palette option.
 */
export function getColorPaletteById(paletteId: ColorPaletteId): ColorPaletteOption {
  const defaultPalette =
    COLOR_PALETTE_OPTIONS.find((palette) => palette.id === DEFAULT_COLOR_PALETTE_ID) ||
    COLOR_PALETTE_OPTIONS[0];

  return COLOR_PALETTE_OPTIONS.find((palette) => palette.id === paletteId) || defaultPalette;
}

/**
 * Builds a CSS background style string that previews the palette as a 135-degree linear gradient.
 *
 * @param paletteId - The color palette id used to select swatches for the gradient
 * @returns A CSS `background` style string containing a `linear-gradient(135deg, ...)` across the palette's first four hex color swatches
 */
export function getColorPalettePreviewStyle(paletteId: ColorPaletteId): string {
  const palette = getColorPaletteById(paletteId);
  const [first, second, third, fourth] = palette.swatches;
  return `background: linear-gradient(135deg, ${first} 0%, ${second} 36%, ${third} 68%, ${fourth} 100%);`;
}

/**
 * Builds the CSS class string for a color-palette option button.
 *
 * @param isSelected - Whether the palette option is currently selected
 * @returns The composed CSS class string; when `isSelected` is `true` the string includes a bright border class, otherwise it includes a semi-transparent border and a brighter hover border
 */
export function getColorPaletteOptionButtonClass(isSelected: boolean): string {
  const baseClass =
    "w-full aspect-square rounded-md border transition-all duration-200 hover:scale-102 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-bright";

  if (isSelected) {
    return `${baseClass} border-border-bright`;
  }

  return `${baseClass} border-border/70 hover:border-border-bright/80`;
}

/**
 * Produce an XML policy describing rules and metadata for the specified color palette.
 *
 * @param paletteId - The color palette id to generate the policy for
 * @returns An XML string that describes the selected palette and its rules; for `ai-choice` the policy is in "adaptive" mode (rules only), for other palettes the policy is in "strict" mode and includes an `allowed_hex_colors` element and an explicit exception rule for user-requested color changes
 */
export function buildColorPalettePolicyXml(paletteId: ColorPaletteId): string {
  const palette = getColorPaletteById(paletteId);

  if (palette.id === "ai-choice") {
    return `<color_palette_policy mode="adaptive">
  <selected_palette id="${palette.id}" name="${palette.label}">
    <description>${palette.description}</description>
  </selected_palette>
  <rules>
    <rule>${palette.promptDirective}</rule>
    <rule>Keep colors intentional and cohesive, with clear contrast for readability.</rule>
  </rules>
</color_palette_policy>`;
  }

  return `<color_palette_policy mode="strict">
  <selected_palette id="${palette.id}" name="${palette.label}">
    <description>${palette.description}</description>
    <allowed_hex_colors>${palette.swatches.join(", ")}</allowed_hex_colors>
  </selected_palette>
  <rules>
    <rule>${palette.promptDirective}</rule>
    <rule>Use only the allowed hex colors for fills, strokes, gradients, and accents.</rule>
    <rule>Opacity changes are allowed, but introducing new colors is not allowed by default.</rule>
    <rule>
      Exception: if the user explicitly asks for a specific color on a specific element, honor that request for
      that element while keeping the rest of the illustration in the selected palette.
    </rule>
  </rules>
</color_palette_policy>`;
}
