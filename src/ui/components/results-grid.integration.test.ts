import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_EVENTS } from "../../core/constants/events";
import { emitAppEvent } from "../../core/events/app-events";

const saveSvgMock = vi.fn();
const showAlertMock = vi.fn();

vi.mock("../../core/app/composition-root", () => ({
  appComposition: {
    settingsRepository: {
      getSettings: () => ({ variations: 2 }),
    },
    galleryRepository: {
      saveSvg: saveSvgMock,
    },
  },
}));

vi.mock("../../core/utils/id", () => ({
  createId: () => "gallery-fixed-id",
}));

vi.mock("../../core/utils/alert", () => ({
  showAlert: showAlertMock,
}));

describe("results-grid save to gallery workflow", () => {
  beforeEach(() => {
    vi.resetModules();
    saveSvgMock.mockReset();
    showAlertMock.mockReset();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    const grid = document.querySelector("results-grid");
    grid?.remove();
  });

  it("saves selected generated SVG with result metadata", async () => {
    saveSvgMock.mockResolvedValue(undefined);

    await import("./results-grid");

    const grid = document.createElement("results-grid");
    document.body.appendChild(grid);

    emitAppEvent(APP_EVENTS.SVGEN_RESULTS, {
      svgs: ["<svg viewBox='0 0 10 10'><circle cx='5' cy='5' r='4'/></svg>"],
      prompt: "logo",
      model: "gemini-2.5-flash",
      generatedAt: 111,
    });

    const saveButton = grid.querySelector<HTMLButtonElement>(
      'button[data-action="save-to-gallery"]',
    );
    expect(saveButton).toBeTruthy();

    saveButton!.click();

    await vi.waitFor(() => {
      expect(saveSvgMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "gallery-fixed-id",
          prompt: "logo",
          model: "gemini-2.5-flash",
          timestamp: 111,
        }),
      );
      const saved = saveSvgMock.mock.calls[0][0];
      expect(saved.svg).toContain("<svg");
      expect(showAlertMock).toHaveBeenCalledWith({
        type: "success",
        message: "SVG saved to gallery!",
      });
    });
  });
});
