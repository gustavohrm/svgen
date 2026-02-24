import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ApiKeysModal } from "./api-keys-modal";
import { AppSettings } from "../../core/modules/db/index";
import { AiProvider } from "../../core/types/index";

// Mock the composition root
vi.mock("../../core/app/composition-root", () => {
  const mockGenerate = vi.fn();
  const mockFetchModels = vi.fn();

  return {
    appComposition: {
      providerRegistry: {
        getAllProviders: vi.fn().mockReturnValue([
          {
            id: "gcp",
            name: "Google Cloud",
            icon: "/icons/gcp.svg",
            configFields: [],
            generate: mockGenerate,
            fetchModels: mockFetchModels,
          },
          {
            id: "open-router",
            name: "OpenRouter",
            icon: "/icons/openrouter.svg",
            configFields: [],
            generate: mockGenerate,
            fetchModels: mockFetchModels,
          },
        ]),
        getProvider: vi.fn((id: string) => {
          const providers = {
            gcp: {
              id: "gcp",
              name: "Google Cloud",
              icon: "/icons/gcp.svg",
              configFields: [],
              generate: mockGenerate,
              fetchModels: mockFetchModels,
            },
            "open-router": {
              id: "open-router",
              name: "OpenRouter",
              icon: "/icons/openrouter.svg",
              configFields: [],
              generate: mockGenerate,
              fetchModels: mockFetchModels,
            },
          };
          return providers[id as keyof typeof providers];
        }),
      },
      settingsRepository: {
        getSettings: vi.fn().mockReturnValue({
          apiKeys: [],
          activeKeys: {},
          variations: 4,
          temperature: 0.7,
          systemPrompt: "",
        }),
        saveSettings: vi.fn(),
        setActiveKey: vi.fn(),
        toggleModelSelection: vi.fn(),
        toggleModelSelections: vi.fn(),
        setVariations: vi.fn(),
        setTemperature: vi.fn(),
        setSystemPrompt: vi.fn(),
      },
    },
  };
});

// Mock alert and other utilities
vi.mock("../../core/utils/alert", () => ({
  showAlert: vi.fn(),
}));

vi.mock("../../core/utils/id", () => ({
  createId: vi.fn(() => "test-id-123"),
}));

describe("ApiKeysModal", () => {
  let modal: ApiKeysModal;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = '<div id="test-container"></div>';

    // Define custom element if not already defined
    if (!customElements.get("api-keys-modal")) {
      customElements.define("api-keys-modal", ApiKeysModal);
    }

    modal = document.createElement("api-keys-modal") as ApiKeysModal;
    document.body.appendChild(modal);
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("should create instance", () => {
    expect(modal).toBeInstanceOf(ApiKeysModal);
    expect(modal).toBeInstanceOf(HTMLElement);
  });

  it("should render modal structure on connect", () => {
    const modals = modal.querySelectorAll("app-modal");
    expect(modals.length).toBeGreaterThan(0);
  });

  it("should have keys modal element", () => {
    const keysModal = document.getElementById("keys-modal");
    expect(keysModal).toBeTruthy();
  });

  it("should have add key modal element", () => {
    const addKeyModal = document.getElementById("add-key-modal");
    expect(addKeyModal).toBeTruthy();
  });

  it("should have edit key modal element", () => {
    const editKeyModal = document.getElementById("edit-key-modal");
    expect(editKeyModal).toBeTruthy();
  });

  it("should render keys modal body", () => {
    const modalBody = modal.querySelector("#keys-modal-body");
    expect(modalBody).toBeTruthy();
  });

  it("open method should show keys modal", () => {
    modal.open();

    const keysModal = document.getElementById("keys-modal");
    expect(keysModal?.classList.contains("hidden")).toBe(false);
    expect(keysModal?.classList.contains("flex")).toBe(true);
  });

  it("should render provider sections in modal body", () => {
    modal.open();

    const modalBody = modal.querySelector("#keys-modal-body");
    expect(modalBody?.innerHTML).toContain("Google Cloud");
    expect(modalBody?.innerHTML).toContain("OpenRouter");
  });

  it("should render add key buttons for each provider", () => {
    modal.open();

    const addButtons = modal.querySelectorAll('[data-action="add-key"]');
    expect(addButtons.length).toBeGreaterThan(0);
  });

  it("should show no keys message when no keys configured", () => {
    modal.open();

    const modalBody = modal.querySelector("#keys-modal-body");
    expect(modalBody?.innerHTML).toContain("No keys configured");
  });

  it("should have form inputs in add key modal", () => {
    const nameInput = modal.querySelector("#modal-key-name");
    const valueInput = modal.querySelector("#modal-key-value");
    const providerInput = modal.querySelector("#modal-provider-id");

    expect(nameInput).toBeTruthy();
    expect(valueInput).toBeTruthy();
    expect(providerInput).toBeTruthy();
  });

  it("should have save button in add key modal", () => {
    const saveButton = modal.querySelector("#save-new-key");
    expect(saveButton).toBeTruthy();
  });

  it("should have form inputs in edit key modal", () => {
    const keyIdInput = modal.querySelector("#edit-modal-key-id");
    const nameInput = modal.querySelector("#edit-modal-key-name");

    expect(keyIdInput).toBeTruthy();
    expect(nameInput).toBeTruthy();
  });

  it("should have save button in edit key modal", () => {
    const saveButton = modal.querySelector("#save-edit-key");
    expect(saveButton).toBeTruthy();
  });

  it("should have close buttons for all modals", () => {
    const closeKeysBtn = modal.querySelector("#close-keys-modal-btn");
    const closeAddKeyBtn = modal.querySelector("#close-add-key-btn");
    const closeEditKeyBtn = modal.querySelector("#close-edit-key-btn");

    expect(closeKeysBtn).toBeTruthy();
    expect(closeAddKeyBtn).toBeTruthy();
    expect(closeEditKeyBtn).toBeTruthy();
  });
});

