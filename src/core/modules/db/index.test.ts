import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "./index";

describe("db module", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("should return default settings when localStorage is empty", () => {
    const settings = db.getSettings();
    expect(settings.apiKeys).toEqual([]);
    expect(settings.activeKeys).toEqual({});
    expect(settings.variations).toBe(4);
    expect(settings.temperature).toBe(0.7);
    expect(settings.systemPrompt).toBe("");
  });

  it("should save and retrieve settings", () => {
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

    db.saveSettings(newSettings);
    const retrieved = db.getSettings();

    expect(retrieved.apiKeys.length).toBe(1);
    expect(retrieved.apiKeys[0].name).toBe("Test Key");
    expect(retrieved.activeKeys["gcp"]).toBe("1");
  });

  it("should partial update settings", () => {
    db.saveSettings({ variations: 3 });
    let settings = db.getSettings();
    expect(settings.variations).toBe(3);

    db.saveSettings({ temperature: 1.2 });
    settings = db.getSettings();
    expect(settings.temperature).toBe(1.2);

    db.saveSettings({ systemPrompt: "Custom prompt" });
    settings = db.getSettings();
    expect(settings.systemPrompt).toBe("Custom prompt");

    db.saveSettings({ activeKeys: { gcp: "some-id" } });
    settings = db.getSettings();
    expect(settings.variations).toBe(3);
    expect(settings.temperature).toBe(1.2);
    expect(settings.systemPrompt).toBe("Custom prompt");
    expect(settings.activeKeys["gcp"]).toBe("some-id");
  });

  it("should auto-select first key if none active", () => {
    const key = {
      id: "123",
      providerId: "open-router" as const,
      name: "Key 1",
      value: "v1",
      createdAt: Date.now(),
      selectedModels: [],
    };

    db.saveSettings({ apiKeys: [key] });
    const settings = db.getSettings();
    expect(settings.activeKeys["open-router"]).toBe("123");
  });
});
