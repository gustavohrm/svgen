import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GeneratorControls } from "./generator-controls";
import { APP_EVENTS } from "../../core/constants/events";

// Mock dependencies
vi.mock("../../core/app/composition-root", () => {
  return {
    appComposition: {
      settingsRepository: {
        getSettings: vi.fn().mockReturnValue({
          apiKeys: [],
          activeKeys: {},
          variations: 4,
          temperature: 0.7,
          systemPrompt: "",
        }),
        saveSettings: vi.fn(),
        setActiveKey: vi.fn(),
        toggleModelSelection: vi.fn(),
        toggleModelSelections: vi.fn(),
        setVariations: vi.fn((val: number) => val),
        setTemperature: vi.fn((val: number) => val),
        setSystemPrompt: vi.fn(),
      },
    },
  };
});

vi.mock("../../core/events/app-events", () => ({
  emitAppEvent: vi.fn(),
}));

vi.mock("../../core/services/ai/index", () => ({
  DEFAULT_SYSTEM_PROMPT: "You are a helpful assistant.",
}));

// Mock model-dropdown custom element
class MockModelDropdown extends HTMLElement {
  selectedModel = "test-model";
  providerId = "gcp";
}
if (!customElements.get("model-dropdown")) {
  customElements.define("model-dropdown", MockModelDropdown);
}

