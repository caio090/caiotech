/**
 * Pure cash flow / reserve / projection math for "Meu Negócio" — Financeiro.
 * No React, no I/O. Every function is deterministic and side-effect free so
 * it can be unit tested directly (see __tests__/calculations.test.ts).
 *
 * Money is always integer cents in, integer cents out. Division always goes
 * through safeDivide — this module must never surface NaN or Infinity.
 */

import type {
  CashFlowEntry,
  CashFlowCategory,
  CashFlowProjection,
  CashFlowProjectionPoint,
  CashReserveConfig,
  CashReserveScenario,
  CashReserveSummary,
  CashRunwayScenario,
  DailyCashPoint,
  ExpenseCompositionSlice,
  TopOutflowEntry,
  VarianceResult,
  WorkingCapitalSummary,
} from "./types";

/**
 * Kept local (not imported from motor-lokat/money) so this module has zero
 * value-level cross-directory imports — the established convention that
 * keeps calculation modules runnable directly via `node` for tests (see
 * src/lib/stock/calculations.ts). Logic is identical to motor-lokat/money.ts.
 */
function safeDivide(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  if (denominator === 0) return null;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : null;
}
function roundFraction(fraction: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(fraction * factor) / factor;
}

const CATEGORY_LABEL: Record<CashFlowCategory, string> = {
  vendas: "Vendas",
  recebiveis_cartao: "Recebíveis de cartão",
  aporte_socio: "Aporte de sócio",
  outras_receitas: "Outras receitas",
  insumos: "Insumos",
  folha_pagamento: "Folha de pagamento",
  aluguel: "Aluguel",
  energia_agua: "Energia e água",
  marketing: "Marketing",
  impostos: "Impostos",
  taxas_maquininha: "Taxas de maquininha",
  manutencao: "Manutenção",
  emprestimo: "Empréstimo",
  investimento: "Investimento",
  outras_despesas: "Outras despesas",
};

export function categoryLabel(category: CashFlowCategory): string {
  return CATEGORY_LABEL[category] ?? category;
}

/** An entry counts as cash-in-hand only once money has actually moved. */
function isRealizedInflow(e: CashFlowEntry): boolean {
  return e.direction === "inflow" && e.status === "received" && e.effectiveDate !== null;
}
function isRealizedOutflow(e: CashFlowEntry): boolean {
  return e.direction === "outflow" && e.status === "paid" && e.effectiveDate !== null;
}
function isActiveEntry(e: CashFlowEntry): boolean {
  return e.status !== "cancelled";
}
function withinPeriod(dateIso: string, startDate: string, endDate: string): boolean {
  return dateIso >= startDate && dateIso <= endDate;
}

// ── Fase 4 — cálculos ────────────────────────────────────────────────────

/** fluxo líquido = entradas efetivas − saídas efetivas (cancelados nunca contam, planejado nunca conta como caixa). */
export function calculateNetCashFlow(entries: CashFlowEntry[], startDate: string, endDate: string): number {
  let inflows = 0;
  let outflows = 0;
  for (const e of entries) {
    if (!isActiveEntry(e) || e.effectiveDate === null || !withinPeriod(e.effectiveDate, startDate, endDate)) continue;
    if (isRealizedInflow(e)) inflows += e.amount;
    if (isRealizedOutflow(e)) outflows += e.amount;
  }
  return inflows - outflows;
}

/** saldo final = saldo inicial + entradas efetivas − saídas efetivas. */
export function calculateClosingCashBalance(openingBalance: number, entries: CashFlowEntry[], startDate: string, endDate: string): number {
  return openingBalance + calculateNetCashFlow(entries, startDate, endDate);
}

/**
 * Planejado vs realizado — a interpretação depende da direção (Fase 5).
 * `hasUnresolvedIssue` marks an outflow that came in "below planned" only
 * because it's overdue/missing, not because it was actually smaller —
 * never paint that favorable.
 */
