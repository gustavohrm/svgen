import { AiProviderId, AiProvider, GenerateOptions } from "../../types/index";
import { AppSettings } from "../../modules/db/index";

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

const SYSTEM_PROMPT_GUARDRAILS = `Output contract:
1. Return exactly one complete <svg>...</svg> document and nothing else.
2. Do not use markdown, code fences, explanations, or comments outside SVG.
3. Ensure the SVG is valid and self-contained (no external assets, fonts, CSS, or scripts).
4. Prefer a viewBox and responsive coordinates over fixed pixel width/height.
5. Keep markup concise and deterministic while preserving visual quality.`;

export class AiService {
  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly providerRegistry: ProviderRegistry,
  ) {}

  buildSystemPrompt(referenceSvgs?: string[], customSystemPrompt?: string): string {
    const basePrompt = customSystemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT;
    let systemPrompt = `${basePrompt}\n\n${SYSTEM_PROMPT_GUARDRAILS}`;

    if (referenceSvgs && referenceSvgs.length > 0) {
      systemPrompt += `\n\nReference SVGs are provided below to guide the style or structure:\n`;
      referenceSvgs.forEach((svg, index) => {
        systemPrompt += `\n--- Reference ${index + 1} ---\n${svg}\n--------------------\n`;
      });
    }

    return systemPrompt;
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

    return provider.generate({
      prompt: options.prompt,
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
