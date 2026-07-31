import type { IntelligenceContext } from "./types";

export function buildIntelligenceContext(params: { moduleId: string; surface: string; fieldId?: string; recordId?: string }): IntelligenceContext {
  return { moduleId: params.moduleId, surface: params.surface, fieldId: params.fieldId, recordId: params.recordId, locale: "pt-BR" };
}
