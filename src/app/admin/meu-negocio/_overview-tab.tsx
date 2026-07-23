"use client";

import { AlertTriangle, Info, TrendingDown } from "lucide-react";
import { formatCents } from "@/lib/motor-lokat/money";
import { generateFinancialInsights } from "@/lib/motor-lokat/insight-rules";
import type { FinancialProfile, FinancialSnapshot, FinancialMetric } from "@/lib/motor-lokat/types";
import type { SegmentPreset } from "@/lib/motor-lokat/segment-presets";
import { MetricCard, MoneyInput, PercentInput, NumberInput, GlossaryHelpIcon, SimpleBarChart } from "./_shared";

interface Props {
  profile: FinancialProfile;
  onProfileChange: (p: FinancialProfile) => void;
  snapshot: FinancialSnapshot;
  preset: SegmentPreset;
  onOpenDetail: (m: FinancialMetric) => void;
  onOpenGlossary: (termId: string) => void;
}

export function OverviewTab({ profile, onProfileChange, snapshot, preset, onOpenDetail, onOpenGlossary }: Props) {
  function update<K extends keyof FinancialProfile>(key: K, value: FinancialProfile[K]) {
    onProfileChange({ ...profile, [key]: value });
  }

  const insights = generateFinancialInsights(snapshot);

  const cards: FinancialMetric[] = [
    snapshot.grossSales, snapshot.netRevenue, snapshot.directCostPct, snapshot.variableExpensesPct,
    snapshot.contributionMarginPct, snapshot.fixedExpenses, snapshot.operatingResult, snapshot.averageTicket,
    snapshot.breakEvenRevenue, snapshot.workingCapitalNeeded,
  ];

  const revenueBars = [
    { label: "Receita líquida", value: snapshot.netRevenue.value, colorClass: "bg-purple-500", displayValue: formatCents(snapshot.netRevenue.value) },
    { label: preset.directCostLabel, value: snapshot.directCost.value, colorClass: "bg-red-400", displayValue: formatCents(snapshot.directCost.value) },
    { label: preset.variableExpensesLabel, value: snapshot.variableExpenses.value, colorClass: "bg-amber-400", displayValue: formatCents(snapshot.variableExpenses.value) },
    { label: "Despesas fixas", value: snapshot.fixedExpenses.value, colorClass: "bg-blue-400", displayValue: formatCents(snapshot.fixedExpenses.value) },
    { label: "Resultado operacional estimado", value: snapshot.operatingResult.value, colorClass: snapshot.operatingResult.value >= 0 ? "bg-emerald-500" : "bg-red-600", displayValue: formatCents(snapshot.operatingResult.value) },
  ];

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-xs font-bold text-gray-700 mb-3">Valores do período (edite livremente)</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <MoneyInput label="Faturamento bruto" valueCents={profile.grossSales.value} onChange={(v) => update("grossSales", { value: v, source: "manual" })} dataTestId="mn-input-gross-sales" />
          <MoneyInput label="Subsídios de plataforma" valueCents={profile.platformSubsidies.value} onChange={(v) => update("platformSubsidies", { value: v, source: v > 0 ? "manual" : "missing" })} />
          <MoneyInput label="Devoluções / estornos" valueCents={profile.refunds.value} onChange={(v) => update("refunds", { value: v, source: "manual" })} />
          <MoneyInput label="Chargebacks" valueCents={profile.chargebacks.value} onChange={(v) => update("chargebacks", { value: v, source: v > 0 ? "manual" : "missing" })} />
          <MoneyInput label={preset.directCostLabel} valueCents={profile.directCost.value} onChange={(v) => update("directCost", { value: v, source: "manual" })} dataTestId="mn-input-direct-cost" />
          <MoneyInput label={preset.variableExpensesLabel} valueCents={profile.variableExpenses.value} onChange={(v) => update("variableExpenses", { value: v, source: "manual" })} />
          <MoneyInput label="Despesas fixas" valueCents={profile.fixedExpenses.value} onChange={(v) => update("fixedExpenses", { value: v, source: "manual" })} />
          <NumberInput label="Quantidade de pedidos/vendas" value={profile.ordersCount.value} onChange={(v) => update("ordersCount", { value: v, source: "manual" })} />
        </div>
      </div>

      {/* Goals */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-xs font-bold text-gray-700 mb-3">Metas configuráveis</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <PercentInput label="Meta: custo para produzir (máx.)" valueFraction={profile.goals.directCostPct} onChange={(v) => update("goals", { ...profile.goals, directCostPct: v })} />
          <PercentInput label="Meta: despesas variáveis (máx.)" valueFraction={profile.goals.variableExpensesPct} onChange={(v) => update("goals", { ...profile.goals, variableExpensesPct: v })} />
          <PercentInput label="Meta: margem de contribuição (mín.)" valueFraction={profile.goals.contributionMarginPct} onChange={(v) => update("goals", { ...profile.goals, contributionMarginPct: v })} />
          <NumberInput label="Meses de reserva desejados" value={profile.goals.cashReserveMonthsGoal} onChange={(v) => update("goals", { ...profile.goals, cashReserveMonthsGoal: v })} />
        </div>
      </div>

      {/* Cards */}
      <div>
        <p className="text-xs font-bold text-gray-700 mb-3">Indicadores</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {cards.map((m) => <MetricCard key={m.id} metric={m} onOpenDetail={onOpenDetail} />)}
        </div>
      </div>

      {/* Composição da receita chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-xs font-bold text-gray-700 mb-3">Composição da receita</p>
        <SimpleBarChart bars={revenueBars} />
      </div>

      {/* Perdas (Fase 20) */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <TrendingDown className="w-3.5 h-3.5 text-red-500" />
          <p className="text-xs font-bold text-gray-700">Perdas comuns em {preset.label.toLowerCase()}</p>
          <GlossaryHelpIcon termId="perdas" onOpen={onOpenGlossary} />
        </div>
        <div className="flex flex-wrap gap-2">
          {preset.lossExamples.map((loss) => (
            <span key={loss} className="text-[11px] font-medium bg-red-50 text-red-700 border border-red-100 rounded-full px-2.5 py-1">{loss}</span>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-2">Controle completo de estoque e perdas é uma próxima capacidade — aqui é só a categorização inicial por segmento.</p>
      </div>

      {/* Insights (Fase 23) */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center gap-1.5 mb-1">
          <Info className="w-3.5 h-3.5 text-indigo-500" />
          <p className="text-xs font-bold text-gray-700">Prévia de interpretação</p>
        </div>
        <p className="text-[10px] text-gray-400 mb-3">Nenhuma IA está conectada nesta versão — os pontos abaixo vêm de regras fixas comparando os números com as metas configuradas.</p>
        {insights.length === 0 ? (
          <p className="text-xs text-gray-400">Nenhum ponto de atenção identificado com os dados e metas atuais.</p>
        ) : (
          <div className="space-y-2.5">
            {insights.map((insight) => (
              <div key={insight.id} className={`rounded-xl border px-3 py-2.5 ${insight.severity === "critico" ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"}`}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${insight.severity === "critico" ? "text-red-600" : "text-amber-600"}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold ${insight.severity === "critico" ? "text-red-800" : "text-amber-800"}`}>{insight.what}</p>
                    <p className={`text-[11px] mt-0.5 ${insight.severity === "critico" ? "text-red-700" : "text-amber-700"}`}>{insight.mainReason}</p>
                    <p className="text-[10px] text-gray-500 mt-1">Sugestão: {insight.suggestion}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Limite: {insight.suggestionLimits}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payload futuro para LLM — Fase 24: preview only, never sent anywhere */}
      <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
        <p className="text-xs font-bold text-gray-600 mb-1">Payload futuro para IA (prévia)</p>
        <p className="text-[10px] text-gray-400 mb-3">Apenas uma prévia visual do formato de dados. Nada é enviado para nenhuma API nesta versão.</p>
        <pre className="text-[10px] text-gray-600 bg-white border border-gray-100 rounded-xl p-3 overflow-x-auto">
{JSON.stringify({
  business_segment: profile.segment,
  period: "período atual (demonstração)",
  gross_sales: snapshot.grossSales.value,
  net_revenue: snapshot.netRevenue.value,
  direct_cost: snapshot.directCost.value,
  variable_expenses: snapshot.variableExpenses.value,
  contribution_margin: snapshot.contributionMargin.value,
  fixed_expenses: snapshot.fixedExpenses.value,
  operating_result: snapshot.operatingResult.value,
  cash_coverage_months: null,
  campaign: {},
  missing_data: [snapshot.grossSales, snapshot.directCost, snapshot.variableExpenses, snapshot.fixedExpenses]
    .flatMap((m) => m.missingInputs),
  confidence: snapshot.operatingResult.confidence,
}, null, 2)}
        </pre>
      </div>

      {/* Próximas capacidades (Fase 4) */}
      <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
        <p className="text-xs font-bold text-gray-600 mb-2">Próximas capacidades</p>
        <div className="flex flex-wrap gap-2">
          {["Controle de estoque", "Importação AiPede", "Importação CSV/Excel", "Preenchimento automático do REC OS", "IA conectada para interpretação"].map((cap) => (
            <span key={cap} className="text-[10px] font-medium bg-white text-gray-500 border border-gray-200 rounded-full px-2.5 py-1">
              {cap} · Planejado
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
