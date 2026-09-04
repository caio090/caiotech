/**
 * Provedor: OpenAI Images (GPT Image)
 *
 * Variáveis necessárias para ativar:
 *   OPENAI_API_KEY      — chave da conta central da LOKAT OS (nunca expor ao cliente)
 *   OPENAI_IMAGE_MODEL   — ex: "gpt-image-2" (default) ou outro modelo GPT Image real
 *
 * Prompt 09 (Studio Image Provider Compatibility) — reescrito para usar
 * o SDK oficial (`client.images.generate()`, tipado, satisfaz
 * `ImageGenerateParamsNonStreaming` sem `as any`) em vez de um
 * `fetch()` cru com corpo hardcoded. A compatibilidade por família de
 * modelo fica centralizada em openai-image-compat.ts, nunca espalhada
 * em `if (model.startsWith(...))` neste arquivo.
 *
 * Prompt 11 (GPT-Image-2 Production Migration) — segundo incidente
 * real de Production (`dpl_EHFbxtcH6Czf2xFfmmDrb9UzmTtC`): o default
 * hardcoded `"dall-e-3"` (usado porque `OPENAI_IMAGE_MODEL` não estava
 * configurada) foi rejeitado pela API real com
 * `code: "invalid_value", param: "model"` -- dall-e-2/dall-e-3 foram
 * removidos da API da OpenAI. Novo default: `DEFAULT_OPENAI_IMAGE_MODEL`
 * (`"gpt-image-2"`, definido em openai-image-compat.ts -- fonte
 * canônica única, nunca duplicada). `resolveOpenAIImageModelFamily`
 * reconhece `dall-e-2`/`dall-e-3` explicitamente como `"removed"` e
 * `buildOpenAIImageRequest` nunca constrói um request pra eles --
 * nenhum fallback silencioso de um modelo removido pra outro modelo.
 */

import OpenAI from "openai";
import type { ImageProvider, ImageGenerationInput, ImageGenerationOutput } from "./types";
import { buildOpenAIImageRequest, DEFAULT_OPENAI_IMAGE_MODEL } from "./openai-image-compat";
import { normalizeOpenAIImageResponse, mapOpenAIImageErrorToSafeMessage, logOpenAIImageError } from "./openai-image-response";

const API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_IMAGE_MODEL?.trim() || DEFAULT_OPENAI_IMAGE_MODEL;
/**
 * Prompt 11, Fase 17/18 — orçamento do pipeline dentro do teto real de
 * 60s (maxDuration, plano Hobby, ver route.ts). O cenário principal de
 * smoke (Fase 18: Free Mode, sem referência, sem logo de Company) tem
 * teto teórico texto(15s) + esta chamada(42s) + compositor(~1s) = 58s,
 * dentro do orçamento. Company Mode com logo oficial (+ fetch de
 * ~8s) ou com referências anexadas (+ até 10s por referência) pode
 * ultrapassar 60s no PIOR caso teórico simultâneo -- aceito por ora
 * (Fase 18 explicitamente adia essa otimização; o próprio
 * `maxDuration` da Vercel age como backstop final nesse caso raro,
 * nunca uma falha silenciosa). 42s (subiu de 35s no Prompt 09) porque
 * uma geração real do GPT Image pode legitimamente levar mais tempo
 * que isso -- um timeout de provider curto demais criaria um TERCEIRO
 * modo de falha previsível.
 */
const IMAGE_TIMEOUT_MS = 42_000;

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
      // Prompt 11 -- `built.error` é a mensagem sanitizada (segura pro
      // cliente); `internalDetail` é só logado aqui, nunca devolvido.
      console.warn("[image-providers/openai] modelo de imagem não construiu request", { family: built.family, internalDetail: built.internalDetail });
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
