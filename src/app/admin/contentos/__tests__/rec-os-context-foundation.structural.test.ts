/**
 * Executar com: node .tmp/run-ts-test.cjs src/app/admin/contentos/__tests__/rec-os-context-foundation.structural.test.ts
 * LOKAT OS CENTRAL — REC OS Context Foundation V1. Cobre os itens A-J da
 * missão: Company Context canônico no hub, Calendário e Conexões
 * contextuais (nunca saem do REC OS), Calendário/Central de Integrações
 * globais intactos, nenhuma auth paralela, nenhuma credencial duplicada.
 * QA visual autenticado fica BLOCKED (sem credencial E2E local) -- coberto
 * aqui só o que é verificável por código.
 */
import * as fs from "fs";
import * as path from "path";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p: string) => fs.existsSync(path.join(root, p));

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

const hubPage = read("src/app/admin/contentos/page.tsx");
const calendarPage = read("src/app/admin/contentos/calendario/page.tsx");
const connectionsPage = read("src/app/admin/contentos/conexoes/page.tsx");
const connectionsClient = read("src/app/admin/contentos/conexoes/_client-content.tsx");
const subnav = read("src/app/admin/contentos/_contentos-subnav.tsx");
const globalCalendarPage = read("src/app/admin/calendario/page.tsx");
const globalConexoesPage = read("src/app/admin/conexoes/page.tsx");
const globalCalendarLib = read("src/lib/global-calendar.ts");

console.log("[test] A — REC OS hub sem client: nunca crasha, usa a autoridade canônica de Company Context");
{
  assert(hubPage.includes("listAuthorizedCompanies"), "hub consulta a lista de clientes via listAuthorizedCompanies() -- mesma autoridade do resto do produto, não mais uma query direta em clients");
  assert(!hubPage.includes(".from(\"clients\")"), "hub não consulta a tabela clients diretamente para montar o picker");
}

console.log("[test] B — REC OS Calendário/Conexões com client: mantêm o contexto (resolveCompanyContext canônico, nunca auth paralela)");
{
  for (const [name, content] of [["calendario", calendarPage], ["conexoes", connectionsPage]] as const) {
    assert(content.includes('import { resolveCompanyContext } from "@/lib/company-context/resolve"'), `${name}: usa resolveCompanyContext(), a única autoridade real`);
    assert(content.includes("CompanyContextRequiredState"), `${name}: sem client autorizado, mostra o estado compartilhado (mesmo modal de Empresa/Escritório/Projetos)`);
    assert(!content.includes("createServerClient(") && !content.includes("new SupabaseClient"), `${name}: nenhum cliente Supabase paralelo criado à mão`);
  }
}

console.log("[test] C — Calendário REC OS permanece sob /admin/contentos/calendario, nunca redireciona incondicionalmente para /admin/calendario");
{
  assert(!/^\s*redirect\(/m.test(calendarPage.replace(/if \(resolution\.reason === "not_authenticated"\) redirect\("\/login"\);/, "").replace(/if \(resolution\.reason === "role_not_supported"\) redirect\("\/admin\/dashboard"\);/, "")), "nenhum redirect incondicional restante (só os dois casos legítimos de auth/role)");
  assert(exists("src/app/admin/contentos/calendario/page.tsx"), "rota própria existe em disco (não é mais um alias fino)");
}

console.log("[test] D — Calendário REC OS reutiliza a MESMA fonte/normalização do Calendário Global, nunca duplica");
{
  assert(
    calendarPage.includes("normalizeContentItems") && calendarPage.includes("normalizeOperationalTasks") && calendarPage.includes("normalizeApprovals"),
    "usa as mesmas funções puras de global-calendar.ts (content_items/operational_tasks/approvals), nenhuma reimplementação"
  );
  assert(calendarPage.includes('from "../../calendario/_client-content"'), "reaproveita o mesmo componente de apresentação (GlobalCalendarContent), não uma segunda UI de calendário");
  assert(calendarPage.includes(".eq(\"client_id\", context.companyId)"), "sempre filtra por UMA Company real -- nunca 'todos os clientes' nesta view contextual");
  assert(!exists("src/lib/rec-os-calendar.ts") && !exists("src/lib/contentos-calendar.ts"), "nenhum módulo novo de normalização de calendário foi criado");
}

console.log("[test] E — Conexões REC OS permanece dentro do REC OS (nunca redireciona para /admin/conexoes)");
{
  assert(!/redirect\(.*\/admin\/conexoes/.test(connectionsPage), "página não redireciona para /admin/conexoes");
  assert(connectionsClient.includes('href={`/admin/conexoes?client=${companyId}`}'), "CTA secundário explícito ('Gerenciar integração') aponta para a Central real, preservando o client -- nunca escondido, nunca automático");
}

console.log("[test] F — Conexões REC OS nunca duplica credencial/token/tabela");
{
  assert(!connectionsClient.includes("access_token") && !connectionsClient.includes("client_secret"), "componente cliente nunca referencia token/secret");
  assert(connectionsClient.includes('fetch("/api/meta/hub-assets")'), "reaproveita a MESMA API que /admin/conexoes já usa para status Meta, nunca uma segunda tabela/rota");
  assert(connectionsClient.includes("/api/olaclick/status"), "reaproveita a MESMA API que /admin/conexoes já usa para status OlaClick");
  assert(!connectionsPage.includes("createSupabaseAdminClient") && !connectionsPage.includes("service_role"), "página não usa service role para ler status de conexão -- delega às APIs já existentes");
}

console.log("[test] G — Troca de empresa dentro do REC OS nunca sai do módulo");
{
  assert(subnav.includes('{ href: "/admin/contentos/calendario", label: "Calendário",  acceptsClient: true }'), "Calendário do subnav aponta para a rota contextual, preserva client");
  assert(subnav.includes('{ href: "/admin/contentos/conexoes",   label: "Conexões",    acceptsClient: true }'), "Conexões do subnav aponta para a rota contextual, preserva client");
  assert(!/href:\s*"\/admin\/calendario"/.test(subnav) && !/href:\s*"\/admin\/conexoes"/.test(subnav), "subnav não tem mais nenhum link de escape direto para as rotas globais");
}

console.log("[test] H — client inválido continua fail-closed (mesma autoridade já testada em company-context.test.ts)");
{
  assert(calendarPage.includes("resolveCompanyContext(clientId)"), "calendário contextual passa o client bruto da URL para o resolver -- nunca aceita sem validar");
  assert(connectionsPage.includes("resolveCompanyContext(clientId)"), "conexões contextual idem -- nenhum bypass de autorização");
}

console.log("[test] I — Calendário Global (/admin/calendario) continua intacto -- extensão é opt-in via basePath");
{
  assert(!globalCalendarPage.includes("basePath"), "página do Calendário Global não passa basePath -- usa o default (/admin/calendario), comportamento inalterado");
  assert(globalCalendarLib.includes("basePath ?? \"/admin/calendario\""), "buildGlobalCalendarHref() preserva o default histórico quando basePath não é informado");
}

console.log("[test] J — Central /admin/conexoes continua intacta, nenhuma duplicação de UI/rota");
{
  assert(!globalConexoesPage.includes("/admin/contentos/conexoes"), "a Central real não foi alterada para saber da nova view contextual -- unidirecional, REC OS que espelha a Central, nunca o contrário");
  assert(exists("src/app/admin/conexoes/page.tsx"), "rota real preservada");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
