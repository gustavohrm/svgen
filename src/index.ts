import "./ui/components/index";
import { createAiService } from "./core/services/ai/index";
import { createDefaultProviderRegistry } from "./core/services/ai/providers/index";
import { db } from "./core/modules/db/index";
import { showAlert } from "./core/utils/alert";

// Dependency Injection Setup
const providerRegistry = createDefaultProviderRegistry();
const aiService = createAiService(db, providerRegistry);

document.addEventListener("DOMContentLoaded", () => {
  // Tab Switching Logic
  const genTabBtn = document.getElementById("nav-generation");
  const keysTabBtn = document.getElementById("nav-keys");
  const galleryTabBtn = document.getElementById("nav-gallery"); // New: Gallery tab button

  const genContent = document.getElementById("tab-generation");
  const keysContent = document.getElementById("tab-keys");
  const galleryContent = document.getElementById("tab-gallery"); // New: Gallery tab content

  const switchTab = (tab: "generation" | "keys" | "gallery") => {
    // Reset all
    [genTabBtn, keysTabBtn, galleryTabBtn].forEach((btn) => {
      btn?.classList.remove("text-primary", "border-b-2", "border-primary");
      btn?.classList.add("text-text-secondary");
    });
    [genContent, keysContent, galleryContent].forEach((content) => {
      content?.classList.add("hidden");
    });

    // Activate selected tab
    if (tab === "generation") {
      genTabBtn?.classList.add("text-primary", "border-b-2", "border-primary");
      genTabBtn?.classList.remove("text-text-secondary");
      genContent?.classList.remove("hidden");
    } else if (tab === "keys") {
      keysTabBtn?.classList.add("text-primary", "border-b-2", "border-primary");
      keysTabBtn?.classList.remove("text-text-secondary");
      keysContent?.classList.remove("hidden");
    } else if (tab === "gallery") {
      galleryTabBtn?.classList.add("text-primary", "border-b-2", "border-primary");
      galleryTabBtn?.classList.remove("text-text-secondary");
      galleryContent?.classList.remove("hidden");
      window.dispatchEvent(new Event("gallery-opened")); // Dispatch event when gallery is opened
    }
  };

  genTabBtn?.addEventListener("click", () => switchTab("generation"));
  keysTabBtn?.addEventListener("click", () => switchTab("keys"));
  galleryTabBtn?.addEventListener("click", () => switchTab("gallery")); // New: Gallery tab click listener

  // Default to generation tab
  switchTab("generation");

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
    const provider = providerRegistry.getProvider(providerId);

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

      window.dispatchEvent(
        new CustomEvent("svgen-results", { detail: { svgs: results, prompt, model } }),
      );
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
  // Export registry globally so components can use it (temporary until full DI in components)
  (window as any).providerRegistry = providerRegistry;
});
