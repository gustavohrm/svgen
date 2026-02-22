import { AiProviderId, AiProvider, GenerateOptions } from "../../types/index";
import { AppSettings } from "../../modules/db/index";

export interface Database {
  getSettings(): AppSettings;
}

export interface ProviderRegistry {
  getProvider(id: AiProviderId): AiProvider | undefined;
}

export class AiService {
  constructor(
    private readonly db: Database,
    private readonly providerRegistry: ProviderRegistry,
  ) {}

  buildSystemPrompt(referenceSvgs?: string[]): string {
    let systemPrompt = `You are an expert SVG designer. Your only job is to return valid, clean SVG code based on the user's request.
Requirements:
1. ONLY return the SVG code, nothing else.
2. NO markdown formatting, NO backticks.
3. Use Tailwind colors (hex/rgb) or semantic colors.
4. Make sure the SVG is self-contained.
5. viewBox is preferred over fixed width/height.`;

    if (referenceSvgs && referenceSvgs.length > 0) {
      systemPrompt += `\n\nReference SVGs are provided below to guide the style or structure:\n`;
      referenceSvgs.forEach((svg, index) => {
        systemPrompt += `\n--- Reference ${index + 1} ---\n${svg}\n--------------------\n`;
      });
    }

    return systemPrompt;
  }

  async generate(options: Omit<GenerateOptions, "apiKey">): Promise<string> {
    const settings = this.db.getSettings();
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

    const systemPrompt = this.buildSystemPrompt(options.referenceSvgs);

    return provider.generate({
      prompt: options.prompt,
      systemPrompt,
      model: options.model,
      apiKey: activeKey.value,
    });
  }

  async generateMultiple(
    options: Omit<GenerateOptions, "apiKey">,
    count: number,
  ): Promise<string[]> {
    const promises = Array.from({ length: count }).map(() => this.generate(options));
    return Promise.all(promises);
  }
}

/**
 * Factory function to create an instance of AiService
 */
export function createAiService(db: Database, providerRegistry: ProviderRegistry): AiService {
  return new AiService(db, providerRegistry);
}
