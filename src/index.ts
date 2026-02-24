import "./ui/components/app-header";
import "./ui/components/model-dropdown";
import "./ui/components/generator-controls";
import "./ui/components/results-grid";
import { appComposition } from "./core/app/composition-root";
import { showAlert } from "./core/utils/alert";
import { APP_EVENTS } from "./core/constants/events";
import { sanitizeSvgMarkup } from "./core/utils/svg-sanitizer";

function sanitizeGeneratedSvgs(svgs: string[]): string[] {
  return svgs.map((svg) => sanitizeSvgMarkup(svg)).filter((svg): svg is string => Boolean(svg));
}

document.addEventListener("DOMContentLoaded", () => {
  window.addEventListener(APP_EVENTS.START_GENERATION, async (e: Event) => {
    const customEvent = e as CustomEvent;
    const { prompt, referenceSvgs, model, providerId, variations } = customEvent.detail;

    if (!model || !providerId) {
      showAlert({
        type: "error",
        message: "Please select a model to generate with.",
      });
      return;
    }

    const settings = appComposition.settingsRepository.getSettings();
    const activeKeyId = settings.activeKeys[providerId];
    const activeKey = settings.apiKeys.find((key) => key.id === activeKeyId);

    if (!activeKey) {
      showAlert({
        type: "error",
        message:
          "Please configure and select an API key for the chosen provider in the API Keys tab.",
      });
      window.location.href = "/settings/";
      return;
    }

    const provider = appComposition.providerRegistry.getProvider(providerId);

    if (!provider) {
      showAlert({
        type: "error",
        message: `Provider ${providerId} not found`,
      });
      return;
    }

    window.dispatchEvent(new Event(APP_EVENTS.GENERATION_STARTED));

    try {
      const requestedVariations = variations || settings.variations || 4;
      let results: string[];

      try {
        results = await appComposition.aiService.generateMultiple(
          {
            prompt,
            referenceSvgs,
            model,
            providerId,
          },
          requestedVariations,
        );
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "";
        const shouldFallbackToSingle =
          providerId === "gcp" &&
          requestedVariations > 1 &&
          /Multiple candidates is not enabled for this model/i.test(errorMessage);

        if (!shouldFallbackToSingle) {
          throw error;
        }

        showAlert({
          type: "warning",
          message: `Model ${model} does not support multiple candidates. Generated 1 variation instead.`,
        });

        results = await appComposition.aiService.generateMultiple(
          {
            prompt,
            referenceSvgs,
            model,
            providerId,
          },
          1,
        );
      }

      const safeResults = sanitizeGeneratedSvgs(results);
      if (safeResults.length === 0) {
        throw new Error("Generated SVG content failed validation and was blocked.");
      }

      if (safeResults.length < results.length) {
        showAlert({
          type: "warning",
          message: "One or more SVG results were blocked because they failed security validation.",
        });
      }

      const generatedAt = Date.now();

      window.dispatchEvent(
        new CustomEvent(APP_EVENTS.SVGEN_RESULTS, {
          detail: { svgs: safeResults, prompt, model, generatedAt },
        }),
      );
      showAlert({ type: "success", message: "SVGs generated successfully" });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to generate SVG. Please try again.";
      console.error("Generation failed:", error);
      showAlert({
        type: "error",
        message: errorMessage,
      });
      window.dispatchEvent(new CustomEvent(APP_EVENTS.SVGEN_RESULTS, { detail: { svgs: [] } }));
    } finally {
      window.dispatchEvent(new Event(APP_EVENTS.GENERATION_FINISHED));
    }
  });
});
