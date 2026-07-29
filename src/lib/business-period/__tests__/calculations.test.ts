(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const calc = require("../calculations.ts") as typeof import("../calculations");
let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

const TZ = "America/Fortaleza"; // UTC-3, no DST
const OP_START = "04:00";

console.log("\n[test] resolveOperationalDate -- madrugada, virada de mês e de ano (Fase 8/21)");
{
  // 18:00 UTC = 15:00 Fortaleza -> depois da virada -> mesmo dia
  assert(calc.resolveOperationalDate(new Date("2026-07-29T18:00:00.000Z"), TZ, OP_START) === "2026-07-29", "15h local (depois da virada) -> dia corrente");
  // 05:00 UTC = 02:00 Fortaleza -> antes da virada -> dia anterior
  assert(calc.resolveOperationalDate(new Date("2026-07-29T05:00:00.000Z"), TZ, OP_START) === "2026-07-28", "02h local (madrugada, antes da virada de 04:00) -> dia anterior");
  // exatamente 04:00 local -> já é o novo dia operacional (início inclusivo)
  assert(calc.resolveOperationalDate(new Date("2026-07-29T07:00:00.000Z"), TZ, OP_START) === "2026-07-29", "exatamente no horário de virada -> já conta como o novo dia (início inclusivo)");
  // 02:00 local em 01/08 -> deve virar 31/07, não 01/08 (troca de mês)
  assert(calc.resolveOperationalDate(new Date("2026-08-01T05:00:00.000Z"), TZ, OP_START) === "2026-07-31", "madrugada do dia 1º de agosto (antes da virada) -> ainda é 31 de julho");
  // 02:00 local em 01/01/2027 -> deve virar 31/12/2026 (troca de ano)
  assert(calc.resolveOperationalDate(new Date("2027-01-01T05:00:00.000Z"), TZ, OP_START) === "2026-12-31", "madrugada do dia 1º de janeiro (antes da virada) -> ainda é 31 de dezembro do ano anterior");
}

console.log("\n[test] presets -- início inclusivo, fim exclusivo (Fase 7/21)");
{
  const now = new Date("2026-07-29T18:00:00.000Z"); // 15:00 Fortaleza, operational today = 2026-07-29
  const today = calc.buildPeriodSelection("TODAY", TZ, OP_START, now);
  assert(today.startDate === "2026-07-29" && today.endDateExclusive === "2026-07-30", "TODAY = [hoje, amanhã)");

  const yesterday = calc.buildPeriodSelection("YESTERDAY", TZ, OP_START, now);
  assert(yesterday.startDate === "2026-07-28" && yesterday.endDateExclusive === "2026-07-29", "YESTERDAY = [ontem, hoje)");

  const last7 = calc.buildPeriodSelection("LAST_7_DAYS", TZ, OP_START, now);
  assert(last7.startDate === "2026-07-23" && last7.endDateExclusive === "2026-07-30", "LAST_7_DAYS inclui hoje e mais 6 dias anteriores (7 dias no total)");

  const last30 = calc.buildPeriodSelection("LAST_30_DAYS", TZ, OP_START, now);
  assert(last30.startDate === "2026-06-30" && last30.endDateExclusive === "2026-07-30", "LAST_30_DAYS = 30 dias terminando hoje");

  const thisMonth = calc.buildPeriodSelection("THIS_MONTH", TZ, OP_START, now);
  assert(thisMonth.startDate === "2026-07-01" && thisMonth.endDateExclusive === "2026-08-01", "THIS_MONTH = mês corrente inteiro");

  const previousMonth = calc.buildPeriodSelection("PREVIOUS_MONTH", TZ, OP_START, now);
  assert(previousMonth.startDate === "2026-06-01" && previousMonth.endDateExclusive === "2026-07-01", "PREVIOUS_MONTH = junho inteiro (mês anterior a julho)");

  const thisQuarter = calc.buildPeriodSelection("THIS_QUARTER", TZ, OP_START, now);
  assert(thisQuarter.startDate === "2026-07-01" && thisQuarter.endDateExclusive === "2026-10-01", "THIS_QUARTER (julho) = 3º trimestre completo (jul-set)");

  const thisYear = calc.buildPeriodSelection("THIS_YEAR", TZ, OP_START, now);
  assert(thisYear.startDate === "2026-01-01" && thisYear.endDateExclusive === "2027-01-01", "THIS_YEAR = ano inteiro");
}

console.log("\n[test] CUSTOM -- validação de intervalo (Fase 10/21)");
{
  const now = new Date("2026-07-29T18:00:00.000Z");
  const custom = calc.buildPeriodSelection("CUSTOM", TZ, OP_START, now, { startDate: "2026-07-10", endDateExclusive: "2026-07-20" });
  assert(custom.startDate === "2026-07-10" && custom.endDateExclusive === "2026-07-20" && custom.isCustom, "CUSTOM aceita intervalo explícito e marca isCustom");

  let threw = false;
  try { calc.buildPeriodSelection("CUSTOM", TZ, OP_START, now, { startDate: "2026-07-20", endDateExclusive: "2026-07-10" }); } catch { threw = true; }
  assert(threw, "início posterior ao fim lança erro, nunca produz um intervalo invertido silenciosamente");

  let threwEmpty = false;
  try { calc.buildPeriodSelection("CUSTOM", TZ, OP_START, now, { startDate: "2026-07-10", endDateExclusive: "2026-07-10" }); } catch { threwEmpty = true; }
  assert(threwEmpty, "intervalo vazio (início == fim) é rejeitado");
}

console.log("\n[test] comparação -- período anterior de mesma duração, mês cheio vs. genérico (Fase 12/21)");
{
  const now = new Date("2026-07-29T18:00:00.000Z");
  const today = calc.buildPeriodSelection("TODAY", TZ, OP_START, now);
  assert(today.comparisonStartDate === "2026-07-28" && today.comparisonEndDateExclusive === "2026-07-29", "TODAY compara com ontem");

  const yesterday = calc.buildPeriodSelection("YESTERDAY", TZ, OP_START, now);
  assert(yesterday.comparisonStartDate === "2026-07-27" && yesterday.comparisonEndDateExclusive === "2026-07-28", "YESTERDAY compara com o dia anterior a ele");

  const last7 = calc.buildPeriodSelection("LAST_7_DAYS", TZ, OP_START, now);
  assert(last7.comparisonStartDate === "2026-07-16" && last7.comparisonEndDateExclusive === "2026-07-23", "LAST_7_DAYS compara com os 7 dias imediatamente anteriores, sem sobreposição");

  const thisMonth = calc.buildPeriodSelection("THIS_MONTH", TZ, OP_START, now);
  assert(thisMonth.comparisonStartDate === "2026-06-01" && thisMonth.comparisonEndDateExclusive === "2026-07-01", "THIS_MONTH (julho, 31 dias) compara com junho INTEIRO (30 dias), não com 31 dias atrás");

  const previousMonth = calc.buildPeriodSelection("PREVIOUS_MONTH", TZ, OP_START, now);
  assert(previousMonth.comparisonStartDate === "2026-05-01" && previousMonth.comparisonEndDateExclusive === "2026-06-01", "PREVIOUS_MONTH (junho) compara com maio (um mês antes do selecionado)");

  const custom = calc.buildPeriodSelection("CUSTOM", TZ, OP_START, now, { startDate: "2026-07-10", endDateExclusive: "2026-07-20" });
  assert(custom.comparisonStartDate === "2026-06-30" && custom.comparisonEndDateExclusive === "2026-07-10", "CUSTOM (10 dias) compara com os 10 dias imediatamente anteriores");
}

console.log("\n[test] virada de ano na composição de presets (Fase 21)");
{
  const now = new Date("2026-01-03T18:00:00.000Z"); // 15:00 Fortaleza, 3 jan 2026
  const previousMonth = calc.buildPeriodSelection("PREVIOUS_MONTH", TZ, OP_START, now);
  assert(previousMonth.startDate === "2025-12-01" && previousMonth.endDateExclusive === "2026-01-01", "PREVIOUS_MONTH em janeiro é dezembro do ano anterior");
  assert(previousMonth.comparisonStartDate === "2025-11-01" && previousMonth.comparisonEndDateExclusive === "2025-12-01", "comparação de PREVIOUS_MONTH atravessando o ano funciona (novembro/2025)");

  const last7 = calc.buildPeriodSelection("LAST_7_DAYS", TZ, OP_START, now);
  assert(last7.startDate === "2025-12-28", "LAST_7_DAYS atravessando a virada do ano calcula corretamente");
}

console.log("\n[test] toMetricPeriod / toComparisonMetricPeriod -- ponte para o modelo inclusivo existente");
{
  const now = new Date("2026-07-29T18:00:00.000Z");
  const thisMonth = calc.buildPeriodSelection("THIS_MONTH", TZ, OP_START, now);
  const metricPeriod = calc.toMetricPeriod(thisMonth);
  assert(metricPeriod.start === "2026-07-01" && metricPeriod.end === "2026-07-31", "período inclusivo para consumo por cálculos existentes (fim = endDateExclusive - 1 dia)");
  const comparisonPeriod = calc.toComparisonMetricPeriod(thisMonth);
  assert(comparisonPeriod.start === "2026-06-01" && comparisonPeriod.end === "2026-06-30", "período de comparação inclusivo também");
}

console.log("\n[test] rótulos dos presets em pt-BR (Fase 7)");
{
  const expected: Record<string, string> = { TODAY: "Hoje", YESTERDAY: "Ontem", LAST_7_DAYS: "Últimos 7 dias", LAST_30_DAYS: "Últimos 30 dias", THIS_MONTH: "Este mês", PREVIOUS_MONTH: "Mês anterior", THIS_QUARTER: "Este trimestre", THIS_YEAR: "Este ano", CUSTOM: "Personalizado" };
  assert(Object.keys(calc.BUSINESS_PERIOD_PRESET_LABEL).length === 9, "exatamente os 9 presets especificados");
  for (const [key, label] of Object.entries(expected)) assert(calc.BUSINESS_PERIOD_PRESET_LABEL[key as keyof typeof calc.BUSINESS_PERIOD_PRESET_LABEL] === label, `${key} -> "${label}"`);
}

console.log(`[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
