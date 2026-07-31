"use client";

import type { ReactNode } from "react";
import { Info } from "lucide-react";

/** Ajuda contextual determinística (exemplos, explicação de campo) -- mostrada enquanto a IA real não está disponível (Fase 17). */
export function ContextHelpCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
      <p className="mb-1 flex items-center gap-1.5 font-semibold text-slate-700">
        <Info className="h-3.5 w-3.5" />
        {title}
      </p>
      {children}
    </div>
  );
}
