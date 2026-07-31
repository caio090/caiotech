"use client";

import type { SwotItem, SalesGoal } from "@/lib/motor-lokat/business-types";
import { buildLivingManual, type BusinessDnaProfile, type EightPs, type CompetitorProfile, type BusinessSeasonalEvent } from "@/lib/business-strategy";
import { dashboardTokens } from "../_dashboard-design-tokens";

/** Manual Vivo (Fase 4): renderiza o resultado de buildLivingManual() — nunca guarda seu próprio estado. */
export function StrategyManualPanel({
  companyName, dna, eightPs, swotItems, competitors, goals, seasonality, generatedAtIso,
}: {
  companyName: string;
  dna: BusinessDnaProfile;
  eightPs: EightPs;
  swotItems: SwotItem[];
  competitors: CompetitorProfile[];
  goals: SalesGoal[];
  seasonality: BusinessSeasonalEvent[];
  generatedAtIso: string;
}) {
  const manual = buildLivingManual(companyName, dna, eightPs, swotItems, competitors, goals, seasonality, generatedAtIso);

  return (
    <div className={`${dashboardTokens.panel} ${dashboardTokens.radius} p-4 sm:p-5 space-y-4`}>
      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-violet-300">Manual do Negócio</p>
        <p className="text-sm font-black text-[#f6f7fb]">{manual.companyName}</p>
      </div>
      {manual.sections.map((section) => (
        <section key={section.id} data-testid={`strategy-manual-${section.id}`}>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#8993a8]">{section.title}</p>
          <p className="whitespace-pre-line text-xs text-[#bcc4d4]">{section.content}</p>
          {section.pending && <p className="mt-0.5 text-[10px] italic text-amber-300">Pendente de confirmação.</p>}
        </section>
      ))}
      <p className="border-t border-[#272d3a] pt-3 text-[10px] italic text-[#8993a8]">
        Este manual é derivado ao vivo do DNA, 8Ps, SWOT, concorrência, metas e sazonalidade — não é uma cópia separada. Editar qualquer área acima atualiza este resumo imediatamente.
      </p>
    </div>
  );
}
