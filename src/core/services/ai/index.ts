import { AiProviderId, AiProvider, GenerateOptions } from "../../types/index";
import { AppSettings } from "../../modules/db/index";
import { normalizePositiveInt } from "../../utils/number";
import { SVG_VARIATIONS_JSON_SCHEMA } from "./structured-output";

export interface SettingsRepository {
  getSettings(): AppSettings;
}

export interface ProviderRegistry {
  getProvider(id: AiProviderId): AiProvider | undefined;
}

export const DEFAULT_SYSTEM_PROMPT = `You are an expert SVG designer creating production-ready SVG artwork from user instructions.

Design goals:
- Translate the request into a clear visual composition with intentional hierarchy and spacing.
- Favor clean geometry, balanced proportions, and strong readability at small and large sizes.
- Use cohesive color palettes with sufficient contrast between key shapes.
- Prefer reusable structure (grouping, transforms, shared styles) when it keeps output clear and compact.`;

const SYSTEM_PROMPT_GUARDRAILS = `
<generation_rules>
  <rule>Generate the requested number of distinct SVG variations.</rule>
  <rule>Each variation must be a complete, valid &lt;svg&gt;...&lt;/svg&gt; document.</rule>
  <rule>Do not use markdown, code fences, or explanatory text.</rule>
  <rule>Keep SVGs self-contained (no external assets, fonts, CSS, or scripts).</rule>
  <rule>Prefer viewBox-based responsive coordinates.</rule>
</generation_rules>
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

  buildSystemPrompt(referenceSvgs?: string[], customSystemPrompt?: string): string {
    const basePrompt = customSystemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT;
    let systemPrompt = `<system_instructions><![CDATA[${toCdata(basePrompt)}]]></system_instructions>\n${SYSTEM_PROMPT_GUARDRAILS}`;

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

    const systemPrompt = this.buildSystemPrompt(options.referenceSvgs, settings.systemPrompt);
    const userPrompt = this.buildUserPrompt(options.prompt, count);

    return provider.generate({
      prompt: userPrompt,
      systemPrompt,
      model: options.model,
      apiKey: activeKey.value,
      count,
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

function toCdata(value: string): string {
  return value.replace(/\]\]>/g, "]]]]><![CDATA[>");
}
