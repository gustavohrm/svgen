import { APP_EVENTS } from "../../core/constants/events";
import { emitAppEvent } from "../../core/events/app-events";
import type { AiProviderId } from "../../core/types";
import { ModelDropdown } from "./model-dropdown";
import { DEFAULT_SYSTEM_PROMPT } from "../../core/services/ai/index";
import { appComposition } from "../../core/app/composition-root";
import {
  renderGeneratorControls,
  setGenerateButtonLoading,
  setGenerateButtonReady,
} from "./generator-controls.template";
import { createAttachmentPreviewNode } from "./generator-controls.attachments";
import {
  clampTemperature,
  clampVariations,
  DEFAULT_TEMPERATURE,
  hidePanel,
  showPanel,
  togglePanel,
} from "./generator-controls.settings";

const settingsRepository = appComposition.settingsRepository;

export class GeneratorControls extends HTMLElement {
  private referenceFiles: File[] = [];
  private isGenerating: boolean = false;
  private attachmentsRenderToken = 0;

  private handleDocumentClick = (e: Event) => {
    const settingsBtn = this.querySelector("#settings-btn") as HTMLButtonElement | null;
    const settingsMenu = this.querySelector("#settings-menu") as HTMLDivElement | null;

    if (
      settingsBtn &&
      settingsMenu &&
      !settingsBtn.contains(e.target as Node) &&
      !settingsMenu.contains(e.target as Node)
    ) {
      hidePanel(settingsMenu);
    }
  };

  private handleGenerationStarted = () => {
    this.isGenerating = true;
    const generateBtn = this.querySelector("#generate-btn") as HTMLButtonElement | null;
    if (generateBtn) {
      setGenerateButtonLoading(generateBtn);
    }
  };

