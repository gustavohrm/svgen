import { describe, it, expect, vi, beforeEach } from "vitest";
import { AiService, createAiService, ProviderRegistry, SettingsRepository } from "./index";
import { AiProvider, GenerateOptions } from "../../types/index";

describe("AiService", () => {
  let mockSettingsRepository: SettingsRepository;
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

    mockSettingsRepository = {
      getSettings: vi.fn().mockReturnValue({
        apiKeys: [{ id: "key1", providerId: "gcp", value: "test-key" }],
        activeKeys: { gcp: "key1" },
        variations: 1,
        temperature: 0.7,
        systemPrompt: "",
      }),
    };

    mockProviderRegistry = {
      getProvider: vi.fn().mockReturnValue(mockProvider),
    };

    service = createAiService(mockSettingsRepository, mockProviderRegistry);
  });

  it("should build correct system prompt", () => {
    const prompt = service.buildSystemPrompt();
    expect(prompt).toContain("expert SVG designer");
    expect(prompt).toContain("Prefer named SVG primitives");
    expect(prompt).toContain("avoid SMIL tags");
    expect(prompt).toContain("<css_animation_profile>");
    expect(prompt).toContain("<profile>permissive</profile>");
    expect(prompt).toContain("<allowed_css_properties>");
    expect(prompt).toContain("animation-duration");
    expect(prompt).toContain("<safety_rules>");
    expect(prompt).toContain("<system_instructions>");
    expect(prompt).toContain("<response_contract>");
    expect(prompt).toContain('"svgs"');
  });

  it("should build system prompt with references", () => {
    const prompt = service.buildSystemPrompt(["<svg>ref</svg>"]);
    expect(prompt).toContain("<reference_svgs>");
    expect(prompt).toContain('<reference index="1">');
    expect(prompt).toContain("<svg>ref</svg>");
  });

  it("should use custom system prompt when provided", () => {
    const prompt = service.buildSystemPrompt([], "Always prefer monochrome icon style.");
    expect(prompt).toContain("Always prefer monochrome icon style.");
    expect(prompt).toContain("<response_contract>");
  });

  it("should keep XML well-formed when custom system prompt contains CDATA terminator", () => {
    const customPrompt = "Always prefer monochrome icon style ]]> with bold geometry.";
    const prompt = service.buildSystemPrompt([], customPrompt);

    expect(prompt).toContain("<system_instructions><![CDATA[");
    expect(prompt).toContain(
      "Always prefer monochrome icon style ]]]]><![CDATA[> with bold geometry.",
    );
    expect(prompt).not.toContain("Always prefer monochrome icon style ]]> with bold geometry.");
    expect(prompt).toContain("<response_contract>");
  });

  it("should build XML-scoped user prompt for generation", () => {
    const prompt = service.buildUserPrompt("draw an orbit icon", 3);

    expect(prompt).toContain("<generation_request>");
    expect(prompt).toContain("<variation_count>3</variation_count>");
    expect(prompt).toContain("<user_prompt><![CDATA[draw an orbit icon]]></user_prompt>");
  });

  it("should keep XML well-formed when user prompt contains CDATA terminator", () => {
    const prompt = service.buildUserPrompt("test ]]> end", 2);

    expect(prompt).toContain("<generation_request>");
    expect(prompt).toContain("<user_prompt><![CDATA[");
    expect(prompt).toContain("]]]]><![CDATA[>");
    expect(prompt).toContain("end]]></user_prompt>");
    expect(prompt).not.toContain("test ]]></user_prompt>");
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
        apiKey: "test-key",
        temperature: 0.7,
      }),
    );

    const providerCall = (mockProvider.generate as any).mock.calls[0][0];
    expect(providerCall.prompt).toContain("<generation_request>");
    expect(providerCall.prompt).toContain("<user_prompt><![CDATA[draw a circle]]></user_prompt>");
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
        prompt: expect.stringContaining("<variation_count>2</variation_count>"),
      }),
    );
  });

  it("should normalize count consistently for prompt and provider", async () => {
    const options: Omit<GenerateOptions, "apiKey"> = {
      prompt: "draw a circle",
      model: "gemini-pro",
      providerId: "gcp",
    };

    await service.generateMultiple(options, 2.9);

    const providerCall = (mockProvider.generate as any).mock.calls[0][0];
    expect(providerCall.count).toBe(2);
    expect(providerCall.prompt).toContain("<variation_count>2</variation_count>");
  });

  it("should throw error if no active key", async () => {
    (mockSettingsRepository.getSettings as any).mockReturnValue({
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
