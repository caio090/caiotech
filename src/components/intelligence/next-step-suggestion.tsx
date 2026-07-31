"use client";

import { ArrowRight } from "lucide-react";

/** Sugestão de próximo passo -- texto fornecido pelo chamador (regra determinística do módulo), não gerado por IA. */
export function NextStepSuggestion({ text, onAccept }: { text: string; onAccept?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-violet-200 bg-violet-50 p-2.5 text-xs text-violet-800">
      <span>{text}</span>
      {onAccept && (
        <button type="button" onClick={onAccept} className="inline-flex items-center gap-1 font-semibold hover:underline">
          Seguir <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
