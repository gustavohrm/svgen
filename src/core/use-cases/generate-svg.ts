import { AppSettings } from "../modules/db/index";
import { AiProviderId, ProviderGenerateResult, TokenUsage } from "../types";
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
  usage?: TokenUsage;
}

export interface GenerationUiAdapter {
  notify(notification: { type: "error" | "warning" | "success"; message: string }): void;
  navigateToSettings(): void;
}

interface SettingsRepository {
  getSettings(): AppSettings;
  recordUsage(usage: {
    providerId: AiProviderId;
    model: string;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  }): AppSettings;
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
  ): Promise<ProviderGenerateResult>;
}

export const SANITIZER_GUIDANCE =
  "Avoid blocked tags (script, foreignObject, animate, animateMotion, animateTransform, set), inline on* attributes, external URLs, and blocked CSS patterns.";

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
      const firstPassGeneration = await this.aiService.generateMultiple(
        {
          prompt,
          referenceSvgs,
          model,
          providerId,
        },
        requestedVariations,
      );
      let aggregatedUsage = mergeUsage(undefined, firstPassGeneration.usage);
      const firstPassGeneratedSvgs = firstPassGeneration.svgs;
      const firstPassMerge = sanitizeAndMergeGeneratedSvgs(firstPassGeneratedSvgs);
      let safeResults = firstPassMerge.svgs;
      let initialSafeCount = safeResults.length;
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
        const refillPrompt = buildRefillPrompt(prompt, {
          missingCount: missingAfterFirstPass,
          requestedCount: requestedVariations,
          acceptedCount: safeResults.length,
          blockedCount: firstPassMerge.blockedCount,
          duplicateCount: firstPassMerge.duplicateCount,
        });
        const refillReferences = mergeReferenceSvgs(referenceSvgs, safeResults);

        const refillGeneration = await this.aiService.generateMultiple(
          {
            prompt: refillPrompt,
            referenceSvgs: refillReferences,
            model,
            providerId,
          },
          missingAfterFirstPass,
        );
        aggregatedUsage = mergeUsage(aggregatedUsage, refillGeneration.usage);
        refillPassGeneratedSvgs = refillGeneration.svgs;

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

      const refillRecovered = safeResults.length - initialSafeCount;

      if (refillAttempted && safeResults.length === requestedVariations) {
        hasWarnings = true;
        this.uiAdapter.notify({
          type: "warning",
          message: `The first model response returned fewer usable variations than requested; one refill pass recovered all ${refillRequestCount} missing variation(s).`,
        });
      }

      if (refillAttempted && safeResults.length < requestedVariations) {
        hasWarnings = true;
        this.uiAdapter.notify({
          type: "warning",
          message: `The model responses remained underfilled after one refill pass: requested ${requestedVariations} total variation(s), asked for ${refillRequestCount} more in refill, and recovered ${refillRecovered} safe SVG(s).`,
        });
      }

      if (!hasWarnings && safeResults.length === requestedVariations) {
        this.uiAdapter.notify({
          type: "success",
          message: buildSuccessMessage(aggregatedUsage),
        });
      }

      this.settingsRepository.recordUsage({
        providerId,
        model,
        inputTokens: aggregatedUsage?.inputTokens,
        outputTokens: aggregatedUsage?.outputTokens,
        totalTokens: aggregatedUsage?.totalTokens,
      });

      return {
        svgs: safeResults,
        prompt,
        model,
        generatedAt: Date.now(),
        usage: aggregatedUsage,
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

const numberFormatter = new Intl.NumberFormat("en-US");

function formatTokenCount(value: number | undefined): string {
  if (typeof value !== "number") {
    return "N/A";
  }

  return numberFormatter.format(value);
}

function buildSuccessMessage(usage: TokenUsage | undefined): string {
  if (!usage) {
    return "SVGs generated successfully";
  }

  return `SVGs generated successfully (${formatTokenCount(usage.inputTokens)} in / ${formatTokenCount(usage.outputTokens)} out)`;
}

function mergeUsage(
  current: TokenUsage | undefined,
  next: TokenUsage | undefined,
): TokenUsage | undefined {
  if (!current && !next) {
    return undefined;
  }

  const inputTokens =
    (typeof current?.inputTokens === "number" ? current.inputTokens : 0) +
    (typeof next?.inputTokens === "number" ? next.inputTokens : 0);
  const outputTokens =
    (typeof current?.outputTokens === "number" ? current.outputTokens : 0) +
    (typeof next?.outputTokens === "number" ? next.outputTokens : 0);
  const totalTokensFromProviders =
    (typeof current?.totalTokens === "number" ? current.totalTokens : 0) +
    (typeof next?.totalTokens === "number" ? next.totalTokens : 0);

  const hasInput =
    typeof current?.inputTokens === "number" || typeof next?.inputTokens === "number";
  const hasOutput =
    typeof current?.outputTokens === "number" || typeof next?.outputTokens === "number";
  const hasTotal =
    typeof current?.totalTokens === "number" || typeof next?.totalTokens === "number";

  const merged: TokenUsage = {};

  if (hasInput) {
    merged.inputTokens = inputTokens;
  }

  if (hasOutput) {
    merged.outputTokens = outputTokens;
  }

  if (hasTotal) {
    merged.totalTokens = totalTokensFromProviders;
  } else if (hasInput || hasOutput) {
    merged.totalTokens = inputTokens + outputTokens;
  }

  return merged;
}

/**
 * Constructs a refill prompt that requests a specific number of new SVG variations while preserving the original style family and enforcing distinctness.
 *
 * @param prompt - The original generation prompt to preserve context and constraints
 * @param missingCount - Number of additional variations to request (normalized to a positive integer)
 * @returns A refill prompt string tailored for a single refill pass requesting `missingCount` net-new, stylistically consistent, and distinct SVGs
 * Build a refill prompt that preserves style family while forcing distinct additions.
 *
 * @param prompt - The original generation prompt
 * @param feedback - Refilling context and first-pass failure hints
 * @returns Prompt text for a single refill pass
 */
interface RefillPromptFeedback {
  missingCount: number;
  requestedCount: number;
  acceptedCount: number;
  blockedCount: number;
  duplicateCount: number;
}

function buildRefillPrompt(prompt: string, feedback: RefillPromptFeedback): string {
  const normalizedMissingCount = normalizePositiveInt(feedback.missingCount);
  const normalizedRequestedCount = normalizePositiveInt(feedback.requestedCount);
  const normalizedAcceptedCount = Math.max(
    0,
    Math.min(
      normalizedRequestedCount,
      Number.isFinite(feedback.acceptedCount) ? Math.trunc(feedback.acceptedCount) : 0,
    ),
  );
  const normalizedBlockedCount =
    Number.isFinite(feedback.blockedCount) && feedback.blockedCount > 0
      ? Math.trunc(feedback.blockedCount)
      : 0;
  const normalizedDuplicateCount =
    Number.isFinite(feedback.duplicateCount) && feedback.duplicateCount > 0
      ? Math.trunc(feedback.duplicateCount)
      : 0;

  const failureHints: string[] = [];

  if (normalizedBlockedCount > 0) {
    failureHints.push(`Previous candidates were blocked by sanitization. ${SANITIZER_GUIDANCE}`);
  }

  if (normalizedDuplicateCount > 0) {
    failureHints.push(
      "Previous candidates included duplicates. Produce net-new compositions with different focal layout, motion direction, and color direction.",
    );
  }

  if (failureHints.length === 0) {
    failureHints.push(
      "Prior pass under-delivered count. Return fully formed, distinct SVG documents that satisfy the exact missing count.",
    );
  }

  return `${prompt}\n\n<refill_request>
  <missing_variations>${normalizedMissingCount}</missing_variations>
  <requested_variations_total>${normalizedRequestedCount}</requested_variations_total>
  <accepted_variations_so_far>${normalizedAcceptedCount}</accepted_variations_so_far>
  <failure_feedback>
    <blocked_after_sanitization>${normalizedBlockedCount}</blocked_after_sanitization>
    <duplicates_removed>${normalizedDuplicateCount}</duplicates_removed>
    <likely_failure_modes>${failureHints.join(" ")}</likely_failure_modes>
  </failure_feedback>
  <style_continuity>Preserve the same style family and design language as previously accepted SVGs.</style_continuity>
  <distinctness_requirements>Each new SVG must use a clearly distinct composition, motion direction, and color direction versus prior accepted outputs and versus other refill outputs.</distinctness_requirements>
  <pairwise_difference_rule>Every pair of refill SVGs must differ on at least two axes: composition, shape language, color direction, or motion profile.</pairwise_difference_rule>
  <novelty_rule>Return only net-new variations; do not duplicate or trivially mutate previous outputs.</novelty_rule>
  <sanitizer_compatibility>${SANITIZER_GUIDANCE}</sanitizer_compatibility>
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
 * Sanitize raw SVGs and merge only unique safe outputs with previously accepted SVGs.
 *
 * @param rawSvgs - Raw generated SVG strings from a model call
 * @param existingSvgs - Previously accepted sanitized SVG strings
 * @returns Merged sanitized outputs plus blocked and duplicate counters
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