  private handleGenerationFinished = () => {
    this.isGenerating = false;
    const generateBtn = this.querySelector("#generate-btn") as HTMLButtonElement | null;
    if (generateBtn) {
      setGenerateButtonReady(generateBtn);
    }
  };

  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
    this.attachEvents();
  }

  disconnectedCallback() {
    window.removeEventListener(APP_EVENTS.GENERATION_STARTED, this.handleGenerationStarted);
    window.removeEventListener(APP_EVENTS.GENERATION_FINISHED, this.handleGenerationFinished);
    document.removeEventListener("click", this.handleDocumentClick);
  }

  private render() {
    this.classList.add("block", "w-full");
    this.innerHTML = renderGeneratorControls(settingsRepository.getSettings());

    // Delay attach until element is painted
    requestAnimationFrame(() => {
      void this.renderAttachments().catch((error: unknown) => {
        console.error("Failed to render attachments:", error);
      });
    });
  }

  private async renderAttachments() {
    const container = this.querySelector("#attachments-container") as HTMLDivElement;
    if (!container) return;

    const renderToken = ++this.attachmentsRenderToken;
    const filesSnapshot = [...this.referenceFiles];

    container.innerHTML = "";

    try {
      for (let i = 0; i < filesSnapshot.length; i++) {
        const file = filesSnapshot[i];
        const div = await createAttachmentPreviewNode(file, i);

        if (renderToken !== this.attachmentsRenderToken) {
          return;
        }

        if (this.referenceFiles[i] !== file) {
          continue;
        }

        container.appendChild(div);
      }
    } catch (error: unknown) {
      if (renderToken !== this.attachmentsRenderToken) {
        return;
      }

      container.innerHTML = "";
      const fallback = document.createElement("div");
      fallback.className = "text-xs text-text-muted px-2 py-1";
      fallback.textContent = "Unable to render attachments.";
      container.appendChild(fallback);
      console.error("Failed to render attachment previews:", error);
    }
  }

  private attachEvents() {
    // Component level events
    const referenceInput = this.querySelector("#reference-input") as HTMLInputElement;
    const attachmentsContainer = this.querySelector("#attachments-container") as HTMLDivElement;
    const settingsBtn = this.querySelector("#settings-btn") as HTMLButtonElement;
    const settingsMenu = this.querySelector("#settings-menu") as HTMLDivElement;
    const variationInput = this.querySelector("#variation-input") as HTMLInputElement;
    const temperatureInput = this.querySelector("#temperature-input") as HTMLInputElement;
    const editSystemPromptBtn = this.querySelector("#edit-system-prompt-btn") as HTMLButtonElement;
    const systemPromptModal = this.querySelector("#system-prompt-modal") as HTMLDivElement;
    const systemPromptModalInput = this.querySelector(
      "#system-prompt-modal-input",
    ) as HTMLTextAreaElement;
    const closeSystemPromptModalBtn = this.querySelector(
      "#close-system-prompt-modal-btn",
    ) as HTMLButtonElement;
    const cancelSystemPromptBtn = this.querySelector(
      "#cancel-system-prompt-btn",
    ) as HTMLButtonElement;
    const saveSystemPromptBtn = this.querySelector("#save-system-prompt-btn") as HTMLButtonElement;

    const closeSystemPromptModal = () => {
      if (systemPromptModal) {
        hidePanel(systemPromptModal);
      }
    };

    settingsBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (settingsMenu) {
        togglePanel(settingsMenu);
      }
    });

    variationInput?.addEventListener("input", (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      if (Number.isNaN(val)) return;
      settingsRepository.setVariations(clampVariations(val));
    });

    variationInput?.addEventListener("blur", (e) => {
      const val = clampVariations(parseInt((e.target as HTMLInputElement).value, 10));
      (e.target as HTMLInputElement).value = val.toString();
      settingsRepository.setVariations(val);
    });

    temperatureInput?.addEventListener("input", (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      if (Number.isNaN(value)) return;
      settingsRepository.setTemperature(clampTemperature(value));
    });

    temperatureInput?.addEventListener("blur", (e) => {
      const target = e.target as HTMLInputElement;
      const value = parseFloat(target.value);
      const normalized = Number.isNaN(value) ? DEFAULT_TEMPERATURE : clampTemperature(value);
      target.value = normalized.toFixed(1);
      settingsRepository.setTemperature(normalized);
    });

    editSystemPromptBtn?.addEventListener("click", () => {
      if (!systemPromptModal || !systemPromptModalInput) return;

      const savedPrompt = settingsRepository.getSettings().systemPrompt?.trim();
      systemPromptModalInput.value = savedPrompt || DEFAULT_SYSTEM_PROMPT;

      if (settingsMenu) {
        hidePanel(settingsMenu);
      }

      showPanel(systemPromptModal);
      requestAnimationFrame(() => systemPromptModalInput.focus());
    });

    closeSystemPromptModalBtn?.addEventListener("click", closeSystemPromptModal);
    cancelSystemPromptBtn?.addEventListener("click", closeSystemPromptModal);

    saveSystemPromptBtn?.addEventListener("click", () => {
      if (!systemPromptModalInput) return;

      const value = systemPromptModalInput.value.trim();
      const normalizedDefault = DEFAULT_SYSTEM_PROMPT.trim();
      settingsRepository.setSystemPrompt(value === normalizedDefault ? "" : value);
      closeSystemPromptModal();
    });

    systemPromptModal?.addEventListener("click", (e) => {
      if (e.target === systemPromptModal) {
        closeSystemPromptModal();
      }
    });

    document.addEventListener("click", this.handleDocumentClick);

    // File uploads
    referenceInput?.addEventListener("change", (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      const newFiles = files.filter(
        (f) => f.type === "image/svg+xml" || f.name.endsWith(".svg") || f.name.endsWith(".SVG"),
      );
      this.referenceFiles = [...this.referenceFiles, ...newFiles];
      void this.renderAttachments().catch((error: unknown) => {
        console.error("Failed to render attachments:", error);
      });
    });

    // Remove file (Event delegation for attachments)
    attachmentsContainer?.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest("button[data-index]");
      if (!btn) return;

      const idx = parseInt(btn.getAttribute("data-index")!, 10);
      this.referenceFiles.splice(idx, 1);
      void this.renderAttachments().catch((error: unknown) => {
        console.error("Failed to render attachments:", error);
      });

      if (this.referenceFiles.length === 0 && referenceInput) {
        referenceInput.value = "";
      }
    });

    // Generation Submit
    this.addEventListener("click", async (e) => {
      const btn = (e.target as HTMLElement).closest("#generate-btn");
      if (!btn) return;

      const promptInput = this.querySelector("#prompt-input") as HTMLTextAreaElement | null;
      if (!promptInput || this.isGenerating) return;

      const prompt = promptInput.value.trim();
      const selector = this.querySelector("#model-selector") as ModelDropdown | null;
      const model = selector?.selectedModel;
      const providerId = (selector?.providerId || undefined) as AiProviderId | undefined;

      if (!prompt) return;

      const svgsAsText = await Promise.all(this.referenceFiles.map((file) => file.text()));
      const variations = settingsRepository.getSettings().variations || 1;

      emitAppEvent(APP_EVENTS.START_GENERATION, {
        prompt,
        referenceSvgs: svgsAsText,
        model,
        providerId,
        variations,
      });
    });

    // Subscribing to global events generated by index.ts Orchestrator
    window.addEventListener(APP_EVENTS.GENERATION_STARTED, this.handleGenerationStarted);
    window.addEventListener(APP_EVENTS.GENERATION_FINISHED, this.handleGenerationFinished);
  }
}

customElements.define("generator-controls", GeneratorControls);
