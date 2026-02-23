import { db, ApiKeyItem } from "../core/modules/db/index";
import { createDefaultProviderRegistry } from "../core/services/ai/providers/index";
import { showAlert } from "../core/utils/alert";
import { AiProviderId } from "../core/types/index";

const providerRegistry = createDefaultProviderRegistry();

export function openModal(container: HTMLElement, id: string) {
  const modal = container.querySelector(`#${id}`) as HTMLElement | null;
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }
}

export function closeModal(container: HTMLElement, id: string) {
  const modal = container.querySelector(`#${id}`) as HTMLElement | null;
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

export function renderKeysModalBody(container: HTMLElement) {
  const body = container.querySelector("#keys-modal-body");
  if (!body) return;

  const settings = db.getSettings();
  const providers = providerRegistry.getAllProviders();

  body.innerHTML = providers
    .map((provider) => {
      const keys = settings.apiKeys.filter((k) => k.providerId === provider.id);
      const activeKeyId = settings.activeKeys[provider.id];

      return `
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <img src="${provider.icon}" alt="${provider.name}" class="w-5 h-5 object-contain" />
              <span class="text-sm font-semibold text-text">${provider.name}</span>
            </div>
            <button data-action="add-key" data-provider="${provider.id}" class="text-xs font-medium text-text-secondary hover:text-text transition-all cursor-pointer flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              <span>Add Key</span>
            </button>
          </div>

          ${
            keys.length === 0
              ? `<div class="py-4 text-center border border-dashed border-border/50 rounded-xl">
                   <p class="text-xs text-text-muted">No keys configured</p>
                 </div>`
              : keys
                  .map((key) => {
                    const isActive = key.id === activeKeyId;
                    return `
                    <div class="flex items-center gap-3 group">
                      <label class="flex-1 flex items-center gap-3 p-2 cursor-pointer rounded-lg transition-all hover:bg-surface">
                        <input type="radio" name="active-key-${provider.id}" value="${key.id}" data-provider-id="${provider.id}" ${isActive ? "checked" : ""} class="w-4 h-4 accent-primary key-radio" />
                        <div class="flex flex-col min-w-0">
                          <span class="text-sm font-medium ${isActive ? "text-text" : "text-text-secondary"} truncate">${key.name}</span>
                          <span class="text-xs text-text-muted font-mono mt-0.5">${key.value.substring(0, 4)}••••${key.value.substring(key.value.length - 4)}</span>
                        </div>
                      </label>
                      <div class="flex items-center gap-1">
                        <button data-action="edit-key" data-key-id="${key.id}" data-key-name="${key.name}" class="p-2 rounded-lg text-text-secondary hover:text-text hover:bg-surface-hover transition-all opacity-0 group-hover:opacity-100" title="Edit Name">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                        </button>
                        <button data-action="delete-key" data-key-id="${key.id}" class="p-2 rounded-lg text-text-secondary hover:text-error hover:bg-error/10 transition-all opacity-0 group-hover:opacity-100" title="Delete Key">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                        </button>
                        <button data-action="fetch-models" data-key-id="${key.id}" class="p-2 rounded-lg text-text-secondary hover:text-text hover:bg-surface-hover transition-all" title="Sync Models">
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

// Track if the delegated listener has been attached
let isKeysModalEventsAttached = false;

export function attachKeysModalEvents(container: HTMLElement, onUpdate: () => void) {
  if (isKeysModalEventsAttached) return;

  container.addEventListener("click", async (e) => {
    const target = e.target as HTMLElement;

    // --- Active Key Selection (radio buttons) ---
    if (target.matches("input.key-radio")) {
      const radio = target as HTMLInputElement;
      const id = radio.value;
      const providerId = radio.dataset.providerId;
      if (providerId) {
        const settings = db.getSettings();
        settings.activeKeys[providerId] = id;
        db.saveSettings(settings);
        renderKeysModalBody(container);
        onUpdate();
      }
      return;
    }

    // --- Buttons ---
    const btn = target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.getAttribute("data-action");

    // Add key
    if (action === "add-key") {
      const providerId = (btn as HTMLElement).dataset.provider as AiProviderId;
      const provider = providerRegistry.getProvider(providerId);
      if (provider) {
        const titleEl = container.querySelector("#add-key-title");
        const providerInput = container.querySelector("#modal-provider-id") as HTMLInputElement;
        const nameInput = container.querySelector("#modal-key-name") as HTMLInputElement;
        const valueInput = container.querySelector("#modal-key-value") as HTMLInputElement;

        if (titleEl) titleEl.textContent = `Add ${provider.name} Key`;
        if (providerInput) providerInput.value = provider.id;
        if (nameInput) nameInput.value = "";
        if (valueInput) valueInput.value = "";
        openModal(container, "add-key-modal");
      }
      return;
    }

    // Delete keys
    if (action === "delete-key") {
      const id = (btn as HTMLElement).dataset.keyId;
      if (confirm("Delete this key?")) {
        const settings = db.getSettings();
        const keyToDelete = settings.apiKeys.find((k) => k.id === id);
        if (keyToDelete) {
          settings.apiKeys = settings.apiKeys.filter((k) => k.id !== id);
          if (settings.activeKeys[keyToDelete.providerId] === id) {
            const remaining = settings.apiKeys.filter(
              (k) => k.providerId === keyToDelete.providerId,
            );
            if (remaining.length > 0) settings.activeKeys[keyToDelete.providerId] = remaining[0].id;
            else delete settings.activeKeys[keyToDelete.providerId];
          }
          db.saveSettings(settings);
        }
        renderKeysModalBody(container);
        onUpdate();
      }
      return;
    }

    // Sync models
    if (action === "fetch-models") {
      const keyId = (btn as HTMLElement).dataset.keyId;
      const settings = db.getSettings();
      const key = settings.apiKeys.find((k) => k.id === keyId);
      if (!key) return;

      const provider = providerRegistry.getProvider(key.providerId);
      if (!provider) return;

      const btnEl = btn as HTMLButtonElement;
      btnEl.disabled = true;
      btnEl.classList.add("opacity-50", "pointer-events-none", "animate-spin");

      try {
        const models = await provider.fetchModels(key.value);
        key.availableModels = models;
        if (key.selectedModels.length === 0) key.selectedModels = [...models];
        db.saveSettings(settings);
        showAlert({ type: "success", message: "Models synced." });
        renderKeysModalBody(container);
        onUpdate();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        showAlert({ type: "error", message: `Sync failed: ${message}` });
      } finally {
        btnEl.disabled = false;
        btnEl.classList.remove("opacity-50", "pointer-events-none", "animate-spin");
      }
      return;
    }

    // Edit key name
    if (action === "edit-key") {
      const id = (btn as HTMLElement).dataset.keyId;
      const currentName = (btn as HTMLElement).dataset.keyName;
      if (id && currentName) {
        const keyIdInput = container.querySelector("#edit-modal-key-id") as HTMLInputElement;
        const nameInput = container.querySelector("#edit-modal-key-name") as HTMLInputElement;
        if (keyIdInput) keyIdInput.value = id;
        if (nameInput) nameInput.value = currentName;
        openModal(container, "edit-key-modal");
      }
      return;
    }
  });

  isKeysModalEventsAttached = true;
}

export function bindKeysModalStaticEvents(container: HTMLElement, onUpdate: () => void) {
  // Close buttons for modals
  container.querySelector("#close-keys-modal-btn")?.addEventListener("click", () => {
    closeModal(container, "keys-modal");
    onUpdate();
  });

  container.querySelector("#close-add-key-btn")?.addEventListener("click", () => {
    closeModal(container, "add-key-modal");
  });

  container.querySelector("#close-edit-key-btn")?.addEventListener("click", () => {
    closeModal(container, "edit-key-modal");
  });

  // Save new key
  container.querySelector("#save-new-key")?.addEventListener("click", async () => {
    const providerIdInput = container.querySelector("#modal-provider-id") as HTMLInputElement;
    const nameInput = container.querySelector("#modal-key-name") as HTMLInputElement;
    const valueInput = container.querySelector("#modal-key-value") as HTMLInputElement;

    const providerId = providerIdInput.value as AiProviderId;
    const name = nameInput.value.trim();
    const value = valueInput.value.trim();

    if (!name || !value) {
      showAlert({ type: "error", message: "Name and Key are required." });
      return;
    }

    const settings = db.getSettings();
    const newKey: ApiKeyItem = {
      id: Date.now().toString(),
      providerId,
      name,
      value,
      createdAt: Date.now(),
      selectedModels: [],
    };

    settings.apiKeys.push(newKey);
    if (!settings.activeKeys[providerId]) settings.activeKeys[providerId] = newKey.id;
    db.saveSettings(settings);

    showAlert({ type: "success", message: "Key added." });
    closeModal(container, "add-key-modal");
    renderKeysModalBody(container);
    window.dispatchEvent(new Event("settings-updated"));
  });

  // Save edit key
  container.querySelector("#save-edit-key")?.addEventListener("click", () => {
    const keyIdInput = container.querySelector("#edit-modal-key-id") as HTMLInputElement;
    const nameInput = container.querySelector("#edit-modal-key-name") as HTMLInputElement;

    const id = keyIdInput.value;
    const newName = nameInput.value.trim();

    if (!newName) {
      showAlert({ type: "error", message: "Key Name is required." });
      return;
    }

    const settings = db.getSettings();
    const keyToEdit = settings.apiKeys.find((k) => k.id === id);
    if (keyToEdit) {
      keyToEdit.name = newName;
      db.saveSettings(settings);
      showAlert({ type: "success", message: "Key name updated." });
      closeModal(container, "edit-key-modal");
      renderKeysModalBody(container);
      window.dispatchEvent(new Event("settings-updated"));
    }
  });
}
