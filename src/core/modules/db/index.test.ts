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
    expect(settings.activeKeyId).toBeNull();
    expect(settings.variations).toBe(1);
  });

  it("should save and retrieve settings", () => {
    const newSettings = {
      apiKeys: [
        {
          id: "1",
          providerId: "test",
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
    expect(retrieved.activeKeyId).toBe("1");
  });

  it("should partial update settings", () => {
    db.saveSettings({ variations: 3 });
    let settings = db.getSettings();
    expect(settings.variations).toBe(3);

    db.saveSettings({ activeKeyId: "some-id" });
    settings = db.getSettings();
    expect(settings.variations).toBe(3);
    expect(settings.activeKeyId).toBe("some-id");
  });

  it("should auto-select first key if none active", () => {
    const key = {
      id: "123",
      providerId: "p1",
      name: "Key 1",
      value: "v1",
      createdAt: Date.now(),
      selectedModels: [],
    };
    
    db.saveSettings({ apiKeys: [key] });
    const settings = db.getSettings();
    expect(settings.activeKeyId).toBe("123");
  });
});
