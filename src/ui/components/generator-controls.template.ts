import type { AppSettings } from "../../core/modules/db";

const GENERATE_ICON = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="w-5 h-5"
  >
    <path d="m5 12 7-7 7 7" />
    <path d="M12 19V5" />
  </svg>
`;

const GENERATE_LOADING_ICON = `
  <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
`;

export function renderGeneratorControls(settings: AppSettings): string {
  return `
    <div id="generator-controls-container" class="max-w-5xl mx-auto w-full py-0">
      <div
        class="bg-surface border border-transparent rounded-xl p-4 transition-all duration-400 focus-within:border-border relative z-20"
      >
        <textarea
          id="prompt-input"
          rows="3"
          class="w-full bg-transparent text-text placeholder-text-muted outline-none resize-none leading-relaxed"
          placeholder="Describe the SVG you want to generate (e.g., a glowing isometric cube)..."
        ></textarea>

        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4 pt-2">
            <model-dropdown id="model-selector"></model-dropdown>

            <label
              class="cursor-pointer"
              title="Attach reference SVG"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="w-4 h-4 text-text-secondary hover:text-text transition duration-400"
              >
                <path
                  d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"
                />
              </svg>
              <input type="file" id="reference-input" accept=".svg" multiple class="hidden" />
            </label>

            <div class="relative flex items-center" id="settings-container">
              <button
                id="settings-btn"
                class="cursor-pointer text-text-secondary hover:text-text transition duration-400 flex items-center"
                title="Settings"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="size-4"
                >
                  <path d="M14 17H5"/><path d="M19 7h-9"/>
                  <circle cx="17" cy="17" r="3"/>
                  <circle cx="7" cy="7" r="3"/>
                </svg>
              </button>
              <div
                id="settings-menu"
                class="absolute left-1/2 -top-4 -translate-x-1/2 -translate-y-full bg-surface border border-border rounded-xl hidden flex-col gap-3 p-3 shadow-2xl z-50 min-w-3xs duration-200"
              >
                <div class="flex items-center justify-between gap-3">
                  <label class="text-sm font-medium text-text-secondary whitespace-nowrap" for="variation-input">Variations</label>
                  <input
                    type="number"
                    id="variation-input"
                    min="1"
                    max="4"
                    value="${settings.variations}"
                    class="bg-background rounded-lg px-2 py-1.5 text-xs text-text outline-none focus:border-border-bright transition-all w-14 font-medium"
                  />
                </div>

                <div class="flex items-center justify-between gap-3">
                  <label class="text-sm font-medium text-text-secondary whitespace-nowrap" for="temperature-input">Temperature</label>
                  <input
                    type="number"
                    id="temperature-input"
                    min="0"
                    max="2"
                    step="0.1"
                    value="${settings.temperature.toFixed(1)}"
                    class="bg-background rounded-lg px-2 py-1.5 text-xs text-text outline-none focus:border-border-bright transition-all w-14 font-medium"
                  />
                </div>

                <div class="flex items-center justify-between gap-3">
                  <span class="text-sm font-medium text-text-secondary">System prompt</span>
                  <button
                    id="edit-system-prompt-btn"
                    type="button"
                    class="text-xs text-text-secondary hover:text-text transition cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            id="generate-btn"
            class="bg-surface-hover hover:bg-text text-text hover:text-background w-10 h-10 mt-2 rounded-lg flex items-center justify-center transition-all scale-100 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ${GENERATE_ICON}
          </button>
        </div>
      </div>
      <div id="attachments-container" class="flex flex-wrap gap-4 mt-6 empty:hidden"></div>
    </div>

    <div
      id="system-prompt-modal"
      class="fixed inset-0 z-50 hidden items-center justify-center p-4 bg-background/80 backdrop-blur-md"
    >
      <div class="bg-background border border-border rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col">
        <div class="p-4 border-b border-border flex items-center justify-between">
          <h3 class="text-base font-semibold">System Prompt</h3>
          <button
            id="close-system-prompt-modal-btn"
            type="button"
            class="p-1 rounded-lg hover:bg-surface-hover cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <div class="p-4">
          <textarea
            id="system-prompt-modal-input"
            rows="12"
            class="w-full bg-transparent border border-border rounded-xl px-3 py-2.5 text-sm text-text outline-none resize-y leading-relaxed"
          ></textarea>
        </div>
        <div class="p-4 border-t border-border flex items-center justify-end gap-2">
          <button
            id="cancel-system-prompt-btn"
            type="button"
            class="px-3 py-1.5 text-sm text-text-secondary hover:text-text transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="save-system-prompt-btn"
            type="button"
            class="px-3 py-1.5 text-sm bg-surface-hover hover:bg-text text-text hover:text-background rounded-lg transition cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  `;
}

export function setGenerateButtonLoading(button: HTMLButtonElement): void {
  button.disabled = true;
  button.innerHTML = GENERATE_LOADING_ICON;
}

export function setGenerateButtonReady(button: HTMLButtonElement): void {
  button.disabled = false;
  button.innerHTML = GENERATE_ICON;
}
