"use client";

import { useMemo, useState } from "react";
import type { BusinessArchetypeId } from "@/lib/business-archetypes/types";
import type { SwotItem, SalesGoal } from "@/lib/motor-lokat/business-types";
import {
  buildDnaForCurrentCompany, buildEmptyEightPs, buildExampleSwotForArchetype,
  buildDefaultSalesGoals, buildDefaultSeasonality, buildExampleCompetitorsForArchetype,
  type BusinessDnaProfile, type EightPs, type CompetitorProfile, type BusinessSeasonalEvent,
} from "@/lib/business-strategy";
import type { BusinessViewMode } from "@/lib/finance/types";
import { dashboardTokens } from "../_dashboard-design-tokens";
import { StrategyOverviewPanel } from "./_strategy-overview";
import { StrategyManualPanel } from "./_strategy-manual";
import { StrategyEightPsPanel } from "./_strategy-eight-ps";
import { StrategySwotPanel } from "./_strategy-swot";
import { StrategyCompetitorsPanel } from "./_strategy-competitors";
import { StrategyPositioningPanel } from "./_strategy-positioning";
import { StrategyGoalsSeasonalityPanel } from "./_strategy-goals-seasonality";
import { StrategyDataQualityPanel } from "./_strategy-data-quality";

export const STRATEGY_SUBSECTIONS = [
  "Visão do Negócio",
  "Manual Vivo",
  "8Ps LOKAT",
  "SWOT / FOFA",
  "Concorrência",
  "Posicionamento",
  "Metas e Sazonalidade",
  "Qualidade dos Dados",
] as const;

interface Props {
  companyName: string;
  segment: BusinessArchetypeId;
  activeSubsection: string;
  viewMode: BusinessViewMode;
  onViewModeChange: (mode: BusinessViewMode) => void;
}

/**
 * Sprint Meu Negócio 2.1.2 — área "DNA & Estratégia" dentro do Centro de
 * Comando real. O estado estratégico vive aqui, no nível do Command Center
 * (não em Context/Redux/persistência): 100% em memória, reiniciando a cada
 * carga de página, exatamente como o resto do módulo. O aviso fixo de
 * demonstração é responsabilidade do `_restaurant-workspace.tsx` (já existe
 * para todo o Centro de Comando) — não duplicado aqui.
 */
export function StrategyWorkspace({ companyName, segment, activeSubsection, viewMode, onViewModeChange }: Props) {
  const [dna, setDna] = useState<BusinessDnaProfile>(() => buildDnaForCurrentCompany(companyName, segment));
  const [eightPs, setEightPs] = useState<EightPs>(() => buildEmptyEightPs());
  const [swotItems, setSwotItems] = useState<SwotItem[]>(() => buildExampleSwotForArchetype(segment));
  const [competitors, setCompetitors] = useState<CompetitorProfile[]>(() => buildExampleCompetitorsForArchetype(segment));
  const [goals, setGoals] = useState<SalesGoal[]>(() => buildDefaultSalesGoals());
  const [seasonality, setSeasonality] = useState<BusinessSeasonalEvent[]>(() => buildDefaultSeasonality());

  const managerMode = viewMode === "manager";
  const generatedAtIso = useMemo(() => new Date().toISOString(), []);

  return (
    <div className="space-y-4">
      <div className={`${dashboardTokens.panel} ${dashboardTokens.radius} px-4 py-3`}>
        <p className="text-[10px] font-black uppercase tracking-wide text-violet-300">DNA &amp; Estratégia</p>
        <p className="mt-0.5 text-xs leading-relaxed text-[#bcc4d4]">
          Estas informações são demonstrativas e permanecem somente nesta sessão. Nenhum dado é salvo no cadastro real da empresa.
        </p>
      </div>

      {activeSubsection === "Visão do Negócio" && (
        <StrategyOverviewPanel dna={dna} onDnaChange={setDna} managerMode={managerMode} onRequestManagerMode={() => onViewModeChange("manager")} />
      )}

      {activeSubsection === "Manual Vivo" && (
        <StrategyManualPanel
          companyName={companyName} dna={dna} eightPs={eightPs} swotItems={swotItems}
          competitors={competitors} goals={goals} seasonality={seasonality} generatedAtIso={generatedAtIso}
        />
      )}

      {activeSubsection === "8Ps LOKAT" && <StrategyEightPsPanel eightPs={eightPs} onChange={setEightPs} managerMode={managerMode} />}

      {activeSubsection === "SWOT / FOFA" && <StrategySwotPanel items={swotItems} onChange={setSwotItems} />}

      {activeSubsection === "Concorrência" && <StrategyCompetitorsPanel competitors={competitors} onChange={setCompetitors} />}

      {activeSubsection === "Posicionamento" && <StrategyPositioningPanel dna={dna} eightPs={eightPs} />}

      {activeSubsection === "Metas e Sazonalidade" && (
        <StrategyGoalsSeasonalityPanel goals={goals} onGoalsChange={setGoals} seasonality={seasonality} onSeasonalityChange={setSeasonality} />
      )}

      {activeSubsection === "Qualidade dos Dados" && (
        <StrategyDataQualityPanel dna={dna} eightPs={eightPs} swotItems={swotItems} competitors={competitors} goals={goals} seasonality={seasonality} />
      )}
    </div>
  );
}
