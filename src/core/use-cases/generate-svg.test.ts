import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppSettings } from "../modules/db";
import { AiProviderId } from "../types";
import { GenerateSvgUseCase, GenerationUiAdapter } from "./generate-svg";

describe("GenerateSvgUseCase", () => {
  const validSvg = "<svg viewBox='0 0 10 10'><circle cx='5' cy='5' r='4'/></svg>";
  const validSvgAlt = "<svg viewBox='0 0 10 10'><rect x='1' y='1' width='8' height='8'/></svg>";

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
    generateMultipleMock.mockResolvedValue([validSvg]);

    const result = await useCase.execute({
      prompt: "draw a badge",
      referenceSvgs: [],
      model: "gemini-2.5-flash",
      providerId: "gcp",
      variations: 3,
    });

    expect(aiService.generateMultiple).toHaveBeenCalledTimes(1);
    expect(aiService.generateMultiple).toHaveBeenCalledWith(
      expect.objectContaining({ providerId: "gcp" }),
      3,
    );
    expect(result.svgs).toHaveLength(1);
    expect(result.svgs[0]).toContain("<svg");
    expect(uiAdapter.notify).toHaveBeenCalledWith({
      type: "warning",
      message: "Model returned 1 of 3 requested variations before sanitization.",
    });
    expect(uiAdapter.notify).not.toHaveBeenCalledWith({
      type: "success",
      message: "SVGs generated successfully",
    });
  });
});
