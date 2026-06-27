/**
 * Provedor: OpenAI Images (DALL-E 3 / gpt-image-1)
 *
 * Variáveis necessárias para ativar:
 *   OPENAI_API_KEY      — chave da conta central da LOKAT OS (nunca expor ao cliente)
 *   OPENAI_IMAGE_MODEL  — ex: "dall-e-3" ou "gpt-image-1"
 *
 * Esta implementação está em modo PREPARADO. A geração real só será ativada
 * quando as variáveis acima estiverem configuradas na Vercel / ambiente.
 */

import type { ImageProvider, ImageGenerationInput, ImageGenerationOutput } from "./types";

const API_KEY  = process.env.OPENAI_API_KEY;
const MODEL    = process.env.OPENAI_IMAGE_MODEL ?? "dall-e-3";
const API_BASE = "https://api.openai.com/v1";

const OPENAI_SIZE_MAP: Record<string, string> = {
  "1:1":    "1024x1024",
  "9:16":   "1024x1792",
  "16:9":   "1792x1024",
  "4:5":    "1024x1024",
  "1.91:1": "1792x1024",
};

export const OpenAIImagesProvider: ImageProvider = {
  id: "openai-images",
  label: "OpenAI Images (DALL-E 3)",

  isAvailable(): boolean {
    return !!API_KEY;
  },

  async generate(input: ImageGenerationInput): Promise<ImageGenerationOutput> {
    if (!API_KEY) {
      return {
        success: false,
        error: "OPENAI_API_KEY não configurada. Geração desativada.",
      };
    }

    try {
      const size = OPENAI_SIZE_MAP[input.aspectRatio ?? "1:1"] ?? "1024x1024";
      const count = Math.min(input.outputCount ?? 1, MODEL === "dall-e-3" ? 1 : 4);

      const body = {
        model: MODEL,
        prompt: input.prompt,
        n: count,
        size,
        response_format: "url",
        quality: input.highRes ? "hd" : "standard",
      };

      const res = await fetch(`${API_BASE}/images/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        return { success: false, error: `OpenAI error: ${res.status} — ${err}` };
      }

      const data = await res.json();
      const images = (data?.data ?? []).map((d: { url: string }) => ({
        url: d.url,
        width: 1024,
        height: 1024,
      }));

      return { success: true, images };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },
};
