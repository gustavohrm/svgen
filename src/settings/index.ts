import "../ui/components/app-header";
import { AiProviderId } from "../core/types/index";
import type { UsageProviderSnapshot, UsageSnapshot } from "../core/modules/db/index";
import { createStore } from "../core/utils/store";
import { escapeHtml } from "../core/utils/html-escape";
import "../ui/components/api-keys-modal";
import { ApiKeysModal } from "../ui/components/api-keys-modal";
import { appComposition } from "../core/app/composition-root";

const providerRegistry = appComposition.providerRegistry;
const settingsRepository = appComposition.settingsRepository;
const container = document.getElementById("settings-container");

interface ModelEntry {
  model: string;
  providerId: AiProviderId;
  providerName: string;
  providerIcon: string;
  keyId: string;
  isSelected: boolean;
}

interface SettingsState {
  searchTerm: string;
  filterProvider: AiProviderId | "all";
  sortDirection: "asc" | "desc";
}

const numberFormatter = new Intl.NumberFormat("en-US");

function formatInteger(value: number): string {
  return numberFormatter.format(value);
}

function formatTimestamp(value: number | undefined): string {
  if (typeof value !== "number") {
    return "No usage tracked yet";
  }

  return `Updated ${new Date(value).toLocaleString()}`;
}

function renderProviderUsageRows(usage: UsageSnapshot): string {
  const providers = providerRegistry.getAllProviders();

  const rows = providers
    .map((provider) => {
      const providerUsage = usage.providers[provider.id];
      if (!providerUsage || providerUsage.requestCount === 0) {
        return "";
      }

      const safeProviderName = escapeHtml(provider.name);
      const safeProviderIcon = escapeHtml(provider.icon);
      const modelRows = Object.entries(providerUsage.models)
        .filter(([, modelUsage]) => modelUsage.requestCount > 0)
        .sort((a, b) => b[1].totalTokens - a[1].totalTokens)
        .slice(0, 5)
        .map(([model, modelUsage]) => buildModelUsageRow(model, modelUsage))
        .join("");

      return `
        <div class="rounded-lg border border-border/40 px-3 py-2.5">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <img src="${safeProviderIcon}" alt="${safeProviderName}" class="w-4 h-4 object-contain" />
              <span class="text-sm font-medium text-text">${safeProviderName}</span>
            </div>
            <span class="text-xs text-text-muted">${formatInteger(providerUsage.requestCount)} req</span>
          </div>
          <div class="mt-1.5 text-xs text-text-muted">
            ${formatInteger(providerUsage.inputTokens)} in / ${formatInteger(providerUsage.outputTokens)} out / ${formatInteger(providerUsage.totalTokens)} total
          </div>
          ${modelRows ? `<div class="mt-2 space-y-1">${modelRows}</div>` : ""}
        </div>
      `;
    })
    .join("");

  if (!rows) {
    return `<p class="text-xs text-text-muted">No provider usage yet.</p>`;
  }

  return rows;
}

function buildModelUsageRow(model: string, usage: UsageProviderSnapshot["models"][string]): string {
  const safeModel = escapeHtml(model);
  return `
    <div class="flex items-center justify-between gap-2 rounded-md border border-border/30 px-2 py-1.5">
      <span class="text-xs text-text-secondary truncate">${safeModel}</span>
      <span class="text-[11px] text-text-muted shrink-0">${formatInteger(usage.totalTokens)} total</span>
    </div>
  `;
}

