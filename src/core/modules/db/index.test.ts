import { describe, it, expect, beforeEach, vi } from "vitest";
import { BrowserSettingsRepository } from "./index";

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

  it("handles corrupted JSON in localStorage", () => {
    localStorage.setItem("svgen_settings", "invalid json {");
    const settings = repository.getSettings();
    expect(settings.apiKeys).toEqual([]);
    expect(settings.variations).toBe(4);
  });

  it("normalizes out-of-range variations", () => {
    repository.saveSettings({ variations: 10 });
    let settings = repository.getSettings();
    expect(settings.variations).toBe(4);

    repository.saveSettings({ variations: -5 });
    settings = repository.getSettings();
    expect(settings.variations).toBe(1);

    repository.saveSettings({ variations: 2.7 });
    settings = repository.getSettings();
    expect(settings.variations).toBe(3);
  });

  it("normalizes out-of-range temperature", () => {
    repository.saveSettings({ temperature: 5 });
    let settings = repository.getSettings();
    expect(settings.temperature).toBe(2);

    repository.saveSettings({ temperature: -1 });
    settings = repository.getSettings();
    expect(settings.temperature).toBe(0);

    repository.saveSettings({ temperature: 1.234 });
    settings = repository.getSettings();
    expect(settings.temperature).toBe(1.2);
  });

  it("handles non-numeric variations and temperature", () => {
    repository.saveSettings({ variations: NaN });
    let settings = repository.getSettings();
    expect(settings.variations).toBe(4);

    repository.saveSettings({ temperature: Infinity });
    settings = repository.getSettings();
    expect(settings.temperature).toBe(0.7);
  });

  it("setActiveKey does nothing when key does not exist", () => {
    repository.saveSettings({
      apiKeys: [
        {
          id: "k1",
          providerId: "gcp",
          name: "Test",
          value: "abc",
          createdAt: Date.now(),
          selectedModels: [],
        },
      ],
      activeKeys: { gcp: "k1" },
    });

    const result = repository.setActiveKey("gcp", "non-existent-key");
    expect(result.activeKeys.gcp).toBe("k1");
  });

  it("setActiveKey does nothing when provider mismatch", () => {
    repository.saveSettings({
      apiKeys: [
        {
          id: "k1",
          providerId: "gcp",
          name: "Test",
          value: "abc",
          createdAt: Date.now(),
          selectedModels: [],
        },
      ],
      activeKeys: { gcp: "k1" },
    });

    const result = repository.setActiveKey("open-router", "k1");
    expect(result.activeKeys.gcp).toBe("k1");
    expect(result.activeKeys["open-router"]).toBeUndefined();
  });

  it("toggleModelSelection ignores non-existent keys", () => {
    repository.saveSettings({
      apiKeys: [
        {
          id: "k1",
          providerId: "gcp",
          name: "Test",
          value: "abc",
          createdAt: Date.now(),
          selectedModels: ["m1"],
        },
      ],
    });

    repository.toggleModelSelection("non-existent", "m2", true);
    const settings = repository.getSettings();
    expect(settings.apiKeys[0].selectedModels).toEqual(["m1"]);
  });

  it("toggleModelSelections handles empty update array", () => {
    repository.saveSettings({
      apiKeys: [
        {
          id: "k1",
          providerId: "gcp",
          name: "Test",
          value: "abc",
          createdAt: Date.now(),
          selectedModels: ["m1"],
        },
      ],
    });

    const result = repository.toggleModelSelections([]);
    expect(result.apiKeys[0].selectedModels).toEqual(["m1"]);
  });

  it("toggleModelSelections handles duplicate model updates", () => {
    repository.saveSettings({
      apiKeys: [
        {
          id: "k1",
          providerId: "gcp",
          name: "Test",
          value: "abc",
          createdAt: Date.now(),
          selectedModels: [],
        },
      ],
    });

    repository.toggleModelSelections([
      { keyId: "k1", model: "m1", shouldSelect: true },
      { keyId: "k1", model: "m1", shouldSelect: false },
    ]);

    const settings = repository.getSettings();
    expect(settings.apiKeys[0].selectedModels).toEqual([]);
  });

  it("handles multiple keys for same provider correctly", () => {
    const key1 = {
      id: "k1",
      providerId: "gcp" as const,
      name: "Key 1",
      value: "abc",
      createdAt: Date.now(),
      selectedModels: [],
    };

    const key2 = {
      id: "k2",
      providerId: "gcp" as const,
      name: "Key 2",
      value: "def",
      createdAt: Date.now(),
      selectedModels: [],
    };

    repository.saveSettings({ apiKeys: [key1, key2] });
    const settings = repository.getSettings();

    expect(settings.activeKeys.gcp).toBe("k1");
    repository.setActiveKey("gcp", "k2");
    const updated = repository.getSettings();
    expect(updated.activeKeys.gcp).toBe("k2");
  });

  it("handles non-object localStorage values", () => {
    localStorage.setItem("svgen_settings", "null");
    const settings = repository.getSettings();
    expect(settings.apiKeys).toEqual([]);

    localStorage.setItem("svgen_settings", "[]");
    const settings2 = repository.getSettings();
    expect(settings2.apiKeys).toEqual([]);

    localStorage.setItem("svgen_settings", '"string"');
    const settings3 = repository.getSettings();
    expect(settings3.apiKeys).toEqual([]);
  });

  it("preserves availableModels when cloning keys", () => {
    repository.saveSettings({
      apiKeys: [
        {
          id: "k1",
          providerId: "gcp",
          name: "Test",
          value: "abc",
          createdAt: Date.now(),
          selectedModels: ["m1"],
          availableModels: ["m1", "m2", "m3"],
        },
      ],
    });

    const settings = repository.getSettings();
    expect(settings.apiKeys[0].availableModels).toEqual(["m1", "m2", "m3"]);

    settings.apiKeys[0].availableModels!.push("m4");
    const settings2 = repository.getSettings();
    expect(settings2.apiKeys[0].availableModels).toEqual(["m1", "m2", "m3"]);
  });

  it("cloneSettings creates deep copy of nested arrays", () => {
    repository.saveSettings({
      apiKeys: [
        {
          id: "k1",
          providerId: "gcp",
          name: "Test",
          value: "abc",
          createdAt: Date.now(),
          selectedModels: ["m1", "m2"],
        },
      ],
    });

    const settings1 = repository.getSettings();
    settings1.apiKeys[0].selectedModels.push("m3");

    const settings2 = repository.getSettings();
    expect(settings2.apiKeys[0].selectedModels).toEqual(["m1", "m2"]);
  });

  it("filters out invalid activeKeys entries", () => {
    localStorage.setItem(
      "svgen_settings",
      JSON.stringify({
        apiKeys: [],
        activeKeys: {
          gcp: "key1",
          invalid: 123,
          null: null,
        },
      }),
    );

    const settings = repository.getSettings();
    expect(settings.activeKeys).toEqual({ gcp: "key1" });
  });

  it("handles invalid systemPrompt types", () => {
    localStorage.setItem(
      "svgen_settings",
      JSON.stringify({
        apiKeys: [],
        activeKeys: {},
        systemPrompt: 123,
        variations: 4,
        temperature: 0.7,
      }),
    );

    const settings = repository.getSettings();
    expect(settings.systemPrompt).toBe("");
  });

  it("toggleModelSelection defaults to toggle behavior when shouldSelect is undefined", () => {
    repository.saveSettings({
      apiKeys: [
        {
          id: "k1",
          providerId: "gcp",
          name: "Test",
          value: "abc",
          createdAt: Date.now(),
          selectedModels: [],
        },
      ],
    });

    repository.toggleModelSelection("k1", "m1");
    let settings = repository.getSettings();
    expect(settings.apiKeys[0].selectedModels).toEqual(["m1"]);

    repository.toggleModelSelection("k1", "m1");
    settings = repository.getSettings();
    expect(settings.apiKeys[0].selectedModels).toEqual([]);
  });

  it("batch model selection with mixed keys", () => {
    repository.saveSettings({
      apiKeys: [
        {
          id: "k1",
          providerId: "gcp",
          name: "GCP Key",
          value: "abc",
          createdAt: Date.now(),
          selectedModels: [],
        },
        {
          id: "k2",
          providerId: "open-router",
          name: "OpenRouter Key",
          value: "def",
          createdAt: Date.now(),
          selectedModels: ["existing"],
        },
      ],
    });

    repository.toggleModelSelections([
      { keyId: "k1", model: "m1", shouldSelect: true },
      { keyId: "k2", model: "m2", shouldSelect: true },
      { keyId: "k1", model: "m3", shouldSelect: true },
    ]);

    const settings = repository.getSettings();
    expect(settings.apiKeys[0].selectedModels).toEqual(["m1", "m3"]);
    expect(settings.apiKeys[1].selectedModels).toEqual(["existing", "m2"]);
  });

  it("doesn't modify key when all model selections already match desired state", () => {
    repository.saveSettings({
      apiKeys: [
        {
          id: "k1",
          providerId: "gcp",
          name: "Test",
          value: "abc",
          createdAt: Date.now(),
          selectedModels: ["m1", "m2"],
        },
      ],
    });

    const setItemSpy = vi.spyOn(localStorage, "setItem");
    repository.toggleModelSelections([
      { keyId: "k1", model: "m1", shouldSelect: true },
      { keyId: "k1", model: "m2", shouldSelect: true },
    ]);

    const settings = repository.getSettings();
    expect(settings.apiKeys[0].selectedModels).toEqual(["m1", "m2"]);
  });
});