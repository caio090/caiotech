"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { findStockGlossaryEntry } from "@/lib/business-archetypes/glossary";

/**
 * Linguagem simples primeiro, termo técnico entre parênteses — glossário
 * contextual (expansível), nunca uma parede de termos separada.
 */
export function StockGlossaryTerm({ termId, className }: { termId: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const entry = findStockGlossaryEntry(termId);
  if (!entry) return null;

  return (
    <span className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-testid={`glossary-term-${termId}`}
        className="inline-flex items-center gap-1 text-gray-600 hover:text-purple-600 transition-colors"
      >
        <span>{entry.simpleLabel} ({entry.technicalTerm})</span>
        <HelpCircle className="w-3 h-3 shrink-0" />
      </button>
      {open && (
        <span className="block mt-2 text-xs text-gray-600 leading-relaxed bg-gray-50 border border-gray-100 rounded-xl p-3 space-y-1.5">
          <span className="block"><strong className="text-gray-800">O que é:</strong> {entry.whatIsIt}</span>
          <span className="block"><strong className="text-gray-800">Como é calculado:</strong> {entry.howCalculated}</span>
          <span className="block"><strong className="text-gray-800">Por que importa:</strong> {entry.whyItMatters}</span>
          <span className="block"><strong className="text-gray-800">O que pode alterar:</strong> {entry.whatCanChangeIt}</span>
          <span className="block"><strong className="text-gray-800">O que você pode fazer:</strong> {entry.whatCanUserDo}</span>
        </span>
      )}
    </span>
  );
}
