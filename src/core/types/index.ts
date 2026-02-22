export type AiProviderId = "open-router" | "gcp";

export interface ProviderGenerateOptions {
  prompt: string;
  systemPrompt: string;
  model: string;
  apiKey: string;
}

export interface ProviderConfigField {
  id: string;
  label: string;
  placeholder: string;
  type: string;
}

export interface AiProvider {
  id: AiProviderId;
  name: string;
  configFields: ProviderConfigField[];
  generate(options: ProviderGenerateOptions): Promise<string>;
  fetchModels(apiKey: string): Promise<string[]>;
}

export interface GenerateOptions {
  prompt: string;
  referenceSvgs?: string[];
  model: string;
  providerId: AiProviderId;
  apiKey: string;
}
