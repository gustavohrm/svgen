import { AppSettings } from "../modules/db/index";
import { AiProviderId } from "../types";
import { sanitizeSvgMarkup } from "../utils/svg-sanitizer";

export interface GenerateSvgRequest {
  prompt: string;
  referenceSvgs: string[];
  model: string | undefined;
  providerId: AiProviderId | undefined;
  variations: number;
}

export interface GenerateSvgResult {
  svgs: string[];
  prompt?: string;
  model?: string;
  generatedAt?: number;
}

export interface GenerationUiAdapter {
  notify(notification: { type: "error" | "warning" | "success"; message: string }): void;
  navigateToSettings(): void;
}

interface SettingsRepository {
  getSettings(): AppSettings;
}

interface ProviderRegistry {
  getProvider(id: AiProviderId): unknown;
}

interface AiGenerationService {
  generateMultiple(
    options: {
      prompt: string;
      referenceSvgs: string[];
      model: string;
      providerId: AiProviderId;
    },
    count: number,
  ): Promise<string[]>;
}

export class GenerateSvgUseCase {
  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly providerRegistry: ProviderRegistry,
    private readonly aiService: AiGenerationService,
    private readonly uiAdapter: GenerationUiAdapter,
  ) {}

  async execute(request: GenerateSvgRequest): Promise<GenerateSvgResult> {
    const { prompt, referenceSvgs, model, providerId, variations } = request;

    if (!model || !providerId) {
      this.uiAdapter.notify({
        type: "error",
        message: "Please select a model to generate with.",
      });
      return { svgs: [] };
    }

    const settings = this.settingsRepository.getSettings();
    const activeKeyId = settings.activeKeys[providerId];
    const activeKey = settings.apiKeys.find((key) => key.id === activeKeyId);

    if (!activeKey) {
      this.uiAdapter.notify({
        type: "error",
        message:
          "Please configure and select an API key for the chosen provider in the API Keys tab.",
      });
      this.uiAdapter.navigateToSettings();
      return { svgs: [] };
    }

    const provider = this.providerRegistry.getProvider(providerId);
    if (!provider) {
      this.uiAdapter.notify({
        type: "error",
        message: `Provider ${providerId} not found`,
      });
      return { svgs: [] };
    }

    try {
      const requestedVariations = variations || settings.variations || 4;
      const generatedSvgs = await this.aiService.generateMultiple(
        {
          prompt,
          referenceSvgs,
          model,
          providerId,
        },
        requestedVariations,
      );
      const safeResults = sanitizeGeneratedSvgs(generatedSvgs);

      if (safeResults.length === 0) {
        throw new Error("Generated SVG content failed validation and was blocked.");
      }

      if (safeResults.length < generatedSvgs.length) {
        this.uiAdapter.notify({
          type: "warning",
          message: "One or more SVG results were blocked because they failed security validation.",
        });
      }

      if (safeResults.length < requestedVariations) {
        this.uiAdapter.notify({
          type: "warning",
          message: `Model returned ${safeResults.length} of ${requestedVariations} requested variations.`,
        });
      }

      this.uiAdapter.notify({ type: "success", message: "SVGs generated successfully" });
      return {
        svgs: safeResults,
        prompt,
        model,
        generatedAt: Date.now(),
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to generate SVG. Please try again.";
      console.error("Generation failed:", error);
      this.uiAdapter.notify({
        type: "error",
        message: errorMessage,
      });
      return { svgs: [] };
    }
  }
}

function sanitizeGeneratedSvgs(svgs: string[]): string[] {
  return svgs.map((svg) => sanitizeSvgMarkup(svg)).filter((svg): svg is string => Boolean(svg));
}
