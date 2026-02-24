import { describe, it, expect, beforeEach, vi } from "vitest";
import { AiProviderId, AiProvider } from "../core/types/index";
import { AppSettings, ApiKeyItem } from "../core/modules/db/index";

// Helper functions extracted from settings/index.ts for testing
function getAllModels(
  settings: AppSettings,
  providers: AiProvider[],
): Array<{
  model: string;
  providerId: AiProviderId;
  providerName: string;
  providerIcon: string;
  keyId: string;
  isSelected: boolean;
}> {
  const entries: Array<{
    model: string;
    providerId: AiProviderId;
    providerName: string;
    providerIcon: string;
    keyId: string;
    isSelected: boolean;
  }> = [];

  for (const provider of providers) {
    const activeKeyId = settings.activeKeys[provider.id];
    const activeKey = settings.apiKeys.find(
      (k) => k.id === activeKeyId && k.providerId === provider.id,
    );

    if (!activeKey || !activeKey.availableModels) continue;

    for (const model of activeKey.availableModels) {
      entries.push({
        model,
        providerId: provider.id,
        providerName: provider.name,
        providerIcon: provider.icon,
        keyId: activeKey.id,
        isSelected: activeKey.selectedModels.includes(model),
      });
    }
  }

  return entries;
}

interface SettingsState {
  searchTerm: string;
  filterProvider: AiProviderId | "all";
  sortDirection: "asc" | "desc";
}

type ModelEntry = {
  model: string;
  providerId: AiProviderId;
  providerName: string;
  providerIcon: string;
  keyId: string;
  isSelected: boolean;
};

function getFilteredModels(models: ModelEntry[], state: SettingsState): ModelEntry[] {
  let filtered = models;

  if (state.filterProvider !== "all") {
    filtered = filtered.filter((m) => m.providerId === state.filterProvider);
  }

  if (state.searchTerm) {
    const term = state.searchTerm.toLowerCase();
    filtered = filtered.filter((m) => m.model.toLowerCase().includes(term));
  }

  filtered.sort((a, b) => {
    const comparison = a.model.localeCompare(b.model);
    return state.sortDirection === "asc" ? comparison : -comparison;
  });

  return filtered;
}

