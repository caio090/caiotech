/**
 * Prompt 20 (Studio Visual Quality) — Fase 19/20: o provider de imagem
 * precisa saber ONDE o compositor pretende escrever ANTES de gerar a
 * cena -- nunca gera o fundo primeiro e só depois torce pra sobrar
 * espaço onde o texto vai entrar (a fotografia precisa ser pensada
 * junto com o layout). Puro, sem I/O -- só monta a instrução de
 * negative space a partir do headlineZone decidido pela Vidigal.
 */
import type { VidigalHeadlineZone } from "../skills/vidigal-png/output";

const NEGATIVE_SPACE_INSTRUCTION: Record<VidigalHeadlineZone, string> = {
  TOP: "Reserve clean, visually calm negative space in the top area of the frame for editorial text -- keep the main subject/product away from the top region.",
  BOTTOM: "Reserve clean, visually calm negative space in the bottom area of the frame for editorial text -- keep the main subject/product away from the bottom region.",
};

/** Anexa a instrução de negative space ANTES da política do Background Guard (defesa em profundidade, nunca substitui a política de anti-colagem/texto). */
export function applyCompositionGuidance(generationPrompt: string, headlineZone: VidigalHeadlineZone): string {
  const base = generationPrompt.trim();
  const instruction = NEGATIVE_SPACE_INSTRUCTION[headlineZone];
  return base ? `${base}\n\n${instruction}` : instruction;
}
