import { BrowserSettingsRepository } from "../modules/db/index";
import { IndexedDbGalleryRepository } from "../modules/gallery-db/index";
import { createAiService } from "../services/ai/index";
import { createDefaultProviderRegistry } from "../services/ai/providers/index";
import { FetchGoogleCloudClient, FetchOpenRouterClient } from "../services/ai/providers/clients";

const fetchImpl = (...args: Parameters<typeof fetch>) => fetch(...args);

const settingsRepository = new BrowserSettingsRepository(localStorage);
const galleryRepository = new IndexedDbGalleryRepository(indexedDB);
const providerRegistry = createDefaultProviderRegistry({
  openRouterClient: new FetchOpenRouterClient(fetchImpl),
  googleCloudClient: new FetchGoogleCloudClient(fetchImpl),
});
const aiService = createAiService(settingsRepository, providerRegistry);

export const appComposition = {
  settingsRepository,
  galleryRepository,
  providerRegistry,
  aiService,
};
