import "./ui/components/app-header";
import "./ui/components/model-dropdown";
import { createAiService } from "./core/services/ai/index";
import { createDefaultProviderRegistry } from "./core/services/ai/providers/index";
import "./ui/components/generator-controls";
import { db } from "./core/modules/db/index";
import "./ui/components/results-grid";
import { showAlert } from "./core/utils/alert";
import { APP_EVENTS } from "./core/constants/events";

// Dependency Injection Setup
const providerRegistry = createDefaultProviderRegistry();
const aiService = createAiService(db, providerRegistry);

/** --- ORCHESTRATION --- */
document.addEventListener("DOMContentLoaded", () => {
  window.addEventListener(APP_EVENTS.START_GENERATION, async (e: Event) => {
    const customEvent = e as CustomEvent;
    const { prompt, referenceSvgs, model, providerId } = customEvent.detail;

    if (!model || !providerId) {
      showAlert({
        type: "error",
        message: "Please select a model to generate with.",
      });
      return;
    }

    // Check if configuration exists
    const settings = db.getSettings();
    const activeKeyId = settings.activeKeys[providerId];
    const activeKey = settings.apiKeys.find((k) => k.id === activeKeyId);

    if (!activeKey) {
      showAlert({
        type: "error",
        message: `Please configure and select an API key for the chosen provider in the API Keys tab.`,
      });
      window.location.href = "/settings/";
      return;
    }

    const provider = providerRegistry.getProvider(providerId);

    if (!provider) {
      showAlert({
        type: "error",
        message: `Provider ${providerId} not found`,
      });
      return;
    }

    window.dispatchEvent(new Event(APP_EVENTS.GENERATION_STARTED));

    try {
      const results = await aiService.generateMultiple(
        {
          prompt,
          referenceSvgs,
          model,
          providerId,
        },
        settings.variations || 4,
      );

      window.dispatchEvent(
        new CustomEvent(APP_EVENTS.SVGEN_RESULTS, { detail: { svgs: results, prompt, model } }),
      );
      showAlert({ type: "success", message: "SVGs generated successfully" });
    } catch (error: unknown) {
      // Use stricter error type than any
      const errorMessage =
        error instanceof Error ? error.message : "Failed to generate SVG. Please try again.";
      console.error("Generation failed:", error);
      showAlert({
        type: "error",
        message: errorMessage,
      });
      // clear the skeleton
      window.dispatchEvent(new CustomEvent(APP_EVENTS.SVGEN_RESULTS, { detail: { svgs: [] } }));
    } finally {
      window.dispatchEvent(new Event(APP_EVENTS.GENERATION_FINISHED));
    }
  });
});
