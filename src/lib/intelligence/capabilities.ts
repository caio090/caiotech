import type { IntelligenceAction, IntelligenceCapability } from "./types";
import { CURRENT_INTELLIGENCE_AVAILABILITY, isIntelligenceAvailable } from "./availability";

/** Cada módulo declara quais ações de IA são permitidas nele -- nenhum módulo mostra todos os botões (Fase 18). */
const MODULE_ALLOWED_ACTIONS: Record<string, IntelligenceAction[]> = {
  meu_negocio: ["explain", "help_fill", "find_inconsistencies", "suggest_next_step"],
  rec_os: ["explain", "generate_questions", "summarize"],
  financeiro: ["explain", "find_inconsistencies"],
  relatorios: ["interpret", "summarize", "compare"],
  crm_leads_clientes: ["classify", "suggest_next_step"],
};

export function resolveIntelligenceCapabilities(moduleId: string): IntelligenceCapability[] {
  const actions = MODULE_ALLOWED_ACTIONS[moduleId] ?? [];
  return actions.map((action) => ({ action, moduleId, enabled: isIntelligenceAvailable(CURRENT_INTELLIGENCE_AVAILABILITY) }));
}

export function isActionAllowedForModule(moduleId: string, action: IntelligenceAction): boolean {
  return (MODULE_ALLOWED_ACTIONS[moduleId] ?? []).includes(action);
}
