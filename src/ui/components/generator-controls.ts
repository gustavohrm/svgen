import { APP_EVENTS } from "../../core/constants/events";
import { emitAppEvent, onAppEvent, type SvgResultsDetail } from "../../core/events/app-events";
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
import { isColorPaletteId } from "../../core/constants/color-palettes";
import { updatePaletteSelectionUi } from "./generator-controls.palette";
import { QUICK_ACTION_PROMPTS } from "../../core/constants/quick-actions";

const settingsRepository = appComposition.settingsRepository;

export class GeneratorControls extends HTMLElement {
  private referenceFiles: File[] = [];
  private isGenerating: boolean = false;
  private hasResults: boolean = false;
  private attachmentsRenderToken = 0;
  private unsubscribeEvents: Array<() => void> = [];

  private _onClick = (e: Event) => {
    const btn = (e.target as HTMLElement).closest("#generate-btn");
    if (btn) {
      void this.handleGenerate();
    }
  };

  private handleDocumentClick = (e: Event) => {
    const colorPaletteBtn = this.querySelector("#color-palette-btn") as HTMLButtonElement | null;
    const colorPaletteMenu = this.querySelector("#color-palette-menu") as HTMLDivElement | null;
    const settingsBtn = this.querySelector("#settings-btn") as HTMLButtonElement | null;
    const settingsMenu = this.querySelector("#settings-menu") as HTMLDivElement | null;

    if (
      colorPaletteBtn &&
      colorPaletteMenu &&
      !colorPaletteBtn.contains(e.target as Node) &&
      !colorPaletteMenu.contains(e.target as Node)
    ) {
      hidePanel(colorPaletteMenu);
    }

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

  private handleSVGenResults = (detail: SvgResultsDetail) => {
    this.hasResults = (detail?.svgs?.length ?? 0) > 0;
    this.updateQuickActionsVisibility();
  };

  private fisherYatesShuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  private updateQuickActionsVisibility() {
    const container = this.querySelector("#quick-actions-container") as HTMLDivElement | null;
    const promptInput = this.querySelector("#prompt-input") as HTMLTextAreaElement | null;
    if (!container || !promptInput) return;

    const isInputEmpty = promptInput.value.trim().length === 0;

    if (this.hasResults || !isInputEmpty) {
      container.classList.add("hidden");
    } else {
      container.classList.remove("hidden");
      if (container.children.length === 0) {
        this.renderQuickActions();
      }
    }
  }

  private renderQuickActions() {
    const container = this.querySelector("#quick-actions-container") as HTMLDivElement | null;
    if (!container) return;

    // Pick 4-5 random prompts
    const shuffled = this.fisherYatesShuffle([...QUICK_ACTION_PROMPTS]);
    const selected = shuffled.slice(0, 4 + Math.floor(Math.random() * 2));

    const fragment = document.createDocumentFragment();

    selected.forEach((prompt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "quick-action-btn px-3 py-1.5 text-xs bg-transparent hover:bg-surface-hover border border-border/40 hover:border-border-bright rounded-lg text-text-secondary hover:text-text transition cursor-pointer";
      btn.dataset.prompt = prompt;
      btn.textContent = prompt;

      btn.addEventListener("click", () => {
        const promptInput = this.querySelector("#prompt-input") as HTMLTextAreaElement | null;
        if (promptInput) {
          promptInput.value = prompt;
          this.updateQuickActionsVisibility();
          promptInput.focus();
        }
      });

      fragment.appendChild(btn);
    });

    container.innerHTML = "";
    container.appendChild(fragment);
  }

  private handleGenerate = async () => {
    const promptInput = this.querySelector("#prompt-input") as HTMLTextAreaElement | null;
    if (!promptInput || this.isGenerating) return;

    const prompt = promptInput.value.trim();
    const selector = this.querySelector("#model-selector") as ModelDropdown | null;
    const model = selector?.selectedModel;
    const providerId = (selector?.providerId || undefined) as AiProviderId | undefined;

    if (!prompt) return;

    let svgsAsText: string[] = [];
    if (this.referenceFiles.length > 0) {
      const results = await Promise.allSettled(this.referenceFiles.map((file) => file.text()));
      svgsAsText = results
        .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
        .map((r) => r.value);

      if (svgsAsText.length === 0) {
        console.error("Failed to read any of the reference SVGs.");
        return;
      }

      const failures = results.filter((r) => r.status === "rejected");
      if (failures.length > 0) {
        console.warn(`${failures.length} reference SVG(s) failed to load and were skipped.`);
      }
    }

    const variations = settingsRepository.getSettings().variations || 1;

    emitAppEvent(APP_EVENTS.START_GENERATION, {
      prompt,
      referenceSvgs: svgsAsText,
      model,
      providerId,
      variations,
    });
  };

  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
    this.attachEvents();
    this.updateQuickActionsVisibility();
  }

