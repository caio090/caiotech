"use client";

import { useEffect, useState } from "react";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ANALYSIS_PROPOSAL_FIXTURES, ANALYSIS_STAGE_LABEL, ANALYSIS_STAGE_ORDER, type AnalysisStage,
} from "@/lib/business-archetypes/analysis-proposal";

const STAGE_DELAY_MS = 450;

export function RestaurantAnalyzeFill() {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<AnalysisStage>("idle");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (stage === "idle" || stage === "ready") return;
    const currentIndex = ANALYSIS_STAGE_ORDER.indexOf(stage);
    const timer = setTimeout(() => {
      const next = ANALYSIS_STAGE_ORDER[currentIndex + 1];
      if (next) setStage(next);
    }, STAGE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [stage]);

  function start() {
    setOpen(true);
    setApplied(false);
    setSelected({});
    setStage("reading");
  }

  function cancel() {
    setOpen(false);
    setStage("idle");
  }

  function applySelected() {
    setApplied(true);
  }

  const isRunning = stage !== "idle" && stage !== "ready";

  return (
    <div className="mt-6">
      <button
        onClick={start}
        data-testid="analyze-fill-button"
        className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5" /> Analisar e preencher
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={isRunning ? undefined : cancel}>
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            {isRunning && (
              <div className="flex flex-col items-center py-8 text-center" data-testid="analyze-fill-progress">
                <Loader2 className="w-6 h-6 text-purple-500 animate-spin mb-3" />
                <p className="text-sm font-bold text-gray-800">{ANALYSIS_STAGE_LABEL[stage]}</p>
              </div>
            )}

            {stage === "ready" && !applied && (
              <div data-testid="analyze-fill-review">
                <p className="text-sm font-bold text-gray-900 mb-3">Sugestões encontradas</p>
                <div className="space-y-3 mb-4">
                  {ANALYSIS_PROPOSAL_FIXTURES.map((p) => (
                    <label key={p.id} className="flex items-start gap-2.5 bg-gray-50 border border-gray-100 rounded-xl p-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!selected[p.id]}
                        onChange={(e) => setSelected((prev) => ({ ...prev, [p.id]: e.target.checked }))}
                        data-testid={`analyze-fill-select-${p.id}`}
                        className="mt-0.5"
                      />
                      <div className="text-xs">
                        <p className="font-bold text-gray-800">{p.field}</p>
                        <p className="text-gray-500">Atual: <span className="text-gray-700">{p.currentValue}</span> → Sugerido: <span className="text-purple-700 font-bold">{p.suggestedValue}</span></p>
                        <p className="text-gray-400 mt-0.5">Origem: {p.origin}</p>
                        <p className="text-gray-400">Motivo: {p.reason}</p>
                        <span className={cn("inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                          p.confidence === "alta" ? "bg-emerald-50 text-emerald-700" : p.confidence === "media" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-500"
                        )}>
                          Confiança {p.confidence}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={applySelected} data-testid="analyze-fill-apply" className="flex-1 text-xs font-bold py-2.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700">Aplicar selecionados</button>
                  <button onClick={() => setStage("reading")} className="text-xs font-bold py-2.5 px-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">Revisar</button>
                  <button onClick={cancel} className="text-xs font-bold py-2.5 px-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">Cancelar</button>
                </div>
              </div>
            )}

            {applied && (
              <div className="text-center py-6" data-testid="analyze-fill-applied">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-gray-800 mb-1">Sugestões aplicadas nesta demonstração</p>
                <p className="text-[11px] text-gray-400 mb-4">As alterações permanecem somente nesta demonstração.</p>
                <button onClick={cancel} className="text-xs font-bold py-2.5 px-4 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">Fechar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
