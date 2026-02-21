import { AiProvider, GenerateOptions } from "../../../types/index";

export class GoogleCloudProvider implements AiProvider {
  async generate(options: GenerateOptions): Promise<string> {
    const { prompt, referenceSvgs, model, apiKey } = options;

    if (!apiKey) {
      throw new Error("GCP (Gemini) API key is required");
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

    const payload = {
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`GCP API error: ${res.status} ${res.statusText} - ${errorText}`);
    }

    const data = await res.json();
    const result = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
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
