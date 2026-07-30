(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const c = require("../classification.ts") as typeof import("../classification");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const t = require("../types.ts") as typeof import("../types");
let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("\n[test] taxonomia -- rótulos em pt-BR para todos os 7 tipos mínimos");
{
  const expected: Record<string, string> = {
    REAL_SYNCED: "Real sincronizado",
    REAL_IMPORTED: "Real importado",
    REAL_MANUAL: "Real informado",
    CALCULATED: "Calculado",
    ESTIMATED: "Estimado",
    SIMULATED: "Simulado",
    UNAVAILABLE: "Indisponível",
  };
  assert(Object.keys(t.DATA_CLASSIFICATION_LABEL).length === 7, "exatamente os 7 tipos mínimos exigidos, sem mais nem menos");
  for (const [key, label] of Object.entries(expected)) {
    assert(t.DATA_CLASSIFICATION_LABEL[key as keyof typeof t.DATA_CLASSIFICATION_LABEL] === label, `${key} -> "${label}"`);
  }
}

console.log("\n[test] isRealClassification -- só os 3 tipos REAL_* contam como reais");
{
  assert(t.isRealClassification("REAL_SYNCED") && t.isRealClassification("REAL_IMPORTED") && t.isRealClassification("REAL_MANUAL"), "REAL_SYNCED/IMPORTED/MANUAL são reais");
  assert(!t.isRealClassification("CALCULATED") && !t.isRealClassification("ESTIMATED") && !t.isRealClassification("SIMULATED") && !t.isRealClassification("UNAVAILABLE"), "CALCULATED/ESTIMATED/SIMULATED/UNAVAILABLE não são reais");
}

console.log("\n[test] deriveDerivedClassification -- nunca deixa uma métrica derivada parecer mais confiável que sua pior entrada (Fase 11)");
{
  assert(c.deriveDerivedClassification([]) === "UNAVAILABLE", "sem entradas -> indisponível");
  assert(c.deriveDerivedClassification(["UNAVAILABLE", "UNAVAILABLE"]) === "UNAVAILABLE", "todas indisponíveis -> indisponível");
  assert(c.deriveDerivedClassification(["REAL_SYNCED", "REAL_IMPORTED"]) === "CALCULATED", "fórmula só com entradas reais -> calculado (não \"real\")");
  assert(c.deriveDerivedClassification(["REAL_SYNCED", "SIMULATED"]) === "ESTIMATED", "faturamento real + mix simulado -> estimado (exemplo exato da Fase 11)");
  assert(c.deriveDerivedClassification(["SIMULATED", "SIMULATED"]) === "SIMULATED", "tudo simulado -> simulado, nunca \"estimado\" para parecer mais sério");
  assert(c.deriveDerivedClassification(["ESTIMATED", "REAL_MANUAL"]) === "ESTIMATED", "estimativa + real -> continua estimado");
  assert(c.deriveDerivedClassification(["UNAVAILABLE", "REAL_SYNCED"]) === "CALCULATED", "indisponível é ignorado quando há uma entrada real utilizável (não contamina para baixo)");
  assert(c.deriveDerivedClassification(["UNAVAILABLE", "SIMULATED"]) === "SIMULATED", "indisponível ignorado, resultado depende apenas da entrada simulada restante");
}

console.log("\n[test] buildMetric -- preenche defaults sem quebrar campos obrigatórios");
{
  const metric = c.buildMetric({
    metricId: "test_metric",
    label: "Métrica de teste",
    value: 100,
    formattedValue: "R$ 1,00",
    unit: "BRL",
    period: { start: "2026-07-01", end: "2026-07-31", label: "Julho de 2026" },
    dataClassification: "SIMULATED",
    calculatedAt: "2026-07-31T00:00:00.000Z",
    formulaTrace: { expression: "valor fixo", isPartial: false, inputs: [] },
  });
  assert(metric.sourceIds.length === 0 && metric.sourceLabels.length === 0, "sourceIds/sourceLabels vazios por padrão, nunca undefined");
  assert(metric.coveragePercentage === null, "coveragePercentage null por padrão (distinto de 0%)");
  assert(metric.confidenceLevel === "medium", "confidenceLevel default é medium");
  assert(metric.includedRecords === null && metric.excludedRecords === null, "includedRecords/excludedRecords null por padrão");
  assert(metric.limitations.length === 0, "limitations vazio por padrão, nunca undefined");
  assert(metric.reconciliationStatus === "not_applicable", "reconciliationStatus default é not_applicable (sem múltiplas fontes)");
}

console.log(`[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
