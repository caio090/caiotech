"use client";

import { useState } from "react";
import { Filter, X } from "lucide-react";

/**
 * Sprint REC OS 3.0.1 (Fase 35) — filtros do CRM em sheet no mobile, em vez
 * de duas linhas de chips sempre visíveis competindo com a lista de leads
 * pelo espaço da primeira viewport. Reaproveita exatamente o mesmo estado
 * (`srcFilter`/`statusFilter`) já usado pela versão desktop — nunca um
 * segundo sistema de filtro. Só cobre Origem e Etapa porque são os únicos
 * filtros que já existem de verdade nesta página; responsável, temperatura,
 * canal e período do ticket original não têm fonte de dado real ainda.
 */
export interface CrmFilterOption {
  key: string;
  label: string;
  count: number;
}

interface CrmMobileFilterSheetProps {
  sourceOptions: CrmFilterOption[];
  sourceValue: string;
  onSourceChange: (value: string) => void;
  statusOptions: CrmFilterOption[];
  statusValue: string;
  onStatusChange: (value: string) => void;
}

export function CrmMobileFilterSheet({
  sourceOptions, sourceValue, onSourceChange,
  statusOptions, statusValue, onStatusChange,
}: CrmMobileFilterSheetProps) {
  const [open, setOpen] = useState(false);
  const [draftSource, setDraftSource] = useState(sourceValue);
  const [draftStatus, setDraftStatus] = useState(statusValue);

  const activeCount = (sourceValue !== "all" ? 1 : 0) + (statusValue !== "all" ? 1 : 0);

  function openSheet() {
    setDraftSource(sourceValue);
    setDraftStatus(statusValue);
    setOpen(true);
  }
  function apply() {
    onSourceChange(draftSource);
    onStatusChange(draftStatus);
    setOpen(false);
  }
  function clear() {
    setDraftSource("all");
    setDraftStatus("all");
    onSourceChange("all");
    onStatusChange("all");
    setOpen(false);
  }

  return (
    <div className="md:hidden">
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={openSheet}
          data-testid="crm-mobile-filters-trigger"
          className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-gray-700"
        >
          <Filter className="h-3.5 w-3.5" /> Filtros
          {activeCount > 0 && (
            <span className="ml-0.5 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{activeCount}</span>
          )}
        </button>
        {sourceValue !== "all" && (
          <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700">
            {sourceOptions.find((o) => o.key === sourceValue)?.label}
          </span>
        )}
        {statusValue !== "all" && (
          <span className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-700">
            {statusOptions.find((o) => o.key === statusValue)?.label}
          </span>
        )}
        {activeCount > 0 && (
          <button type="button" onClick={clear} className="text-[10px] font-bold text-gray-400 underline">
            Limpar
          </button>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="max-h-[80vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Filtros do CRM"
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-900">Filtros</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar filtros" className="text-gray-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-1.5 text-[10px] font-bold uppercase text-gray-400">Origem</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {sourceOptions.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setDraftSource(opt.key)}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                    draftSource === opt.key ? "border-indigo-600 bg-indigo-600 text-white" : "border-gray-200 bg-white text-gray-600"
                  }`}
                >
                  {opt.label}{opt.count > 0 ? ` (${opt.count})` : ""}
                </button>
              ))}
            </div>

            <p className="mb-1.5 text-[10px] font-bold uppercase text-gray-400">Etapa</p>
            <div className="mb-6 flex flex-wrap gap-2">
              {statusOptions.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setDraftStatus(opt.key)}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                    draftStatus === opt.key ? "border-gray-800 bg-gray-800 text-white" : "border-gray-200 bg-white text-gray-600"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={clear} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-bold text-gray-600">
                Limpar
              </button>
              <button type="button" onClick={apply} className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white">
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
