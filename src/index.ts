import "./ui/components/index";
import { aiService } from "./core/services/ai/index";
import { db } from "./core/modules/db/index";
import { showAlert } from "./core/utils/alert";

document.addEventListener("DOMContentLoaded", () => {
  // Global orchestration
  window.addEventListener("start-generation", async (e: Event) => {
    const customEvent = e as CustomEvent;
    const { prompt, referenceSvgs } = customEvent.detail;

    // Check if configuration exists
    const settings = db.getSettings();
    if (settings.selectedProvider === "openrouter" && !settings.openRouterKey) {
      showAlert({ type: "error", message: "Please configure your OpenRouter API key in settings" });
      window.dispatchEvent(new Event("open-settings"));
      return;
    }
    if (settings.selectedProvider === "gcp" && !settings.gcpKey) {
      showAlert({ type: "error", message: "Please configure your GCP API key in settings" });
      window.dispatchEvent(new Event("open-settings"));
      return;
    }

    window.dispatchEvent(new Event("generation-started"));

    try {
      const results = await aiService.generateMultiple(
        {
          prompt,
          referenceSvgs,
          model: settings.selectedModel,
        },
        settings.variations,
      );

      window.dispatchEvent(new CustomEvent("svgen-results", { detail: { svgs: results } }));
      showAlert({ type: "success", message: "SVGs generated successfully" });
    } catch (error: any) {
      console.error("Generation failed:", error);
      showAlert({
        type: "error",
        message: error.message || "Failed to generate SVG. Please try again.",
      });
      // clear the skeleton
      window.dispatchEvent(new CustomEvent("svgen-results", { detail: { svgs: [] } }));
    } finally {
      window.dispatchEvent(new Event("generation-finished"));
    }
  });
});
