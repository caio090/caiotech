"use client";

import { useSyncExternalStore } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { formatCents } from "@/lib/motor-lokat/money";
import type { CashFlowByPeriodPoint } from "@/lib/finance/calculations";
import type { CashFlowProjectionPoint, ExpenseCompositionSlice, TopOutflowEntry, VarianceResult } from "@/lib/finance/types";

/** Respects prefers-reduced-motion by disabling chart entry animation. */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)");
      query.addEventListener("change", onStoreChange);
      return () => query.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
}

const PALETTE = ["#7c3aed", "#4f46e5", "#059669", "#d97706", "#dc2626", "#0891b2", "#9ca3af"];

// ── Common chrome: título, período, fonte, legenda, interpretação, ação, estado vazio (Fase 8) ──

export function ChartCard({
  title, period, source, interpretation, action, children, empty, testId,
}: {
  title: string;
  period: string;
  source: string;
  interpretation?: string;
  action?: string;
  children: React.ReactNode;
  empty?: boolean;
  testId?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4" data-testid={testId}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-[11px] font-bold text-gray-700">{title}</p>
        <span className="text-[9px] text-gray-400 whitespace-nowrap">{period}</span>
      </div>
      <p className="text-[10px] text-gray-400 mb-3">Fonte: {source}</p>

      {empty ? (
        <div role="img" aria-label={`${title} — sem dados suficientes no período`} className="h-40 flex items-center justify-center text-center">
          <p className="text-xs text-gray-400 max-w-[220px]">Ainda não há dados suficientes neste período para montar este gráfico.</p>
        </div>
      ) : (
        <div role="img" aria-label={title}>{children}</div>
      )}

      {interpretation && !empty && <p className="text-[11px] text-gray-600 mt-3 leading-relaxed">{interpretation}</p>}
      {action && !empty && <p className="text-[11px] text-purple-700 mt-1.5 font-semibold">{action}</p>}
    </div>
  );
}

const currencyTick = (v: number) => formatCents(v);
/** Recharts' Tooltip formatter type allows any ValueType (number | string | array | undefined) — always coerce to number before formatting. */
const tooltipCurrency = (value: unknown) => formatCents(Number(value));

// ── Linha: evolução do saldo (Fase 8) ───────────────────────────────────

export function CashBalanceLineChart({ points }: { points: CashFlowByPeriodPoint[] }) {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={points} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="periodLabel" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} />
        <YAxis tickFormatter={currencyTick} tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={70} />
        <Tooltip formatter={tooltipCurrency} labelFormatter={(l) => `Período: ${l}`} contentStyle={{ fontSize: 11, borderRadius: 12, border: "1px solid #e5e7eb" }} />
        <Line type="monotone" dataKey="closingBalance" name="Saldo final" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={!reducedMotion} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Linha projetada: 30/60/90 dias (Fase 8) ─────────────────────────────

export function ProjectionLineChart({ points }: { points: CashFlowProjectionPoint[] }) {
  const reducedMotion = usePrefersReducedMotion();
  const data = points.map((p) => ({ label: `${p.horizonDays} dias`, saldo: p.projectedBalance }));
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} />
        <YAxis tickFormatter={currencyTick} tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={70} />
        <Tooltip formatter={tooltipCurrency} contentStyle={{ fontSize: 11, borderRadius: 12, border: "1px solid #e5e7eb" }} />
        <Line type="monotone" dataKey="saldo" name="Saldo projetado" stroke="#4f46e5" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3 }} isAnimationActive={!reducedMotion} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Barras: planejado versus realizado (Fase 8) ─────────────────────────

export function PlannedVsActualBarChart({ variance, label }: { variance: VarianceResult; label: string }) {
  const reducedMotion = usePrefersReducedMotion();
  const data = [{ label, Planejado: variance.plannedAmount, Realizado: variance.actualAmount }];
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
        <XAxis type="number" tickFormatter={currencyTick} tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={90} />
        <Tooltip formatter={tooltipCurrency} contentStyle={{ fontSize: 11, borderRadius: 12, border: "1px solid #e5e7eb" }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="Planejado" fill="#c4b5fd" radius={[4, 4, 4, 4]} isAnimationActive={!reducedMotion} />
        <Bar dataKey="Realizado" fill="#7c3aed" radius={[4, 4, 4, 4]} isAnimationActive={!reducedMotion} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Rosca: despesas por categoria, "Outros" agrupado (Fase 8) ───────────

export function ExpenseDonutChart({ slices }: { slices: ExpenseCompositionSlice[] }) {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={slices} dataKey="amount" nameKey="label" innerRadius={50} outerRadius={80}
            paddingAngle={2} isAnimationActive={!reducedMotion}
          >
            {slices.map((s, i) => <Cell key={s.category} fill={PALETTE[i % PALETTE.length]} />)}
          </Pie>
          <Tooltip formatter={tooltipCurrency} contentStyle={{ fontSize: 11, borderRadius: 12, border: "1px solid #e5e7eb" }} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2 justify-center">
        {slices.map((s, i) => (
          <li key={s.category} className="flex items-center gap-1.5 text-[10px] text-gray-600">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
            {s.label} ({(s.percentage * 100).toFixed(0)}%)
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Barras horizontais: maiores saídas (Fase 8) ─────────────────────────

export function TopOutflowsBarChart({ outflows }: { outflows: TopOutflowEntry[] }) {
  const reducedMotion = usePrefersReducedMotion();
  const data = outflows.map((o) => ({ label: o.label.length > 22 ? `${o.label.slice(0, 21)}…` : o.label, valor: o.amount }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, outflows.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
        <XAxis type="number" tickFormatter={currencyTick} tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={130} />
        <Tooltip formatter={tooltipCurrency} contentStyle={{ fontSize: 11, borderRadius: 12, border: "1px solid #e5e7eb" }} />
        <Bar dataKey="valor" fill="#dc2626" radius={[0, 4, 4, 0]} isAnimationActive={!reducedMotion} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Progresso: reserva atual versus recomendada (Fase 8) ────────────────

export function ReserveProgressBar({ percent, currentLabel, recommendedLabel }: { percent: number; currentLabel: string; recommendedLabel: string }) {
  const clamped = Math.min(100, Math.max(0, percent * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1.5">
        <span className="text-gray-500">Reserva atual: <strong className="text-gray-800">{currentLabel}</strong></span>
        <span className="text-gray-500">Meta: <strong className="text-gray-800">{recommendedLabel}</strong></span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.round(clamped)} aria-valuemin={0} aria-valuemax={100}>
        <div
          className={clamped >= 100 ? "h-full bg-emerald-500 rounded-full transition-all motion-reduce:transition-none" : "h-full bg-amber-500 rounded-full transition-all motion-reduce:transition-none"}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="text-[10px] text-gray-400 mt-1">{clamped.toFixed(0)}% da meta atingida</p>
    </div>
  );
}
