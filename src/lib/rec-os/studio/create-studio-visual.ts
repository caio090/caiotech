/**
 * Sprint REC OS Studio Image Generation MVP V0.3 (Fase 20/21) —
 * orquestração server-side única: texto (Vidigal) + DNA da Company +
 * imagem, num único ponto de entrada para a rota da API. Evita lógica
 * complexa direto no componente React (Fase 21) e evita que o usuário
 * precise executar duas experiências separadas (Fase 20).
 *
 * Pipeline:
 *   USER BRIEF -> Vidigal Text Runtime -> StudioSkillResult ->
 *   generationPrompt -> Studio Image Runtime -> Provider -> imagem.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { executeStudioSkill } from "./execute";
import type { StudioSkillExecutionResult } from "./runtime";
import type { StudioBriefInput } from "./types";
import { buildStudioCreativeBusinessContext } from "./business-context";
import { generateStudioImage } from "./image/image-runtime";
import type { StudioImageAsset, StudioImageGenerationResult } from "./image/types";
import type { VidigalPngOutputContract } from "./skills/vidigal-png/output";

export interface CreateStudioVisualRequest {
  skillId: string;
  input: StudioBriefInput;
  /** Já resolvido/autorizado pelo caller (rota) -- nunca o valor bruto do cliente. `null` = Free Creation Mode. */
  companyId: string | null;
  companyName: string | null;
  assets: { references: StudioImageAsset[]; protectedAssets: StudioImageAsset[] };
  db: SupabaseClient;
}

export interface StudioVisualCreationResult {
  text: StudioSkillExecutionResult;
  /** `null` quando o texto não completou -- nunca tenta gerar imagem sobre uma direção que falhou. */
  image: StudioImageGenerationResult | null;
}

function isVidigalOutput(value: unknown): value is VidigalPngOutputContract {
  return !!value && typeof value === "object" && typeof (value as Record<string, unknown>).generationPrompt === "string";
}

export async function createStudioVisual(request: CreateStudioVisualRequest): Promise<StudioVisualCreationResult> {
  const context = await buildStudioCreativeBusinessContext(request.db, request.companyId, request.companyName);

  const textResult = await executeStudioSkill({ skillId: request.skillId, input: request.input, context });

  if (textResult.status !== "completed" || !isVidigalOutput(textResult.output)) {
    return { text: textResult, image: null };
  }

  // Fase 15 -- logo oficial da Company (quando existir DNA real) é
  // SEMPRE tratada como PROTECTED, automaticamente -- o usuário não
  // precisa (e não pode) marcar o logo oficial como "referência".
  const protectedAssets = [...request.assets.protectedAssets];
  const officialLogo = context.identity?.logoUrl;
  if (officialLogo && !protectedAssets.some((a) => a.url === officialLogo)) {
    protectedAssets.push({ id: "company-logo", label: "Logo oficial da Company", kind: "protected", url: officialLogo });
  }

  const imageResult = await generateStudioImage({
    generationPrompt: textResult.output.generationPrompt,
    format: request.input.format ?? "feed_square",
    references: request.assets.references,
    protectedAssets,
  });

  return { text: textResult, image: imageResult };
}
