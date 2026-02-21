import { OpenRouterProvider } from "./open-router";
import { GoogleCloudProvider } from "./google-cloud";
import { AiProvider } from "../../../types/index";

// Export the array of all available AI providers
export const providers: AiProvider[] = [new OpenRouterProvider(), new GoogleCloudProvider()];

// Helper to find a specific provider
export function getProvider(id: string): AiProvider | undefined {
  return providers.find((p) => p.id === id);
}

// Re-export specific classes if needed by consumers
export { OpenRouterProvider, GoogleCloudProvider };
