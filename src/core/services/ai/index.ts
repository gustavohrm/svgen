import { AiProviderId, AiProvider, GenerateOptions } from "../../types/index";
import { AppSettings } from "../../modules/db/index";
import { normalizePositiveInt } from "../../utils/number";
import { SVG_VARIATIONS_JSON_SCHEMA } from "./structured-output";
import {
  buildColorPalettePolicyXml,
  DEFAULT_COLOR_PALETTE_ID,
  isColorPaletteId,
} from "../../constants/color-palettes";
import {
  SVG_BLOCKED_FEATURES,
  SVG_CSS_ALLOWED_AT_RULES,
  SVG_CSS_BLOCKED_PROPERTIES,
  SVG_CSS_MAX_SELECTOR_CHARS,
  SVG_CSS_MAX_STYLE_ATTRIBUTE_CHARS,
  SVG_CSS_MAX_STYLE_BLOCKS,
  SVG_CSS_MAX_STYLE_CHARS,
  SVG_CSS_MAX_VALUE_CHARS,
  SVG_CSS_POLICY_PROFILE,
  formatSvgCssAllowedPropertiesForPrompt,
  SVG_CSS_URL_REFERENCE_RULE,
} from "../../constants/svg-css-policy";

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

const SYSTEM_PROMPT_GUARDRAILS = `
<generation_rules>
  <rule>Generate the requested number of distinct SVG variations.</rule>
  <rule>Each variation should differ meaningfully in composition, motion, color direction, or visual style.</rule>
  <rule>Each variation must be a complete, valid &lt;svg&gt;...&lt;/svg&gt; document.</rule>
  <rule>Do not use markdown, code fences, or explanatory text.</rule>
  <rule>Keep SVGs self-contained (no external assets, fonts, CSS, or scripts).</rule>
  <rule>Prefer named SVG primitives over paths when equivalent.</rule>
  <rule>If animation is requested, use inline CSS animation and avoid SMIL tags such as &lt;animate&gt;, &lt;animateTransform&gt;, &lt;animateMotion&gt;, and &lt;set&gt;.</rule>
  <rule>Prefer viewBox-based responsive coordinates.</rule>
  <rule>Treat the CSS capability contract below as strict enforcement, not guidance.</rule>
</generation_rules>
${buildSvgCssCapabilityContractXml()}
<response_contract>
  <type>json_object</type>
  <schema>${JSON.stringify(SVG_VARIATIONS_JSON_SCHEMA)}</schema>
  <notes>The response must be valid JSON matching the schema exactly.</notes>
</response_contract>`;

export class AiService {
  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly providerRegistry: ProviderRegistry,
  ) {}

  buildSystemPrompt(
    settings: AppSettings,
    referenceSvgs?: string[],
    customSystemPrompt?: string,
  ): string {
    const basePrompt = customSystemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT;
    const paletteId = isColorPaletteId(settings.colorPaletteId)
      ? settings.colorPaletteId
      : DEFAULT_COLOR_PALETTE_ID;
    const colorPalettePolicy = buildColorPalettePolicyXml(paletteId);

    let systemPrompt = `<system_instructions><![CDATA[${toCdata(basePrompt)}]]></system_instructions>\n${SYSTEM_PROMPT_GUARDRAILS}\n${colorPalettePolicy}`;

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
    <requirement>Provide ${normalizedVariationCount} SVG strings when possible.</requirement>
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
    );
    const userPrompt = this.buildUserPrompt(options.prompt, normalizedCount);

    return provider.generate({
      prompt: userPrompt,
      systemPrompt,
      model: options.model,
      apiKey: activeKey.value,
      count: normalizedCount,
      temperature: settings.temperature,
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

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSvgCssCapabilityContractXml(): string {
  const allowedAtRulesXml = SVG_CSS_ALLOWED_AT_RULES.map(
    (rule) => `    <at_rule>${xmlEscape(rule)}</at_rule>`,
  ).join("\n");
  const blockedFeaturesXml = SVG_BLOCKED_FEATURES.map(
    (feature) => `    <feature>${xmlEscape(feature)}</feature>`,
  ).join("\n");

  return `<css_capability_contract>
  <profile>${xmlEscape(SVG_CSS_POLICY_PROFILE)}</profile>
  <allowed_at_rules>
${allowedAtRulesXml}
  </allowed_at_rules>
  <property_policy>
    <model>${xmlEscape(formatSvgCssAllowedPropertiesForPrompt())}</model>
    <blocked_properties>${xmlEscape(SVG_CSS_BLOCKED_PROPERTIES.join(", "))}</blocked_properties>
  </property_policy>
  <url_policy>
    <allowed_local_references>#id, url(#id)</allowed_local_references>
    <external_urls_allowed>false</external_urls_allowed>
    <rule>${xmlEscape(SVG_CSS_URL_REFERENCE_RULE)}</rule>
  </url_policy>
  <style_limits>
    <max_style_blocks>${SVG_CSS_MAX_STYLE_BLOCKS}</max_style_blocks>
    <max_style_chars>${SVG_CSS_MAX_STYLE_CHARS}</max_style_chars>
    <max_style_attr_chars>${SVG_CSS_MAX_STYLE_ATTRIBUTE_CHARS}</max_style_attr_chars>
    <max_selector_length>${SVG_CSS_MAX_SELECTOR_CHARS}</max_selector_length>
    <max_value_length>${SVG_CSS_MAX_VALUE_CHARS}</max_value_length>
  </style_limits>
  <blocked_features>
${blockedFeaturesXml}
  </blocked_features>
</css_capability_contract>`;
}
