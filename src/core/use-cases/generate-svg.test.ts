import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppSettings } from "../modules/db";
import { AiProviderId } from "../types";
import { GenerateSvgUseCase, GenerationUiAdapter } from "./generate-svg";

describe("GenerateSvgUseCase", () => {
  const validSvg = "<svg viewBox='0 0 10 10'><circle cx='5' cy='5' r='4'/></svg>";
  const validSvgAlt = "<svg viewBox='0 0 10 10'><rect x='1' y='1' width='8' height='8'/></svg>";
  const validSvgThird = "<svg viewBox='0 0 10 10'><polygon points='5,1 9,9 1,9'/></svg>";
  const unsafeSvg = "<svg viewBox='0 0 10 10'><script>alert(1)</script></svg>";

  let settingsRepository: {
    getSettings: () => AppSettings;
  };
  let providerRegistry: {
    getProvider: (id: AiProviderId) => unknown;
  };
  let aiService: {
    generateMultiple: (
      options: {
        prompt: string;
        referenceSvgs: string[];
        model: string;
        providerId: AiProviderId;
      },
      count: number,
    ) => Promise<string[]>;
  };
  let generateMultipleMock: ReturnType<
    typeof vi.fn<
      (
        options: {
          prompt: string;
          referenceSvgs: string[];
          model: string;
          providerId: AiProviderId;
        },
        count: number,
      ) => Promise<string[]>
    >
  >;
  let uiAdapter: GenerationUiAdapter;
  let useCase: GenerateSvgUseCase;

  beforeEach(() => {
    settingsRepository = {
      getSettings: vi.fn<() => AppSettings>().mockReturnValue({
        apiKeys: [
          {
            id: "key-1",
            providerId: "gcp",
            name: "Primary GCP key",
            value: "secret",
            createdAt: Date.now(),
            selectedModels: [],
          },
        ],
        activeKeys: { gcp: "key-1" },
        variations: 4,
        temperature: 0.7,
        systemPrompt: "",
        colorPaletteId: "monochrome",
      }),
    };

    providerRegistry = {
      getProvider: vi.fn<(id: AiProviderId) => unknown>().mockReturnValue({ id: "gcp" }),
    };

    generateMultipleMock = vi
      .fn<
        (
          options: {
            prompt: string;
            referenceSvgs: string[];
            model: string;
            providerId: AiProviderId;
          },
          count: number,
        ) => Promise<string[]>
      >()
      .mockResolvedValue([validSvg]);
    aiService = {
      generateMultiple: generateMultipleMock,
    };

    uiAdapter = {
      notify: vi.fn(),
      navigateToSettings: vi.fn(),
    };

    useCase = new GenerateSvgUseCase(settingsRepository, providerRegistry, aiService, uiAdapter);
  });

  it("returns shaped successful payload and emits success notification", async () => {
    generateMultipleMock.mockResolvedValue([validSvg, validSvgAlt]);

    const result = await useCase.execute({
      prompt: "draw a badge",
      referenceSvgs: [],
      model: "gemini-2.5-flash",
      providerId: "gcp",
      variations: 2,
    });

    expect(aiService.generateMultiple).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "draw a badge",
        model: "gemini-2.5-flash",
        providerId: "gcp",
      }),
      2,
    );
    expect(aiService.generateMultiple).toHaveBeenCalledTimes(1);
    expect(result.svgs).toHaveLength(2);
    expect(result.svgs[0]).toContain("<svg");
    expect(result.svgs[1]).toContain("<svg");
    expect(result.prompt).toBe("draw a badge");
    expect(result.model).toBe("gemini-2.5-flash");
    expect(result.generatedAt).toBeTypeOf("number");
    expect(uiAdapter.notify).toHaveBeenCalledWith({
      type: "success",
      message: "SVGs generated successfully",
    });
  });

  it("navigates to settings when provider key is missing", async () => {
    vi.mocked(settingsRepository.getSettings).mockReturnValue({
      apiKeys: [],
      activeKeys: {},
      variations: 4,
      temperature: 0.7,
      systemPrompt: "",
      colorPaletteId: "monochrome",
    });

    const result = await useCase.execute({
      prompt: "draw a badge",
      referenceSvgs: [],
      model: "gemini-2.5-flash",
      providerId: "gcp",
      variations: 2,
    });

    expect(result).toEqual({ svgs: [] });
    expect(uiAdapter.navigateToSettings).toHaveBeenCalledTimes(1);
    expect(uiAdapter.notify).toHaveBeenCalledWith({
      type: "error",
      message:
        "Please configure and select an API key for the chosen provider in the API Keys tab.",
    });
  });

  it("warns when provider returns fewer variations than requested", async () => {
    generateMultipleMock
      .mockResolvedValueOnce([validSvg])
      .mockResolvedValueOnce([validSvgAlt, validSvgThird]);

    const result = await useCase.execute({
      prompt: "draw a badge",
      referenceSvgs: [validSvg],
      model: "gemini-2.5-flash",
      providerId: "gcp",
      variations: 3,
    });

    expect(aiService.generateMultiple).toHaveBeenCalledTimes(2);
    expect(aiService.generateMultiple).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ providerId: "gcp" }),
      3,
    );
    expect(aiService.generateMultiple).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        providerId: "gcp",
        prompt: expect.stringContaining("<missing_variations>2</missing_variations>"),
        referenceSvgs: expect.arrayContaining([validSvg]),
      }),
      2,
    );
    expect(result.svgs).toHaveLength(3);
    expect(result.svgs[0]).toContain("<svg");
    expect(result.svgs[1]).toContain("<svg");
    expect(result.svgs[2]).toContain("<svg");
    expect(uiAdapter.notify).toHaveBeenCalledWith({
      type: "warning",
      message:
        "The first model response returned fewer usable variations than requested; one refill pass recovered all 2 missing variation(s).",
    });
    expect(uiAdapter.notify).not.toHaveBeenCalledWith({
      type: "success",
      message: "SVGs generated successfully",
    });
  });

  it("triggers refill when sanitization blocks first-pass output", async () => {
    generateMultipleMock
      .mockResolvedValueOnce([validSvg, unsafeSvg])
      .mockResolvedValueOnce([validSvgAlt]);

    const result = await useCase.execute({
      prompt: "draw a badge",
      referenceSvgs: [],
      model: "gemini-2.5-flash",
      providerId: "gcp",
      variations: 2,
    });

    expect(aiService.generateMultiple).toHaveBeenCalledTimes(2);
    expect(aiService.generateMultiple).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        prompt: expect.stringContaining("<refill_request>"),
      }),
      1,
    );
    expect(aiService.generateMultiple).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        prompt: expect.stringContaining("<failure_feedback>"),
      }),
      1,
    );
    expect(aiService.generateMultiple).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        prompt: expect.stringContaining(
          "<blocked_after_sanitization>1</blocked_after_sanitization>",
        ),
      }),
      1,
    );
    expect(result.svgs).toHaveLength(2);
    expect(uiAdapter.notify).toHaveBeenCalledWith({
      type: "warning",
      message: "1 SVG result(s) were blocked because they failed security validation.",
    });
  });

  it("uses at most one refill pass and warns when still under target", async () => {
    generateMultipleMock.mockResolvedValueOnce([validSvg]).mockResolvedValueOnce([]);

    const result = await useCase.execute({
      prompt: "draw a badge",
      referenceSvgs: [],
      model: "gemini-2.5-flash",
      providerId: "gcp",
      variations: 3,
    });

    expect(aiService.generateMultiple).toHaveBeenCalledTimes(2);
    expect(result.svgs).toHaveLength(1);
    expect(uiAdapter.notify).toHaveBeenCalledWith({
      type: "warning",
      message:
        "The model responses remained underfilled after one refill pass: requested 3 total variation(s), asked for 2 more in refill, and recovered 0 safe SVG(s).",
    });
  });

  it("dedupes across passes and caps final output to requested count", async () => {
    generateMultipleMock
      .mockResolvedValueOnce([validSvg, validSvg])
      .mockResolvedValueOnce([validSvg, validSvgAlt]);

    const result = await useCase.execute({
      prompt: "draw a badge",
      referenceSvgs: [],
      model: "gemini-2.5-flash",
      providerId: "gcp",
      variations: 2,
    });

    expect(aiService.generateMultiple).toHaveBeenCalledTimes(2);
    expect(aiService.generateMultiple).toHaveBeenNthCalledWith(2, expect.anything(), 1);
    expect(result.svgs).toHaveLength(2);
    expect(new Set(result.svgs).size).toBe(2);
    expect(uiAdapter.notify).toHaveBeenCalledWith({
      type: "warning",
      message: "2 duplicate SVG result(s) were removed while merging generation passes.",
    });
  });

  it("shows user-friendly timeout message when generation exceeds timeout", async () => {
    generateMultipleMock.mockRejectedValue(
      new Error("Request to https://provider.example timed out after 120000ms."),
    );

    const result = await useCase.execute({
      prompt: "draw a badge",
      referenceSvgs: [],
      model: "gemini-2.5-flash",
      providerId: "gcp",
      variations: 2,
    });

    expect(result).toEqual({ svgs: [] });
    expect(uiAdapter.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "error",
        message: expect.stringContaining("timed out"),
      }),
    );
  });

  it("shows user-friendly rate-limit message", async () => {
    vi.mocked(settingsRepository.getSettings).mockReturnValue({
      apiKeys: [
        {
          id: "key-or",
          providerId: "open-router",
          name: "Primary OpenRouter key",
          value: "secret",
          createdAt: Date.now(),
          selectedModels: [],
        },
      ],
      activeKeys: { "open-router": "key-or" },
      variations: 4,
      temperature: 0.7,
      systemPrompt: "",
      colorPaletteId: "monochrome",
    });

    generateMultipleMock.mockRejectedValue(
      new Error("OpenRouter API error: 429 Too Many Requests - rate limit exceeded"),
    );

    const result = await useCase.execute({
      prompt: "draw a badge",
      referenceSvgs: [],
      model: "openai/gpt-4.1-mini",
      providerId: "open-router",
      variations: 2,
    });

    expect(result).toEqual({ svgs: [] });
    expect(uiAdapter.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "error",
        message: expect.stringContaining("Rate limit reached"),
      }),
    );
  });
});
