"use client";

import { buildPositioningSummary, type BusinessDnaProfile, type EightPs } from "@/lib/business-strategy";
import { dashboardTokens } from "../_dashboard-design-tokens";

/** Posicionamento (Fase 10): resumo derivado, nunca uma frase inventada quando faltam dados. */
export function StrategyPositioningPanel({ dna, eightPs }: { dna: BusinessDnaProfile; eightPs: EightPs }) {
  const summary = buildPositioningSummary(dna, eightPs);

  return (
    <div className="space-y-4">
      <div className={`${dashboardTokens.panel} ${dashboardTokens.radius} p-4`} data-testid="strategy-positioning-summary">
        <p className="text-[10px] font-black uppercase tracking-wider text-violet-300">Resumo de posicionamento</p>
        {summary ? (
          <p className="mt-1 text-sm text-[#f6f7fb]">{summary}</p>
        ) : (
          <p className="mt-1 text-xs text-[#8993a8]">
            Preencha Público (8Ps), Posicionamento (8Ps), Proposta de valor e Diferenciais (Visão do Negócio) para gerar o resumo.
          </p>
        )}
      </div>

      <div className={`${dashboardTokens.panel} ${dashboardTokens.radius} p-4 space-y-2`}>
        <p className="text-xs font-bold text-[#f6f7fb]">O que a empresa é / não é</p>
        <p className="text-[11px] text-[#bcc4d4]"><strong>É:</strong> {eightPs.positioning.text || "Não informado"}</p>
        <p className="text-[11px] text-[#bcc4d4]"><strong>Diferencial (prova):</strong> {dna.differentiators.value || "Não informado"}</p>
        <p className="text-[11px] text-[#bcc4d4]"><strong>Público:</strong> {dna.audiences.value || eightPs.audience.text || "Não informado"}</p>
      </div>
    </div>
  );
}
