"use client";

import { cn } from "@/lib/utils";
import { describeDataSource } from "@/lib/finance/data-source";
import type { DataProvenance } from "@/lib/finance/data-source";

const RELIABILITY_STYLE: Record<DataProvenance["reliability"], string> = {
  integrated: "bg-emerald-50 text-emerald-700 border-emerald-100",
  imported: "bg-blue-50 text-blue-700 border-blue-100",
  manual: "bg-blue-50 text-blue-700 border-blue-100",
  derived: "bg-purple-50 text-purple-700 border-purple-100",
  simulated: "bg-amber-50 text-amber-700 border-amber-100",
  incomplete: "bg-gray-100 text-gray-500 border-gray-200",
};

/** Nunca mostrar dado sem origem quando a origem for conhecida (Fase 4). */
export function DataSourceBadge({ provenance, testId }: { provenance: DataProvenance; testId?: string }) {
  return (
    <span
      data-testid={testId}
      className={cn("inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border", RELIABILITY_STYLE[provenance.reliability])}
      title={provenance.warnings.join(" ")}
    >
      {provenance.isSimulated ? "Exemplo simulado" : describeDataSource(provenance.source)}
    </span>
  );
}
