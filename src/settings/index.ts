import "../ui/components/app-header";
import "../ui/components/app-modal";
import { db } from "../core/modules/db/index";
import { createDefaultProviderRegistry } from "../core/services/ai/providers/index";
import { AiProviderId } from "../core/types/index";
import {
  renderKeysModalBody,
  attachKeysModalEvents,
  bindKeysModalStaticEvents,
  openModal,
} from "./keys-modal";
import { APP_EVENTS } from "../core/constants/events";

const providerRegistry = createDefaultProviderRegistry();
const container = document.getElementById("settings-container");

interface ModelEntry {
  model: string;
  providerId: AiProviderId;
  providerName: string;
  providerIcon: string;
  keyId: string;
  isSelected: boolean;
}

/* ── State ── */
let searchTerm = "";
let filterProvider: AiProviderId | "all" = "all";
let sortDirection: "asc" | "desc" = "asc";

/* ── Helpers ── */
function getAllModels(): ModelEntry[] {
  const settings = db.getSettings();
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

function getFilteredModels(models: ModelEntry[]): ModelEntry[] {
  let filtered = models;

  if (filterProvider !== "all") {
    filtered = filtered.filter((m) => m.providerId === filterProvider);
  }

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter((m) => m.model.toLowerCase().includes(term));
  }

  filtered.sort((a, b) => {
    const comparison = a.model.localeCompare(b.model);
    return sortDirection === "asc" ? comparison : -comparison;
  });

  return filtered;
}

/* ── Render: Models Table ── */
function renderModels() {
  if (!container) return;
  const table = container.querySelector("#models-table");
  const emptyState = container.querySelector("#empty-state");
  if (!table || !emptyState) return;

  const allModels = getAllModels();
  const filtered = getFilteredModels(allModels);

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
    .map(
      (entry) => `
      <label class="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-hover/5 transition-all cursor-pointer group">
        <input
          type="checkbox"
          data-key-id="${entry.keyId}"
          value="${entry.model}"
          ${entry.isSelected ? "checked" : ""}
          class="model-checkbox w-4 h-4 accent-primary rounded border-border shrink-0"
        />
        <img
          src="${entry.providerIcon}"
          alt="${entry.providerName}"
          class="w-5 h-5 shrink-0 object-contain opacity-60 group-hover:opacity-100 transition-opacity"
        />
        <span class="text-sm text-text-secondary group-hover:text-text transition-colors truncate">${entry.model}</span>
      </label>
    `,
    )
    .join("");
}

/* ── Render: Provider Filter ── */
function renderFilterDropdown() {
  if (!container) return;
  const dropdown = container.querySelector("#filter-dropdown");
  if (!dropdown) return;

  const providers = providerRegistry.getAllProviders();

  dropdown.innerHTML = `
    <button data-filter="all" class="filter-option w-full text-left px-4 py-2.5 text-sm ${
      filterProvider === "all" ? "text-text" : "text-text-secondary"
    } hover:text-text hover:bg-surface-hover transition-all flex items-center gap-2.5">
      <span class="w-5 h-5 flex items-center justify-center shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>
        </svg>
      </span>
      All Providers
    </button>
    ${providers
      .map(
        (p) => `
      <button data-filter="${p.id}" class="filter-option w-full text-left px-4 py-2.5 text-sm ${
        filterProvider === p.id ? "text-text" : "text-text-secondary"
      } hover:text-text hover:bg-surface-hover transition-all flex items-center gap-2.5">
        <img src="${p.icon}" alt="${p.name}" class="w-5 h-5 object-contain shrink-0" />
        ${p.name}
      </button>
    `,
      )
      .join("")}
  `;
}

/* ── Full render ── */
function render() {
  renderModels();
  renderFilterDropdown();
}

/* ── Event Bindings ── */
let isInitialized = false;

function bindStaticEvents() {
  if (!container || isInitialized) return;

  const onUpdate = () => {
    render();
    attachDynamicEvents();
    window.dispatchEvent(new Event(APP_EVENTS.SETTINGS_UPDATED));
  };

  // Direct API Keys button
  container.querySelector("#open-keys-modal-btn")?.addEventListener("click", () => {
    renderKeysModalBody(container);
    openModal(container, "keys-modal");
    attachKeysModalEvents(container, onUpdate);
  });

  bindKeysModalStaticEvents(container, onUpdate);

  // Search
  const searchInput = container.querySelector("#model-search") as HTMLInputElement;
  searchInput?.addEventListener("input", (e) => {
    searchTerm = (e.target as HTMLInputElement).value;
    renderModels();
    attachDynamicEvents();
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

  // Sort toggle
  const sortBtn = container.querySelector("#sort-btn");
  const sortLabel = container.querySelector("#sort-label");

  sortBtn?.addEventListener("click", () => {
    sortDirection = sortDirection === "asc" ? "desc" : "asc";
    if (sortLabel) sortLabel.textContent = sortDirection === "asc" ? "A → Z" : "Z → A";
    renderModels();
    attachDynamicEvents();
  });

  isInitialized = true;
}

function attachDynamicEvents() {
  if (!container) return;

  // Model checkboxes
  container.querySelectorAll(".model-checkbox").forEach((cb) => {
    cb.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement;
      const keyId = target.dataset.keyId;
      const model = target.value;
      const settings = db.getSettings();
      const key = settings.apiKeys.find((k) => k.id === keyId);
      if (key) {
        if (target.checked) {
          if (!key.selectedModels.includes(model)) key.selectedModels.push(model);
        } else {
          key.selectedModels = key.selectedModels.filter((m) => m !== model);
        }
        db.saveSettings(settings);
        window.dispatchEvent(new Event(APP_EVENTS.SETTINGS_UPDATED));
      }
    });
  });

  // Filter options
  container.querySelectorAll(".filter-option").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const target = e.currentTarget as HTMLElement;
      const value = target.dataset.filter as AiProviderId | "all";
      filterProvider = value;

      const filterLabel = container?.querySelector("#filter-label");
      if (filterLabel) {
        filterLabel.textContent =
          value === "all"
            ? "All Providers"
            : (providerRegistry.getProvider(value)?.name ?? "All Providers");
      }

      const filterDropdown = container?.querySelector("#filter-dropdown") as HTMLElement;
      filterDropdown?.classList.add("hidden");

      render();
      attachDynamicEvents();
    });
  });
}

/* ── Init ── */
document.addEventListener("DOMContentLoaded", () => {
  render();
  bindStaticEvents();
  attachDynamicEvents();
});
