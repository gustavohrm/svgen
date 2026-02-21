export interface GenerateOptions {
  prompt: string;
  referenceSvgs?: string[];
  model: string;
  apiKey: string;
}

export interface AiProvider {
  generate(options: GenerateOptions): Promise<string>;
}
