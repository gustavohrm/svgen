import { AiProviderId, AiProvider, GenerateOptions } from "../../types/index";
import { AppSettings } from "../../modules/db/index";
import { normalizePositiveInt } from "../../utils/number";
import { buildSvgVariationsJsonSchema } from "./structured-output";
import {
  buildColorPalettePolicyXml,
  DEFAULT_COLOR_PALETTE_ID,
  isColorPaletteId,
} from "../../constants/color-palettes";
import { SVG_CSS_CAPABILITY_CONTRACT } from "../../constants/svg-css-policy";

export interface SettingsRepository {
  getSettings(): AppSettings;
}

export interface ProviderRegistry {
  getProvider(id: AiProviderId): AiProvider | undefined;
}

export const DEFAULT_SYSTEM_PROMPT = `You are an expert SVG designer creating production-ready SVG artwork from user instructions.

Design goals:
- Translate the request into an intentional composition with hierarchy, depth, and focal flow.
- Build layered scenes (foreground/midground/background) when useful to avoid flat output.
- Use cohesive palettes with strong contrast and accessibility-minded legibility.
- Use gradients, filters, masks, and blend modes deliberately for depth and material feel.
- Choreograph motion with clear timing, stagger, and easing; keep loops smooth and purposeful.
- Keep artwork scalable and readable at icon and poster sizes.
- Prefer reusable structure (grouping, transforms, shared styles) when it keeps output clear and compact.
- Prefer named SVG primitives (rect, circle, ellipse, line, polyline, polygon) over path whenever they can represent the same shape.
- Use path only when geometry cannot be expressed cleanly with named primitives.
- When animation is needed, prefer CSS keyframes inside an inline <style> block and do not use SMIL animation tags.`;

const DEFAULT_MODEL_TOP_P = 0.85;
const MAX_OUTPUT_TOKENS_PER_VARIATION = 1400;
const MAX_OUTPUT_TOKENS_FLOOR = 2048;
const MAX_OUTPUT_TOKENS_CEILING = 8192;

/**
 * Compute the token budget for a requested number of variations, clamped to allowed limits.
 *
 * @param variationCount - The desired number of SVG variations
 * @returns The total allowed output tokens for the request, clamped between the configured floor and ceiling
 */
function calculateMaxOutputTokens(variationCount: number): number {
  const normalizedVariationCount = normalizePositiveInt(variationCount);
  const computed = normalizedVariationCount * MAX_OUTPUT_TOKENS_PER_VARIATION;
  return Math.max(MAX_OUTPUT_TOKENS_FLOOR, Math.min(MAX_OUTPUT_TOKENS_CEILING, computed));
}

/**
 * Produce an XML fragment of guardrails that enforce generation rules, quality criteria, the SVG CSS capability contract, and a response schema for a set of SVG variations.
 *
 * @param variationCount - The desired number of SVG variations; normalized to a positive integer and used to require exactly that many outputs.
 * @returns An XML string containing <generation_rules>, <quality_rubric>, an embedded CSS capability contract, and a <response_contract> whose schema requires exactly the specified number of SVGs under the "svgs" key.
 */
function buildSystemPromptGuardrails(variationCount: number): string {
  const normalizedVariationCount = normalizePositiveInt(variationCount);
  const variationsSchema = buildSvgVariationsJsonSchema(normalizedVariationCount);

  return `
<generation_rules>
  <rule>Generate exactly ${normalizedVariationCount} distinct SVG variations.</rule>
  <rule>Return exactly ${normalizedVariationCount} SVG strings under the "svgs" key; never return fewer or more.</rule>
  <rule>Each variation should differ meaningfully in composition, motion, color direction, or visual style.</rule>
  <rule>Do not duplicate compositions or near-identical variations to satisfy count.</rule>
  <rule>Each variation must be a complete, valid &lt;svg&gt;...&lt;/svg&gt; document.</rule>
  <rule>Do not use markdown, code fences, or explanatory text.</rule>
  <rule>Keep SVGs self-contained (no external assets, fonts, CSS, or scripts).</rule>
  <rule>Prefer named SVG primitives over paths when equivalent.</rule>
  <rule>If animation is requested, use inline CSS animation and avoid SMIL tags such as &lt;animate&gt;, &lt;animateTransform&gt;, &lt;animateMotion&gt;, and &lt;set&gt;.</rule>
  <rule>Prefer viewBox-based responsive coordinates.</rule>
  <rule>Treat the CSS capability contract below as strict enforcement, not guidance.</rule>
</generation_rules>
<quality_rubric>
  <criterion id="composition">Clear focal hierarchy, balanced negative space, and intentional layering.</criterion>
  <criterion id="craft">Clean geometry, alignment discipline, and coherent shape language.</criterion>
  <criterion id="color">Intentional palette usage with contrast-aware legibility.</criterion>
  <criterion id="motion">Purposeful motion timing/easing when animation is present; static alternatives still feel polished.</criterion>
  <criterion id="originality">Each variation should feel materially different, not a trivial tweak.</criterion>
</quality_rubric>
${buildSvgCssCapabilityContractXml()}
<response_contract>
  <type>json_object</type>
  <schema>${JSON.stringify(variationsSchema)}</schema>
  <notes>The response must be valid JSON matching the schema exactly.</notes>
</response_contract>`;
}

