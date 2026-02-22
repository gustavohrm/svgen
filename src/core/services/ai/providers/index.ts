import { OpenRouterProvider } from "./open-router";
import { GoogleCloudProvider } from "./google-cloud";
import { AiProvider, AiProviderId } from "../../../types/index";
import { ProviderRegistry } from "../index";

export class AiProviderRegistry implements ProviderRegistry {
  private providersMap: Map<AiProviderId, AiProvider> = new Map();

  constructor(providersList: AiProvider[]) {
    providersList.forEach((provider) => {
      this.providersMap.set(provider.id, provider);
    });
  }

  getProvider(id: AiProviderId): AiProvider | undefined {
    return this.providersMap.get(id);
  }

  getAllProviders(): AiProvider[] {
    return Array.from(this.providersMap.values());
  }
}

/**
 * Factory function to create the default provider registry
 */
export function createDefaultProviderRegistry(): AiProviderRegistry {
  return new AiProviderRegistry([new OpenRouterProvider(), new GoogleCloudProvider()]);
}

// Re-export specific classes if needed by consumers
export { OpenRouterProvider, GoogleCloudProvider };