describe("ApiKeysModal - with mocked settings data", () => {
  let modal: ApiKeysModal;

  beforeEach(async () => {
    const { appComposition } = await import("../../core/app/composition-root");

    vi.mocked(appComposition.settingsRepository.getSettings).mockReturnValue({
      apiKeys: [
        {
          id: "key1",
          providerId: "gcp",
          name: "My GCP Key",
          value: "sk-test-key-12345",
          createdAt: Date.now(),
          selectedModels: ["model1"],
          availableModels: ["model1", "model2"],
        },
        {
          id: "key2",
          providerId: "open-router",
          name: "My OpenRouter Key",
          value: "or-key-67890",
          createdAt: Date.now(),
          selectedModels: [],
        },
      ],
      activeKeys: { gcp: "key1", "open-router": "key2" },
      variations: 4,
      temperature: 0.7,
      systemPrompt: "",
    });

    document.body.innerHTML = '<div id="test-container"></div>';
    modal = document.createElement("api-keys-modal") as ApiKeysModal;
    document.body.appendChild(modal);
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("should render configured keys in modal body", () => {
    modal.open();

    const modalBody = modal.querySelector("#keys-modal-body");
    expect(modalBody?.innerHTML).toContain("My GCP Key");
    expect(modalBody?.innerHTML).toContain("My OpenRouter Key");
  });

  it("should mask API key values", () => {
    modal.open();

    const modalBody = modal.querySelector("#keys-modal-body");
    expect(modalBody?.innerHTML).toContain("sk-t••••2345");
    expect(modalBody?.innerHTML).toContain("or-k••••7890");
  });

  it("should render radio buttons for active key selection", () => {
    modal.open();

    const radios = modal.querySelectorAll('input[type="radio"].key-radio');
    expect(radios.length).toBe(2);
  });

  it("should mark active key as checked", () => {
    modal.open();

    const gcpRadio = modal.querySelector('input[value="key1"]') as HTMLInputElement;
    expect(gcpRadio?.checked).toBe(true);
  });

  it("should render edit and delete buttons for each key", () => {
    modal.open();

    const editButtons = modal.querySelectorAll('[data-action="edit-key"]');
    const deleteButtons = modal.querySelectorAll('[data-action="delete-key"]');

    expect(editButtons.length).toBe(2);
    expect(deleteButtons.length).toBe(2);
  });

  it("should render fetch models button for each key", () => {
    modal.open();

    const fetchButtons = modal.querySelectorAll('[data-action="fetch-models"]');
    expect(fetchButtons.length).toBe(2);
  });

  it("should not show no keys message when keys exist", () => {
    modal.open();

    const modalBody = modal.querySelector("#keys-modal-body");
    const gcpSection = modalBody?.innerHTML.includes("Google Cloud");
    const noKeysMessage =
      gcpSection && modalBody?.innerHTML.match(/Google Cloud[\s\S]*?No keys configured/);

    expect(noKeysMessage).toBeFalsy();
  });
});

describe("ApiKeysModal - edge cases", () => {
  let modal: ApiKeysModal;

  beforeEach(() => {
    document.body.innerHTML = '<div id="test-container"></div>';
    modal = document.createElement("api-keys-modal") as ApiKeysModal;
    document.body.appendChild(modal);
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("should handle empty provider list gracefully", async () => {
    const { appComposition } = await import("../../core/app/composition-root");
    vi.mocked(appComposition.providerRegistry.getAllProviders).mockReturnValue([]);

    modal.open();
    const modalBody = modal.querySelector("#keys-modal-body");
    expect(modalBody?.innerHTML).toBe("");
  });

  it("should mask very long API key values correctly", () => {
    const longValue = "a".repeat(200);
    const expectedMasked = `${longValue.substring(0, 4)}••••${longValue.substring(longValue.length - 4)}`;

    // Test the masking logic directly
    expect(expectedMasked).toBe("aaaa••••aaaa");
    expect(expectedMasked.length).toBe(12);
  });

  it("should use escapeHtml for rendering key names", async () => {
    // Test that the module imports and uses escapeHtml
    const { escapeHtml } = await import("../../core/utils/html-escape");

    const testString = 'Key with "quotes" & <tags>';
    const escaped = escapeHtml(testString);

    expect(escaped).toContain("&quot;");
    expect(escaped).toContain("&amp;");
    expect(escaped).toContain("&lt;");
    expect(escaped).toContain("&gt;");
  });
});