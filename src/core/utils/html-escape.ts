const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const HTML_ESCAPE_REGEX = /[&<>"']/g;

export function escapeHtml(value: string): string {
  return value.replace(HTML_ESCAPE_REGEX, (char) => HTML_ESCAPE_MAP[char]);
}
