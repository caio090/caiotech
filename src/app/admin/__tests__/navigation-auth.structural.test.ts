/**
 * Executar com: node .tmp/run-ts-test.cjs src/app/admin/__tests__/navigation-auth.structural.test.ts
 * Cobre Fase 34 (testes de rotas) itens 1-16 do brief da Sprint Navegação
 * e Experiência 3.0.1.2.
 */
import * as fs from "fs";
import * as path from "path";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

const calendarPage = read("src/app/admin/calendario/page.tsx");
const contentosPage = read("src/app/admin/contentos/page.tsx");
const unavailable = read("src/components/admin-contentos-unavailable-state.tsx");
const sidebar = read("src/components/app-sidebar.tsx");
const mobileShellTypes = read("src/lib/mobile-shell/types.ts");
const layoutClient = read("src/app/admin/_layout-client.tsx");
const searchSheet = read("src/components/admin-search-sheet.tsx");
const quickAction = read("src/components/quick-action-menu.tsx");

console.log("[test] estado honesto reaproveitado por Calendário e REC OS nunca menciona detalhe técnico");
const unavailableCopyBlock = unavailable.match(/const COPY[\s\S]*?^};/m)?.[0] ?? "";
assert(!unavailableCopyBlock.toLowerCase().includes("service_role") && !unavailableCopyBlock.includes("SUPABASE"), "textos visíveis (COPY) nunca expõem nome de env/secret — só o comentário de desenvolvedor explica a causa");
assert(unavailable.includes("403") && unavailable.includes("503"), "estados 403 (sem permissão) e 503 (indisponível) diferenciados");

console.log("[test] 1/5 — Calendário: sessão autenticada nunca vai ao login por falha de config/permissão");
assert(calendarPage.includes("if (ctx.status === 401) redirect(\"/login\")"), "Calendário só redireciona ao login em 401 genuíno");
assert(calendarPage.includes("<AdminContentOSUnavailableState"), "403/503 mostram estado honesto, não login");
assert(!/if \(ctx instanceof Response\) redirect\("\/login"\);/.test(calendarPage), "removido o redirect incondicional antigo");

console.log("[test] 2/6 — REC OS: mesmo defeito corrigido no hub principal");
assert(contentosPage.includes("if (ctx.status === 401) redirect(\"/login\")"), "REC OS só redireciona ao login em 401 genuíno");
assert(contentosPage.includes("<AdminContentOSUnavailableState"), "403/503 mostram estado honesto no REC OS também");
assert(!/if \(ctx instanceof Response\) redirect\("\/login"\);/.test(contentosPage), "removido o redirect incondicional antigo do REC OS");

console.log("[test] 7 — não autenticado (401) continua indo ao login em ambas as rotas");
assert(calendarPage.includes('if (ctx.status === 401) redirect("/login");'), "Calendário: 401 genuíno ainda redireciona para /login");
assert(contentosPage.includes('if (ctx.status === 401) redirect("/login");'), "REC OS: 401 genuíno ainda redireciona para /login");

console.log("[test] 3/4 — nenhum link interno usa domínio absoluto ou localhost fixo");
const filesToScan = [calendarPage, contentosPage, sidebar, layoutClient, searchSheet, quickAction, mobileShellTypes];
for (const content of filesToScan) {
  assert(!/https?:\/\/www\.lokat\.com\.br/.test(content), "nenhuma referência a www.lokat.com.br");
  assert(!/127\.0\.0\.1:3100/.test(content), "nenhuma referência hardcoded a 127.0.0.1:3100");
  assert(!/localhost:300\d/.test(content), "nenhuma referência hardcoded a localhost:3000/3100");
}

console.log("[test] 8/9/10/11/12 — client/month/return_to preservados e validados (Fase 4)");
assert(calendarPage.includes("sanitizeCalendarReturnTo") && calendarPage.includes('RETURN_TO_ALLOWED_PREFIX = "/admin/"'), "return_to só aceita /admin/, nunca concede acesso externo");
assert(calendarPage.includes("splitCombinedMonth"), "month preservado (YYYY-MM combinado traduzido)");
assert(calendarPage.includes("params.client")===false || calendarPage.includes("requestedClientId"), "client tratado explicitamente");

console.log("[test] 13 — /admin/contentos/calendario deixou de ser alias: agora é view contextual real (REC OS Context Foundation V1)");
const contentosCalendarioPage = read("src/app/admin/contentos/calendario/page.tsx");
assert(!/redirect\(qs \? `\/admin\/calendario/.test(contentosCalendarioPage), "não redireciona mais incondicionalmente para /admin/calendario");
assert(contentosCalendarioPage.includes("resolveCompanyContext") && contentosCalendarioPage.includes("CompanyContextRequiredState"), "usa a mesma autoridade canônica de Company Context do resto do produto, nunca uma segunda");
assert(contentosCalendarioPage.includes("normalizeContentItems") && contentosCalendarioPage.includes("normalizeOperationalTasks") && contentosCalendarioPage.includes("normalizeApprovals"), "reaproveita as mesmas funções puras de global-calendar.ts, nenhuma normalização duplicada");
assert(contentosCalendarioPage.includes("GlobalCalendarContent"), "reaproveita o mesmo componente de apresentação do Calendário Global, nunca uma segunda UI de calendário");
const crmAlias = read("src/app/admin/crm/page.tsx");
assert(crmAlias.includes("query.append") || crmAlias.includes("query.set"), "alias /admin/crm preserva parâmetros ao redirecionar para /admin/leads");

console.log("[test] 14/15/16/17 — header/sidebar/bottom nav/quick action usam rotas canônicas");
assert(sidebar.includes('href: "/admin/contentos"') && sidebar.includes('href: "/admin/calendario"'), "sidebar usa as rotas canônicas reais");
assert(mobileShellTypes.includes('route: "/admin/contentos"') && mobileShellTypes.includes('route: "/admin/calendario"'), "bottom nav usa as rotas canônicas reais");
assert(quickAction.includes('"/admin/contentos') || quickAction.includes('"/admin/calendario"'), "ação rápida usa rotas canônicas");
assert(searchSheet.includes("configs.admin.nav"), "busca usa o mesmo catálogo real de rotas do sidebar (nunca uma lista paralela)");

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
