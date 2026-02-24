import { APP_EVENTS } from "../constants/events";
import { AiProviderId } from "../types";

export interface StartGenerationDetail {
  prompt: string;
  referenceSvgs: string[];
  model: string | undefined;
  providerId: AiProviderId | undefined;
  variations: number;
}

export interface SvgResultsDetail {
  svgs: string[];
  prompt?: string;
  model?: string;
  generatedAt?: number;
}

export interface AppEventMap {
  [APP_EVENTS.START_GENERATION]: StartGenerationDetail;
  [APP_EVENTS.GENERATION_STARTED]: undefined;
  [APP_EVENTS.GENERATION_FINISHED]: undefined;
  [APP_EVENTS.SVGEN_RESULTS]: SvgResultsDetail;
}

type AppEventName = keyof AppEventMap;

export function emitAppEvent<K extends AppEventName>(
  type: K,
  ...detailArg: AppEventMap[K] extends undefined ? [] : [AppEventMap[K]]
): void {
  if (detailArg.length === 0) {
    window.dispatchEvent(new Event(type));
    return;
  }

  window.dispatchEvent(new CustomEvent(type, { detail: detailArg[0] }));
}

export function onAppEvent<K extends AppEventName>(
  type: K,
  handler: (detail: AppEventMap[K], event: CustomEvent<AppEventMap[K]>) => void,
  target: Window = window,
): () => void {
  const listener: EventListener = (event) => {
    const customEvent = event as CustomEvent<AppEventMap[K]>;
    handler(customEvent.detail as AppEventMap[K], customEvent);
  };

  target.addEventListener(type, listener);
  return () => target.removeEventListener(type, listener);
}