export function calculatePlannedVsActual(
  plannedAmount: number,
  actualAmount: number,
  direction: "inflow" | "outflow",
  hasUnresolvedIssue = false
): VarianceResult {
  const varianceAmount = actualAmount - plannedAmount;
  const variancePercentage = plannedAmount !== 0 ? roundFraction(safeDivide(varianceAmount, plannedAmount) ?? 0) : null;

  if (plannedAmount === 0 && actualAmount === 0) {
    return {
      plannedAmount, actualAmount, varianceAmount: 0, variancePercentage: null, direction,
      interpretation: "sem_dados", status: "inconclusive",
      explanation: "Não há valor planejado nem realizado para este item neste período.",
    };
  }

  let status: VarianceResult["status"];
  let interpretation: string;
  let explanation: string;

  if (direction === "inflow") {
    if (actualAmount > plannedAmount) {
      status = "favorable"; interpretation = "acima_do_planejado";
      explanation = "A receita realizada ficou acima da planejada — favorável.";
    } else if (actualAmount < plannedAmount) {
      status = "unfavorable"; interpretation = "abaixo_do_planejado";
      explanation = "A receita realizada ficou abaixo da planejada — desfavorável.";
    } else {
      status = "attention"; interpretation = "igual_ao_planejado";
      explanation = "A receita realizada ficou exatamente igual à planejada.";
    }
  } else {
    if (hasUnresolvedIssue) {
      status = "attention"; interpretation = "abaixo_do_planejado_mas_pendente";
      explanation = "A despesa está abaixo do planejado, mas isso pode ser porque ainda não foi paga ou está atrasada — não é necessariamente uma economia real.";
    } else if (actualAmount > plannedAmount) {
      status = "unfavorable"; interpretation = "acima_do_planejado";
      explanation = "A despesa realizada ficou acima da planejada — desfavorável.";
    } else if (actualAmount < plannedAmount) {
      status = "favorable"; interpretation = "abaixo_do_planejado";
      explanation = "A despesa realizada ficou abaixo da planejada, sem pendências — favorável.";
    } else {
      status = "attention"; interpretation = "igual_ao_planejado";
      explanation = "A despesa realizada ficou exatamente igual à planejada.";
    }
  }

  return { plannedAmount, actualAmount, varianceAmount, variancePercentage, direction, interpretation, status, explanation };
}

/** Projeta o saldo em horizontes fixos (30/60/90 dias) a partir do fluxo médio diário observado nas entradas ativas. */
export function calculateCashProjection(
  startingBalance: number,
  entries: CashFlowEntry[],
  fromDateIso: string,
  horizonsDays: number[] = [30, 60, 90]
): CashFlowProjection {
  const from = new Date(`${fromDateIso}T00:00:00Z`);
  const active = entries.filter(isActiveEntry);

  const points: CashFlowProjectionPoint[] = horizonsDays.map((h) => {
    const target = new Date(from);
    target.setUTCDate(target.getUTCDate() + h);
    const targetIso = target.toISOString().slice(0, 10);

    let projected = startingBalance;
    let isEstimated = false;
    for (const e of active) {
      const dateForEntry = e.effectiveDate ?? e.dueDate;
      if (dateForEntry <= targetIso && dateForEntry > fromDateIso) {
        if (e.direction === "inflow") projected += e.amount;
        else projected -= e.amount;
        if (e.effectiveDate === null) isEstimated = true;
      }
    }
    return { date: targetIso, horizonDays: h, projectedBalance: projected, isEstimated };
  });

  let firstNegativeDate: string | null = null;
  for (const p of points) {
    if (p.projectedBalance < 0) { firstNegativeDate = p.date; break; }
  }

  return { startingBalance, points, firstNegativeDate };
}

