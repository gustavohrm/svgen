import { describe, expect, it } from "vitest";
import {
  buildGcpSvgVariationsSchema,
  buildSvgVariationsJsonSchema,
  parseSvgVariationsFromResponses,
} from "./structured-output";

describe("structured output schemas", () => {
  it("builds dynamic JSON schema with exact requested count", () => {
    const schema = buildSvgVariationsJsonSchema(3);

    expect(schema.properties.svgs.minItems).toBe(3);
    expect(schema.properties.svgs.maxItems).toBe(3);
  });

  it("builds dynamic GCP schema with exact requested count", () => {
    const schema = buildGcpSvgVariationsSchema(2);

    expect(schema.properties.svgs.minItems).toBe(2);
    expect(schema.properties.svgs.maxItems).toBe(2);
  });

  it("normalizes invalid requested counts to one", () => {
    const schema = buildSvgVariationsJsonSchema(0);

    expect(schema.properties.svgs.minItems).toBe(1);
    expect(schema.properties.svgs.maxItems).toBe(1);
  });
});

describe("parseSvgVariationsFromResponses", () => {
  const validSvg = "<svg viewBox='0 0 10 10'><circle cx='5' cy='5' r='4'/></svg>";
  const secondSvg = "<svg viewBox='0 0 10 10'><rect x='1' y='1' width='8' height='8'/></svg>";
  const thirdSvg = "<svg viewBox='0 0 10 10'><path d='M1 1 L9 9'/></svg>";

  function canonicalizeSvg(svg: string): string {
    const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
    return parsed.documentElement.outerHTML;
  }

  it("parses valid structured payloads", () => {
    const result = parseSvgVariationsFromResponses([JSON.stringify({ svgs: [validSvg] })], 1);

    expect(result).toEqual([validSvg]);
  });

  it("rejects structured payloads with unknown top-level fields", () => {
    const payloadWithUnknownField =
      '{"svgs":["\\u003csvg viewBox=\\"0 0 10 10\\"\\u003e\\u003ccircle cx=\\"5\\" cy=\\"5\\" r=\\"4\\"/\\u003e\\u003c/svg\\u003e"],"extra":true}';

    expect(() => parseSvgVariationsFromResponses([payloadWithUnknownField], 1)).toThrow(
      "Model returned an invalid variations payload",
    );
  });

  it("throws when no responses are returned", () => {
    expect(() => parseSvgVariationsFromResponses([], 1)).toThrow(
      "Model returned an invalid variations payload",
    );
  });

  it("falls back to raw svg responses", () => {
    const result = parseSvgVariationsFromResponses([validSvg], 1);

    expect(result).toEqual([validSvg]);
  });

  it("falls back to raw svg wrapped in markdown fences", () => {
    const wrappedSvg = ["```svg", validSvg, "```"].join("\n");

    const result = parseSvgVariationsFromResponses([wrappedSvg], 1);

    expect(result).toEqual([validSvg]);
  });

  it("extracts multiple raw svgs from a single response", () => {
    const response = [
      "Variation 1:",
      validSvg,
      "Variation 2:",
      secondSvg,
      "Variation 3:",
      thirdSvg,
    ].join("\n\n");

    const result = parseSvgVariationsFromResponses([response], 3);

    expect(result.map(canonicalizeSvg)).toEqual(
      [validSvg, secondSvg, thirdSvg].map(canonicalizeSvg),
    );
  });

  it("preserves nested svg content when extracting raw responses", () => {
    const nestedSvg =
      "<svg viewBox='0 0 20 20'><svg x='2' y='2' width='8' height='8' viewBox='0 0 8 8'><circle cx='4' cy='4' r='3'/></svg></svg>";

    const result = parseSvgVariationsFromResponses([nestedSvg], 1);

    expect(result).toHaveLength(1);
    expect((result[0].match(/<svg/gi) ?? []).length).toBe(2);
    expect(result[0]).toContain("<circle");
    expect(result[0]).toContain("</svg>");
  });

  it("rejects structured payloads when svgs array length does not match requestedCount", () => {
    expect(() =>
      parseSvgVariationsFromResponses(
        [JSON.stringify({ svgs: [validSvg, secondSvg, thirdSvg] })],
        1,
      ),
    ).toThrow("exactly 1 SVG strings");
  });

  it("parses fenced json payloads with surrounding text", () => {
    const response = [
      "Here are the variations:",
      "```json",
      JSON.stringify({ svgs: [validSvg] }),
      "```",
      "trailer {not: 'json'}",
    ].join("\n");

    const result = parseSvgVariationsFromResponses([response], 1);

    expect(result).toEqual([validSvg]);
  });

  it("normalizes structured svg strings with surrounding text", () => {
    const wrappedSvg = ["Here is your SVG:", validSvg, "Thanks!"].join("\n");

    const result = parseSvgVariationsFromResponses([JSON.stringify({ svgs: [wrappedSvg] })], 1);

    expect(result).toEqual([validSvg]);
  });

  it("accumulates partial structured payloads across responses", () => {
    const result = parseSvgVariationsFromResponses(
      [JSON.stringify({ svgs: [validSvg] }), JSON.stringify({ svgs: [secondSvg] })],
      2,
    );

    expect(result).toEqual([validSvg, secondSvg]);
  });

  it("rejects concatenated multi-root svg payloads", () => {
    expect(() => parseSvgVariationsFromResponses([`${validSvg}${secondSvg}`], 1)).toThrow(
      "Model returned an invalid variations payload",
    );
  });
});
