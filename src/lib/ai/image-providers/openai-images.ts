/**
 * Provedor: OpenAI Images (GPT Image / DALL-E)
 *
 * Variáveis necessárias para ativar:
 *   OPENAI_API_KEY      — chave da conta central da LOKAT OS (nunca expor ao cliente)
 *   OPENAI_IMAGE_MODEL   — ex: "dall-e-3" ou um modelo GPT Image real (gpt-image-1 etc.)
 *
 * Prompt 09 (Studio Image Provider Compatibility) — reescrito para usar
 * o SDK oficial (`client.images.generate()`, tipado, satisfaz
 * `ImageGenerateParamsNonStreaming` sem `as any`) em vez de um
 * `fetch()` cru com corpo hardcoded. A causa raiz do incidente de
 * Production (HTTP 400 "Unknown parameter: 'response_format'") e a
 * decisão de nunca enviar esse parâmetro estão documentadas em
 * openai-image-compat.ts -- a compatibilidade por família de modelo
 * (GPT Image vs DALL-E) fica centralizada lá, nunca espalhada em
 * `if (model.startsWith(...))` neste arquivo.
 */

import OpenAI from "openai";
import type { ImageProvider, ImageGenerationInput, ImageGenerationOutput } from "./types";
import { buildOpenAIImageRequest } from "./openai-image-compat";
import { normalizeOpenAIImageResponse, mapOpenAIImageErrorToSafeMessage, logOpenAIImageError } from "./openai-image-response";

const API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_IMAGE_MODEL?.trim() || "dall-e-3";
// ~104s de teto teórico somando as etapas do pipeline completo
// (Vidigal 20s + até 2 referências * 10s + esta chamada + fetch de
// asset + compositor) excede o maxDuration=60s do plano Hobby da
// Vercel (route.ts) -- este valor é o teto REALISTA pra uma geração
// de imagem única, não a soma de todos os piores casos simultâneos
// (esse backstop final é o próprio maxDuration da Function, ver
// route.ts). Ver Prompt 09, seção TIMEOUT do relatório.
const IMAGE_TIMEOUT_MS = 35_000;

let cachedClient: OpenAI | null = null;
function getClient(): OpenAI {
  if (!cachedClient) cachedClient = new OpenAI({ apiKey: API_KEY, timeout: IMAGE_TIMEOUT_MS });
  return cachedClient;
}

export const OpenAIImagesProvider: ImageProvider = {
  id: "openai-images",
  label: "OpenAI Images",

  isAvailable(): boolean {
    return !!API_KEY;
  },

  async generate(input: ImageGenerationInput): Promise<ImageGenerationOutput> {
    if (!API_KEY) {
      return { success: false, error: "OPENAI_API_KEY não configurada. Geração desativada." };
    }

    const built = buildOpenAIImageRequest({
      model: MODEL,
      prompt: input.prompt,
      aspectRatio: input.aspectRatio ?? "1:1",
      highRes: input.highRes,
      outputCount: input.outputCount,
    });
    if (!built.ok) {
      return { success: false, error: built.error };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
    try {
      const response = await getClient().images.generate(built.request, { signal: controller.signal });
      const normalized = normalizeOpenAIImageResponse(response, built.request.size);
      if (!normalized.ok) {
        return { success: false, error: normalized.error };
      }
      return { success: true, images: normalized.images, providerRaw: { model: MODEL, family: built.family, size: built.request.size, quality: built.request.quality } };
    } catch (error) {
      logOpenAIImageError(error);
      const timedOut = error instanceof Error && error.name === "AbortError";
      return { success: false, error: timedOut ? "A geração de imagem excedeu o tempo limite." : mapOpenAIImageErrorToSafeMessage(error) };
    } finally {
      clearTimeout(timer);
    }
  },
};
