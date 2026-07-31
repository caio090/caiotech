import type { SwotItem } from "@/lib/motor-lokat/business-types";
import type { SwotCrossSuggestion } from "./types";

/**
 * Cruzamentos determinísticos da matriz SWOT (Fase 17). Só combina itens
 * confirmados e reais (nunca exemplos não confirmados) — o cruzamento é uma
 * sugestão para revisão humana, nunca uma decisão aplicada automaticamente.
 */
export function buildSwotCrossSuggestions(items: SwotItem[]): SwotCrossSuggestion[] {
  const confirmedReal = items.filter((i) => i.confirmed && !i.isExample && i.text.trim() !== "");
  const strengths = confirmedReal.filter((i) => i.category === "forca");
  const weaknesses = confirmedReal.filter((i) => i.category === "fraqueza");
  const opportunities = confirmedReal.filter((i) => i.category === "oportunidade");
  const threats = confirmedReal.filter((i) => i.category === "ameaca");

  const suggestions: SwotCrossSuggestion[] = [];

  for (const s of strengths) {
    for (const o of opportunities) {
      suggestions.push({ quadrant: "potencializar", strengthOrWeaknessId: s.id, opportunityOrThreatId: o.id, label: "Potencializar", reason: `Usar "${s.text}" para aproveitar "${o.text}".` });
    }
    for (const t of threats) {
      suggestions.push({ quadrant: "proteger", strengthOrWeaknessId: s.id, opportunityOrThreatId: t.id, label: "Proteger", reason: `Usar "${s.text}" para se proteger de "${t.text}".` });
    }
  }
  for (const w of weaknesses) {
    for (const o of opportunities) {
      suggestions.push({ quadrant: "melhorar_para_aproveitar", strengthOrWeaknessId: w.id, opportunityOrThreatId: o.id, label: "Melhorar para aproveitar", reason: `Melhorar "${w.text}" para conseguir aproveitar "${o.text}".` });
    }
    for (const t of threats) {
      suggestions.push({ quadrant: "reduzir_risco", strengthOrWeaknessId: w.id, opportunityOrThreatId: t.id, label: "Reduzir risco", reason: `"${w.text}" combinada com "${t.text}" é um risco a reduzir.` });
    }
  }

  return suggestions;
}
