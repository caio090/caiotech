/**
 * Sprint REC OS Studio Image Generation MVP V0.3 — contratos do runtime
 * visual. Domínio puro (sem I/O, sem import de provider) -- a chamada
 * real ao provider fica isolada em ./image-runtime.ts (o único arquivo
 * deste domínio que importa @/lib/ai/image-providers).
 *
 * Vidigal PNG (skills/vidigal-png/) NUNCA importa nada deste diretório
 * -- a orquestração (create-studio-visual.ts) é quem conecta o texto ao
 * runtime visual, nunca a skill em si.
 */
import type { DesignFormat } from "@/lib/providers/shared/types";

export type StudioImageAssetKind = "reference" | "protected";

/**
 * Fase 12/13 — um asset anexado a UMA geração. `url` é sempre efêmero
 * (data: URL enviado pelo cliente para esta requisição, ou uma URL já
 * pública conhecida, como o logo oficial da Company) -- nunca
 * persistido por este domínio (sem banco, sem tabela).
 */
export interface StudioImageAsset {
  id: string;
  label: string;
  kind: StudioImageAssetKind;
  url: string;
}

export type StudioImageCapabilityKey =
  | "textToImage"
  | "referenceImages"
  | "imageEditing"
  | "maskEditing"
  | "transparentBackground"
  | "protectedAssetSupport";

/**
 * Fase 6 — declarar SOMENTE o que o provider real suporta hoje. Nenhuma
 * capability é inventada: a auditoria desta sprint confirmou que nem
 * google-gemini.ts nem openai-images.ts realmente enviam
 * styleReference/subjectReference ao provider (campos mortos) -- por
 * isso referenceImages/imageEditing/maskEditing/transparentBackground/
 * protectedAssetSupport são sempre false nesta versão.
 */
export interface StudioImageCapabilities {
  providerId: string | null;
  available: boolean;
  supports: Record<StudioImageCapabilityKey, boolean>;
}

export interface StudioImageGenerationRequest {
  generationPrompt: string;
  format: DesignFormat;
  references: StudioImageAsset[];
  protectedAssets: StudioImageAsset[];
}

export type StudioImageResultStatus = "completed" | "failed" | "runtime_unavailable";

export type StudioImageErrorCode =
  | "STUDIO_IMAGE_PROVIDER_UNAVAILABLE"
  | "STUDIO_IMAGE_GENERATION_FAILED"
  | "STUDIO_ASSET_LOCK_UNSUPPORTED";

export interface StudioImageGenerationResult {
  status: StudioImageResultStatus;
  providerId: string | null;
  image: { url: string; width: number; height: number } | null;
  /** Nunca vazio quando existem limitações reais de capability -- nunca
   *  altera o resultado em silêncio (Fase 14: "falhar explícito ou
   *  classificar como referência, nunca alterar o original em silêncio"). */
  warnings: string[];
  error?: { code: StudioImageErrorCode; message: string };
  generatedAt: string;
}
