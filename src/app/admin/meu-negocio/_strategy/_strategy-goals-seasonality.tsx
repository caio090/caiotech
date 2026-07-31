"use client";

import type { SalesGoal, SalesGoalMetric } from "@/lib/motor-lokat/business-types";
import type { BusinessSeasonalEvent } from "@/lib/business-strategy";
import { SEASONAL_EVENT_TYPE_LABEL } from "@/lib/business-strategy";
import { dashboardTokens } from "../_dashboard-design-tokens";

const GOAL_METRIC_LABEL: Record<SalesGoalMetric, string> = {
  unidades: "Unidades", faturamento: "Faturamento", clientes_novos: "Clientes novos",
  recompra: "Recompra (%)", margem_contribuicao: "Margem de contribuição", ticket_medio: "Ticket médio",
};

/** Metas e Sazonalidade (Fase 26/27): "Sem dado" em vez de 0%, nunca NaN/Infinity. */
export function StrategyGoalsSeasonalityPanel({
  goals, onGoalsChange, seasonality, onSeasonalityChange,
}: {
  goals: SalesGoal[];
  onGoalsChange: (goals: SalesGoal[]) => void;
  seasonality: BusinessSeasonalEvent[];
  onSeasonalityChange: (events: BusinessSeasonalEvent[]) => void;
}) {
  function updateGoal(id: string, patch: Partial<SalesGoal>) {
    onGoalsChange(goals.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }

  return (
    <div className="space-y-4">
      <div className={`${dashboardTokens.panel} ${dashboardTokens.radius} p-4`}>
        <p className="mb-3 text-xs font-bold text-[#f6f7fb]">Metas</p>
        <div className="space-y-2">
          {goals.map((goal) => {
            const hasRealized = goal.actualValue !== 0;
            const pctReached = goal.goalValue !== 0 && hasRealized ? Math.round((goal.actualValue / goal.goalValue) * 100) : null;
            return (
              <div key={goal.id} className="rounded-md border border-[#272d3a] bg-[#171b26] p-3" data-testid={`strategy-goal-${goal.metric}`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[#f6f7fb]">{goal.label}</p>
                  <span className="text-[10px] text-[#8993a8]">{GOAL_METRIC_LABEL[goal.metric]}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-[#bcc4d4]">
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-semibold text-[#8993a8]">Meta</span>
                    <input
                      type="text" inputMode="numeric" value={goal.goalValue || ""} placeholder="0"
                      onChange={(e) => updateGoal(goal.id, { goalValue: Number.parseInt(e.target.value.replace(/\D/g, ""), 10) || 0 })}
                      className={`${dashboardTokens.focus} w-full rounded border border-[#3a4354] bg-[#11141c] px-2 py-1 text-xs text-[#f6f7fb]`}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-semibold text-[#8993a8]">Realizado</span>
                    <input
                      type="text" inputMode="numeric" value={goal.actualValue || ""} placeholder="0"
                      onChange={(e) => updateGoal(goal.id, { actualValue: Number.parseInt(e.target.value.replace(/\D/g, ""), 10) || 0 })}
                      className={`${dashboardTokens.focus} w-full rounded border border-[#3a4354] bg-[#11141c] px-2 py-1 text-xs text-[#f6f7fb]`}
                    />
                  </label>
                </div>
                <p className="mt-1.5 text-[10px] text-[#8993a8]">
                  Atingido: <strong className="text-[#bcc4d4]">{hasRealized ? (pctReached !== null ? `${pctReached}%` : "—") : "Sem dado"}</strong>
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`${dashboardTokens.panel} ${dashboardTokens.radius} p-4`}>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-bold text-[#f6f7fb]">Sazonalidade</p>
          <button
            type="button"
            onClick={() => onSeasonalityChange([...seasonality, {
              id: `seasonal-${Date.now().toString(36)}`, name: "Novo evento sazonal", type: "company_custom",
              startDate: null, endDate: null, recurrence: "yearly", scope: "company", region: "",
              segment: null, expectedImpact: "unknown", affectedProducts: "", affectedChannels: "",
              preparationLeadTimeDays: null, source: "manual", confidence: "unknown", confirmed: false, notes: "",
            }])}
            className={`${dashboardTokens.focus} rounded-md bg-violet-600 px-2.5 py-1 text-[10px] font-bold text-white`}
          >
            Adicionar evento
          </button>
        </div>
        {seasonality.length === 0 ? (
          <p className="text-[10px] text-[#8993a8]">Nenhuma sazonalidade cadastrada nesta sprint — a pesquisa automática de datas/feriados permanece indisponível.</p>
        ) : (
          <ul className="space-y-1">
            {seasonality.map((s) => (
              <li key={s.id} className="text-[11px] text-[#bcc4d4]">{s.name} · {SEASONAL_EVENT_TYPE_LABEL[s.type]}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