/** Soma de entradas e saídas efetivamente realizadas dentro do período (para KPIs de topo). */
export function calculateRealizedTotals(entries: CashFlowEntry[], startDate: string, endDate: string): { inflows: number; outflows: number } {
  let inflows = 0;
  let outflows = 0;
  for (const e of entries) {
    if (!isActiveEntry(e) || e.effectiveDate === null || !withinPeriod(e.effectiveDate, startDate, endDate)) continue;
    if (isRealizedInflow(e)) inflows += e.amount;
    if (isRealizedOutflow(e)) outflows += e.amount;
  }
  return { inflows, outflows };
}

/** Contas a receber/pagar ainda não efetivadas (planejadas, pendentes ou atrasadas) — nunca tratadas como caixa disponível. */
export function calculateOpenReceivablesPayables(entries: CashFlowEntry[]): { receivables: number; payables: number } {
  let receivables = 0;
  let payables = 0;
  for (const e of entries) {
    if (!isActiveEntry(e) || (e.status !== "planned" && e.status !== "pending" && e.status !== "overdue")) continue;
    if (e.direction === "inflow") receivables += e.amount;
    else payables += e.amount;
  }
  return { receivables, payables };
}

/** Soma as saídas marcadas isEssential dentro do período, ignorando canceladas. */
export function calculateEssentialMonthlyOutflow(entries: CashFlowEntry[], startDate: string, endDate: string): number {
  let total = 0;
  for (const e of entries) {
    if (!isActiveEntry(e) || !e.isEssential || e.direction !== "outflow") continue;
    const dateForEntry = e.effectiveDate ?? e.dueDate;
    if (withinPeriod(dateForEntry, startDate, endDate)) total += e.amount;
  }
  return total;
}

/** reserva recomendada = gastos essenciais mensais × meses de proteção. */
export function calculateRecommendedCashReserve(essentialMonthlyOutflow: number, desiredCoverageMonths: number): number {
  const safeMonths = Math.max(0, desiredCoverageMonths);
  return Math.round(Math.max(0, essentialMonthlyOutflow) * safeMonths);
}

/** lacuna de reserva = reserva atual − reserva recomendada (negativo = abaixo da meta). */
export function calculateCashReserveGap(currentReserve: number, recommendedReserve: number): number {
  return currentReserve - recommendedReserve;
}

/** cobertura sem vendas = reserva disponível ÷ gastos essenciais mensais. Nunca Infinity/NaN — null quando não há gasto essencial para dividir. */
export function calculateNoSalesCoverageMonths(availableReserve: number, essentialMonthlyOutflow: number): number | null {
  if (essentialMonthlyOutflow <= 0) return null;
  const months = safeDivide(Math.max(0, availableReserve), essentialMonthlyOutflow);
  return months === null ? null : roundFraction(months, 1);
}

const SCENARIO_MULTIPLIER: Record<CashReserveScenario, number> = {
  conservador: 1.3, // queima 30% mais rápido que o observado
  provavel: 1.0,
  otimista: 0.75, // queima 25% mais devagar
};
const SCENARIO_LABEL: Record<CashReserveScenario, string> = {
  conservador: "Conservador", provavel: "Provável", otimista: "Otimista",
};

/** Mesma cobertura sem vendas, sob três cenários de queima de caixa. */
export function calculateCurrentCashRunway(availableReserve: number, essentialMonthlyOutflow: number): CashRunwayScenario[] {
  return (Object.keys(SCENARIO_MULTIPLIER) as CashReserveScenario[]).map((scenario) => {
    const adjustedOutflow = essentialMonthlyOutflow * SCENARIO_MULTIPLIER[scenario];
    return {
      scenario,
      monthlyBurnMultiplier: SCENARIO_MULTIPLIER[scenario],
      coverageMonths: calculateNoSalesCoverageMonths(availableReserve, adjustedOutflow),
      label: SCENARIO_LABEL[scenario],
    };
  });
}

