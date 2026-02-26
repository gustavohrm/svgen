export function canonicalizeSvg(svg: string): string {
  const parsed = new DOMParser().parseFromString(svg, "text/html");
  const svgNode = parsed.getElementsByTagName("svg")[0];
  return svgNode ? svgNode.outerHTML : svg;
}
