import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const toggleModelSelectionMock = vi.fn();
const toggleModelSelectionsMock = vi.fn();
const getSettingsMock = vi.fn();

vi.mock("../ui/components/app-header", () => ({}));
vi.mock("../ui/components/api-keys-modal", () => ({
  ApiKeysModal: class extends HTMLElement {
    open() {}
  },
}));
vi.mock("../core/app/composition-root", () => ({
  appComposition: {
    providerRegistry: {
      getAllProviders: () => [
        { id: "gcp", name: "Google Cloud", icon: "gcp.svg" },
        { id: "open-router", name: "OpenRouter", icon: "or.svg" },
      ],
      getProvider: (id: string) =>
        id === "gcp"
          ? { id: "gcp", name: "Google Cloud", icon: "gcp.svg" }
          : { id: "open-router", name: "OpenRouter", icon: "or.svg" },
    },
    settingsRepository: {
      getSettings: getSettingsMock,
      toggleModelSelection: toggleModelSelectionMock,
      toggleModelSelections: toggleModelSelectionsMock,
    },
  },
}));

describe("settings page model selection workflows", () => {
  let domContentLoadedHandler: EventListenerOrEventListenerObject | null = null;

  beforeEach(() => {
    vi.resetModules();
    toggleModelSelectionMock.mockReset();
    toggleModelSelectionsMock.mockReset();
    getSettingsMock.mockReset();

    getSettingsMock.mockReturnValue({
      apiKeys: [
        {
          id: "gcp-key",
          providerId: "gcp",
          name: "GCP",
          value: "secret",
          createdAt: 1,
          selectedModels: ["gemini-2.5-flash"],
          availableModels: ["gemini-2.5-flash", "gemini-2.5-pro"],
        },
      ],
      activeKeys: { gcp: "gcp-key" },
      variations: 4,
      temperature: 0.7,
      systemPrompt: "",
      colorPaletteId: "monochrome",
    });

    document.body.innerHTML = `
      <div id="settings-container">
        <button id="open-keys-modal-btn"></button>
        <input id="model-search" />
        <button id="filter-btn"></button>
        <span id="filter-label"></span>
        <div id="filter-dropdown"></div>
        <div id="models-table-header"></div>
        <div>
          <div id="models-table"></div>
        </div>
        <div id="empty-state" class="hidden"></div>
      </div>
      <api-keys-modal></api-keys-modal>
    `;
  });

  afterEach(() => {
    if (domContentLoadedHandler) {
      document.removeEventListener("DOMContentLoaded", domContentLoadedHandler);
      domContentLoadedHandler = null;
    }
  });

  async function importSettingsPageModule() {
    const originalAddEventListener = document.addEventListener.bind(document);

    document.addEventListener = ((
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) => {
      if (type === "DOMContentLoaded") {
        domContentLoadedHandler = listener;
      }

      return originalAddEventListener(type, listener, options);
    }) as Document["addEventListener"];

    try {
      await import("./index");
    } finally {
      document.addEventListener = originalAddEventListener;
    }
  }

  it("updates a single model checkbox through repository command", async () => {
    await importSettingsPageModule();
    document.dispatchEvent(new Event("DOMContentLoaded"));

    const checkbox = document.querySelector<HTMLInputElement>(".model-checkbox");
    expect(checkbox).toBeTruthy();

    checkbox!.checked = false;
    checkbox!.dispatchEvent(new Event("change", { bubbles: true }));

    expect(toggleModelSelectionMock).toHaveBeenCalledWith("gcp-key", "gemini-2.5-flash", false);
  });

  it("shows selected models first in the table", async () => {
    getSettingsMock.mockReturnValue({
      apiKeys: [
        {
          id: "gcp-key",
          providerId: "gcp",
          name: "GCP",
          value: "secret",
          createdAt: 1,
          selectedModels: ["gemini-2.5-pro"],
          availableModels: ["gemini-2.5-flash", "gemini-2.5-pro"],
        },
      ],
      activeKeys: { gcp: "gcp-key" },
      variations: 4,
      temperature: 0.7,
      systemPrompt: "",
      colorPaletteId: "monochrome",
    });

    await importSettingsPageModule();
    document.dispatchEvent(new Event("DOMContentLoaded"));

    const modelOrder = Array.from(
      document.querySelectorAll<HTMLInputElement>(".model-checkbox"),
    ).map((checkbox) => checkbox.value);

    expect(modelOrder).toEqual(["gemini-2.5-pro", "gemini-2.5-flash"]);
  });

  it("applies select-all updates with batched repository command", async () => {
    await importSettingsPageModule();
    document.dispatchEvent(new Event("DOMContentLoaded"));

    const selectAll = document.getElementById("select-all-models") as HTMLInputElement;
    expect(selectAll).toBeTruthy();

    selectAll.checked = true;
    selectAll.dispatchEvent(new Event("change", { bubbles: true }));

    expect(toggleModelSelectionsMock).toHaveBeenCalledWith([
      { keyId: "gcp-key", model: "gemini-2.5-flash", shouldSelect: true },
      { keyId: "gcp-key", model: "gemini-2.5-pro", shouldSelect: true },
    ]);
  });
});
