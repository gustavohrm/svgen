import "./ui/components/index";
import { aiService } from "./core/services/ai/index";
import { db } from "./core/modules/db/index";
import { showAlert } from "./core/utils/alert";

import { getProvider } from "./core/services/ai/providers/index";

document.addEventListener("DOMContentLoaded", () => {
  // Tab Switching Logic
  const genTabBtn = document.getElementById("nav-generation");
  const keysTabBtn = document.getElementById("nav-keys");
  const genContent = document.getElementById("tab-generation");
  const keysContent = document.getElementById("tab-keys");

  const switchTab = (tab: "generation" | "keys") => {
    if (tab === "generation") {
      genTabBtn?.classList.add("text-primary", "border-b-2", "border-primary");
      genTabBtn?.classList.remove("text-text-secondary");
      keysTabBtn?.classList.remove("text-primary", "border-b-2", "border-primary");
      keysTabBtn?.classList.add("text-text-secondary");

      genContent?.classList.remove("hidden");
      keysContent?.classList.add("hidden");
    } else {
      keysTabBtn?.classList.add("text-primary", "border-b-2", "border-primary");
      keysTabBtn?.classList.remove("text-text-secondary");
      genTabBtn?.classList.remove("text-primary", "border-b-2", "border-primary");
      genTabBtn?.classList.add("text-text-secondary");

      keysContent?.classList.remove("hidden");
      genContent?.classList.add("hidden");
    }
  };

  genTabBtn?.addEventListener("click", () => switchTab("generation"));
  keysTabBtn?.addEventListener("click", () => switchTab("keys"));

  // Global orchestration
  window.addEventListener("start-generation", async (e: Event) => {
    const customEvent = e as CustomEvent;
    const { prompt, referenceSvgs, model } = customEvent.detail;

    // Check if configuration exists
    const settings = db.getSettings();
    const activeKey = settings.apiKeys.find((k) => k.id === settings.activeKeyId);

    if (!activeKey) {
      showAlert({
        type: "error",
        message: "Please configure and select an API key in the API Keys tab.",
      });
      switchTab("keys");
      return;
    }

    if (!model) {
      showAlert({
        type: "error",
        message: "Please select a model to generate with.",
      });
      return;
    }

    const providerId = activeKey.providerId;
    const provider = getProvider(providerId);

    if (!provider) {
      showAlert({
        type: "error",
        message: `Provider ${providerId} not found`,
      });
      return;
    }

    window.dispatchEvent(new Event("generation-started"));

    try {
      const results = await aiService.generateMultiple(
        {
          prompt,
          referenceSvgs,
          model,
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

  // Export globally for components to trigger re-renders or switches
  (window as any).switchTab = switchTab;
});
