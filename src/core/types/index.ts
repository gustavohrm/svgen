export interface ProviderGenerateOptions {
  prompt: string;
  systemPrompt: string;
  model: string;
  apiKey: string;
}

export interface AiProvider {
  id: string;
  name: string;
  generate(options: ProviderGenerateOptions): Promise<string>;
}

export interface GenerateOptions {
  prompt: string;
  referenceSvgs?: string[];
  model: string;
  apiKey: string;
}
