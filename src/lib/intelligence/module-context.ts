import { findModuleById } from "@/config/platform-modules";
import type { IntelligenceContext } from "./types";

/** Resolve informação do módulo (dependências, dados consumidos) para dar contexto a uma futura resposta de IA -- puramente estrutural, sem geração de texto. */
export function resolveModuleContextSummary(context: IntelligenceContext): string {
  const mod = findModuleById(context.moduleId);
  if (!mod) return `Módulo desconhecido: ${context.moduleId}`;
  return `${mod.name} (${mod.category}) — consome: ${mod.consumes.join(", ") || "nenhum dado externo"}; produz: ${mod.produces.join(", ") || "nenhum dado para outros módulos"}.`;
}
