/**
 * Prompt 09 (Studio Image Provider Compatibility) — compatibilidade
 * real entre o Studio e as famílias de modelo de imagem da OpenAI.
 *
 * Causa raiz do incidente (HTTP 400 "Unknown parameter: 'response_format'"):
 * openai-images.ts fazia um `fetch()` cru pra `/v1/images/generations`
 * com um corpo hardcoded (`response_format: "url"` sempre, `quality:
 * "hd"|"standard"` sempre) -- nunca usava o SDK instalado, nunca
 * diferenciava família de modelo. O modelo realmente ativo em
 * Production no momento do incidente era o default do próprio código
 * (`dall-e-3`, `OPENAI_IMAGE_MODEL` não está configurada em Production
 * -- confirmado via `vercel env ls production`) -- e mesmo assim a API
 * real rejeitou `response_format`. Os tipos do SDK instalado (`openai@6.45.0`,
 * `node_modules/openai/resources/images.d.ts`) ainda documentam
 * `response_format` como válido pra `dall-e-2`/`dall-e-3`, mas a
 * evidência direta de Production contradiz isso pro modelo que estava
 * realmente ativo -- por isso a decisão aqui é NUNCA enviar
 * `response_format` pra nenhuma família (fail-safe: se a API real
 * ainda aceitar o formato default sem o parâmetro, o normalizador
 * abaixo já sabe lidar com `b64_json` OU `url`, então nada quebra de
 * qualquer forma). Tratar isso como um dado de Production real, não
 * como "os tipos dizem que dá pra confiar".
 */
import type { ImageGenerateParamsNonStreaming } from "openai/resources/images";
import type { ImageAspectRatio } from "./types";

export type OpenAIImageModelFamily = "gpt_image" | "dall_e_2" | "dall_e_3" | "unknown";

/**
 * Determinístico, sem chamada de rede. `unknown` nunca ganha
 * compatibilidade inventada -- ver buildOpenAIImageRequest.
 */
export function resolveOpenAIImageModelFamily(model: string): OpenAIImageModelFamily {
  if (model === "dall-e-2") return "dall_e_2";
  if (model === "dall-e-3") return "dall_e_3";
  // gpt-image-1, gpt-image-1-mini, gpt-image-1.5, gpt-image-2,
  // gpt-image-2-*, chatgpt-image-latest -- todos os IDs reais do union
  // `ImageModel` do SDK instalado que não são dall-e-2/3.
  if (/^(gpt-image-|chatgpt-image-)/.test(model)) return "gpt_image";
  return "unknown";
}

/** Tamanhos reais aceitos por família (node_modules/openai/resources/images.d.ts,
 *  ImageGenerateParamsBase.size) -- nunca um valor inventado. GPT Image
 *  também aceita WIDTHxHEIGHT arbitrário em gpt-image-2/2026-04-21,
 *  mas o Studio só precisa dos presets padrão (o compositor já resolve
 *  pra 1080x{1080,1350,1920} depois, o background é só um ponto de
 *  partida). dall-e-2 NUNCA suporta proporção não-quadrada -- limitação
 *  real do modelo, nunca contornada aqui. */
const GPT_IMAGE_SIZE_MAP: Record<ImageAspectRatio, ImageGenerateParamsNonStreaming["size"]> = {
  "1:1": "1024x1024",
  "9:16": "1024x1536",
  "16:9": "1536x1024",
  "4:5": "1024x1024",
  "1.91:1": "1536x1024",
};
const DALL_E_3_SIZE_MAP: Record<ImageAspectRatio, ImageGenerateParamsNonStreaming["size"]> = {
  "1:1": "1024x1024",
  "9:16": "1024x1792",
  "16:9": "1792x1024",
  "4:5": "1024x1024",
  "1.91:1": "1792x1024",
};

export interface BuildOpenAIImageRequestParams {
  model: string;
  prompt: string;
  aspectRatio: ImageAspectRatio;
  highRes?: boolean;
  outputCount?: number;
}

export type BuildOpenAIImageRequestResult =
  | { ok: true; family: Exclude<OpenAIImageModelFamily, "unknown">; request: ImageGenerateParamsNonStreaming }
  | { ok: false; error: string };

function clampCount(count: number | undefined, max: number): number {
  return Math.min(Math.max(count ?? 1, 1), max);
}

/**
 * Constrói o request pra `client.images.generate()` contendo SOMENTE
 * os parâmetros válidos pra família do modelo -- satisfaz os tipos do
 * SDK (nenhum `as any`/`as unknown as`), nunca `response_format`
 * (ver comentário do módulo).
 */
export function buildOpenAIImageRequest(params: BuildOpenAIImageRequestParams): BuildOpenAIImageRequestResult {
  const family = resolveOpenAIImageModelFamily(params.model);

  if (family === "unknown") {
    return { ok: false, error: `Modelo de imagem OpenAI não reconhecido: "${params.model}". Nenhuma compatibilidade foi assumida.` };
  }

  if (family === "gpt_image") {
    const request: ImageGenerateParamsNonStreaming = {
      model: params.model,
      prompt: params.prompt,
      size: GPT_IMAGE_SIZE_MAP[params.aspectRatio] ?? "1024x1024",
      quality: params.highRes ? "high" : "auto",
      n: clampCount(params.outputCount, 10),
      // Nunca style (só dall-e-3), nunca response_format (ver topo do arquivo).
    };
    return { ok: true, family, request };
  }

  if (family === "dall_e_3") {
    const request: ImageGenerateParamsNonStreaming = {
      model: params.model,
      prompt: params.prompt,
      size: DALL_E_3_SIZE_MAP[params.aspectRatio] ?? "1024x1024",
      quality: params.highRes ? "hd" : "standard",
      n: 1, // dall-e-3 só suporta n=1 (documentado no SDK: "For dall-e-3, only n=1 is supported").
      // Nunca response_format (ver topo do arquivo) -- nunca background/moderation/output_format (só GPT Image).
    };
    return { ok: true, family, request };
  }

  // dall_e_2 -- nunca suporta proporção não-quadrada, sempre 1024x1024 aqui.
  const request: ImageGenerateParamsNonStreaming = {
    model: params.model,
    prompt: params.prompt,
    size: "1024x1024",
    quality: "standard", // única opção documentada pro dall-e-2
    n: clampCount(params.outputCount, 10),
  };
  return { ok: true, family, request };
}
