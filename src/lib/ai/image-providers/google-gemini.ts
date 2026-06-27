/**
 * Provedor: Google Gemini / Imagen (Nano Banana Pro)
 *
 * "Nano Banana Pro" corresponde ao Gemini 3 Pro Image (Imagen 3) do Google.
 * Cobrança baseada em tokens/imagem/resolução — separada dos créditos internos da LOKAT OS.
 *
 * Variáveis necessárias para ativar:
 *   GOOGLE_GEMINI_API_KEY — chave da conta central da LOKAT OS (nunca expor ao cliente)
 *   GOOGLE_IMAGE_MODEL    — ex: "imagen-3.0-generate-001" (padrão)
 *
 * Esta implementação está em modo PREPARADO. A geração real só será ativada
 * quando as variáveis acima estiverem configuradas na Vercel / ambiente.
 */

import type { ImageProvider, ImageGenerationInput, ImageGenerationOutput } from "./types";

const API_KEY   = process.env.GOOGLE_GEMINI_API_KEY;
const MODEL     = process.env.GOOGLE_IMAGE_MODEL ?? "imagen-3.0-generate-001";
const API_BASE  = "https://generativelanguage.googleapis.com/v1beta";

export const GoogleGeminiProvider: ImageProvider = {
  id: "google-gemini",
  label: "Google Imagen (Nano Banana Pro)",

  isAvailable(): boolean {
    return !!API_KEY;
  },

  async generate(input: ImageGenerationInput): Promise<ImageGenerationOutput> {
    if (!API_KEY) {
      return {
        success: false,
        error: "GOOGLE_GEMINI_API_KEY não configurada. Geração desativada.",
      };
    }

    try {
      const body = {
        instances: [{ prompt: input.prompt }],
        parameters: {
          sampleCount: input.outputCount ?? 1,
          aspectRatio: input.aspectRatio ?? "1:1",
          safetyFilterLevel: "BLOCK_FEW",
        },
      };

      const res = await fetch(
        `${API_BASE}/models/${MODEL}:predict?key=${API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        return { success: false, error: `Google Imagen error: ${res.status} — ${err}` };
      }

      const data = await res.json();
      const predictions: { bytesBase64Encoded?: string; mimeType?: string }[] =
        data?.predictions ?? [];

      if (!predictions.length) {
        return { success: false, error: "Nenhuma imagem retornada pelo Google Imagen." };
      }

      const images = predictions.map((p) => ({
        url: `data:${p.mimeType ?? "image/png"};base64,${p.bytesBase64Encoded}`,
        width: input.highRes ? 2048 : 1024,
        height: input.highRes ? 2048 : 1024,
      }));

      return { success: true, images };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },
};
