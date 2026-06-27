/**
 * Interface abstrata para provedores de geração de imagem.
 * Nunca expor chaves de API no frontend. Toda chamada acontece no servidor.
 */

export type ImageAspectRatio = "1:1" | "9:16" | "16:9" | "4:5" | "1.91:1";

export interface ImageGenerationInput {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: ImageAspectRatio;
  styleReference?: string; // URL de referência visual
  subjectReference?: string; // URL de pessoa/produto/logo
  outputCount?: number; // 1–4
  highRes?: boolean;
}

export interface ImageGenerationOutput {
  success: boolean;
  images?: { url: string; width: number; height: number }[];
  error?: string;
  providerRaw?: unknown; // dados brutos do provider para debug interno
}

export interface ImageProvider {
  id: string;
  label: string;
  isAvailable(): boolean;
  generate(input: ImageGenerationInput): Promise<ImageGenerationOutput>;
}