describe("Settings Module - getAllModels", () => {
  let mockSettings: AppSettings;
  let mockProviders: AiProvider[];

  beforeEach(() => {
    const mockGenerate = vi.fn();
    const mockFetchModels = vi.fn();

    mockSettings = {
      apiKeys: [],
      activeKeys: {},
      variations: 4,
      temperature: 0.7,
      systemPrompt: "",
    };

    mockProviders = [
      {
        id: "gcp",
        name: "Google Cloud",
        icon: "/icons/gcp.svg",
        configFields: [],
        generate: mockGenerate,
        fetchModels: mockFetchModels,
      },
      {
        id: "open-router",
        name: "OpenRouter",
        icon: "/icons/openrouter.svg",
        configFields: [],
        generate: mockGenerate,
        fetchModels: mockFetchModels,
      },
    ];
  });

  it("returns empty array when no API keys configured", () => {
    const result = getAllModels(mockSettings, mockProviders);
    expect(result).toEqual([]);
  });

  it("returns empty array when active key has no available models", () => {
    mockSettings.apiKeys = [
      {
        id: "key1",
        providerId: "gcp",
        name: "Test Key",
        value: "secret",
        createdAt: Date.now(),
        selectedModels: [],
      },
    ];
    mockSettings.activeKeys = { gcp: "key1" };

    const result = getAllModels(mockSettings, mockProviders);
    expect(result).toEqual([]);
  });

  it("returns models from active key with selection status", () => {
    mockSettings.apiKeys = [
      {
        id: "key1",
        providerId: "gcp",
        name: "Test Key",
        value: "secret",
        createdAt: Date.now(),
        selectedModels: ["model1", "model3"],
        availableModels: ["model1", "model2", "model3"],
      },
    ];
    mockSettings.activeKeys = { gcp: "key1" };

    const result = getAllModels(mockSettings, mockProviders);

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      model: "model1",
      providerId: "gcp",
      providerName: "Google Cloud",
      providerIcon: "/icons/gcp.svg",
      keyId: "key1",
      isSelected: true,
    });
    expect(result[1]).toMatchObject({
      model: "model2",
      isSelected: false,
    });
    expect(result[2]).toMatchObject({
      model: "model3",
      isSelected: true,
    });
  });

  it("returns models from multiple providers", () => {
    mockSettings.apiKeys = [
      {
        id: "key1",
        providerId: "gcp",
        name: "GCP Key",
        value: "secret1",
        createdAt: Date.now(),
        selectedModels: ["gcp-model1"],
        availableModels: ["gcp-model1", "gcp-model2"],
      },
      {
        id: "key2",
        providerId: "open-router",
        name: "OR Key",
        value: "secret2",
        createdAt: Date.now(),
        selectedModels: [],
        availableModels: ["or-model1"],
      },
    ];
    mockSettings.activeKeys = { gcp: "key1", "open-router": "key2" };

    const result = getAllModels(mockSettings, mockProviders);

    expect(result).toHaveLength(3);
    expect(result.filter((m) => m.providerId === "gcp")).toHaveLength(2);
    expect(result.filter((m) => m.providerId === "open-router")).toHaveLength(1);
  });

  it("skips provider when no active key is set", () => {
    mockSettings.apiKeys = [
      {
        id: "key1",
        providerId: "gcp",
        name: "GCP Key",
        value: "secret1",
        createdAt: Date.now(),
        selectedModels: [],
        availableModels: ["model1"],
      },
    ];
    mockSettings.activeKeys = {};

    const result = getAllModels(mockSettings, mockProviders);
    expect(result).toEqual([]);
  });

  it("skips provider when active key does not exist", () => {
    mockSettings.apiKeys = [
      {
        id: "key1",
        providerId: "gcp",
        name: "GCP Key",
        value: "secret1",
        createdAt: Date.now(),
        selectedModels: [],
        availableModels: ["model1"],
      },
    ];
    mockSettings.activeKeys = { gcp: "non-existent-key" };

    const result = getAllModels(mockSettings, mockProviders);
    expect(result).toEqual([]);
  });

  it("skips provider when active key provider mismatch", () => {
    mockSettings.apiKeys = [
      {
        id: "key1",
        providerId: "gcp",
        name: "GCP Key",
        value: "secret1",
        createdAt: Date.now(),
        selectedModels: [],
        availableModels: ["model1"],
      },
    ];
    mockSettings.activeKeys = { "open-router": "key1" };

    const result = getAllModels(mockSettings, mockProviders);
    expect(result).toEqual([]);
  });

  it("handles keys with empty availableModels array", () => {
    mockSettings.apiKeys = [
      {
        id: "key1",
        providerId: "gcp",
        name: "GCP Key",
        value: "secret1",
        createdAt: Date.now(),
        selectedModels: [],
        availableModels: [],
      },
    ];
    mockSettings.activeKeys = { gcp: "key1" };

    const result = getAllModels(mockSettings, mockProviders);
    expect(result).toEqual([]);
  });
});