export class AiService {
  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly providerRegistry: ProviderRegistry,
  ) {}

  buildSystemPrompt(
    settings: AppSettings,
    referenceSvgs?: string[],
    customSystemPrompt?: string,
    variationCount: number = 1,
  ): string {
    const normalizedVariationCount = normalizePositiveInt(variationCount);
    const additiveDirectives = customSystemPrompt?.trim();
    const paletteId = isColorPaletteId(settings.colorPaletteId)
      ? settings.colorPaletteId
      : DEFAULT_COLOR_PALETTE_ID;
    const colorPalettePolicy = buildColorPalettePolicyXml(paletteId);

    let systemPrompt = `<system_instructions><![CDATA[${toCdata(DEFAULT_SYSTEM_PROMPT)}]]></system_instructions>`;
    if (additiveDirectives) {
      systemPrompt += `\n<additive_directives><![CDATA[${toCdata(additiveDirectives)}]]></additive_directives>`;
    }

    systemPrompt += `\n${buildSystemPromptGuardrails(normalizedVariationCount)}\n${colorPalettePolicy}`;

    if (referenceSvgs && referenceSvgs.length > 0) {
      systemPrompt += `\n<reference_svgs>`;
      referenceSvgs.forEach((svg, index) => {
        systemPrompt += `\n  <reference index="${index + 1}"><![CDATA[${toCdata(svg)}]]></reference>`;
      });
      systemPrompt += `\n</reference_svgs>`;
    }

    return systemPrompt;
  }

  /** @internal */
  buildUserPrompt(userPrompt: string, variationCount: number): string {
    const normalizedVariationCount = normalizePositiveInt(variationCount);

    return `<generation_request>
  <variation_count>${normalizedVariationCount}</variation_count>
  <user_prompt><![CDATA[${toCdata(userPrompt)}]]></user_prompt>
  <output_requirements>
    <requirement>Return JSON only.</requirement>
    <requirement>Use exactly one top-level key named "svgs".</requirement>
    <requirement>Return exactly ${normalizedVariationCount} SVG strings in "svgs".</requirement>
    <requirement>Do not return fewer or more than ${normalizedVariationCount} SVG strings.</requirement>
    <requirement>Each item must be a full &lt;svg&gt;...&lt;/svg&gt; document.</requirement>
  </output_requirements>
</generation_request>`;
  }

  async generate(options: Omit<GenerateOptions, "apiKey">): Promise<string> {
    const results = await this.generateVariationSet(options, 1);
    return results[0] || "";
  }

  private async generateVariationSet(
    options: Omit<GenerateOptions, "apiKey">,
    count: number,
  ): Promise<string[]> {
    const normalizedCount = normalizePositiveInt(count);
    const settings = this.settingsRepository.getSettings();
    const activeKeyId = settings.activeKeys[options.providerId];
    const activeKey = settings.apiKeys.find((k) => k.id === activeKeyId);

    if (!activeKey) {
      throw new Error(`No active API key selected for provider. Please configure one in settings.`);
    }

    const providerId = activeKey.providerId;
    const provider = this.providerRegistry.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider implementation for '${providerId}' not found.`);
    }

    const systemPrompt = this.buildSystemPrompt(
      settings,
      options.referenceSvgs,
      settings.systemPrompt,
      normalizedCount,
    );
    const userPrompt = this.buildUserPrompt(options.prompt, normalizedCount);
    const topP = options.topP ?? DEFAULT_MODEL_TOP_P;
    const maxOutputTokens = options.maxOutputTokens ?? calculateMaxOutputTokens(normalizedCount);

    return provider.generate({
      prompt: userPrompt,
      systemPrompt,
      model: options.model,
      apiKey: activeKey.value,
      count: normalizedCount,
      temperature: settings.temperature,
      topP,
      maxOutputTokens,
    });
  }

  async generateMultiple(
    options: Omit<GenerateOptions, "apiKey">,
    count: number,
  ): Promise<string[]> {
    return this.generateVariationSet(options, count);
  }
}

/**
 * Factory function to create an instance of AiService
 */
export function createAiService(
  settingsRepository: SettingsRepository,
  providerRegistry: ProviderRegistry,
): AiService {
  return new AiService(settingsRepository, providerRegistry);
}

/**
 * Escape a string so it can be safely placed inside an XML CDATA section.
 *
 * @param value - The string to embed inside CDATA
 * @returns The input string with every occurrence of `]]>` replaced by `]]]]><![CDATA[>` to prevent CDATA termination
 */
function toCdata(value: string): string {
  return value.replace(/\]\]>/g, "]]]]><![CDATA[>");
}

/**
 * Builds an XML fragment containing the serialized SVG CSS capability contract.
 *
 * @returns An XML string with a top-level `<css_capability_contract>` element whose content is a CDATA-wrapped JSON serialization of `SVG_CSS_CAPABILITY_CONTRACT` (escaped to be safe inside CDATA).
 */
function buildSvgCssCapabilityContractXml(): string {
  const contractPayload = JSON.stringify(SVG_CSS_CAPABILITY_CONTRACT);
  return `<css_capability_contract><![CDATA[${toCdata(contractPayload)}]]></css_capability_contract>`;
}
