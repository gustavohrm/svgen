import { describe, it, expect, vi, beforeEach } from "vitest";
import { AiService, createAiService, Database, ProviderRegistry } from "./index";
import { AiProvider, GenerateOptions } from "../../types/index";

describe("AiService", () => {
  let mockDb: Database;
  let mockProviderRegistry: ProviderRegistry;
  let mockProvider: AiProvider;
  let service: AiService;

  beforeEach(() => {
    mockProvider = {
      id: "gcp",
      name: "GCP",
      configFields: [],
      generate: vi.fn().mockResolvedValue(["<svg>test</svg>"]),
      fetchModels: vi.fn().mockResolvedValue(["model1"]),
    } as any;

    mockDb = {
      getSettings: vi.fn().mockReturnValue({
        apiKeys: [{ id: "key1", providerId: "gcp", value: "test-key" }],
        activeKeys: { gcp: "key1" },
        variations: 1,
      }),
    };

    mockProviderRegistry = {
      getProvider: vi.fn().mockReturnValue(mockProvider),
    };

    service = createAiService(mockDb, mockProviderRegistry);
  });

  it("should build correct system prompt", () => {
    const prompt = service.buildSystemPrompt();
    expect(prompt).toContain("expert SVG designer");
  });

  it("should build system prompt with references", () => {
    const prompt = service.buildSystemPrompt(["<svg>ref</svg>"]);
    expect(prompt).toContain("Reference SVGs");
    expect(prompt).toContain("<svg>ref</svg>");
  });

  it("should generate SVG using injected provider", async () => {
    const options: Omit<GenerateOptions, "apiKey"> = {
      prompt: "draw a circle",
      model: "gemini-pro",
      providerId: "gcp",
    };

    const result = await service.generate(options);

    expect(result).toBe("<svg>test</svg>");
    expect(mockProviderRegistry.getProvider).toHaveBeenCalledWith("gcp");
    expect(mockProvider.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "draw a circle",
        apiKey: "test-key",
      }),
    );
  });

  it("should generate multiple SVGs in a single request", async () => {
    (mockProvider.generate as any).mockResolvedValue(["<svg>test1</svg>", "<svg>test2</svg>"]);
    const options: Omit<GenerateOptions, "apiKey"> = {
      prompt: "draw a circle",
      model: "gemini-pro",
      providerId: "gcp",
    };

    const results = await service.generateMultiple(options, 2);

    expect(results).toHaveLength(2);
    expect(results[0]).toBe("<svg>test1</svg>");
    expect(results[1]).toBe("<svg>test2</svg>");
    expect(mockProvider.generate).toHaveBeenCalledTimes(1);
    expect(mockProvider.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 2,
      }),
    );
  });

  it("should throw error if no active key", async () => {
    (mockDb.getSettings as any).mockReturnValue({
      apiKeys: [],
      activeKeys: {},
    });

    await expect(
      service.generate({ prompt: "test", model: "test", providerId: "gcp" }),
    ).rejects.toThrow("No active API key selected");
  });

  it("should throw error if provider not found", async () => {
    (mockProviderRegistry.getProvider as any).mockReturnValue(undefined);

    await expect(
      service.generate({ prompt: "test", model: "test", providerId: "gcp" }),
    ).rejects.toThrow("Provider implementation for 'gcp' not found");
  });
});