  disconnectedCallback() {
    for (const u of this.unsubscribeEvents) u();
    this.unsubscribeEvents = [];
    document.removeEventListener("click", this.handleDocumentClick);
    this.removeEventListener("click", this._onClick);
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
    const colorPaletteBtn = this.querySelector("#color-palette-btn") as HTMLButtonElement | null;
    const colorPaletteMenu = this.querySelector("#color-palette-menu") as HTMLDivElement | null;
    const colorPaletteOptions = this.querySelectorAll<HTMLButtonElement>(
      "button[data-color-palette-id]",
    );
    const referenceInput = this.querySelector("#reference-input") as HTMLInputElement;
    const attachmentsContainer = this.querySelector("#attachments-container") as HTMLDivElement;
    const settingsBtn = this.querySelector("#settings-btn") as HTMLButtonElement;
    const settingsMenu = this.querySelector("#settings-menu") as HTMLDivElement;
    const variationInput = this.querySelector("#variation-input") as HTMLInputElement;
    const temperatureInput = this.querySelector("#temperature-input") as HTMLInputElement;
    const stepButtons = this.querySelectorAll<HTMLButtonElement>("button[data-step-target]");
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

    colorPaletteBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (colorPaletteMenu) {
        if (settingsMenu) {
          hidePanel(settingsMenu);
        }
        togglePanel(colorPaletteMenu);
      }
    });

    colorPaletteOptions.forEach((option) => {
      option.addEventListener("click", () => {
        const paletteId = option.dataset.colorPaletteId;
        if (!isColorPaletteId(paletteId)) {
          return;
        }

        settingsRepository.setColorPaletteId(paletteId);
        updatePaletteSelectionUi({
          paletteId,
          previewNode: colorPaletteBtn,
          optionNodes: colorPaletteOptions,
        });

        if (colorPaletteMenu) {
          hidePanel(colorPaletteMenu);
        }
      });
    });

    settingsBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (settingsMenu) {
        if (colorPaletteMenu) {
          hidePanel(colorPaletteMenu);
        }
        togglePanel(settingsMenu);
      }
    });

    variationInput?.addEventListener("input", (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      if (Number.isNaN(val)) return;
      settingsRepository.setVariations(clampVariations(val));
    });

    variationInput?.addEventListener("blur", (e) => {
      const val = clampVariations(parseFloat((e.target as HTMLInputElement).value));
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

    stepButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const targetId = button.dataset.stepTarget;
        const delta = Number(button.dataset.stepDelta);
        if (!targetId || !Number.isFinite(delta)) return;

        if (targetId === "variation-input" && variationInput) {
          const current = parseFloat(variationInput.value);
          const base = Number.isNaN(current)
            ? (settingsRepository.getSettings().variations ?? 1)
            : current;
          const next = clampVariations(base + delta);

          variationInput.value = next.toString();
          settingsRepository.setVariations(next);
          variationInput.focus();
          return;
        }

        if (targetId === "temperature-input" && temperatureInput) {
          const current = parseFloat(temperatureInput.value);
          const base = Number.isNaN(current)
            ? (settingsRepository.getSettings().temperature ?? DEFAULT_TEMPERATURE)
            : current;
          const next = clampTemperature(Math.round((base + delta) * 10) / 10);

          temperatureInput.value = next.toFixed(1);
          settingsRepository.setTemperature(next);
          temperatureInput.focus();
        }
      });
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

    const promptInput = this.querySelector("#prompt-input") as HTMLTextAreaElement | null;
    promptInput?.addEventListener("input", () => {
      this.updateQuickActionsVisibility();
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
    this.addEventListener("click", this._onClick);

    // Subscribing to global events
    this.unsubscribeEvents.push(
      onAppEvent(APP_EVENTS.GENERATION_STARTED, this.handleGenerationStarted),
    );
    this.unsubscribeEvents.push(
      onAppEvent(APP_EVENTS.GENERATION_FINISHED, this.handleGenerationFinished),
    );
    this.unsubscribeEvents.push(onAppEvent(APP_EVENTS.SVGEN_RESULTS, this.handleSVGenResults));
  }
}

customElements.define("generator-controls", GeneratorControls);