describe("GeneratorControls", () => {
  let controls: GeneratorControls;

  beforeEach(() => {
    document.body.innerHTML = '<div id="test-container"></div>';

    if (!customElements.get("generator-controls")) {
      customElements.define("generator-controls", GeneratorControls);
    }

    controls = document.createElement("generator-controls") as GeneratorControls;
    document.body.appendChild(controls);
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("should create instance", () => {
    expect(controls).toBeInstanceOf(GeneratorControls);
    expect(controls).toBeInstanceOf(HTMLElement);
  });

  it("should render prompt input", () => {
    const promptInput = controls.querySelector("#prompt-input");
    expect(promptInput).toBeTruthy();
    expect(promptInput?.tagName).toBe("TEXTAREA");
  });

  it("should render generate button", () => {
    const generateBtn = controls.querySelector("#generate-btn");
    expect(generateBtn).toBeTruthy();
    expect(generateBtn?.tagName).toBe("BUTTON");
  });

  it("should render model selector", () => {
    const modelSelector = controls.querySelector("#model-selector");
    expect(modelSelector).toBeTruthy();
  });

  it("should render reference input", () => {
    const referenceInput = controls.querySelector("#reference-input");
    expect(referenceInput).toBeTruthy();
    expect(referenceInput?.getAttribute("type")).toBe("file");
    expect(referenceInput?.getAttribute("accept")).toBe(".svg");
    expect(referenceInput?.hasAttribute("multiple")).toBe(true);
  });

  it("should render settings button", () => {
    const settingsBtn = controls.querySelector("#settings-btn");
    expect(settingsBtn).toBeTruthy();
  });

  it("should render settings menu", () => {
    const settingsMenu = controls.querySelector("#settings-menu");
    expect(settingsMenu).toBeTruthy();
    expect(settingsMenu?.classList.contains("hidden")).toBe(true);
  });

  it("should render variation input with correct default value", () => {
    const variationInput = controls.querySelector("#variation-input") as HTMLInputElement;
    expect(variationInput).toBeTruthy();
    expect(variationInput.value).toBe("4");
    expect(variationInput.min).toBe("1");
    expect(variationInput.max).toBe("4");
  });

  it("should render temperature input with correct default value", () => {
    const temperatureInput = controls.querySelector("#temperature-input") as HTMLInputElement;
    expect(temperatureInput).toBeTruthy();
    expect(temperatureInput.value).toBe("0.7");
    expect(temperatureInput.min).toBe("0");
    expect(temperatureInput.max).toBe("2");
    expect(temperatureInput.step).toBe("0.1");
  });

  it("should render system prompt modal", () => {
    const modal = controls.querySelector("#system-prompt-modal");
    expect(modal).toBeTruthy();
    expect(modal?.classList.contains("hidden")).toBe(true);
  });

  it("should render attachments container", () => {
    const attachments = controls.querySelector("#attachments-container");
    expect(attachments).toBeTruthy();
  });

  it("should have edit system prompt button", () => {
    const editBtn = controls.querySelector("#edit-system-prompt-btn");
    expect(editBtn).toBeTruthy();
  });

  it("should add block and w-full classes to element", () => {
    expect(controls.classList.contains("block")).toBe(true);
    expect(controls.classList.contains("w-full")).toBe(true);
  });
});

describe("GeneratorControls - Event Handling", () => {
  let controls: GeneratorControls;

  beforeEach(() => {
    document.body.innerHTML = '<div id="test-container"></div>';
    controls = document.createElement("generator-controls") as GeneratorControls;
    document.body.appendChild(controls);
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("should disable generate button on GENERATION_STARTED event", () => {
    const generateBtn = controls.querySelector("#generate-btn") as HTMLButtonElement;
    expect(generateBtn.disabled).toBe(false);

    window.dispatchEvent(new Event(APP_EVENTS.GENERATION_STARTED));

    expect(generateBtn.disabled).toBe(true);
    expect(generateBtn.innerHTML).toContain("animate-spin");
  });

  it("should enable generate button on GENERATION_FINISHED event", () => {
    const generateBtn = controls.querySelector("#generate-btn") as HTMLButtonElement;

    // First disable it
    window.dispatchEvent(new Event(APP_EVENTS.GENERATION_STARTED));
    expect(generateBtn.disabled).toBe(true);

    // Then finish
    window.dispatchEvent(new Event(APP_EVENTS.GENERATION_FINISHED));
    expect(generateBtn.disabled).toBe(false);
    expect(generateBtn.innerHTML).toContain("arrow-up");
  });

  it("should toggle settings menu on settings button click", () => {
    const settingsBtn = controls.querySelector("#settings-btn") as HTMLButtonElement;
    const settingsMenu = controls.querySelector("#settings-menu") as HTMLDivElement;

    expect(settingsMenu.classList.contains("hidden")).toBe(true);

    settingsBtn.click();
    expect(settingsMenu.classList.contains("hidden")).toBe(false);
    expect(settingsMenu.classList.contains("flex")).toBe(true);

    settingsBtn.click();
    expect(settingsMenu.classList.contains("hidden")).toBe(true);
    expect(settingsMenu.classList.contains("flex")).toBe(false);
  });

  it("should open system prompt modal on edit button click", () => {
    const settingsBtn = controls.querySelector("#settings-btn") as HTMLButtonElement;
    const editBtn = controls.querySelector("#edit-system-prompt-btn") as HTMLButtonElement;
    const modal = controls.querySelector("#system-prompt-modal") as HTMLDivElement;

    settingsBtn.click(); // Open settings menu first
    editBtn.click();

    expect(modal.classList.contains("hidden")).toBe(false);
    expect(modal.classList.contains("flex")).toBe(true);
  });

  it("should close system prompt modal on close button click", () => {
    const editBtn = controls.querySelector("#edit-system-prompt-btn") as HTMLButtonElement;
    const closeBtn = controls.querySelector("#close-system-prompt-modal-btn") as HTMLButtonElement;
    const modal = controls.querySelector("#system-prompt-modal") as HTMLDivElement;

    const settingsBtn = controls.querySelector("#settings-btn") as HTMLButtonElement;
    settingsBtn.click();
    editBtn.click();
    expect(modal.classList.contains("flex")).toBe(true);

    closeBtn.click();
    expect(modal.classList.contains("hidden")).toBe(true);
  });

  it("should close system prompt modal on cancel button click", () => {
    const editBtn = controls.querySelector("#edit-system-prompt-btn") as HTMLButtonElement;
    const cancelBtn = controls.querySelector("#cancel-system-prompt-btn") as HTMLButtonElement;
    const modal = controls.querySelector("#system-prompt-modal") as HTMLDivElement;

    const settingsBtn = controls.querySelector("#settings-btn") as HTMLButtonElement;
    settingsBtn.click();
    editBtn.click();
    expect(modal.classList.contains("flex")).toBe(true);

    cancelBtn.click();
    expect(modal.classList.contains("hidden")).toBe(true);
  });

  it("should close system prompt modal when clicking backdrop", () => {
    const editBtn = controls.querySelector("#edit-system-prompt-btn") as HTMLButtonElement;
    const modal = controls.querySelector("#system-prompt-modal") as HTMLDivElement;

    const settingsBtn = controls.querySelector("#settings-btn") as HTMLButtonElement;
    settingsBtn.click();
    editBtn.click();
    expect(modal.classList.contains("flex")).toBe(true);

    modal.click(); // Click on the backdrop (modal itself)
    expect(modal.classList.contains("hidden")).toBe(true);
  });
});

describe("GeneratorControls - Settings Updates", () => {
  let controls: GeneratorControls;

  beforeEach(async () => {
    document.body.innerHTML = '<div id="test-container"></div>';
    controls = document.createElement("generator-controls") as GeneratorControls;
    document.body.appendChild(controls);
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("should call setVariations when variation input changes", async () => {
    const { appComposition } = await import("../../core/app/composition-root");
    const variationInput = controls.querySelector("#variation-input") as HTMLInputElement;

    variationInput.value = "3";
    variationInput.dispatchEvent(new Event("input"));

    expect(appComposition.settingsRepository.setVariations).toHaveBeenCalledWith(3);
  });

  it("should clamp variations to min 1 on blur", async () => {
    const { appComposition } = await import("../../core/app/composition-root");
    const variationInput = controls.querySelector("#variation-input") as HTMLInputElement;

    variationInput.value = "0";
    variationInput.dispatchEvent(new Event("blur"));

    expect(variationInput.value).toBe("1");
    expect(appComposition.settingsRepository.setVariations).toHaveBeenCalledWith(1);
  });

  it("should clamp variations to max 4 on blur", async () => {
    const { appComposition } = await import("../../core/app/composition-root");
    const variationInput = controls.querySelector("#variation-input") as HTMLInputElement;

    variationInput.value = "10";
    variationInput.dispatchEvent(new Event("blur"));

    expect(variationInput.value).toBe("4");
    expect(appComposition.settingsRepository.setVariations).toHaveBeenCalledWith(4);
  });

  it("should call setTemperature when temperature input changes", async () => {
    const { appComposition } = await import("../../core/app/composition-root");
    const temperatureInput = controls.querySelector("#temperature-input") as HTMLInputElement;

    temperatureInput.value = "1.5";
    temperatureInput.dispatchEvent(new Event("input"));

    expect(appComposition.settingsRepository.setTemperature).toHaveBeenCalled();
  });

  it("should clamp temperature to 0 minimum", async () => {
    const { appComposition } = await import("../../core/app/composition-root");
    const temperatureInput = controls.querySelector("#temperature-input") as HTMLInputElement;

    temperatureInput.value = "-1";
    temperatureInput.dispatchEvent(new Event("blur"));

    expect(temperatureInput.value).toBe("0.0");
    expect(appComposition.settingsRepository.setTemperature).toHaveBeenCalledWith(0);
  });

  it("should clamp temperature to 2 maximum", async () => {
    const { appComposition } = await import("../../core/app/composition-root");
    const temperatureInput = controls.querySelector("#temperature-input") as HTMLInputElement;

    temperatureInput.value = "5";
    temperatureInput.dispatchEvent(new Event("blur"));

    expect(temperatureInput.value).toBe("2.0");
    expect(appComposition.settingsRepository.setTemperature).toHaveBeenCalledWith(2);
  });

  it("should round temperature to 1 decimal place", async () => {
    const { appComposition } = await import("../../core/app/composition-root");
    const temperatureInput = controls.querySelector("#temperature-input") as HTMLInputElement;

    temperatureInput.value = "1.567";
    temperatureInput.dispatchEvent(new Event("blur"));

    expect(temperatureInput.value).toBe("1.6");
  });

  it("should default temperature to 0.7 on invalid input", async () => {
    const { appComposition } = await import("../../core/app/composition-root");
    const temperatureInput = controls.querySelector("#temperature-input") as HTMLInputElement;

    temperatureInput.value = "invalid";
    temperatureInput.dispatchEvent(new Event("blur"));

    expect(temperatureInput.value).toBe("0.7");
    expect(appComposition.settingsRepository.setTemperature).toHaveBeenCalledWith(0.7);
  });

  it("should save system prompt when save button clicked", async () => {
    const { appComposition } = await import("../../core/app/composition-root");
    const settingsBtn = controls.querySelector("#settings-btn") as HTMLButtonElement;
    const editBtn = controls.querySelector("#edit-system-prompt-btn") as HTMLButtonElement;
    const saveBtn = controls.querySelector("#save-system-prompt-btn") as HTMLButtonElement;
    const input = controls.querySelector("#system-prompt-modal-input") as HTMLTextAreaElement;

    settingsBtn.click();
    editBtn.click();

    input.value = "Custom system prompt";
    saveBtn.click();

    expect(appComposition.settingsRepository.setSystemPrompt).toHaveBeenCalledWith(
      "Custom system prompt",
    );
  });

  it("should save empty string when system prompt matches default", async () => {
    const { appComposition } = await import("../../core/app/composition-root");
    const { DEFAULT_SYSTEM_PROMPT } = await import("../../core/services/ai/index");

    const settingsBtn = controls.querySelector("#settings-btn") as HTMLButtonElement;
    const editBtn = controls.querySelector("#edit-system-prompt-btn") as HTMLButtonElement;
    const saveBtn = controls.querySelector("#save-system-prompt-btn") as HTMLButtonElement;
    const input = controls.querySelector("#system-prompt-modal-input") as HTMLTextAreaElement;

    settingsBtn.click();
    editBtn.click();

    input.value = DEFAULT_SYSTEM_PROMPT;
    saveBtn.click();

    expect(appComposition.settingsRepository.setSystemPrompt).toHaveBeenCalledWith("");
  });
});

describe("GeneratorControls - File Attachments", () => {
  let controls: GeneratorControls;

  beforeEach(() => {
    document.body.innerHTML = '<div id="test-container"></div>';
    controls = document.createElement("generator-controls") as GeneratorControls;
    document.body.appendChild(controls);
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("should have hidden file input", () => {
    const referenceInput = controls.querySelector("#reference-input") as HTMLInputElement;
    expect(referenceInput.classList.contains("hidden")).toBe(true);
  });

  it("should accept SVG files", () => {
    const referenceInput = controls.querySelector("#reference-input") as HTMLInputElement;
    expect(referenceInput.accept).toBe(".svg");
  });

  it("should allow multiple file selection", () => {
    const referenceInput = controls.querySelector("#reference-input") as HTMLInputElement;
    expect(referenceInput.multiple).toBe(true);
  });

  it("attachments container should be initially empty and hidden", () => {
    const container = controls.querySelector("#attachments-container") as HTMLDivElement;
    expect(container.innerHTML.trim()).toBe("");
    expect(container.classList.contains("empty:hidden")).toBe(true);
  });
});

describe("GeneratorControls - Edge Cases", () => {
  let controls: GeneratorControls;

  beforeEach(() => {
    document.body.innerHTML = '<div id="test-container"></div>';
    controls = document.createElement("generator-controls") as GeneratorControls;
    document.body.appendChild(controls);
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("should not process variation input if value is NaN", async () => {
    const { appComposition } = await import("../../core/app/composition-root");
    const variationInput = controls.querySelector("#variation-input") as HTMLInputElement;

    variationInput.value = "abc";
    variationInput.dispatchEvent(new Event("input"));

    // Should not call setVariations with NaN
    expect(appComposition.settingsRepository.setVariations).not.toHaveBeenCalled();
  });

  it("should not process temperature input if value is NaN", async () => {
    const { appComposition } = await import("../../core/app/composition-root");
    const temperatureInput = controls.querySelector("#temperature-input") as HTMLInputElement;

    const callCount = vi.mocked(appComposition.settingsRepository.setTemperature).mock.calls.length;
    temperatureInput.value = "abc";
    temperatureInput.dispatchEvent(new Event("input"));

    // Should not call setTemperature
    expect(vi.mocked(appComposition.settingsRepository.setTemperature).mock.calls.length).toBe(
      callCount,
    );
  });

  it("should clean up event listeners on disconnect", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    controls.remove();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      APP_EVENTS.GENERATION_STARTED,
      expect.any(Function),
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      APP_EVENTS.GENERATION_FINISHED,
      expect.any(Function),
    );
  });

  it("should prevent multiple simultaneous generation clicks", () => {
    const generateBtn = controls.querySelector("#generate-btn") as HTMLButtonElement;

    // Simulate generation in progress
    window.dispatchEvent(new Event(APP_EVENTS.GENERATION_STARTED));

    expect(generateBtn.disabled).toBe(true);
  });
});