describe("Settings Module - getFilteredModels", () => {
  let sampleModels: ModelEntry[];

  beforeEach(() => {
    sampleModels = [
      {
        model: "gemini-2.0-flash",
        providerId: "gcp",
        providerName: "Google Cloud",
        providerIcon: "/gcp.svg",
        keyId: "k1",
        isSelected: true,
      },
      {
        model: "claude-3-opus",
        providerId: "open-router",
        providerName: "OpenRouter",
        providerIcon: "/or.svg",
        keyId: "k2",
        isSelected: false,
      },
      {
        model: "gemini-1.5-pro",
        providerId: "gcp",
        providerName: "Google Cloud",
        providerIcon: "/gcp.svg",
        keyId: "k1",
        isSelected: false,
      },
      {
        model: "anthropic/claude-3-sonnet",
        providerId: "open-router",
        providerName: "OpenRouter",
        providerIcon: "/or.svg",
        keyId: "k2",
        isSelected: true,
      },
    ];
  });

  it("returns all models when no filters applied", () => {
    const state: SettingsState = {
      searchTerm: "",
      filterProvider: "all",
      sortDirection: "asc",
    };

    const result = getFilteredModels(sampleModels, state);
    expect(result).toHaveLength(4);
  });

  it("filters by provider", () => {
    const state: SettingsState = {
      searchTerm: "",
      filterProvider: "gcp",
      sortDirection: "asc",
    };

    const result = getFilteredModels(sampleModels, state);
    expect(result).toHaveLength(2);
    expect(result.every((m) => m.providerId === "gcp")).toBe(true);
  });

  it("filters by search term case-insensitively", () => {
    const state: SettingsState = {
      searchTerm: "GEMINI",
      filterProvider: "all",
      sortDirection: "asc",
    };

    const result = getFilteredModels(sampleModels, state);
    expect(result).toHaveLength(2);
    expect(result.every((m) => m.model.toLowerCase().includes("gemini"))).toBe(true);
  });

  it("combines provider filter and search term", () => {
    const state: SettingsState = {
      searchTerm: "claude",
      filterProvider: "open-router",
      sortDirection: "asc",
    };

    const result = getFilteredModels(sampleModels, state);
    expect(result).toHaveLength(2);
    expect(result.every((m) => m.providerId === "open-router")).toBe(true);
    expect(result.every((m) => m.model.toLowerCase().includes("claude"))).toBe(true);
  });

  it("sorts ascending by default", () => {
    const state: SettingsState = {
      searchTerm: "",
      filterProvider: "all",
      sortDirection: "asc",
    };

    const result = getFilteredModels(sampleModels, state);
    expect(result[0].model).toBe("anthropic/claude-3-sonnet");
    expect(result[1].model).toBe("claude-3-opus");
    expect(result[2].model).toBe("gemini-1.5-pro");
    expect(result[3].model).toBe("gemini-2.0-flash");
  });

  it("sorts descending when specified", () => {
    const state: SettingsState = {
      searchTerm: "",
      filterProvider: "all",
      sortDirection: "desc",
    };

    const result = getFilteredModels(sampleModels, state);
    expect(result[0].model).toBe("gemini-2.0-flash");
    expect(result[1].model).toBe("gemini-1.5-pro");
    expect(result[2].model).toBe("claude-3-opus");
    expect(result[3].model).toBe("anthropic/claude-3-sonnet");
  });

  it("returns empty array when search matches nothing", () => {
    const state: SettingsState = {
      searchTerm: "nonexistent-model",
      filterProvider: "all",
      sortDirection: "asc",
    };

    const result = getFilteredModels(sampleModels, state);
    expect(result).toEqual([]);
  });

  it("returns empty array when filtering provider with no models", () => {
    const state: SettingsState = {
      searchTerm: "gemini",
      filterProvider: "open-router",
      sortDirection: "asc",
    };

    const result = getFilteredModels(sampleModels, state);
    expect(result).toEqual([]);
  });

  it("handles empty model list", () => {
    const state: SettingsState = {
      searchTerm: "",
      filterProvider: "all",
      sortDirection: "asc",
    };

    const result = getFilteredModels([], state);
    expect(result).toEqual([]);
  });

  it("filters partial model name matches", () => {
    const state: SettingsState = {
      searchTerm: "flash",
      filterProvider: "all",
      sortDirection: "asc",
    };

    const result = getFilteredModels(sampleModels, state);
    expect(result).toHaveLength(1);
    expect(result[0].model).toBe("gemini-2.0-flash");
  });

  it("sorts models in place when no filters applied", () => {
    const state: SettingsState = {
      searchTerm: "",
      filterProvider: "all",
      sortDirection: "desc",
    };

    const result = getFilteredModels(sampleModels, state);

    // Check result is in descending order
    expect(result[0].model).toBe("gemini-2.0-flash");
    // When no filters are applied, the sort happens in place
    expect(result).toBe(sampleModels);
  });

  it("handles single model result", () => {
    const state: SettingsState = {
      searchTerm: "anthropic",
      filterProvider: "all",
      sortDirection: "asc",
    };

    const result = getFilteredModels(sampleModels, state);
    expect(result).toHaveLength(1);
    expect(result[0].model).toBe("anthropic/claude-3-sonnet");
  });
});