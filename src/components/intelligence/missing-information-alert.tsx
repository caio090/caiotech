"use client";

import { AlertTriangle } from "lucide-react";

/** Alerta determinístico de campos ausentes -- calculado por validação real (dados que o próprio módulo já valida), nunca por inferência de IA. */
export function MissingInformationAlert({ missingFields }: { missingFields: string[] }) {
  if (missingFields.length === 0) return null;
  return (
    <div className="flex items-start gap-1.5 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>Faltam informações: {missingFields.join(", ")}.</span>
    </div>
  );
}
