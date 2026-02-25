import { describe, expect, it } from "vitest";
import { parseSvgVariationsFromResponses } from "./structured-output";

describe("parseSvgVariationsFromResponses", () => {
  const validSvg = "<svg viewBox='0 0 10 10'><circle cx='5' cy='5' r='4'/></svg>";
  const secondSvg = "<svg viewBox='0 0 10 10'><rect x='1' y='1' width='8' height='8'/></svg>";
  const thirdSvg = "<svg viewBox='0 0 10 10'><path d='M1 1 L9 9'/></svg>";

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

  it("caps parsed svg results to requestedCount", () => {
    const result = parseSvgVariationsFromResponses(
      [JSON.stringify({ svgs: [validSvg, secondSvg, thirdSvg] })],
      1,
    );

    expect(result).toEqual([validSvg]);
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

  it("rejects concatenated multi-root svg payloads", () => {
    expect(() => parseSvgVariationsFromResponses([`${validSvg}${secondSvg}`], 1)).toThrow(
      "Model returned an invalid variations payload",
    );
  });
});
