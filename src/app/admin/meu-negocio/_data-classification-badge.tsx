"use client";

import { cn } from "@/lib/utils";
import { DATA_CLASSIFICATION_LABEL } from "@/lib/data-quality/types";
import type { BusinessMetricValue, DataClassification } from "@/lib/data-quality/types";

const CLASSIFICATION_STYLE: Record<DataClassification, string> = {
  REAL_SYNCED: "bg-emerald-50 text-emerald-700 border-emerald-100",
  REAL_IMPORTED: "bg-blue-50 text-blue-700 border-blue-100",
  REAL_MANUAL: "bg-blue-50 text-blue-700 border-blue-100",
  CALCULATED: "bg-purple-50 text-purple-700 border-purple-100",
  ESTIMATED: "bg-amber-50 text-amber-700 border-amber-100",
  SIMULATED: "bg-amber-50 text-amber-700 border-amber-100",
  UNAVAILABLE: "bg-gray-100 text-gray-500 border-gray-200",
};

/** Badge for the canonical BusinessMetricValue taxonomy (Fase 10) -- always text + tooltip, never color alone. */
export function DataClassificationBadge({ classification, tooltip, testId }: { classification: DataClassification; tooltip?: string; testId?: string }) {
  return (
    <span
      data-testid={testId}
      className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold", CLASSIFICATION_STYLE[classification])}
      title={tooltip ?? DATA_CLASSIFICATION_LABEL[classification]}
    >
      {DATA_CLASSIFICATION_LABEL[classification]}
    </span>
  );
}

/** Modo Gestor only: fonte, atualização, cobertura, fórmula, registros incluídos/excluídos (Fase 10). */
export function DataClassificationDetails({ metric }: { metric: BusinessMetricValue }) {
  const coverageLabel = metric.coveragePercentage === null ? "Indisponível" : `${(metric.coveragePercentage * 100).toFixed(0)}%`;
  return (
    <div className="mt-2 space-y-1 border-t border-[#272d3a] pt-2 text-[10px] text-[#8993a8]">
      <p><strong className="text-[#bcc4d4]">Fonte:</strong> {metric.sourceLabels.length > 0 ? metric.sourceLabels.join(", ") : "Não informada"}</p>
      <p><strong className="text-[#bcc4d4]">Atualizado em:</strong> {new Date(metric.calculatedAt).toLocaleString("pt-BR")}</p>
      <p><strong className="text-[#bcc4d4]">Cobertura:</strong> {coverageLabel}</p>
      <p><strong className="text-[#bcc4d4]">Fórmula:</strong> {metric.formulaTrace.expression}{metric.formulaTrace.isPartial ? " (parcial)" : ""}</p>
      {(metric.includedRecords !== null || metric.excludedRecords !== null) && (
        <p><strong className="text-[#bcc4d4]">Registros:</strong> {metric.includedRecords ?? "?"} incluídos, {metric.excludedRecords ?? "?"} excluídos</p>
      )}
      {metric.limitations.length > 0 && metric.limitations.map((limitation) => <p key={limitation} className="text-amber-300">{limitation}</p>)}
    </div>
  );
}
