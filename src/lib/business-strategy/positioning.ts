import type { BusinessDnaProfile, EightPs } from "./types";

/**
 * Resumo de posicionamento (Fase 10): "Para [público], a empresa é
 * [categoria] que entrega [benefício], porque [prova/diferencial]." Só é
 * construído quando os quatro componentes existem — nunca inventa uma frase
 * quando faltam dados (retorna null, não um texto com lacunas).
 */
export function buildPositioningSummary(dna: BusinessDnaProfile, eightPs: EightPs): string | null {
  const audience = dna.audiences.value.trim() || eightPs.audience.text.trim();
  const category = eightPs.positioning.text.trim();
  const benefit = dna.valueProposition.value.trim() || eightPs.product.text.trim();
  const proof = dna.differentiators.value.trim();
  if (!audience || !category || !benefit || !proof) return null;
  return `Para ${audience}, a empresa é ${category} que entrega ${benefit}, porque ${proof}.`;
}
