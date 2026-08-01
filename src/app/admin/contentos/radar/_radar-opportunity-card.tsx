import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { RadarOpportunity } from "@/lib/rec-os-workflow/radar-opportunities";

/**
 * Sprint REC OS 3.0.1.1 (Fase 2) — "Criar a partir desta oportunidade" só
 * fica disponível quando há contexto mínimo (cliente selecionado). Sem
 * cliente, mostra por que a ação está indisponível em vez de escondê-la —
 * nenhum botão falso, mas também nenhum botão que engana sobre o que falta.
 */
export function RadarOpportunityCard({ opp, clientId }: { opp: RadarOpportunity; clientId: string | null }) {
  const href = clientId ? `/admin/contentos/criar?client=${clientId}&seed=${opp.id}&section=ideia` : null;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4" data-testid="radar-opportunity-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-800">{opp.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{opp.summary}</p>
        </div>
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100 whitespace-nowrap flex-shrink-0">
          Demonstração
        </span>
      </div>
      <p className="text-[11px] text-gray-400 mt-2 italic">Evidência: {opp.evidence}</p>
      <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-indigo-700 font-medium">{opp.opportunity}</p>
        {href ? (
          <Link
            href={href}
            data-testid="radar-create-from-opportunity"
            className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-white bg-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Criar a partir desta oportunidade <ArrowRight className="w-3 h-3" />
          </Link>
        ) : (
          <span className="shrink-0 text-[10px] text-gray-400" data-testid="radar-create-disabled">
            Selecione um cliente para criar a partir daqui
          </span>
        )}
      </div>
    </div>
  );
}
