(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const calc = require("../calculations.ts") as typeof import("../calculations");
let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

const PERIOD = { start: "2026-07-01", end: "2026-07-31", label: "Julho de 2026" };
const NOW = "2026-08-01T00:00:00.000Z";

console.log("\n[test] calculateRevenueSummary -- fórmulas completas (Fase 8)");
{
  const summary = calc.calculateRevenueSummary(
    { grossItemsAmountCents: 10_000_00, discountsAmountCents: 500_00, cancelledAmountCents: 300_00, feesAmountCents: 400_00, validOrderCount: 190 },
    PERIOD, "SIMULATED", NOW, ["Exemplo simulado"],
  );
  assert(summary.grossSales.value === 10_000_00, "vendas brutas = soma dos itens antes dos descontos");
  assert(summary.realizedRevenue.value === 10_000_00 - 500_00 - 300_00, "faturamento realizado = vendas brutas - descontos - cancelamentos");
  assert(summary.revenueAfterFees.value === summary.realizedRevenue.value! - 400_00, "receita após taxas = faturamento realizado - taxas");
  assert(summary.averageTicket.value === Math.round(summary.realizedRevenue.value! / 190), "ticket médio = faturamento realizado ÷ pedidos válidos");
  assert(summary.realizedRevenue.formulaTrace.expression === "vendas brutas − descontos − cancelamentos", "fórmula do faturamento realizado é exibida");
  assert(!summary.realizedRevenue.formulaTrace.isPartial, "fórmula completa não é marcada como parcial");
  assert(/^R\$\s*10\.000,00$/.test(summary.grossSales.formattedValue), "formatação em pt-BR (R$, ponto de milhar, vírgula decimal)");
}

console.log("\n[test] calculateRevenueSummary -- nunca assume zero silenciosamente quando um componente falta (Fase 8)");
{
  const summary = calc.calculateRevenueSummary(
    { grossItemsAmountCents: 10_000_00, discountsAmountCents: null, cancelledAmountCents: null, feesAmountCents: null, validOrderCount: 190 },
    PERIOD, "REAL_SYNCED", NOW, ["OlaClick"],
  );
  assert(summary.realizedRevenue.formulaTrace.isPartial, "fórmula do faturamento realizado é marcada como parcial quando descontos/cancelamentos faltam");
  assert(summary.realizedRevenue.limitations.length > 0, "limitação explícita é registrada, não escondida");
  assert(summary.realizedRevenue.value === 10_000_00, "o valor exibido usa 0 apenas como exibição da fórmula parcial, mas a limitação avisa que não é definitivo");
  assert(summary.discounts.dataClassification === "UNAVAILABLE", "componente ausente (descontos) é classificado como indisponível, não herda a classificação do resto");
  assert(summary.discounts.formattedValue === "Indisponível", "componente ausente mostra \"Indisponível\", não R$ 0,00");
}

console.log("\n[test] calculateRevenueSummary -- vendas brutas ausentes bloqueia o faturamento realizado (não finge um valor)");
{
  const summary = calc.calculateRevenueSummary(
    { grossItemsAmountCents: null, discountsAmountCents: 100, cancelledAmountCents: 100, feesAmountCents: 100, validOrderCount: 10 },
    PERIOD, "SIMULATED", NOW, ["Exemplo simulado"],
  );
  assert(summary.realizedRevenue.value === null, "sem vendas brutas, faturamento realizado é null (indisponível), nunca um número inventado");
  assert(summary.realizedRevenue.dataClassification === "UNAVAILABLE", "classificação vira indisponível quando o valor não pôde ser calculado");
}

console.log("\n[test] calculateRevenueSummary -- ticket médio não divide por zero pedidos");
{
  const summary = calc.calculateRevenueSummary(
    { grossItemsAmountCents: 1000, discountsAmountCents: 0, cancelledAmountCents: 0, feesAmountCents: 0, validOrderCount: 0 },
    PERIOD, "SIMULATED", NOW, ["Exemplo simulado"],
  );
  assert(summary.averageTicket.value === null, "0 pedidos válidos -> ticket médio indisponível, não Infinity/NaN");
  assert(summary.averageTicket.limitations.length > 0, "limitação explícita para ticket médio sem pedidos");
}

console.log("\n[test] resolvePreviousPeriod -- mês cheio compara com o mês anterior inteiro (Fase 7)");
{
  const previous = calc.resolvePreviousPeriod({ start: "2026-07-01", end: "2026-07-31", label: "Julho" });
  assert(previous.start === "2026-06-01" && previous.end === "2026-06-30", "julho completo -> junho completo (30 dias), não 31 dias atrás");
}

console.log("\n[test] resolvePreviousPeriod -- período genérico compara com intervalo imediatamente anterior de mesma duração (Fase 7)");
{
  const previous = calc.resolvePreviousPeriod({ start: "2026-07-20", end: "2026-07-26", label: "Últimos 7 dias" });
  assert(previous.start === "2026-07-13" && previous.end === "2026-07-19", "7 dias -> 7 dias imediatamente anteriores, sem sobreposição");
}

console.log("\n[test] resolvePreviousPeriod -- funciona na virada de mês e de ano (madrugada/limites)");
{
  const previous = calc.resolvePreviousPeriod({ start: "2026-01-01", end: "2026-01-07", label: "Primeira semana do ano" });
  assert(previous.start === "2025-12-25" && previous.end === "2025-12-31", "virada de ano tratada corretamente pelo intervalo genérico");
  const previousMonth = calc.resolvePreviousPeriod({ start: "2026-03-01", end: "2026-03-31", label: "Março" });
  assert(previousMonth.start === "2026-02-01" && previousMonth.end === "2026-02-28", "mês cheio de março -> fevereiro (28 dias em 2026, ano não bissexto)");
}

console.log("\n[test] comparePeriods -- nunca divide por zero, nunca inventa uma direção sem dado (Fase 7)");
{
  const previousPeriod = { start: "2026-06-01", end: "2026-06-30", label: "Junho" };
  const normal = calc.comparePeriods(11_000_00, 10_000_00, previousPeriod);
  assert(normal.comparable && normal.percentageDifference !== null && Math.abs(normal.percentageDifference - 0.1) < 1e-9, "10% de aumento calculado corretamente");
  assert(normal.direction === "up", "direção \"up\" quando o valor aumentou");

  const zeroDenominator = calc.comparePeriods(500_00, 0, previousPeriod);
  assert(zeroDenominator.comparable === false && zeroDenominator.percentageDifference === null, "denominador zero -> não comparável, percentual nunca calculado");
  assert(zeroDenominator.direction === "up", "mesmo não comparável em %, a direção (subiu de zero) ainda é informativa");

  const bothMissing = calc.comparePeriods(null, null, previousPeriod);
  assert(bothMissing.comparable === false && bothMissing.direction === "not_comparable", "valores ausentes -> não comparável, sem direção inventada");

  const bothZero = calc.comparePeriods(0, 0, previousPeriod);
  assert(bothZero.direction === "flat" && bothZero.comparable === false, "zero contra zero -> sem variação, mas ainda não comparável em %");
}

console.log("\n[test] nenhuma métrica de faturamento usa a palavra \"lucro\"");
{
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("node:fs") as typeof import("node:fs");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("node:path") as typeof import("node:path");
  const source = fs.readFileSync(path.join(process.cwd(), "src/lib/revenue/calculations.ts"), "utf8");
  assert(!/lucro/i.test(source), "receita operacional após taxas nunca é chamada de lucro (Fase 8)");
}

console.log(`[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
