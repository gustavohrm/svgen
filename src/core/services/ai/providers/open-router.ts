import { AiProvider, GenerateOptions } from "../../../types/index";

export class OpenRouterProvider implements AiProvider {
  async generate(options: GenerateOptions): Promise<string> {
    const { prompt, referenceSvgs, model, apiKey } = options;

    if (!apiKey) {
      throw new Error("OpenRouter API key is required");
    }

    let systemPrompt = `You are an expert SVG designer. Your only job is to return valid, clean SVG code based on the user's request.
Requirements:
1. ONLY return the SVG code, nothing else.
2. NO markdown formatting, NO backticks.
3. Use Tailwind colors (hex/rgb) or semantic colors.
4. Make sure the SVG is self-contained.
5. viewBox is preferred over fixed width/height.`;

    if (referenceSvgs && referenceSvgs.length > 0) {
      systemPrompt += `\n\nReference SVGs are provided below to guide the style or structure:\n`;
      referenceSvgs.forEach((svg, index) => {
        systemPrompt += `\n--- Reference ${index + 1} ---\n${svg}\n--------------------\n`;
      });
    }

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "SVGen",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`OpenRouter API error: ${res.status} ${res.statusText} - ${errorText}`);
    }

    const data = await res.json();
    const result = data.choices[0]?.message?.content || "";
    return this.extractSvg(result);
  }

  private extractSvg(text: string): string {
    const svgStart = text.indexOf("<svg");
    const svgEnd = text.lastIndexOf("</svg>");
    if (svgStart !== -1 && svgEnd !== -1) {
      return text.substring(svgStart, svgEnd + 6);
    }
    return text;
  }
}
