/**
 * Convert raw SVG markup into a base64-encoded data URL suitable for use as an image source.
 *
 * @param svgText - The SVG markup string to encode.
 * @returns A `data:image/svg+xml;base64,<...>` string containing the encoded SVG.
 */
function svgTextToDataUrl(svgText: string): string {
  const bytes = new TextEncoder().encode(svgText);
  const chunkSize = 0x8000;
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  const base64 = btoa(binary);
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Create a preview DOM node for an SVG attachment file.
 *
 * @param file - The File whose SVG text will be rendered into the preview image.
 * @param index - The attachment's zero-based index, set on the dismiss button's `data-index` attribute.
 * @returns The constructed HTMLDivElement containing the preview image and a positioned dismiss button.
 */
export async function createAttachmentPreviewNode(
  file: File,
  index: number,
): Promise<HTMLDivElement> {
  const text = await file.text();
  const dataUrl = svgTextToDataUrl(text);

  const div = document.createElement("div");
  div.className =
    "relative group w-20 h-20 rounded-xl border border-border/50 overflow-hidden bg-transparent flex items-center justify-center";
  div.innerHTML = `
    <img src="${dataUrl}" class="w-full h-full object-contain p-2" alt="attachment" />
    <button data-index="${index}" class="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
    </button>
  `;

  return div;
}
