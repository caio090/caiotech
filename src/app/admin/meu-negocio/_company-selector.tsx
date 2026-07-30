"use client";

import { Building2, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { COMPANY_SELECTION_FIXTURES, type CompanySelectionCard, type ModuleActivationState } from "@/lib/business-archetypes/company-selection";
import { cn } from "@/lib/utils";

const STATE_LABEL: Record<ModuleActivationState, { label: string; cls: string; icon: React.ElementType }> = {
  locked_preview: { label: "Prévia bloqueada", cls: "bg-gray-100 text-gray-500", icon: Clock },
  available_for_activation: { label: "Disponível para ativação", cls: "bg-amber-50 text-amber-700", icon: Clock },
  setup_required: { label: "Configuração necessária", cls: "bg-amber-50 text-amber-700", icon: AlertTriangle },
  active: { label: "Ativo", cls: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
  incomplete: { label: "Incompleto", cls: "bg-amber-50 text-amber-700", icon: AlertTriangle },
  suspended: { label: "Suspenso", cls: "bg-red-50 text-red-700", icon: AlertTriangle },
};

export function CompanySelector({ onOpen }: { onOpen: (companyId: string) => void }) {
  return (
    <div className="max-w-3xl mx-auto py-6">
      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Building2 className="w-6 h-6 text-purple-600" />
        </div>
        <h1 className="text-lg font-bold text-gray-900">Selecione a empresa que deseja analisar</h1>
        <p className="text-xs text-gray-400 mt-1">Demonstração — nenhum dado real é consultado nesta tela.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {COMPANY_SELECTION_FIXTURES.map((card) => (
          <CompanyCard key={card.id} card={card} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

function CompanyCard({ card, onOpen }: { card: CompanySelectionCard; onOpen: (id: string) => void }) {
  const state = STATE_LABEL[card.moduleState];
  const Icon = state.icon;

  return (
    <div
      data-testid={`company-card-${card.id}`}
      className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-3 transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-purple-200 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-gray-900">{card.name}</p>
          <p className="text-[11px] text-gray-400">{card.segmentLabel}</p>
        </div>
        <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shrink-0", state.cls)}>
          <Icon className="w-3 h-3" /> {state.label}
        </span>
      </div>

      {card.id === "duh-lanches" && <span className="w-fit bg-purple-50 px-2 py-1 text-[9px] font-black uppercase text-purple-700">Exemplo simulado</span>}

      <div>
        <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
          <span>Diagnóstico</span>
          <span className="font-bold text-gray-700">{card.diagnosticPercent}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${card.diagnosticPercent}%` }} />
        </div>
      </div>

      {card.missingFields.length > 0 && (
        <div className="text-[11px] text-gray-500">
          <span className="font-bold text-gray-600">Campos ausentes: </span>
          {card.missingFields.join(", ")}
        </div>
      )}

      {card.alerts.length > 0 && (
        <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-2.5 py-1.5 flex items-start gap-1.5">
          <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
          <span>{card.alerts.join(" · ")}</span>
        </div>
      )}

      <p className="text-[10px] text-gray-300 italic">{card.lastUpdatedLabel}</p>

      <button
        onClick={() => onOpen(card.id)}
        data-testid={`open-company-${card.id}`}
        className="mt-auto w-full text-xs font-bold py-2.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors"
      >
        Abrir Meu Negócio
      </button>
    </div>
  );
}
