(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fixtures = require("../fixtures.ts") as typeof import("../fixtures");
let passed = 0, failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };
const metrics = fixtures.COMMAND_CENTER_METRICS;
assert(metrics.length >= 8, "dashboard tem indicadores executivos");
for (const metric of metrics) {
  assert(Boolean(metric.source), `${metric.id} possui fonte`);
  assert(Boolean(metric.period), `${metric.id} possui período`);
  assert(Boolean(metric.destination), `${metric.id} possui destino`);
  assert(metric.trace.metricId === metric.id, `${metric.id} possui trace correspondente`);
  assert(metric.trace.dataSources.length > 0, `${metric.id} trace possui fontes`);
  assert(metric.trace.inputs.every((input) => Boolean(input.source)), `${metric.id} não possui input sem origem`);
}
assert(!fixtures.OLACLICK_CAPABILITIES.some((item) => item.lastTest && item.state === "available"), "integração sem prova runtime não inventa teste");
assert(fixtures.PRODUCT_CATALOG_FIXTURES.some((item) => item.technicalSheet.completeness === "complete"), "produto com ficha completa");
assert(fixtures.PRODUCT_CATALOG_FIXTURES.some((item) => item.technicalSheet.completeness === "incomplete"), "produto com ficha incompleta");
assert(fixtures.PRODUCT_CATALOG_FIXTURES.some((item) => item.technicalSheet.completeness === "missing_sheet"), "produto sem ficha");
assert(fixtures.PRODUCT_CATALOG_FIXTURES.some((item) => item.externalMapping.state === "suggested"), "vínculo sugerido sem aplicação automática");
assert(fixtures.PRODUCT_CATALOG_FIXTURES.some((item) => item.name.toLowerCase().includes("smash")), "catálogo pesquisável contém Smash");
assert(fixtures.PRODUCT_CATALOG_FIXTURES.some((item) => item.alerts.length > 0), "filtro de atenção possui resultados");
assert(new Set(metrics.map((metric) => metric.id)).size === metrics.length, "metricIds são únicos");
console.log(`[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
