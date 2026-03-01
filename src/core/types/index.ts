export type AiProviderId = "open-router" | "gcp";

export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface ProviderGenerateResult {
  svgs: string[];
  usage?: TokenUsage;
}

export interface ProviderGenerateOptions {
  prompt: string;
  systemPrompt: string;
  model: string;
  apiKey: string;
  count?: number;
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
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
  icon: string;
  configFields: ProviderConfigField[];
  generate(options: ProviderGenerateOptions): Promise<ProviderGenerateResult>;
  fetchModels(apiKey: string): Promise<string[]>;
}

export interface GenerateOptions {
  prompt: string;
  referenceSvgs?: string[];
  model: string;
  providerId: AiProviderId;
  apiKey: string;
  topP?: number;
  maxOutputTokens?: number;
}
