import "./ui/components/app-header";
import "./ui/components/model-dropdown";
import "./ui/components/generator-controls";
import "./ui/components/results-grid";
import { appComposition } from "./core/app/composition-root";
import { showAlert } from "./core/utils/alert";
import { APP_EVENTS } from "./core/constants/events";
import { emitAppEvent, onAppEvent } from "./core/events/app-events";
import { GenerateSvgUseCase, GenerationUiAdapter } from "./core/use-cases/generate-svg";

const generationUiAdapter: GenerationUiAdapter = {
  notify: showAlert,
  navigateToSettings: () => {
    window.location.href = "/settings/";
  },
};

const generateSvgUseCase = new GenerateSvgUseCase(
  appComposition.settingsRepository,
  appComposition.providerRegistry,
  appComposition.aiService,
  generationUiAdapter,
);

document.addEventListener("DOMContentLoaded", () => {
  onAppEvent(APP_EVENTS.START_GENERATION, async (detail) => {
    emitAppEvent(APP_EVENTS.GENERATION_STARTED);

    try {
      const result = await generateSvgUseCase.execute(detail);
      emitAppEvent(APP_EVENTS.SVGEN_RESULTS, result);
    } finally {
      emitAppEvent(APP_EVENTS.GENERATION_FINISHED);
    }
  });
});
