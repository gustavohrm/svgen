import { AppSettings } from "../modules/db/index";
import { AiProviderId } from "../types";
import { normalizePositiveInt } from "../utils/number";
import { sanitizeSvgMarkup } from "../utils/svg-sanitizer";
import { mapGenerationErrorToUserMessage } from "../services/ai/error-messages";

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
      const requestedVariationsInput =
        Number.isFinite(variations) && variations > 0 ? variations : (settings.variations ?? 4);
      const requestedVariations = normalizePositiveInt(requestedVariationsInput);
      const firstPassGeneratedSvgs = await this.aiService.generateMultiple(
        {
          prompt,
          referenceSvgs,
          model,
          providerId,
        },
        requestedVariations,
      );
      const firstPassMerge = sanitizeAndMergeGeneratedSvgs(firstPassGeneratedSvgs);
      let safeResults = firstPassMerge.svgs;
      let refillRequestCount = 0;
      let refillPassGeneratedSvgs: string[] = [];
      let refillPassMerge: SanitizedMergeResult = {
        svgs: safeResults,
        blockedCount: 0,
        duplicateCount: 0,
      };

      const missingAfterFirstPass = Math.max(0, requestedVariations - safeResults.length);

      if (missingAfterFirstPass > 0) {
        refillRequestCount = missingAfterFirstPass;
        const refillPrompt = buildRefillPrompt(prompt, missingAfterFirstPass);
        const refillReferences = mergeReferenceSvgs(referenceSvgs, safeResults);

        refillPassGeneratedSvgs = await this.aiService.generateMultiple(
          {
            prompt: refillPrompt,
            referenceSvgs: refillReferences,
            model,
            providerId,
          },
          missingAfterFirstPass,
        );

        refillPassMerge = sanitizeAndMergeGeneratedSvgs(refillPassGeneratedSvgs, safeResults);
        safeResults = refillPassMerge.svgs;
      }

      if (safeResults.length > requestedVariations) {
        safeResults = safeResults.slice(0, requestedVariations);
      }

      if (safeResults.length === 0) {
        throw new Error("Generated SVG content failed validation and was blocked.");
      }

      let hasWarnings = false;
      const blockedCount = firstPassMerge.blockedCount + refillPassMerge.blockedCount;
      const duplicateCount = firstPassMerge.duplicateCount + refillPassMerge.duplicateCount;
      const refillAttempted = refillRequestCount > 0;

      if (blockedCount > 0) {
        hasWarnings = true;
        this.uiAdapter.notify({
          type: "warning",
          message: `${blockedCount} SVG result(s) were blocked because they failed security validation.`,
        });
      }

      if (duplicateCount > 0) {
        hasWarnings = true;
        this.uiAdapter.notify({
          type: "warning",
          message: `${duplicateCount} duplicate SVG result(s) were removed while merging generation passes.`,
        });
      }

      if (refillAttempted && safeResults.length === requestedVariations) {
        hasWarnings = true;
        this.uiAdapter.notify({
          type: "warning",
          message: `Initial results underfilled after sanitization; a single refill pass recovered all ${refillRequestCount} missing variation(s).`,
        });
      }

      if (refillAttempted && safeResults.length < requestedVariations) {
        hasWarnings = true;
        this.uiAdapter.notify({
          type: "warning",
          message: `Initial results underfilled after sanitization; one refill pass requested ${refillRequestCount} more variation(s) but only ${safeResults.length} of ${requestedVariations} safe SVGs are available.`,
        });
      }

      if (!hasWarnings && safeResults.length === requestedVariations) {
        this.uiAdapter.notify({ type: "success", message: "SVGs generated successfully" });
      }
      return {
        svgs: safeResults,
        prompt,
        model,
        generatedAt: Date.now(),
      };
    } catch (error: unknown) {
      const errorMessage = mapGenerationErrorToUserMessage(error, { providerId });
      console.error("Generation failed:", error);
      this.uiAdapter.notify({
        type: "error",
        message: errorMessage,
      });
      return { svgs: [] };
    }
  }
}

/**
 * Constructs a refill prompt that requests a specific number of new SVG variations while preserving the original style family and enforcing distinctness.
 *
 * @param prompt - The original generation prompt to preserve context and constraints
 * @param missingCount - Number of additional variations to request (normalized to a positive integer)
 * @returns A refill prompt string tailored for a single refill pass requesting `missingCount` net-new, stylistically consistent, and distinct SVGs
 */
function buildRefillPrompt(prompt: string, missingCount: number): string {
  const normalizedMissingCount = normalizePositiveInt(missingCount);

  return `${prompt}\n\n<refill_request>
  <missing_variations>${normalizedMissingCount}</missing_variations>
  <style_continuity>Preserve the same style family and design language as previously accepted SVGs.</style_continuity>
  <distinctness_requirements>Each new SVG must use a clearly distinct composition, motion direction, and color direction versus prior accepted outputs and versus other refill outputs.</distinctness_requirements>
  <novelty_rule>Return only net-new variations; do not duplicate or trivially mutate previous outputs.</novelty_rule>
</refill_request>`;
}

/**
 * Merge reference SVG arrays while preserving order and removing duplicates.
 *
 * @param existingReferences - Original user-provided references
 * @param acceptedSvgs - Already accepted generated SVGs
 * @returns A single deduplicated reference list
 */
function mergeReferenceSvgs(existingReferences: string[], acceptedSvgs: string[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const svg of [...existingReferences, ...acceptedSvgs]) {
    if (seen.has(svg)) {
      continue;
    }

    seen.add(svg);
    merged.push(svg);
  }

  return merged;
}

interface SanitizedMergeResult {
  svgs: string[];
  blockedCount: number;
  duplicateCount: number;
}

/**
 * Sanitize raw generated SVG markup and merge unique results with previously accepted sanitized SVGs.
 *
 * @param rawSvgs - Generated SVG strings to sanitize and evaluate
 * @param existingSvgs - Previously accepted sanitized SVG strings to preserve and deduplicate against
 * @returns An object with `svgs` (merged sanitized SVG strings), `blockedCount` (number of inputs removed by sanitation), and `duplicateCount` (number of duplicates skipped)
 */
function sanitizeAndMergeGeneratedSvgs(
  rawSvgs: string[],
  existingSvgs: string[] = [],
): SanitizedMergeResult {
  const seen = new Set(existingSvgs);
  const mergedSvgs = [...existingSvgs];
  let blockedCount = 0;
  let duplicateCount = 0;

  for (const rawSvg of rawSvgs) {
    const sanitizedSvg = sanitizeSvgMarkup(rawSvg);
    if (!sanitizedSvg) {
      blockedCount += 1;
      continue;
    }

    if (seen.has(sanitizedSvg)) {
      duplicateCount += 1;
      continue;
    }

    seen.add(sanitizedSvg);
    mergedSvgs.push(sanitizedSvg);
  }

  return {
    svgs: mergedSvgs,
    blockedCount,
    duplicateCount,
  };
}
