(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const events = require("../registry.ts") as typeof import("../registry");
let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("\n[test 13] Evento válido");
{
  const registry = new events.DomainEventRegistry();
  let received = 0;
  registry.subscribe("ProductOpportunityDetected", () => { received += 1; });
  registry.publish({ id: "e1", type: "ProductOpportunityDetected", source: "meu_negocio", payload: {}, occurredAt: "2026-07-30T12:00:00Z" });
  assert(received === 1, "publish() de um tipo conhecido chama o handler inscrito");
  assert(registry.history().length === 1, "history() registra o evento publicado");
}

console.log("\n[test 14] Evento desconhecido rejeitado");
{
  const registry = new events.DomainEventRegistry();
  assert(!events.isKnownDomainEventType("EventoInventado"), "isKnownDomainEventType rejeita tipo inventado");
  let threw = false;
  try {
    registry.publish({ id: "e2", type: "EventoInventado" as never, source: "x", payload: {}, occurredAt: "2026-07-30T12:00:00Z" });
  } catch { threw = true; }
  assert(threw, "publish() lança erro para tipo de evento desconhecido, nunca aceita silenciosamente");
  assert(registry.history().length === 0, "evento rejeitado não entra no histórico");
}

console.log("\n[test 35] Domain event registry -- todos os 13 tipos conhecidos");
{
  const expected = [
    "ProductOpportunityDetected", "CommercialCampaignCreated", "CommercialCampaignApproved", "CommercialCampaignSentToRecOS",
    "ContentBriefCreated", "ContentScheduled", "ContentPublished", "CalendarEventCreated", "ReportDataImported",
    "FinancialDifferenceDetected", "InventoryRiskDetected", "ProductCostChanged", "BusinessPainPointCaptured",
  ];
  assert(expected.length === 13, "lista de referência tem os 13 tipos do ticket");
  for (const type of expected) assert(events.isKnownDomainEventType(type), `${type} é reconhecido`);
}

console.log(`\n[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
