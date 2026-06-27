/**
 * Factory de provedores de geração de imagem.
 * Seleciona o provedor com base na variável AI_IMAGE_PROVIDER.
 *
 * Nunca chamar do frontend — apenas de Server Actions ou Route Handlers.
 */

import { GoogleGeminiProvider } from "./google-gemini";
import { OpenAIImagesProvider  } from "./openai-images";
import type { ImageProvider    } from "./types";

export type { ImageProvider, ImageGenerationInput, ImageGenerationOutput, ImageAspectRatio } from "./types";

const PROVIDERS: Record<string, ImageProvider> = {
  "google":        GoogleGeminiProvider,
  "google-gemini": GoogleGeminiProvider,
  "openai":        OpenAIImagesProvider,
  "openai-images": OpenAIImagesProvider,
};

/** Retorna o provedor ativo ou null se nenhum estiver configurado */
export function getActiveProvider(): ImageProvider | null {
  const key = process.env.AI_IMAGE_PROVIDER?.toLowerCase();
  if (key && PROVIDERS[key]) return PROVIDERS[key];

  // Auto-detect: usar o primeiro disponível
  for (const p of Object.values(PROVIDERS)) {
    if (p.isAvailable()) return p;
  }

  return null;
}

/** Verifica se algum provedor está disponível (tem chave configurada) */
export function isAiImageAvailable(): boolean {
  return getActiveProvider()?.isAvailable() ?? false;
}

/** Nome do provedor ativo, para exibir na UI */
export function activeProviderLabel(): string {
  const p = getActiveProvider();
  return p?.isAvailable() ? p.label : "Nenhum provedor configurado";
}
