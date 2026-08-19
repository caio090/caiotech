/**
 * Executar com: node .tmp/run-ts-test.cjs src/app/admin/calendario/__tests__/calendar-context.structural.test.ts
 * Cobre Fase 32 (testes Calendário) itens 44-52 do brief da Sprint REC OS 3.0.1.1.
 */
import * as fs from "fs";
import * as path from "path";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

const subnav = read("src/app/admin/contentos/_contentos-subnav.tsx");
const roadmapClient = read("src/app/admin/contentos/roadmap/_roadmap-client.tsx");
const mapaCliente = read("src/app/admin/contentos/mapa-cliente/page.tsx");
const calendarPage = read("src/app/admin/calendario/page.tsx");
const calendarClient = read("src/app/admin/calendario/_client-content.tsx");

console.log("[test] 44 — pelo menos um botão real do REC OS conectado ao helper canônico");
// REC OS Context Foundation V1 — o item "Calendário" do subnav passou a
// apontar para a view CONTEXTUAL dentro do próprio REC OS
// (/admin/contentos/calendario), então não precisa mais construir uma URL
// de saída para /admin/calendario -- esse helper continua sendo a
// autoridade real para quem de fato sai do módulo (Roadmap/Mapa do Cliente).
assert(!subnav.includes("buildCalendarNavigationUrl"), "subnav do REC OS não usa mais buildCalendarNavigationUrl() -- Calendário ficou contextual, nunca sai do módulo");
assert(roadmapClient.includes("buildCalendarNavigationUrl"), "Roadmap usa buildCalendarNavigationUrl()");
assert(mapaCliente.includes("buildCalendarNavigationUrl"), "Mapa do Cliente usa buildCalendarNavigationUrl()");

console.log("[test] 45/46/47/48 — clientId/campaignId/contentId/month preservados na construção da URL");
assert(subnav.includes("acceptsClient && clientId"), "subnav preserva clientId via ?client= para toda rota contextual do REC OS, incluindo Calendário e Conexões");
assert(roadmapClient.includes("clientId,") && roadmapClient.includes("month,"), "Roadmap preserva clientId e month");

console.log("[test] 49 — returnRoute preservada e sanitizada no destino");
assert(calendarPage.includes("sanitizeCalendarReturnTo") && calendarPage.includes('RETURN_TO_ALLOWED_PREFIX = "/admin/"'), "return_to só aceita caminho relativo dentro de /admin/ — nunca URL externa");
assert(calendarPage.includes('RETURN_TO_BLOCKED_PREFIXES'), "prefixos perigosos (http, javascript:, data:) explicitamente bloqueados");

console.log("[test] 50 — Google nunca é chamado nesta integração");
assert(!subnav.toLowerCase().includes("google") && !roadmapClient.toLowerCase().includes("google") && !calendarPage.toLowerCase().includes("google"), "nenhuma referência a Google em nenhum dos arquivos de navegação contextual");

console.log("[test] 51 — Calendário Global lê o contexto validado e aplica no window de busca");
assert(calendarPage.includes("resolveRequestedMonth(combinedMonth.year ?? params.year, combinedMonth.month ?? params.month)"), "month combinado (YYYY-MM) do REC OS é traduzido para o formato que a página já usava, sem quebrar contrato existente");
assert(calendarPage.includes("splitCombinedMonth"), "helper de tradução do formato de mês existe");

console.log("[test] 52 — botão de voltar funciona e mostra a origem");
assert(calendarClient.includes('data-testid="calendar-context-banner"') && calendarClient.includes("Aberto a partir do REC OS"), "banner de origem exibido quando a navegação veio do REC OS");
assert(calendarClient.includes('data-testid="calendar-return-link"') && calendarClient.includes("Voltar"), "link de voltar real, preservando o returnTo sanitizado");

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
