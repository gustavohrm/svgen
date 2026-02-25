import { describe, expect, it } from "vitest";
import { parseSvgVariationsFromResponses } from "./structured-output";

describe("parseSvgVariationsFromResponses", () => {
  const validSvg = "<svg viewBox='0 0 10 10'><circle cx='5' cy='5' r='4'/></svg>";

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
});
