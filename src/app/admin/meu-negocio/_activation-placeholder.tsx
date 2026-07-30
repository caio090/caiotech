"use client";

import { Lock, ArrowLeft, Sparkles } from "lucide-react";
import type { CompanySelectionCard } from "@/lib/business-archetypes/company-selection";
import { getArchetypeConfig } from "@/lib/business-archetypes/types";

/**
 * `locked_preview` — resumo do diagnóstico, lacunas e CTA de ativação, sem
 * edição avançada. Usado para qualquer empresa cujo arquétipo ainda não
 * tenha a experiência completa construída (ex.: O Pedreirão / retail).
 */
export function ActivationPlaceholder({ card, onBack }: { card: CompanySelectionCard; onBack: () => void }) {
  const archetype = getArchetypeConfig(card.archetype);

  return (
    <div className="max-w-2xl mx-auto py-6">
      <button onClick={onBack} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-4">
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar para seleção de empresa
      </button>

      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
            <Lock className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{card.name}</p>
            <p className="text-[11px] text-gray-400">{archetype.label}</p>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
            <span>Diagnóstico conhecido</span>
            <span className="font-bold text-gray-700">{card.diagnosticPercent}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gray-400 rounded-full" style={{ width: `${card.diagnosticPercent}%` }} />
          </div>
        </div>

        {card.missingFields.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] font-bold text-gray-600 mb-1">Lacunas conhecidas</p>
            <ul className="text-xs text-gray-500 list-disc list-inside space-y-0.5">
              {card.missingFields.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </div>
        )}

        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-purple-700 mb-0.5">Recursos bloqueados nesta prévia</p>
            <p className="text-[11px] text-purple-600 leading-relaxed">{archetype.futureNote}</p>
          </div>
        </div>

        <button
          disabled
          title="Ativação não implementada nesta demonstração"
          data-testid="activation-cta-disabled"
          className="mt-4 w-full text-xs font-bold py-2.5 rounded-xl bg-gray-100 text-gray-400 cursor-not-allowed"
        >
          Ativar módulo (em breve)
        </button>
      </div>
    </div>
  );
}

/** Contrato visual para "empresa direta" entrando no próprio painel — sem resolver usuário/membership real nesta sprint. */
export function DirectBusinessEntryContract({ onBack }: { onBack: () => void }) {
  return (
    <div className="max-w-xl mx-auto py-10 text-center">
      <button onClick={onBack} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-6 mx-auto w-fit">
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar
      </button>
      <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
        <Lock className="w-6 h-6 text-gray-400" />
      </div>
      <p className="text-sm font-bold text-gray-900 mb-1">Entrada direta da empresa</p>
      <p className="text-xs text-gray-400 leading-relaxed max-w-sm mx-auto">
        Contrato visual apenas — a resolução real de usuário/empresa (membership) para uma empresa direta acessar
        seu próprio Meu Negócio ainda não foi construída nesta sprint.
      </p>
    </div>
  );
}
