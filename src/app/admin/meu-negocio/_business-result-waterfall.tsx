"use client";

import { ArrowDown } from "lucide-react";
import { dashboardTokens } from "./_dashboard-design-tokens";
import { DataClassificationBadge } from "./_data-classification-badge";

const STEPS = [
  { label: "Vendas realizadas", value: 10000000, positive: true, source: "Cardápio digital simulado" },
  { label: "Descontos", value: -420000, source: "Pedidos simulados" },
  { label: "Custo dos produtos", value: -3700000, source: "Inventário e compras simulados" },
  { label: "Taxas variáveis", value: -680000, source: "Pedidos simulados" },
  { label: "Despesas operacionais", value: -3450000, source: "Financeiro simulado" },
  { label: "Resultado gerencial", value: 1750000, positive: true, source: "Cálculos Lokat" },
];

const money = (value: number) => (Math.abs(value) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function BusinessResultWaterfall({ managerMode }: { managerMode: boolean }) {
  const max = Math.max(...STEPS.map((step) => Math.abs(step.value)));
  return (
    <section className={`${dashboardTokens.panel} ${dashboardTokens.radius} ${dashboardTokens.cardPadding} xl:col-span-7`} aria-labelledby="business-result-title">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id="business-result-title" className="text-sm font-extrabold">Formação do resultado</h3>
          <p className="mt-1 text-xs text-slate-500">Base simulada: Junho de 2026 · valores demonstrativos</p>
        </div>
        <DataClassificationBadge classification="SIMULATED" testId="waterfall-badge" />
      </div>
      <p className="mt-1 text-[10px] text-amber-600">Valor demonstrativo de referência; não recalcula para o período selecionado.</p>
      <div className="mt-5 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {STEPS.map((step, index) => (
          <div key={step.label} className="relative min-w-0">
            <div className="mb-2 flex h-20 items-end rounded-md bg-slate-50 px-2">
              <div className={step.positive ? "w-full rounded-t bg-violet-500" : "w-full rounded-t bg-slate-300"} style={{ height: `${Math.max(16, Math.abs(step.value) / max * 100)}%` }} />
            </div>
            <p className="text-[10px] leading-tight text-slate-500">{step.label}</p>
            <p className={step.value < 0 ? "mt-1 text-xs font-extrabold text-rose-300" : "mt-1 text-xs font-extrabold text-[#f6f7fb]"}>{step.value < 0 ? "− " : ""}{money(step.value)}</p>
            {index < STEPS.length - 1 && <ArrowDown className="absolute -right-2 top-7 hidden h-3 w-3 -rotate-90 text-slate-300 xl:block" />}
          </div>
        ))}
      </div>
      <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] text-slate-500">Resultado gerencial, não substitui a contabilidade.</p>
      {managerMode && <p className="mt-2 text-[11px] text-slate-600">Fórmula: vendas − descontos − custo dos produtos − taxas variáveis − despesas operacionais. Cobertura simulada de 92%; sete registros foram excluídos por dados incompletos.</p>}
    </section>
  );
}
