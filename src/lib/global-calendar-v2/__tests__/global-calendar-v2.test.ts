(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const providers = require("../providers.ts") as typeof import("../providers");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const location = require("../location.ts") as typeof import("../location");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const holidays = require("../holidays.ts") as typeof import("../holidays");
let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("\n[test 28] Localização desconhecida");
{
  const resolved = location.resolveLocationContext({});
  assert(resolved.source === "unknown", "sem nenhum candidato, resolveLocationContext retorna source=unknown");
  assert(resolved.city === undefined, "localização unknown não inventa uma cidade");

  const withManual = location.resolveLocationContext({ manual_city: { city: "Exemplo", state: "CE" } });
  assert(withManual.source === "manual_city" && withManual.city === "Exemplo", "manual_city é usado quando presente");

  const withBoth = location.resolveLocationContext({ manual_city: { city: "Manual", state: "CE" }, business_address: { city: "Cadastrado", state: "SP" } });
  assert(withBoth.source === "business_address", "business_address tem prioridade sobre manual_city");
  assert(location.LOCATION_UX_OPTIONS.includes("Agora não"), "UX inclui a opção de recusar localização");
}

console.log("\n[test 29] Google provider blocked");
{
  const oauth = providers.findCalendarProvider("google_oauth")!;
  assert(oauth.state === "blocked", "google_oauth permanece 'blocked' -- status congelado, não alterado sem autorização formal");
  const ical = providers.findCalendarProvider("google_ical")!;
  assert(ical.state === "planned", "google por URL (iCal) fica 'planned', distinto de OAuth bloqueado");
  assert(providers.CALENDAR_PROVIDERS.every((p) => p.reason.length > 0), "todo provider explica por que está no estado atual");
  const internal = providers.findCalendarProvider("internal")!;
  assert(internal.state === "available", "provider interno (GlobalCalendarEvent real) está disponível");
}

console.log("\n[test] Feriados e datas sazonais nunca são verdade universal sem escopo");
{
  assert(holidays.DEMO_HOLIDAYS.every((h) => h.scope && h.confidence), "todo feriado tem scope e confidence definidos");
  assert(holidays.DEMO_SEASONAL_DATES.every((d) => d.scope && d.confidence), "toda data sazonal tem scope e confidence definidos");
  assert(holidays.findSeasonalOpportunitiesForSegment("food_service").length > 0, "findSeasonalOpportunitiesForSegment encontra oportunidade para food_service");
  assert(holidays.findSeasonalOpportunitiesForSegment("construction_projects").length === 0 || holidays.findSeasonalOpportunitiesForSegment("construction_projects").every((d) => d.scope === "national"), "segmento sem data específica só recebe datas nacionais, nunca uma data de outro segmento");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