function renderUsage() {
  if (!container) return;

  const usageInputTotal = container.querySelector("#usage-input-total");
  const usageOutputTotal = container.querySelector("#usage-output-total");
  const usageTotal = container.querySelector("#usage-total");
  const usageRequestTotal = container.querySelector("#usage-request-total");
  const usageLastUpdated = container.querySelector("#usage-last-updated");
  const usageProviderBreakdown = container.querySelector("#usage-provider-breakdown");

  if (
    !usageInputTotal ||
    !usageOutputTotal ||
    !usageTotal ||
    !usageRequestTotal ||
    !usageLastUpdated ||
    !usageProviderBreakdown
  ) {
    return;
  }

  const usage = settingsRepository.getSettings().usage;

  usageInputTotal.textContent = formatInteger(usage.inputTokens);
  usageOutputTotal.textContent = formatInteger(usage.outputTokens);
  usageTotal.textContent = formatInteger(usage.totalTokens);
  usageRequestTotal.textContent = formatInteger(usage.requestCount);
  usageLastUpdated.textContent = formatTimestamp(usage.updatedAt);
  usageProviderBreakdown.innerHTML = renderProviderUsageRows(usage);
}

/* ── State ── */
const store = createStore<SettingsState>({
  searchTerm: "",
  filterProvider: "all",
  sortDirection: "asc",
});

/* ── Helpers ── */
function getAllModels(): ModelEntry[] {
  const settings = settingsRepository.getSettings();
  const providers = providerRegistry.getAllProviders();
  const entries: ModelEntry[] = [];

  for (const provider of providers) {
    const activeKeyId = settings.activeKeys[provider.id];
    const activeKey = settings.apiKeys.find(
      (k) => k.id === activeKeyId && k.providerId === provider.id,
    );

    if (!activeKey || !activeKey.availableModels) continue;

    for (const model of activeKey.availableModels) {
      entries.push({
        model,
        providerId: provider.id,
        providerName: provider.name,
        providerIcon: provider.icon,
        keyId: activeKey.id,
        isSelected: activeKey.selectedModels.includes(model),
      });
    }
  }

  return entries;
}

function getFilteredModels(models: ModelEntry[], state: SettingsState): ModelEntry[] {
  let filtered = models;

  if (state.filterProvider !== "all") {
    filtered = filtered.filter((m) => m.providerId === state.filterProvider);
  }

  if (state.searchTerm) {
    const term = state.searchTerm.toLowerCase();
    filtered = filtered.filter((m) => m.model.toLowerCase().includes(term));
  }

  filtered.sort((a, b) => {
    if (a.isSelected !== b.isSelected) {
      return a.isSelected ? -1 : 1;
    }

    const comparison = a.model.localeCompare(b.model);
    return state.sortDirection === "asc" ? comparison : -comparison;
  });

  return filtered;
}

