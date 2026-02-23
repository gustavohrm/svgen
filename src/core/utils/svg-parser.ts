/**
 * Extracts raw SVG string from markdown or HTML text blocks
 * @param text The source text containing an SVG
 * @returns The extracted clean SVG string or the original text if no SVG is found
 */
export function extractSvgFromResult(text: string): string {
  const start = text.indexOf("<svg");
  const end = text.lastIndexOf("</svg>");
  if (start !== -1 && end !== -1) {
    return text.substring(start, end + 6);
  }
  return text;
}
