"use client";

import type { SwotItem, SalesGoal } from "@/lib/motor-lokat/business-types";
import {
  computeStrategyDataQuality, type BusinessDnaProfile, type EightPs, type CompetitorProfile,
  type BusinessSeasonalEvent, type StrategyAreaId,
} from "@/lib/business-strategy";
import { dashboardTokens } from "../_dashboard-design-tokens";

const AREA_LABEL: Record<StrategyAreaId, string> = {
  dna: "DNA do Negócio", eight_ps: "8Ps LOKAT", swot: "SWOT/FOFA", competitors: "Concorrência",
  positioning: "Posicionamento", goals: "Metas", seasonality: "Sazonalidade",
};

/** Qualidade dos Dados (Fase 28): nunca "completo" só porque existe texto. */
export function StrategyDataQualityPanel({
  dna, eightPs, swotItems, competitors, goals, seasonality,
}: {
  dna: BusinessDnaProfile;
  eightPs: EightPs;
  swotItems: SwotItem[];
  competitors: CompetitorProfile[];
  goals: SalesGoal[];
  seasonality: BusinessSeasonalEvent[];
}) {
  const quality = computeStrategyDataQuality(dna, eightPs, swotItems, competitors, goals, seasonality);

  return (
    <div className="space-y-4">
      <div className={`${dashboardTokens.panel} ${dashboardTokens.radius} p-4`} data-testid="strategy-data-quality-overall">
        <p className="text-[10px] font-black uppercase tracking-wider text-violet-300">Completude geral</p>
        <p className="text-2xl font-black text-[#f6f7fb]">{quality.overallCompletenessPct}%</p>
        <p className="mt-1 text-[10px] text-[#8993a8]">{quality.exampleItemsNotConfirmed} exemplo(s) ainda não confirmado(s) — não contam como fato.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {quality.areas.map((area) => (
          <div key={area.area} className={`${dashboardTokens.panel} ${dashboardTokens.radius} p-3`} data-testid={`strategy-quality-${area.area}`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-[#f6f7fb]">{AREA_LABEL[area.area]}</p>
              <p className="text-sm font-black text-violet-300">{area.completenessPct}%</p>
            </div>
            <p className="mt-1 text-[10px] text-[#8993a8]">
              {area.confirmedCount} confirmado(s) · {area.missingCount} ausente(s) · {area.estimatedCount} estimado(s)
              {area.outdatedCount > 0 && ` · ${area.outdatedCount} desatualizado(s)`}
              {area.divergentCount > 0 && ` · ${area.divergentCount} divergente(s)`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