/* ── Render: Table Header ── */
function renderTableHeader(state: SettingsState, filteredModels: ModelEntry[]) {
  if (!container) return;
  const header = container.querySelector("#models-table-header");
  if (!header) return;

  const allSelected = filteredModels.length > 0 && filteredModels.every((m) => m.isSelected);
  const someSelected = filteredModels.some((m) => m.isSelected);

  header.innerHTML = `
    <div class="flex items-center gap-4 w-full">
      <label class="relative w-4 h-4 shrink-0 rounded-[5px] focus-within:ring-2 focus-within:ring-border/60 focus-within:ring-offset-1 focus-within:ring-offset-background">
        <input
          type="checkbox"
          id="select-all-models"
          aria-label="Select all visible models"
          ${allSelected ? "checked" : ""}
          class="absolute inset-0 opacity-0 cursor-pointer"
        />
        <span
          class="w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors ${allSelected || someSelected ? "bg-text border-text" : "bg-transparent border-border/70"}"
        >
          ${
            allSelected
              ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="w-2.5 h-2.5 text-background"><path d="M20 6 9 17l-5-5" /></svg>`
              : someSelected
                ? `<svg viewBox="0 0 24 24" fill="currentColor" class="w-2.5 h-2.5 text-background"><rect x="5" y="11" width="14" height="2.5" rx="1.25" /></svg>`
                : ""
          }
        </span>
      </label>
      <span class="text-sm font-bold text-text tracking-wider w-24 shrink-0">Provider</span>
      <span class="text-sm font-bold text-text tracking-wider flex-1">Model</span>
      <button
        id="sort-btn"
        class="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold text-text-muted hover:text-text hover:bg-surface-hover/50 uppercase tracking-wider transition-all cursor-pointer shrink-0"
        title="Sort alphabetically"
      >
        <svg
          class="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          ${
            state.sortDirection === "asc"
              ? `<path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="M20 8h-5"/><path d="M15 10V6.5a2.5 2.5 0 0 1 5 0V10"/><path d="M15 14h5l-5 6h5"/>`
              : `<path d="m3 8 4-4 4 4"/><path d="M7 4v16"/><path d="M15 4h5l-5 6h5"/><path d="M15 20v-3.5a2.5 2.5 0 0 1 5 0V20"/><path d="M20 18h-5"/>`
          }
        </svg>
      </button>
    </div>
  `;

  const selectAllCheckbox = header.querySelector("#select-all-models") as HTMLInputElement;
  if (selectAllCheckbox) {
    selectAllCheckbox.indeterminate = someSelected && !allSelected;
  }
}

/* ── Render: Models Table ── */
function renderModels(state: SettingsState) {
  if (!container) return;
  const table = container.querySelector("#models-table");
  const emptyState = container.querySelector("#empty-state");
  if (!table || !emptyState) return;

  const allModels = getAllModels();
  const filtered = getFilteredModels(allModels, state);

  renderTableHeader(state, filtered);

  if (filtered.length === 0) {
    table.parentElement?.classList.add("hidden");
    emptyState.classList.remove("hidden");
    emptyState.classList.add("flex");
    return;
  }

  table.parentElement?.classList.remove("hidden");
  emptyState.classList.add("hidden");
  emptyState.classList.remove("flex");

  table.innerHTML = filtered
    .map((entry) => {
      const safeKeyId = escapeHtml(entry.keyId);
      const safeModel = escapeHtml(entry.model);
      const safeProviderIcon = escapeHtml(entry.providerIcon);
      const safeProviderName = escapeHtml(entry.providerName);
      const checkboxStateClasses = entry.isSelected
        ? "bg-text border-text"
        : "bg-transparent border-border/70";
      const checkboxIcon = entry.isSelected
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="w-2.5 h-2.5 text-background"><path d="M20 6 9 17l-5-5" /></svg>`
        : "";

      return `
      <label class="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-hover/5 transition-all cursor-pointer group">
        <div class="relative w-4 h-4 shrink-0 rounded-[5px] focus-within:ring-2 focus-within:ring-border/60 focus-within:ring-offset-1 focus-within:ring-offset-background">
          <input
            type="checkbox"
            data-key-id="${safeKeyId}"
            value="${safeModel}"
            ${entry.isSelected ? "checked" : ""}
            class="model-checkbox absolute inset-0 opacity-0 cursor-pointer"
          />
          <span class="pointer-events-none w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors ${checkboxStateClasses}">
            ${checkboxIcon}
          </span>
        </div>
        <div class="w-24 shrink-0 flex items-center gap-2">
          <img
            src="${safeProviderIcon}"
            alt="${safeProviderName}"
            class="w-4 h-4 shrink-0 object-contain opacity-60 group-hover:opacity-100 transition-opacity"
          />
          <span class="text-xs text-text opacity-60 group-hover:opacity-100 transition-colors">${safeProviderName}</span>
        </div>
        <span class="text-sm text-text opacity-60 group-hover:opacity-100 transition-colors flex-1">${safeModel}</span>
      </label>
    `;
    })
    .join("");
}

