import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_EVENTS } from "./core/constants/events";
import { emitAppEvent } from "./core/events/app-events";

const executeMock = vi.fn();

vi.mock("./ui/components/app-header", () => ({}));
vi.mock("./ui/components/model-dropdown", () => ({}));
vi.mock("./ui/components/generator-controls", () => ({}));
vi.mock("./ui/components/results-grid", () => ({}));
vi.mock("./core/utils/alert", () => ({ showAlert: vi.fn() }));
vi.mock("./core/app/composition-root", () => ({
  appComposition: {
    settingsRepository: {},
    providerRegistry: {},
    aiService: {},
  },
}));
vi.mock("./core/use-cases/generate-svg", () => ({
  GenerateSvgUseCase: class {
    execute = executeMock;
  },
}));

describe("index generation event pipeline", () => {
  let cleanupEventsController: AbortController;
  let originalWindowAddEventListener: Window["addEventListener"];
  let originalWindowRemoveEventListener: Window["removeEventListener"];
  let trackedWindowListeners: Array<{
    type: string;
    listener: EventListenerOrEventListenerObject;
    options?: boolean | AddEventListenerOptions;
  }>;

  beforeEach(() => {
    vi.resetModules();
    executeMock.mockReset();
    document.body.innerHTML = "";
    cleanupEventsController = new AbortController();

    originalWindowAddEventListener = window.addEventListener.bind(window);
    originalWindowRemoveEventListener = window.removeEventListener.bind(window);
    trackedWindowListeners = [];

    window.addEventListener = ((
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) => {
      trackedWindowListeners.push({ type, listener, options });
      return originalWindowAddEventListener(type, listener, options);
    }) as Window["addEventListener"];
  });

  afterEach(() => {
    cleanupEventsController.abort();
    for (const { type, listener, options } of trackedWindowListeners) {
      originalWindowRemoveEventListener(type, listener, options);
    }
    window.addEventListener = originalWindowAddEventListener;
    window.removeEventListener = originalWindowRemoveEventListener;
  });

  it("emits started, results and finished events in order", async () => {
    executeMock.mockResolvedValue({
      svgs: ["<svg viewBox='0 0 10 10'></svg>"],
      prompt: "badge",
      model: "gemini-2.5-flash",
      generatedAt: 123,
    });

    await import("./index");

    const sequence: string[] = [];
    const onStarted = () => sequence.push("started");
    const onResults = () => sequence.push("results");
    const onFinished = () => sequence.push("finished");

    window.addEventListener(APP_EVENTS.GENERATION_STARTED, onStarted, {
      signal: cleanupEventsController.signal,
    });
    window.addEventListener(APP_EVENTS.SVGEN_RESULTS, onResults, {
      signal: cleanupEventsController.signal,
    });
    window.addEventListener(APP_EVENTS.GENERATION_FINISHED, onFinished, {
      signal: cleanupEventsController.signal,
    });

    document.dispatchEvent(new Event("DOMContentLoaded"));
    emitAppEvent(APP_EVENTS.START_GENERATION, {
      prompt: "badge",
      referenceSvgs: [],
      model: "gemini-2.5-flash",
      providerId: "gcp",
      variations: 2,
    });

    await vi.waitFor(() => {
      expect(executeMock).toHaveBeenCalledWith({
        prompt: "badge",
        referenceSvgs: [],
        model: "gemini-2.5-flash",
        providerId: "gcp",
        variations: 2,
      });
      expect(sequence).toEqual(["started", "results", "finished"]);
    });
  });
});
