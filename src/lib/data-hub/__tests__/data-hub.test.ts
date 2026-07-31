(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const dataHub = require("../index.ts") as typeof import("../index");
let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("\n[test 9] DataSource válido");
{
  assert(dataHub.DATA_SOURCES.length > 0, "DATA_SOURCES não está vazio");
  assert(dataHub.DATA_SOURCES.every((source) => source.id && source.label && source.type), "toda DataSource tem id, label e type");
  assert(dataHub.findDataSourceById("meu_negocio_manual") !== undefined, "findDataSourceById encontra uma fonte real");
  assert(dataHub.findDataSourceById("fonte_inexistente") === undefined, "findDataSourceById retorna undefined para id inexistente");
}

console.log("\n[test 10] DataConfidence válido");
{
  const order: Array<[string, string]> = [["confirmed", "estimated"], ["calculated", "incomplete"], ["estimated", "divergent"], ["incomplete", "unknown"]];
  for (const [higher, lower] of order) assert(dataHub.isMoreConfident(higher as never, lower as never), `${higher} é mais confiável que ${lower}`);
  assert(!dataHub.isMoreConfident("unknown" as never, "confirmed" as never), "unknown nunca é mais confiável que confirmed");
  const picked = dataHub.pickMostConfident([{ confidence: "estimated" as const, id: "a" }, { confidence: "confirmed" as const, id: "b" }, { confidence: "unknown" as const, id: "c" }]);
  assert(picked?.id === "b", "pickMostConfident escolhe o candidato confirmed entre estimated/confirmed/unknown");
}

console.log("\n[test 11] Provenance completa");
{
  const provenance = dataHub.buildDataProvenance({ sourceId: "spreadsheet_import", origin: "planilha de exemplo", confidence: "estimated", quality: "partial", now: () => new Date("2026-07-30T12:00:00Z") });
  assert(provenance.sourceId === "spreadsheet_import" && provenance.origin === "planilha de exemplo", "buildDataProvenance preenche sourceId e origin");
  assert(provenance.collectedAt === "2026-07-30T12:00:00.000Z" && provenance.updatedAt === "2026-07-30T12:00:00.000Z", "collectedAt/updatedAt usam o now() injetado quando collectedAt não é passado");
  assert(!("password" in provenance) && !("token" in provenance) && !("payload" in provenance), "DataProvenance nunca tem campo de segredo/payload completo (contrato não expõe esses campos)");
}

console.log("\n[test 12] Data quality partial");
{
  assert(dataHub.resolveAggregateQuality([]) === "valid", "nenhuma issue -> valid");
  assert(dataHub.resolveAggregateQuality([{ field: "x", status: "processing", message: "m" }]) === "partial" || dataHub.resolveAggregateQuality([{ field: "x", status: "processing", message: "m" }]) === "processing", "issue leve resulta em partial ou processing, nunca valid");
  assert(dataHub.resolveAggregateQuality([dataHub.buildMissingFieldIssue("cmv")]) === "missing_fields", "issue de campo ausente resulta em missing_fields");
  assert(dataHub.resolveAggregateQuality([{ field: "x", status: "blocked", message: "m" }, { field: "y", status: "invalid", message: "m" }]) === "blocked", "blocked tem prioridade sobre invalid");
}

console.log("\n[test] capabilities e registry do Data Hub");
{
  assert(dataHub.hasDataCapability("xlsx", "import"), "xlsx suporta import");
  assert(!dataHub.hasDataCapability("pdf", "reconcile"), "pdf não suporta reconcile (nenhum processamento real de PDF nesta sprint)");
  const contracts = dataHub.buildModuleDataContracts();
  assert(contracts.some((c) => c.moduleId === "meu_negocio"), "buildModuleDataContracts inclui meu_negocio, derivado de platform-modules.ts");
  assert(dataHub.findProducersOf("financial_reconciliation").includes("meu_negocio") || dataHub.findProducersOf("financial_reconciliation").includes("financeiro"), "findProducersOf encontra ao menos um produtor real de financial_reconciliation");
}

console.log("\n[test] InMemoryDataHubEventLog");
{
  const log = new dataHub.InMemoryDataHubEventLog();
  log.record({ id: "e1", type: "source_registered", sourceId: "spreadsheet_import", occurredAt: "2026-07-30T12:00:00Z", payload: {} });
  assert(log.all().length === 1, "record() adiciona um evento");
  assert(log.byType("source_registered").length === 1, "byType filtra corretamente");
  assert(log.bySource("spreadsheet_import").length === 1, "bySource filtra corretamente");
  log.clear();
  assert(log.all().length === 0, "clear() esvazia o log");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
