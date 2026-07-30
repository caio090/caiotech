"use client";

import { useState } from "react";
import { ShieldCheck, Info } from "lucide-react";
import { formatCents } from "@/lib/motor-lokat/money";
import { calculateCurrentCashRunway } from "@/lib/finance/calculations";
import { StockGlossaryTerm } from "./_stock-glossary-term";
import { MoneyInput, NumberInput } from "./_shared";
import type { BusinessViewMode, CashReserveConfig, CashReserveScenario, CashReserveSummary } from "@/lib/finance/types";

const ALERT_STYLE: Record<CashReserveSummary["alertLevel"], string> = {
  ok: "bg-emerald-50 text-emerald-700 border-emerald-100",
  atencao: "bg-amber-50 text-amber-700 border-amber-100",
  critico: "bg-red-50 text-red-700 border-red-100",
  insuficiente: "bg-gray-50 text-gray-500 border-gray-200",
};
const ALERT_LABEL: Record<CashReserveSummary["alertLevel"], string> = {
  ok: "Reserva dentro da meta", atencao: "Reserva abaixo da meta", critico: "Reserva crítica", insuficiente: "Dados insuficientes",
};
const SCENARIO_LABEL: Record<CashReserveScenario, string> = { conservador: "Conservador", provavel: "Provável", otimista: "Otimista" };

export function FinanceReservePanel({
  summary, config, onConfigChange, availableBalance, essentialMonthlyOutflow, viewMode, essentialCategoryLabels, excludedCategoryLabels,
}: {
  summary: CashReserveSummary;
  config: CashReserveConfig;
  onConfigChange: (next: CashReserveConfig) => void;
  availableBalance: number;
  essentialMonthlyOutflow: number;
  viewMode: BusinessViewMode;
  essentialCategoryLabels: string[];
  excludedCategoryLabels: string[];
}) {
  const [scenario, setScenario] = useState<CashReserveScenario>("provavel");
  const runway = calculateCurrentCashRunway(config.currentReserve, essentialMonthlyOutflow);
  const isManager = viewMode === "manager";

  return (
    <div className="space-y-5">
      <div className="bg-purple-50 border border-purple-100 rounded-2xl px-4 py-3 flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-purple-800">
          &ldquo;Se nenhuma nova venda acontecer, por quanto tempo a empresa consegue manter suas despesas essenciais?&rdquo;
        </p>
      </div>

      {!isManager && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Cobertura sem vendas</p>
          <p className="text-2xl font-black text-gray-900">
            {summary.coverageMonths !== null ? `Seu caixa cobre aproximadamente ${summary.coverageMonths.toFixed(1)} meses de despesas essenciais.` : "Ainda não há dados suficientes para calcular a cobertura."}
          </p>
          <span className={`inline-block mt-3 text-[10px] font-bold px-2.5 py-1 rounded-full border ${ALERT_STYLE[summary.alertLevel]}`}>
            {ALERT_LABEL[summary.alertLevel]}
          </span>
          <p className="text-xs text-gray-600 mt-3">{summary.recommendation}</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MoneyInput label="Reserva atual" valueCents={config.currentReserve} onChange={(v) => onConfigChange({ ...config, currentReserve: v })} dataTestId="mn-reserve-current" />
        <NumberInput label="Meta em meses" value={config.desiredCoverageMonths} onChange={(v) => onConfigChange({ ...config, desiredCoverageMonths: v })} dataTestId="mn-reserve-goal-months" />
        <div className="bg-gray-50 rounded-xl px-3 py-2.5">
          <p className="text-[11px] text-gray-500">Saldo disponível</p>
          <p className="font-bold text-gray-800 text-sm">{formatCents(availableBalance)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl px-3 py-2.5">
          <p className="text-[11px] text-gray-500">Gastos essenciais mensais</p>
          <p className="font-bold text-gray-800 text-sm">{formatCents(essentialMonthlyOutflow)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Reserva e fôlego financeiro</p>
        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <Stat label="Reserva recomendada" value={formatCents(summary.recommendedReserve)} />
          <Stat label="Percentual da meta atingida" value={summary.goalPercent !== null ? `${(summary.goalPercent * 100).toFixed(0)}%` : "—"} />
          <Stat label="Diferença para a meta" value={formatCents(summary.gapToGoal)} tone={summary.gapToGoal >= 0 ? "good" : "bad"} />
          <Stat label="Cobertura sem novas vendas" value={summary.coverageMonths !== null ? `${summary.coverageMonths.toFixed(1)} meses` : "—"} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Cenários de cobertura</p>
        <div role="tablist" className="flex gap-1.5 mb-3">
          {(Object.keys(SCENARIO_LABEL) as CashReserveScenario[]).map((s) => (
            <button
              key={s} role="tab" aria-selected={scenario === s} onClick={() => setScenario(s)}
              data-testid={`reserve-scenario-${s}`}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-colors ${scenario === s ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-200"}`}
            >
              {SCENARIO_LABEL[s]}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {runway.map((r) => (
            <div key={r.scenario} className={`rounded-xl px-3 py-2.5 text-center ${r.scenario === scenario ? "bg-purple-50 border border-purple-100" : "bg-gray-50"}`}>
              <p className="text-[10px] text-gray-500">{r.label}</p>
              <p className="text-sm font-black text-gray-900">{r.coverageMonths !== null ? `${r.coverageMonths.toFixed(1)}m` : "—"}</p>
            </div>
          ))}
        </div>
      </div>

      {isManager && (
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Modo Gestor — detalhamento</p>
          <p className="text-xs text-gray-600 font-mono bg-white border border-gray-100 rounded-xl px-3 py-2">
            reserva recomendada = gastos essenciais mensais × meses de proteção<br />
            cobertura sem vendas = reserva disponível ÷ gastos essenciais mensais
          </p>
          <p className="text-xs text-gray-600"><strong>Valores usados:</strong> gastos essenciais mensais {formatCents(essentialMonthlyOutflow)}, meta de {config.desiredCoverageMonths} meses, cenário {SCENARIO_LABEL[scenario]}.</p>
          <p className="text-xs text-gray-600"><strong>Itens considerados essenciais:</strong> {essentialCategoryLabels.join(", ") || "nenhum cadastrado"}.</p>
          <p className="text-xs text-gray-600"><strong>Itens excluídos:</strong> {excludedCategoryLabels.join(", ") || "nenhum"}.</p>
          <p className="text-xs text-gray-600"><strong>Período de referência:</strong> mês corrente.</p>
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mt-1">
            <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800"><strong>Limitações:</strong> reserva de caixa, saldo bancário, capital de giro e lucro são conceitos diferentes — este cálculo cobre apenas despesas essenciais, não todas as obrigações do negócio.</p>
          </div>
        </div>
      )}

      <div className="text-[11px] text-gray-500 space-y-1">
        <StockGlossaryTerm termId="reserva-caixa" />
        <StockGlossaryTerm termId="cobertura-caixa" />
        <StockGlossaryTerm termId="queima-caixa" />
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const toneClass = tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-red-600" : "text-gray-800";
  return (
    <div className="bg-gray-50 rounded-xl px-3 py-2.5">
      <p className="text-gray-500">{label}</p>
      <p className={`font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}