export function buildCashReserveSummary(
  availableBalance: number,
  config: CashReserveConfig,
  essentialMonthlyOutflow: number,
  scenario: CashReserveScenario = "provavel"
): CashReserveSummary {
  const recommendedReserve = calculateRecommendedCashReserve(essentialMonthlyOutflow, config.desiredCoverageMonths);
  const gapToGoal = calculateCashReserveGap(config.currentReserve, recommendedReserve);
  const goalPercent = recommendedReserve > 0 ? roundFraction(safeDivide(config.currentReserve, recommendedReserve) ?? 0) : null;
  const runway = calculateCurrentCashRunway(config.currentReserve, essentialMonthlyOutflow);
  const coverageMonths = runway.find((r) => r.scenario === scenario)?.coverageMonths ?? null;

  let alertLevel: CashReserveSummary["alertLevel"];
  let recommendation: string;
  if (essentialMonthlyOutflow <= 0 || coverageMonths === null) {
    alertLevel = "insuficiente";
    recommendation = "Não há gastos essenciais suficientes cadastrados para calcular a cobertura com segurança.";
  } else if (coverageMonths >= config.desiredCoverageMonths) {
    alertLevel = "ok";
    recommendation = "A reserva atual cobre a meta de proteção definida. Mantenha o acompanhamento mensal.";
  } else if (coverageMonths >= config.desiredCoverageMonths * 0.5) {
    alertLevel = "atencao";
    recommendation = "A reserva está abaixo da meta. Considere reduzir despesas não essenciais ou reforçar a reserva nos próximos meses.";
  } else {
    alertLevel = "critico";
    recommendation = "A reserva está bem abaixo da meta de proteção — priorize reforçar o caixa antes de novos investimentos.";
  }

  return {
    availableBalance,
    currentReserve: config.currentReserve,
    recommendedReserve,
    desiredCoverageMonths: config.desiredCoverageMonths,
    essentialMonthlyOutflow,
    goalPercent,
    gapToGoal,
    coverageMonths,
    scenario,
    alertLevel,
    recommendation,
  };
}

/** Diferença média, em dias, entre vencimento de contas a receber e a pagar (positivo = recebe depois de pagar). */
export function calculateReceivablePayableGap(entries: CashFlowEntry[]): number | null {
  const receivableDays: number[] = [];
  const payableDays: number[] = [];
  for (const e of entries) {
    if (!isActiveEntry(e) || (e.status !== "planned" && e.status !== "pending")) continue;
    const days = Math.floor((new Date(`${e.dueDate}T00:00:00Z`).getTime() - new Date(`${e.competenceDate}T00:00:00Z`).getTime()) / 86_400_000);
    if (e.direction === "inflow") receivableDays.push(days);
    else payableDays.push(days);
  }
  if (receivableDays.length === 0 || payableDays.length === 0) return null;
  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
  return Math.round(avg(receivableDays) - avg(payableDays));
}

/** Composição de despesas por categoria, agrupando categorias pequenas em "Outros" (Fase 8). */
export function calculateExpenseComposition(entries: CashFlowEntry[], startDate: string, endDate: string, maxSlices = 6): ExpenseCompositionSlice[] {
  const totals = new Map<CashFlowCategory, number>();
  let grandTotal = 0;
  for (const e of entries) {
    if (!isActiveEntry(e) || e.direction !== "outflow") continue;
    const dateForEntry = e.effectiveDate ?? e.dueDate;
    if (!withinPeriod(dateForEntry, startDate, endDate)) continue;
    totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
    grandTotal += e.amount;
  }
  if (grandTotal === 0) return [];

  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const head = sorted.slice(0, maxSlices);
  const tail = sorted.slice(maxSlices);
  const tailTotal = tail.reduce((s, [, v]) => s + v, 0);

  const slices: ExpenseCompositionSlice[] = head.map(([category, amount]) => ({
    category, label: categoryLabel(category), amount,
    percentage: roundFraction(safeDivide(amount, grandTotal) ?? 0),
  }));
  if (tailTotal > 0) {
    slices.push({ category: "outros", label: "Outros", amount: tailTotal, percentage: roundFraction(safeDivide(tailTotal, grandTotal) ?? 0) });
  }
  return slices;
}

