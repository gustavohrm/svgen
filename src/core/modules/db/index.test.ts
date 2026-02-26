import { describe, it, expect, beforeEach, vi } from "vitest";
import { BrowserSettingsRepository } from "./index";
import { DEFAULT_COLOR_PALETTE_ID } from "../../constants/color-palettes";

describe("BrowserSettingsRepository", () => {
  let repository: BrowserSettingsRepository;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    repository = new BrowserSettingsRepository(localStorage);
  });

  it("returns default settings when localStorage is empty", () => {
    const settings = repository.getSettings();
    expect(settings.apiKeys).toEqual([]);
    expect(settings.activeKeys).toEqual({});
    expect(settings.variations).toBe(4);
    expect(settings.temperature).toBe(0.7);
    expect(settings.systemPrompt).toBe("");
    expect(settings.colorPaletteId).toBe(DEFAULT_COLOR_PALETTE_ID);
    expect(settings.colorPaletteId).toBe("ai-choice");
  });

  it("saves and retrieves settings", () => {
    const newSettings = {
      apiKeys: [
        {
          id: "1",
          providerId: "gcp" as const,
          name: "Test Key",
          value: "secret",
          createdAt: Date.now(),
          selectedModels: ["model1"],
        },
      ],
      activeKeyId: "1",
    };

    repository.saveSettings(newSettings);
    const retrieved = repository.getSettings();

    expect(retrieved.apiKeys.length).toBe(1);
    expect(retrieved.apiKeys[0].name).toBe("Test Key");
    expect(retrieved.activeKeys.gcp).toBe("1");
  });

  it("supports partial updates", () => {
    repository.saveSettings({ variations: 3 });
    let settings = repository.getSettings();
    expect(settings.variations).toBe(3);

    repository.saveSettings({ temperature: 1.2 });
    settings = repository.getSettings();
    expect(settings.temperature).toBe(1.2);

    repository.saveSettings({ systemPrompt: "Custom prompt" });
    settings = repository.getSettings();
    expect(settings.systemPrompt).toBe("Custom prompt");

    repository.setColorPaletteId("sunset");
    settings = repository.getSettings();
    expect(settings.colorPaletteId).toBe("sunset");

    repository.saveSettings({ activeKeys: { gcp: "some-id" } });
    settings = repository.getSettings();
    expect(settings.variations).toBe(3);
    expect(settings.temperature).toBe(1.2);
    expect(settings.systemPrompt).toBe("Custom prompt");
    expect(settings.activeKeys.gcp).toBe("some-id");
  });

  it("auto-selects the first key when none is active", () => {
    const key = {
      id: "123",
      providerId: "open-router" as const,
      name: "Key 1",
      value: "v1",
      createdAt: Date.now(),
      selectedModels: [],
    };

    repository.saveSettings({ apiKeys: [key] });
    const settings = repository.getSettings();
    expect(settings.activeKeys["open-router"]).toBe("123");
  });

  it("returns immutable copies from getSettings", () => {
    const first = repository.getSettings();
    first.apiKeys.push({
      id: "temp",
      providerId: "open-router",
      name: "Temp",
      value: "secret",
      createdAt: Date.now(),
      selectedModels: ["x"],
    });
    first.activeKeys["open-router"] = "temp";

    const second = repository.getSettings();
    expect(second.apiKeys).toEqual([]);
    expect(second.activeKeys).toEqual({});
  });

  it("updates settings via command methods", () => {
    repository.saveSettings({
      apiKeys: [
        {
          id: "k1",
          providerId: "open-router",
          name: "Main",
          value: "abc",
          createdAt: Date.now(),
          selectedModels: [],
        },
      ],
      activeKeys: { "open-router": "k1" },
    });

    repository.setVariations(10);
    repository.setTemperature(-1);
    repository.setSystemPrompt("custom");
    repository.setColorPaletteId("ocean");
    repository.toggleModelSelection("k1", "m1", true);
    repository.toggleModelSelection("k1", "m1", false);
    repository.toggleModelSelections([
      { keyId: "k1", model: "m2", shouldSelect: true },
      { keyId: "k1", model: "m3", shouldSelect: true },
    ]);
    repository.setActiveKey("open-router", "k1");

    const settings = repository.getSettings();
    expect(settings.variations).toBe(4);
    expect(settings.temperature).toBe(0);
    expect(settings.systemPrompt).toBe("custom");
    expect(settings.colorPaletteId).toBe("ocean");
    expect(settings.apiKeys[0].selectedModels).toEqual(["m2", "m3"]);
    expect(settings.activeKeys["open-router"]).toBe("k1");
  });

  it("applies batch model updates with a single storage write", () => {
    repository.saveSettings({
      apiKeys: [
        {
          id: "k1",
          providerId: "open-router",
          name: "Main",
          value: "abc",
          createdAt: Date.now(),
          selectedModels: [],
        },
      ],
    });

    const setItemSpy = vi.spyOn(localStorage, "setItem");
    repository.toggleModelSelections([
      { keyId: "k1", model: "m1", shouldSelect: true },
      { keyId: "k1", model: "m2", shouldSelect: true },
      { keyId: "k1", model: "m3", shouldSelect: true },
    ]);

    expect(setItemSpy).toHaveBeenCalledTimes(1);
  });

  it("falls back to defaults when persisted settings are invalid JSON", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    localStorage.setItem("svgen_settings", "{not-json");

    const settings = repository.getSettings();

    expect(settings).toMatchObject({
      apiKeys: [],
      activeKeys: {},
      variations: 4,
      temperature: 0.7,
      systemPrompt: "",
      colorPaletteId: DEFAULT_COLOR_PALETTE_ID,
    });
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("migrates legacy provider-key record payloads", () => {
    localStorage.setItem(
      "svgen_settings",
      JSON.stringify({
        apiKeys: {
          openrouter: "or-secret",
          gcp: "gcp-secret",
        },
        selectedProvider: "openrouter",
      }),
    );

    const settings = repository.getSettings();
    const openRouterKey = settings.apiKeys.find((key) => key.providerId === "open-router");
    const gcpKey = settings.apiKeys.find((key) => key.providerId === "gcp");

    expect(settings.apiKeys).toHaveLength(2);
    expect(openRouterKey?.value).toBe("or-secret");
    expect(gcpKey?.value).toBe("gcp-secret");
    expect(settings.activeKeys["open-router"]).toBe(openRouterKey?.id);
    expect(settings.activeKeys.gcp).toBe(gcpKey?.id);
  });

  it("maps legacy activeKeyId into provider-scoped activeKeys", () => {
    localStorage.setItem(
      "svgen_settings",
      JSON.stringify({
        apiKeys: [
          {
            id: "legacy-gcp",
            providerId: "gcp",
            name: "Legacy gcp key",
            value: "gcp-secret",
            createdAt: Date.now(),
            selectedModels: [],
          },
        ],
        activeKeyId: "legacy-gcp",
      }),
    );

    const settings = repository.getSettings();

    expect(settings.activeKeys.gcp).toBe("legacy-gcp");
  });
});
