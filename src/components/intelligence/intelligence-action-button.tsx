"use client";

import { Sparkles } from "lucide-react";
import type { IntelligenceAction } from "@/lib/intelligence/types";
import { CURRENT_INTELLIGENCE_AVAILABILITY, INTELLIGENCE_UNAVAILABLE_MESSAGE, isIntelligenceAvailable } from "@/lib/intelligence/availability";
import { isActionAllowedForModule } from "@/lib/intelligence/capabilities";

const ACTION_LABELS: Record<IntelligenceAction, string> = {
  explain: "Explicar",
  help_fill: "Preencher comigo",
  interpret: "Interpretar",
  find_inconsistencies: "Encontrar inconsistências",
  suggest_next_step: "Sugerir próximo passo",
  generate_questions: "Gerar perguntas",
  summarize: "Resumir",
  compare: "Comparar",
  classify: "Classificar",
};

/** Fase 18: cada módulo define as ações permitidas -- este botão nunca aparece se a ação não estiver na lista do módulo (Fase 17: sem IA falsa, desabilitado até availability === "available"). */
export function IntelligenceActionButton({ moduleId, action, onClick }: { moduleId: string; action: IntelligenceAction; onClick?: () => void }) {
  if (!isActionAllowedForModule(moduleId, action)) return null;
  const available = isIntelligenceAvailable(CURRENT_INTELLIGENCE_AVAILABILITY);
  return (
    <button
      type="button"
      disabled={!available}
      onClick={onClick}
      title={available ? undefined : INTELLIGENCE_UNAVAILABLE_MESSAGE}
      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:enabled:bg-slate-50"
    >
      <Sparkles className="h-3.5 w-3.5" />
      {ACTION_LABELS[action]}
    </button>
  );
}