/** As N maiores saídas do período (barras horizontais — Fase 8). */
export function calculateTopOutflows(entries: CashFlowEntry[], startDate: string, endDate: string, limit = 5): TopOutflowEntry[] {
  return entries
    .filter((e) => isActiveEntry(e) && e.direction === "outflow" && withinPeriod(e.effectiveDate ?? e.dueDate, startDate, endDate))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
    .map((e) => ({ label: e.description, amount: e.amount, category: e.category }));
}

/**
 * Calendário financeiro (Fase 7) — saldo diário projetado somando contas a
 * receber/pagar pendentes/planejadas por data de vencimento, a partir do
 * saldo disponível hoje. Marcado como projeção gerencial, não um cálculo
 * contábil definitivo de capital de giro.
 */
export function calculateWorkingCapitalCalendar(
  startingBalance: number,
  entries: CashFlowEntry[],
  startDateIso: string,
  daysAhead = 60
): WorkingCapitalSummary {
  const dailyPoints: DailyCashPoint[] = [];
  let runningBalance = startingBalance;
  const start = new Date(`${startDateIso}T00:00:00Z`);

  for (let i = 0; i <= daysAhead; i++) {
    const day = new Date(start);
    day.setUTCDate(day.getUTCDate() + i);
    const dayIso = day.toISOString().slice(0, 10);

    let receivables = 0;
    let payables = 0;
    for (const e of entries) {
      if (!isActiveEntry(e) || (e.status !== "planned" && e.status !== "pending" && e.status !== "overdue")) continue;
      if (e.dueDate !== dayIso) continue;
      if (e.direction === "inflow") receivables += e.amount;
      else payables += e.amount;
    }
    runningBalance += receivables - payables;
    dailyPoints.push({ date: dayIso, receivables, payables, projectedBalance: runningBalance });
  }

  const firstNegative = dailyPoints.find((p) => p.projectedBalance < 0);
  const lowestPoint = dailyPoints.reduce((min, p) => (p.projectedBalance < min.projectedBalance ? p : min), dailyPoints[0] ?? { projectedBalance: 0 });
  const minimumBalanceNeeded = lowestPoint && lowestPoint.projectedBalance < 0 ? Math.abs(lowestPoint.projectedBalance) : 0;

  return {
    dailyPoints,
    firstNegativeDate: firstNegative ? firstNegative.date : null,
    minimumBalanceNeeded,
    averageReceivablePayableGapDays: calculateReceivablePayableGap(entries),
  };
}

export interface CashFlowByPeriodPoint {
  periodLabel: string;
  date: string;
  inflows: number;
  outflows: number;
  closingBalance: number;
}

/** Série de saldo por período (para o gráfico de linha — Fase 8), mês a mês entre startDate e endDate. */
export function calculateCashFlowByPeriod(openingBalance: number, entries: CashFlowEntry[], startDate: string, endDate: string): CashFlowByPeriodPoint[] {
  const points: CashFlowByPeriodPoint[] = [];
  let runningBalance = openingBalance;
  const cursor = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  while (cursor <= end) {
    const monthStart = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0));
    const clampedEnd = monthEnd > end ? end : monthEnd;
    const startIso = monthStart.toISOString().slice(0, 10);
    const endIso = clampedEnd.toISOString().slice(0, 10);

    let inflows = 0;
    let outflows = 0;
    for (const e of entries) {
      if (!isActiveEntry(e) || e.effectiveDate === null || !withinPeriod(e.effectiveDate, startIso, endIso)) continue;
      if (isRealizedInflow(e)) inflows += e.amount;
      if (isRealizedOutflow(e)) outflows += e.amount;
    }
    runningBalance += inflows - outflows;
    points.push({
      periodLabel: monthStart.toLocaleDateString("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" }),
      date: startIso, inflows, outflows, closingBalance: runningBalance,
    });

    cursor.setUTCMonth(cursor.getUTCMonth() + 1, 1);
  }
  return points;
}
