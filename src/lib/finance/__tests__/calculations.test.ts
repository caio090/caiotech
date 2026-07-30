/**
 * Real behavioral tests for src/lib/finance/calculations.ts — no jest/vitest
 * in this project (established pattern, see src/lib/stock/__tests__).
 *
 *   node src/lib/finance/__tests__/calculations.test.ts
 */
(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const calc = require("../calculations.ts") as typeof import("../calculations");
const {
  calculateNetCashFlow, calculateClosingCashBalance, calculatePlannedVsActual, calculateCashProjection,
  calculateEssentialMonthlyOutflow, calculateRecommendedCashReserve, calculateCashReserveGap,
  calculateNoSalesCoverageMonths, calculateCurrentCashRunway, calculateExpenseComposition,
  calculateCashFlowByPeriod, calculateWorkingCapitalCalendar, buildCashReserveSummary,
} = calc;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const types = require("../types.ts") as typeof import("../types");
type CashFlowEntry = import("../types").CashFlowEntry;

let passed = 0;
let failed = 0;
function assert(condition: boolean, label: string) {
  if (condition) { passed++; console.log(`  ok   - ${label}`); }
  else { failed++; console.error(`  FAIL - ${label}`); }
}

function entry(partial: Partial<CashFlowEntry> & Pick<CashFlowEntry, "id" | "direction" | "amount" | "status" | "category">): CashFlowEntry {
  return {
    description: partial.description ?? partial.id,
    classification: "variable",
    dataNature: "actual",
    dueDate: "2026-07-10",
    effectiveDate: null,
    competenceDate: "2026-07-10",
    paymentMethod: "pix",
    source: "manual",
    notes: "",
    isEssential: false,
    recurrence: "none",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...partial,
  };
}

console.log("[test] calculateNetCashFlow — fluxo líquido = entradas efetivas − saídas efetivas");
{
  const entries: CashFlowEntry[] = [
    entry({ id: "in-1", direction: "inflow", category: "vendas", amount: 10_000, status: "received", effectiveDate: "2026-07-05" }),
    entry({ id: "out-1", direction: "outflow", category: "insumos", amount: 3_000, status: "paid", effectiveDate: "2026-07-06" }),
  ];
  assert(calculateNetCashFlow(entries, "2026-07-01", "2026-07-31") === 7_000, "10.000 − 3.000 = 7.000");
}

console.log("\n[test] conta planejada nunca é tratada como caixa realizado");
{
  const entries: CashFlowEntry[] = [
    entry({ id: "planned-1", direction: "inflow", category: "vendas", amount: 50_000, status: "planned", effectiveDate: null, dueDate: "2026-07-20" }),
    entry({ id: "pending-1", direction: "inflow", category: "recebiveis_cartao", amount: 20_000, status: "pending", effectiveDate: null, dueDate: "2026-07-20" }),
  ];
  assert(calculateNetCashFlow(entries, "2026-07-01", "2026-07-31") === 0, "receita planejada/pendente sem data efetiva não entra no fluxo líquido");
}

console.log("\n[test] conta cancelada é sempre ignorada");
{
  const entries: CashFlowEntry[] = [
    entry({ id: "cancelled-1", direction: "outflow", category: "manutencao", amount: 40_000, status: "cancelled", effectiveDate: "2026-07-10" }),
  ];
  assert(calculateNetCashFlow(entries, "2026-07-01", "2026-07-31") === 0, "lançamento cancelado, mesmo com data efetiva, não conta em nenhum cálculo");
}

console.log("\n[test] calculateClosingCashBalance — saldo final = saldo inicial + entradas − saídas");
{
  const entries: CashFlowEntry[] = [
    entry({ id: "in-1", direction: "inflow", category: "vendas", amount: 5_000, status: "received", effectiveDate: "2026-07-05" }),
    entry({ id: "out-1", direction: "outflow", category: "aluguel", amount: 2_000, status: "paid", effectiveDate: "2026-07-06" }),
  ];
  assert(calculateClosingCashBalance(10_000, entries, "2026-07-01", "2026-07-31") === 13_000, "10.000 + 5.000 − 2.000 = 13.000");
}

console.log("\n[test] calculatePlannedVsActual — receita: realizado maior é favorável, menor é desfavorável");
{
  const above = calculatePlannedVsActual(10_000, 12_000, "inflow");
  assert(above.status === "favorable", "receita realizada acima do planejado é favorável");
  const below = calculatePlannedVsActual(10_000, 8_000, "inflow");
  assert(below.status === "unfavorable", "receita realizada abaixo do planejado é desfavorável");
}

console.log("\n[test] calculatePlannedVsActual — despesa: realizado maior é desfavorável, menor sem pendência é favorável");
{
  const above = calculatePlannedVsActual(5_000, 6_000, "outflow");
  assert(above.status === "unfavorable", "despesa realizada acima do planejado é desfavorável");
  const below = calculatePlannedVsActual(5_000, 4_000, "outflow");
  assert(below.status === "favorable", "despesa realizada abaixo do planejado, sem pendência, é favorável");
}

console.log("\n[test] despesa abaixo do planejado mas atrasada/omitida nunca é favorável");
{
  const overdue = calculatePlannedVsActual(5_000, 0, "outflow", true);
  assert(overdue.status === "attention", "despesa abaixo do planejado só por estar atrasada/pendente vira atenção, não favorável");
  assert(!overdue.explanation.toLowerCase().includes("favorável"), "explicação não chama de favorável uma despesa não paga");
}

console.log("\n[test] calculatePlannedVsActual — sem planejado nem realizado é inconclusivo");
{
  const empty = calculatePlannedVsActual(0, 0, "inflow");
  assert(empty.status === "inconclusive", "sem dado nenhum, o resultado é inconclusivo, não favorável nem desfavorável");
}

console.log("\n[test] calculateCashProjection — 30/60/90 dias, nunca NaN/Infinity");
{
  const entries: CashFlowEntry[] = [
    entry({ id: "planned-out", direction: "outflow", category: "aluguel", amount: 20_000, status: "planned", dueDate: "2026-08-05", isEssential: true }),
    entry({ id: "planned-in", direction: "inflow", category: "vendas", amount: 30_000, status: "planned", dueDate: "2026-08-20" }),
  ];
  const projection = calculateCashProjection(100_000, entries, "2026-07-27", [30, 60, 90]);
  assert(projection.points.length === 3, "gera exatamente 3 pontos de projeção");
  assert(projection.points.map((p) => p.horizonDays).join(",") === "30,60,90", "horizontes são 30, 60 e 90 dias");
  for (const p of projection.points) {
    assert(Number.isFinite(p.projectedBalance), `ponto de ${p.horizonDays} dias nunca é NaN/Infinity`);
  }
  assert(projection.points[0].projectedBalance === 100_000 + 30_000 - 20_000, "saldo em 30 dias soma entradas e saídas planejadas até a data");
}

console.log("\n[test] calculateEssentialMonthlyOutflow — soma só saídas essenciais ativas");
{
  const entries: CashFlowEntry[] = [
    entry({ id: "rent", direction: "outflow", category: "aluguel", amount: 10_000, status: "paid", effectiveDate: "2026-07-05", isEssential: true }),
    entry({ id: "marketing", direction: "outflow", category: "marketing", amount: 5_000, status: "paid", effectiveDate: "2026-07-05", isEssential: false }),
    entry({ id: "cancelled-rent", direction: "outflow", category: "aluguel", amount: 99_000, status: "cancelled", effectiveDate: "2026-07-05", isEssential: true }),
  ];
  assert(calculateEssentialMonthlyOutflow(entries, "2026-07-01", "2026-07-31") === 10_000, "só a saída essencial e ativa entra na soma");
}

console.log("\n[test] calculateRecommendedCashReserve — reserva recomendada = gastos essenciais × meses");
{
  assert(calculateRecommendedCashReserve(10_000, 3) === 30_000, "10.000 × 3 = 30.000");
  assert(calculateRecommendedCashReserve(10_000, -2) === 0, "meses negativos nunca reduzem abaixo de zero");
}

console.log("\n[test] calculateCashReserveGap — lacuna de reserva");
{
  assert(calculateCashReserveGap(20_000, 30_000) === -10_000, "reserva abaixo da meta gera lacuna negativa");
  assert(calculateCashReserveGap(40_000, 30_000) === 10_000, "reserva acima da meta gera lacuna positiva");
}

console.log("\n[test] calculateNoSalesCoverageMonths — nunca NaN/Infinity, nunca meses negativos");
{
  assert(calculateNoSalesCoverageMonths(30_000, 10_000) === 3, "30.000 ÷ 10.000 = 3 meses");
  assert(calculateNoSalesCoverageMonths(30_000, 0) === null, "gasto essencial zero retorna null, nunca Infinity");
  assert(calculateNoSalesCoverageMonths(-5_000, 10_000) !== null, "reserva negativa nunca produz NaN — é tratada como zero");
  assert((calculateNoSalesCoverageMonths(-5_000, 10_000) ?? -1) >= 0, "cobertura nunca é negativa");
}

console.log("\n[test] calculateCurrentCashRunway — três cenários, sempre coerentes entre si");
{
  const runway = calculateCurrentCashRunway(30_000, 10_000);
  assert(runway.length === 3, "gera os três cenários: conservador, provável, otimista");
  const conservador = runway.find((r) => r.scenario === "conservador")!;
  const otimista = runway.find((r) => r.scenario === "otimista")!;
  assert((conservador.coverageMonths ?? 0) < (otimista.coverageMonths ?? Infinity), "cenário conservador cobre menos meses que o otimista");
}

console.log("\n[test] buildCashReserveSummary — nunca insuficiente vira NaN/Infinity");
{
  const summary = buildCashReserveSummary(50_000, { currentReserve: 20_000, desiredCoverageMonths: 3, essentialCategories: [] }, 0);
  assert(summary.alertLevel === "insuficiente", "sem gastos essenciais, o alerta é insuficiente, não crítico por engano");
  assert(Number.isFinite(summary.recommendedReserve), "reserva recomendada nunca é NaN/Infinity mesmo sem gasto essencial");
}

console.log("\n[test] calculateExpenseComposition — agrupa categorias pequenas em Outros");
{
  const entries: CashFlowEntry[] = [
    entry({ id: "rent", direction: "outflow", category: "aluguel", amount: 50_000, status: "paid", effectiveDate: "2026-07-05" }),
    entry({ id: "payroll", direction: "outflow", category: "folha_pagamento", amount: 40_000, status: "paid", effectiveDate: "2026-07-05" }),
    entry({ id: "supplies", direction: "outflow", category: "insumos", amount: 30_000, status: "paid", effectiveDate: "2026-07-05" }),
    entry({ id: "energy", direction: "outflow", category: "energia_agua", amount: 20_000, status: "paid", effectiveDate: "2026-07-05" }),
    entry({ id: "tax", direction: "outflow", category: "impostos", amount: 10_000, status: "paid", effectiveDate: "2026-07-05" }),
    entry({ id: "fees", direction: "outflow", category: "taxas_maquininha", amount: 5_000, status: "paid", effectiveDate: "2026-07-05" }),
    entry({ id: "maint", direction: "outflow", category: "manutencao", amount: 1_000, status: "paid", effectiveDate: "2026-07-05" }),
    entry({ id: "market", direction: "outflow", category: "marketing", amount: 500, status: "paid", effectiveDate: "2026-07-05" }),
  ];
  const composition = calculateExpenseComposition(entries, "2026-07-01", "2026-07-31", 6);
  assert(composition.length === 7, "6 maiores categorias + 1 fatia Outros");
  assert(composition[composition.length - 1].category === "outros", "última fatia é sempre Outros");
  assert(composition[composition.length - 1].amount === 1_500, "Outros soma as categorias que ficaram de fora (1.000 + 500)");
  const totalPct = composition.reduce((s, c) => s + c.percentage, 0);
  assert(Math.abs(totalPct - 1) < 0.01, "percentuais somam ~100%");
}

console.log("\n[test] calculateCashFlowByPeriod — série mensal, sem NaN/Infinity");
{
  const entries: CashFlowEntry[] = [
    entry({ id: "in-1", direction: "inflow", category: "vendas", amount: 20_000, status: "received", effectiveDate: "2026-07-05" }),
    entry({ id: "out-1", direction: "outflow", category: "aluguel", amount: 5_000, status: "paid", effectiveDate: "2026-07-06" }),
  ];
  const points = calculateCashFlowByPeriod(10_000, entries, "2026-06-01", "2026-08-15");
  assert(points.length === 3, "gera um ponto por mês (junho, julho, agosto)");
  for (const p of points) assert(Number.isFinite(p.closingBalance), `saldo de ${p.periodLabel} nunca é NaN/Infinity`);
  assert(points[1].closingBalance === 10_000 + 20_000 - 5_000, "saldo de julho reflete as movimentações de julho");
  assert(points[0].periodLabel.startsWith("jun") && points[1].periodLabel.startsWith("jul") && points[2].periodLabel.startsWith("ago"), "rótulos de mês são jun/jul/ago, não deslocados por fuso horário (jun./jul./ago. de 26)");
}

console.log("\n[test] calculateWorkingCapitalCalendar — primeiro dia de risco e valor mínimo necessário");
{
  const entries: CashFlowEntry[] = [
    entry({ id: "payable-1", direction: "outflow", category: "aluguel", amount: 15_000, status: "planned", dueDate: "2026-07-05" }),
  ];
  const calendar = calculateWorkingCapitalCalendar(10_000, entries, "2026-07-01", 10);
  assert(calendar.firstNegativeDate === "2026-07-05", "identifica corretamente o primeiro dia com saldo negativo");
  assert(calendar.minimumBalanceNeeded === 5_000, "valor mínimo necessário é o quanto falta para não ficar negativo (15.000 − 10.000)");
}

console.log("\n[test] categoryLabel — usado nos gráficos, nunca vazio");
{
  assert(types !== undefined, "módulo de tipos carrega sem erro (import type-only)");
  assert(calc.categoryLabel("aluguel") === "Aluguel", "rótulo em pt-BR para a categoria aluguel");
}

console.log(`\n[test] finance/calculations — ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
})();