/* ── Render: Provider Filter ── */
function renderFilterDropdown(state: SettingsState) {
  if (!container) return;
  const dropdown = container.querySelector("#filter-dropdown");
  if (!dropdown) return;

  const providers = providerRegistry.getAllProviders();

  dropdown.innerHTML = `
    <button data-filter="all" class="filter-option w-full text-left px-4 py-2.5 text-sm ${
      state.filterProvider === "all" ? "text-text" : "text-text-secondary"
    } hover:text-text hover:bg-surface-hover transition-all flex items-center gap-2.5">
      <span class="w-5 h-5 flex items-center justify-center shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>
        </svg>
      </span>
      All Providers
    </button>
    ${providers
      .map((p) => {
        const safeProviderId = escapeHtml(p.id);
        const safeProviderIcon = escapeHtml(p.icon);
        const safeProviderName = escapeHtml(p.name);

        return `
      <button data-filter="${safeProviderId}" class="filter-option w-full text-left px-4 py-2.5 text-sm ${
        state.filterProvider === p.id ? "text-text" : "text-text-secondary"
      } hover:text-text hover:bg-surface-hover transition-all flex items-center gap-2.5">
        <img src="${safeProviderIcon}" alt="${safeProviderName}" class="w-5 h-5 object-contain shrink-0" />
        ${safeProviderName}
      </button>
    `;
      })
      .join("")}
  `;
}

/* ── Full render ── */
function render(state: SettingsState = store.get()) {
  renderUsage();
  renderModels(state);
  renderFilterDropdown(state);
}

/* ── Event Bindings ── */
let isInitialized = false;

function bindStaticEvents() {
  if (!container || isInitialized) return;

  // Direct API Keys button
  container.querySelector("#open-keys-modal-btn")?.addEventListener("click", () => {
    const modal = document.querySelector("api-keys-modal") as ApiKeysModal;
    modal?.open();
  });

  // Search
  const searchInput = container.querySelector("#model-search") as HTMLInputElement;
  searchInput?.addEventListener("input", (e) => {
    store.set({ searchTerm: (e.target as HTMLInputElement).value });
  });

  // Filter dropdown toggle
  const filterBtn = container.querySelector("#filter-btn");
  const filterDropdown = container.querySelector("#filter-dropdown") as HTMLElement;

  filterBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    filterDropdown.classList.toggle("hidden");
  });

  document.addEventListener("click", (e) => {
    if (!filterBtn?.contains(e.target as Node)) {
      filterDropdown?.classList.add("hidden");
    }
  });

  isInitialized = true;
}

let isDynamicEventsAttached = false;

function attachDynamicEvents() {
  if (!container || isDynamicEventsAttached) return;

  container.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;

    // Filter options
    const filterBtn = target.closest(".filter-option") as HTMLElement | null;
    if (filterBtn) {
      const value = filterBtn.dataset.filter as AiProviderId | "all";
      store.set({ filterProvider: value });

      const filterLabel = container?.querySelector("#filter-label");
      if (filterLabel) {
        filterLabel.textContent =
          value === "all"
            ? "All Providers"
            : (providerRegistry.getProvider(value)?.name ?? "All Providers");
      }

      const filterDropdown = container?.querySelector("#filter-dropdown") as HTMLElement;
      filterDropdown?.classList.add("hidden");

      return;
    }

    // Sort button (now in header)
    const sortBtn = target.closest("#sort-btn");
    if (sortBtn) {
      const current = store.get().sortDirection;
      const next = current === "asc" ? "desc" : "asc";
      store.set({ sortDirection: next });
      return;
    }
  });

  container.addEventListener("change", (e) => {
    const target = e.target as HTMLInputElement;

    // Select All
    if (target.id === "select-all-models") {
      const isChecked = target.checked;
      const state = store.get();
      const allModels = getAllModels();
      const filtered = getFilteredModels(allModels, state);

      settingsRepository.toggleModelSelections(
        filtered.map((entry) => ({
          keyId: entry.keyId,
          model: entry.model,
          shouldSelect: isChecked,
        })),
      );
      render(store.get());
      return;
    }

    // Model checkboxes
    if (target.matches(".model-checkbox")) {
      const keyId = target.dataset.keyId;
      const model = target.value;
      if (keyId) {
        settingsRepository.toggleModelSelection(keyId, model, target.checked);
        render(store.get()); // Re-render to update the Select All checkbox state
      }
    }
  });

  isDynamicEventsAttached = true;
}

/* ── Init ── */
document.addEventListener("DOMContentLoaded", () => {
  store.subscribe((state) => {
    render(state);
  });

  render(store.get());
  bindStaticEvents();
  attachDynamicEvents();
});
