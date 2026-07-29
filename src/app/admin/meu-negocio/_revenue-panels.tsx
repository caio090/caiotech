"use client";

import { useMemo, useState } from "react";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { calculateRevenueSummary, comparePeriods } from "@/lib/revenue/calculations";
import { REVENUE_CALCULATED_AT_FIXTURE, REVENUE_PREVIOUS_RAW_INPUTS_FIXTURE, REVENUE_RAW_INPUTS_FIXTURE, REVENUE_SOURCE_LABEL_FIXTURE } from "@/lib/revenue/fixtures";
import type { PeriodComparison } from "@/lib/revenue/types";
import type { BusinessMetricValue } from "@/lib/data-quality/types";
import { formatPercent } from "@/lib/motor-lokat/money";
import { toComparisonMetricPeriod, toMetricPeriod } from "@/lib/business-period/calculations";
import type { BusinessPeriodSelection } from "@/lib/business-period/types";
import { DataClassificationBadge, DataClassificationDetails } from "./_data-classification-badge";
import { dashboardTokens } from "./_dashboard-design-tokens";

/**
 * Fase 11/19: os valores em si são uma fixture estática (REVENUE_RAW_INPUTS_FIXTURE)
 * -- selecionar um período diferente atualiza o RÓTULO e a COMPARAÇÃO de verdade
 * (via toMetricPeriod/toComparisonMetricPeriod), mas os números simulados não
 * recalculam por período nesta sprint. Isso é mostrado explicitamente, nunca
 * escondido, para não fingir uma reação que não existe.
 */
function useRevenueSummary(period: BusinessPeriodSelection) {
  return useMemo(() => {
    const metricPeriod = toMetricPeriod(period);
    const comparisonPeriod = toComparisonMetricPeriod(period);
    const summary = calculateRevenueSummary(REVENUE_RAW_INPUTS_FIXTURE, metricPeriod, "SIMULATED", REVENUE_CALCULATED_AT_FIXTURE, REVENUE_SOURCE_LABEL_FIXTURE);
    const previousSummary = calculateRevenueSummary(REVENUE_PREVIOUS_RAW_INPUTS_FIXTURE, comparisonPeriod, "SIMULATED", REVENUE_CALCULATED_AT_FIXTURE, REVENUE_SOURCE_LABEL_FIXTURE);
    const comparison = comparePeriods(summary.realizedRevenue.value, previousSummary.realizedRevenue.value, comparisonPeriod);
    return { summary, comparison };
  }, [period]);
}

function ComparisonLine({ comparison }: { comparison: PeriodComparison }) {
  if (!comparison.comparable || comparison.percentageDifference === null) {
    return <p className="mt-1 text-[10px] font-bold text-slate-500">Não comparável com {comparison.previousPeriod.label}</p>;
  }
  const Icon = comparison.direction === "up" ? TrendingUp : comparison.direction === "down" ? TrendingDown : ArrowRight;
  const tone = comparison.direction === "up" ? "text-emerald-500" : comparison.direction === "down" ? "text-rose-500" : "text-slate-400";
  return (
    <p className={`mt-1 inline-flex items-center gap-1 text-[10px] font-bold ${tone}`}>
      <Icon className="h-3 w-3" />{formatPercent(Math.abs(comparison.percentageDifference))} vs. {comparison.previousPeriod.label}
    </p>
  );
}

