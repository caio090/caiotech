"use client";

import { HelpCircle } from "lucide-react";

/** Explicação estática de um campo -- texto fixo fornecido pelo módulo, nunca gerado. */
export function FieldExplanation({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
      <HelpCircle className="h-3 w-3" />
      {text}
    </span>
  );
}
