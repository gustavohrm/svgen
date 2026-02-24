import type { AppSettings } from "../../core/modules/db";
import { escapeHtml } from "../../core/utils/html-escape";
import type { ProviderOption } from "./model-dropdown.options";

export function renderApiKeysModalShell(): string {
  return `
    <app-modal
      modal-id="keys-modal"
      title-id="keys-modal-title"
      modal-title="API Keys"
      close-btn-id="close-keys-modal-btn"
    >
      <div
        id="keys-modal-body"
        class="px-4 py-6 space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar"
      >
      </div>
    </app-modal>

    <app-modal
      modal-id="add-key-modal"
      title-id="add-key-title"
      modal-title="Add API Key"
      close-btn-id="close-add-key-btn"
    >
      <div class="px-4 py-6 space-y-6">
        <input type="hidden" id="modal-provider-id" />
        <div class="space-y-2">
          <label class="block text-sm font-medium text-text-secondary ml-1">Key Name</label>
          <input
            type="text"
            id="modal-key-name"
            placeholder="e.g. Primary Key"
            class="w-full bg-transparent border border-border/50 rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-muted outline-none focus:border-border transition-all"
          />
        </div>
        <div class="space-y-2">
          <label class="block text-sm font-medium text-text-secondary ml-1">Key Value</label>
          <input
            type="password"
            id="modal-key-value"
            placeholder="sk-••••••••••••••••••••••••"
            class="w-full bg-transparent border border-border/50 rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-muted outline-none focus:border-border transition-all"
          />
        </div>
      </div>
      <div class="p-4 border-t border-border flex justify-end">
        <button
          id="save-new-key"
          class="bg-text text-background px-4 py-2 font-semibold text-sm rounded-lg hover:bg-primary-dark transition-all cursor-pointer"
        >
          Save Configuration
        </button>
      </div>
    </app-modal>

    <app-modal
      modal-id="edit-key-modal"
      title-id="edit-key-title"
      modal-title="Edit API Key Name"
      close-btn-id="close-edit-key-btn"
    >
      <div class="p-4 space-y-6">
        <input type="hidden" id="edit-modal-key-id" />
        <div class="space-y-2">
          <label class="block text-sm font-medium text-text-secondary ml-1">Key Name</label>
          <input
            type="text"
            id="edit-modal-key-name"
            placeholder="e.g. Primary Key"
            class="w-full bg-transparent border border-border/50 rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-muted outline-none focus:border-border transition-all"
          />
        </div>
      </div>
      <div class="p-4 border-t border-border flex justify-end">
        <button
          id="save-edit-key"
          class="bg-text text-background px-4 py-2 font-semibold text-sm rounded-lg hover:bg-primary-dark transition-all cursor-pointer"
        >
          Save Changes
        </button>
      </div>
    </app-modal>
  `;
}

export function renderApiKeysBody(settings: AppSettings, providers: ProviderOption[]): string {
  return providers
    .map((provider) => {
      const safeProviderIcon = escapeHtml(provider.icon);
      const safeProviderName = escapeHtml(provider.name);
      const safeProviderId = escapeHtml(provider.id);
      const keys = settings.apiKeys.filter((k) => k.providerId === provider.id);
      const activeKeyId = settings.activeKeys[provider.id];

      return `
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <img src="${safeProviderIcon}" alt="${safeProviderName}" class="w-5 h-5 object-contain" />
              <span class="text-sm font-semibold text-text">${safeProviderName}</span>
            </div>
            <button data-action="add-key" data-provider="${safeProviderId}" class="text-xs font-medium text-text-secondary hover:text-text transition-all cursor-pointer flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              <span>Add Key</span>
            </button>
          </div>

          ${
            keys.length === 0
              ? `<div class="py-4 text-center border border-dashed border-border/50 rounded-xl"><p class="text-xs text-text-muted">No keys configured</p></div>`
              : keys
                  .map((key) => {
                    const safeKeyId = escapeHtml(key.id);
                    const safeKeyName = escapeHtml(key.name);
                    const maskedValue =
                      key.value.length < 8
                        ? "••••••"
                        : `${key.value.substring(0, 4)}••••${key.value.substring(key.value.length - 4)}`;
                    const safeKeyMaskedValue = escapeHtml(maskedValue);
                    const isActive = key.id === activeKeyId;
                    return `
                      <div class="flex items-center gap-3 group">
                        <label class="flex-1 flex items-center gap-3 p-2 cursor-pointer rounded-lg transition-all hover:bg-surface">
                          <input type="radio" name="active-key-${safeProviderId}" value="${safeKeyId}" data-provider-id="${safeProviderId}" ${isActive ? "checked" : ""} class="w-4 h-4 accent-primary key-radio cursor-pointer" />
                          <div class="flex flex-col min-w-0">
                            <span class="text-sm font-medium ${isActive ? "text-text" : "text-text-secondary"} truncate">${safeKeyName}</span>
                            <span class="text-xs text-text-muted font-mono mt-0.5">${safeKeyMaskedValue}</span>
                          </div>
                        </label>
                        <div class="flex items-center gap-1">
                          <button data-action="edit-key" data-key-id="${safeKeyId}" data-key-name="${safeKeyName}" class="p-2 rounded-lg text-text-secondary hover:text-text hover:bg-surface-hover transition-all opacity-0 group-hover:opacity-100 cursor-pointer" title="Edit Name">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                          </button>
                          <button data-action="delete-key" data-key-id="${safeKeyId}" class="p-2 rounded-lg text-text-secondary hover:text-error hover:bg-error/10 transition-all opacity-0 group-hover:opacity-100 cursor-pointer" title="Delete Key">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                          </button>
                          <button data-action="fetch-models" data-key-id="${safeKeyId}" class="p-2 rounded-lg text-text-secondary hover:text-text hover:bg-surface-hover transition-all cursor-pointer" title="Sync Models">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
                          </button>
                        </div>
                      </div>
                    `;
                  })
                  .join("")
          }
        </div>
      `;
    })
    .join("");
}