/** Primeiro KPI da Visão geral (Fase 8) -- nunca escondido dentro do grid de indicadores secundários. */
export function RevenueHeroCard({ managerMode, onNavigate, period }: { managerMode: boolean; onNavigate: (section: "finance", detail?: string) => void; period: BusinessPeriodSelection }) {
  const { summary, comparison } = useRevenueSummary(period);
  const [showFormula, setShowFormula] = useState(false);
  return (
    <section data-testid="revenue-hero-card" aria-labelledby="revenue-hero-title" className={`${dashboardTokens.elevated} ${dashboardTokens.radius} ${dashboardTokens.cardPadding}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p id="revenue-hero-title" className="text-[11px] font-black uppercase text-[#bcc4d4]">Faturamento realizado</p>
            <DataClassificationBadge classification={summary.realizedRevenue.dataClassification} testId="revenue-hero-badge" />
          </div>
          <p className="mt-1 text-3xl font-black text-[#f6f7fb]">{summary.realizedRevenue.formattedValue}</p>
          <ComparisonLine comparison={comparison} />
          <p className="mt-1 text-[10px] text-[#8993a8]">{summary.period.label} · {summary.validOrders.formattedValue} pedidos válidos · ticket médio {summary.averageTicket.formattedValue}</p>
          {summary.realizedRevenue.dataClassification === "SIMULATED" && <p className="mt-0.5 text-[9px] text-amber-300/80">Valor demonstrativo de referência; não recalcula para o período selecionado.</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <button onClick={() => onNavigate("finance", "Faturamento")} className={`${dashboardTokens.focus} inline-flex items-center gap-1 text-xs font-bold text-violet-300 hover:text-violet-200`}>Abrir Faturamento<ArrowRight className="h-3.5 w-3.5" /></button>
          <button onClick={() => setShowFormula((current) => !current)} className={`${dashboardTokens.focus} text-[10px] font-bold text-violet-300 hover:text-violet-200`}>Como calculamos</button>
        </div>
      </div>
      {showFormula && (
        <div className="mt-3 border-t border-[#272d3a] pt-3 text-[11px] text-[#8993a8]">
          <p className="rounded bg-[#171b26] p-3 font-mono text-[11px]">{summary.realizedRevenue.formulaTrace.expression}</p>
          {summary.realizedRevenue.formulaTrace.isPartial && <p className="mt-1 text-amber-300">Fórmula parcial: um ou mais componentes não estão disponíveis.</p>}
          {summary.realizedRevenue.dataClassification === "SIMULATED" && <p className="mt-1 text-amber-300">Estes valores de exemplo não recalculam por período nesta sprint; apenas o rótulo e a comparação refletem o período selecionado.</p>}
          {managerMode && <DataClassificationDetails metric={summary.realizedRevenue} />}
        </div>
      )}
    </section>
  );
}

function BreakdownRow({ metric }: { metric: BusinessMetricValue }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#272d3a] py-2.5 text-xs last:border-0">
      <span className="text-[#8993a8]">{metric.label}</span>
      <span className="flex items-center gap-2 font-bold text-[#f6f7fb]">{metric.formattedValue}<DataClassificationBadge classification={metric.dataClassification} /></span>
    </div>
  );
}

/** Subárea Financeiro / Faturamento (Fase 9). */
export function RevenueFullPanel({ managerMode, period }: { managerMode: boolean; period: BusinessPeriodSelection }) {
  const { summary, comparison } = useRevenueSummary(period);
  return (
    <div className="space-y-4" data-testid="revenue-full-panel">
      <section className={`${dashboardTokens.panel} ${dashboardTokens.radius} ${dashboardTokens.cardPadding}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-[#f6f7fb]">Faturamento realizado</h3>
            <p className="text-[11px] text-[#8993a8]">{summary.period.label}</p>
          </div>
          <DataClassificationBadge classification={summary.realizedRevenue.dataClassification} testId="revenue-panel-badge" />
        </div>
        <p className="mt-2 text-3xl font-black text-[#f6f7fb]">{summary.realizedRevenue.formattedValue}</p>
        <ComparisonLine comparison={comparison} />
        {summary.realizedRevenue.dataClassification === "SIMULATED" && <p className="mt-2 text-[10px] text-amber-600">Estes valores de exemplo não recalculam por período nesta sprint; apenas o rótulo e a comparação refletem o período selecionado.</p>}
        {managerMode && <DataClassificationDetails metric={summary.realizedRevenue} />}
      </section>

      <section className={`${dashboardTokens.panel} ${dashboardTokens.radius} ${dashboardTokens.cardPadding}`}>
        <h3 className="text-sm font-extrabold text-[#f6f7fb]">Composição</h3>
        <div className="mt-2">
          <BreakdownRow metric={summary.grossSales} />
          <BreakdownRow metric={summary.discounts} />
          <BreakdownRow metric={summary.cancellations} />
          <BreakdownRow metric={summary.fees} />
          <BreakdownRow metric={summary.revenueAfterFees} />
          <BreakdownRow metric={summary.averageTicket} />
          <BreakdownRow metric={summary.validOrders} />
        </div>
        <p className="mt-3 text-[10px] text-[#8993a8]">Receita operacional após taxas não é lucro: despesas operacionais, folha e custos fixos ainda não foram descontados.</p>
      </section>

      <section className={`${dashboardTokens.panel} ${dashboardTokens.radius} ${dashboardTokens.cardPadding}`}>
        <h3 className="text-sm font-extrabold text-[#f6f7fb]">Detalhamento indisponível nesta sprint</h3>
        <p className="mt-1 text-[11px] text-[#8993a8]">Por canal, por forma de pagamento, por dia e por hora operacional dependem de uma fonte real de itens (OlaClick com runtime comprovado ou relatório importado). Conecte uma fonte ou importe um relatório para habilitar.</p>
      </section>
    </div>
  );
}
