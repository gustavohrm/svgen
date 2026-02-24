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
    repository.setActiveKey("open-router", "k1");

    const settings = repository.getSettings();
    expect(settings.variations).toBe(4);
    expect(settings.temperature).toBe(0);
    expect(settings.systemPrompt).toBe("custom");
    expect(settings.apiKeys[0].selectedModels).toEqual([]);
    expect(settings.activeKeys["open-router"]).toBe("k1");
  });
});
