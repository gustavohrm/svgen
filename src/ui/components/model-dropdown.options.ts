import type { AppSettings } from "../../core/modules/db";
import { escapeHtml } from "../../core/utils/html-escape";

export interface ProviderOption {
  id: string;
  name: string;
  icon: string;
}

interface BuildModelOptionsParams {
  settings: AppSettings;
  providers: ProviderOption[];
}

export interface ModelDropdownBuildResult {
  modelOptionsHtml: string;
  firstModel: string | null;
  firstProviderId: string | null;
}

export function buildModelOptions({
  settings,
  providers,
}: BuildModelOptionsParams): ModelDropdownBuildResult {
  let modelOptionsHtml = "";
  let firstModel: string | null = null;
  let firstProviderId: string | null = null;

  let providerTabsHtml = "";
  let providerPanesHtml = "";
  let isFirstProvider = true;

  if (settings.apiKeys.length === 0) {
    return {
      modelOptionsHtml: `<div class="p-4 w-75 text-xs text-text-muted text-center">Configure an API Key first</div>`,
      firstModel,
      firstProviderId,
    };
  }

  for (const provider of providers) {
    const keys = settings.apiKeys.filter((k) => k.providerId === provider.id);
    const providerModels = new Set<string>();
    const safeProviderId = escapeHtml(provider.id);
    const safeProviderName = escapeHtml(provider.name);
    const safeProviderIcon = escapeHtml(provider.icon);
    const safeProviderPaneId = `provider-pane-${safeProviderId}`;

    for (const key of keys) {
      if (!key.selectedModels) continue;
      for (const model of key.selectedModels) {
        providerModels.add(model);
      }
    }

    if (providerModels.size === 0) {
      continue;
    }

    providerTabsHtml += `
      <button data-tab-target="${safeProviderPaneId}" class="provider-tab w-full text-left px-4 py-3 text-xs font-semibold ${isFirstProvider ? "text-text bg-surface-hover/30" : "text-text-muted"} hover:text-text hover:bg-surface-hover/50 transition-all flex items-center justify-between border-b border-border/10 last:border-b-0">
        <div class="flex items-center gap-2 max-w-full overflow-hidden">
          <img src="${safeProviderIcon}" alt="${safeProviderName}" class="w-4 h-4 shrink-0 object-contain" />
          <span class="truncate">${safeProviderName}</span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 opacity-50 shrink-0"><path d="m9 18 6-6-6-6"/></svg>
      </button>
    `;

    providerPanesHtml += `
      <div id="${safeProviderPaneId}" class="provider-pane flex-col gap-1 ${isFirstProvider ? "flex" : "hidden"}">
    `;

    for (const model of providerModels) {
      if (!firstModel) {
        firstModel = model;
        firstProviderId = provider.id;
      }

      const safeModel = escapeHtml(model);

      providerPanesHtml += `
        <button data-model="${safeModel}" data-provider-id="${safeProviderId}" class="model-option w-full text-left px-3 py-2.5 text-xs font-medium text-text-secondary hover:text-text hover:bg-surface-hover rounded-lg transition-colors flex items-center gap-2">
          <img src="${safeProviderIcon}" alt="${safeProviderName}" class="w-4 h-4 shrink-0 object-contain opacity-60" />
          <span class="truncate">${safeModel}</span>
        </button>
      `;
    }

    providerPanesHtml += `</div>`;
    isFirstProvider = false;
  }

  if (!providerTabsHtml) {
    modelOptionsHtml = `<div class="p-4 w-75 text-xs text-text-muted text-center">No models enabled in API Keys</div>`;
  } else {
    modelOptionsHtml = `
      <div class="flex flex-col w-125">
        <div class="p-3 border-b border-border bg-background shrink-0">
          <div class="relative w-full">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" id="model-dropdown-search" autocomplete="off" placeholder="Search models..." class="w-full bg-surface-hover/30 border border-border/50 rounded-lg pl-9 pr-3 py-2 text-xs text-text placeholder:text-text-muted outline-none focus:border-border-bright transition-all">
          </div>
        </div>
        <div class="flex h-80">
          <div class="w-45 shrink-0 border-r border-border bg-surface-hover/10 overflow-y-auto custom-scrollbar flex flex-col">
            ${providerTabsHtml}
          </div>
          <div class="flex-1 overflow-y-auto custom-scrollbar p-3 bg-background relative">
            ${providerPanesHtml}
          </div>
        </div>
      </div>
    `;
  }

  return {
    modelOptionsHtml,
    firstModel,
    firstProviderId,
  };
}
