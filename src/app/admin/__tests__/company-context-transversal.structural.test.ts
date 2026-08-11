/**
 * Executar com: node .tmp/run-ts-test.cjs src/app/admin/__tests__/company-context-transversal.structural.test.ts
 * Sprint MVP Dogfood Final — Company Context Transversal. Cobre a
 * conectividade real entre o seletor global, a shell autenticada, a
 * sidebar, o Início e o Jarvis, sem duplicar o resolver já testado em
 * src/lib/company-context/__tests__/company-context.test.ts.
 */
import * as fs from "fs";
import * as path from "path";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p: string) => fs.existsSync(path.join(root, p));

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("[test] 1 — CompanyContextBar existe e reaproveita o resolver via wrapper HTTP fino");
assert(exists("src/components/company-context-bar.tsx"), "CompanyContextBar existe");
const bar = read("src/components/company-context-bar.tsx");
assert(bar.includes("/api/company-context"), "busca o nome da Company via wrapper existente, nunca inventa um segundo resolver client-side");
assert(bar.includes("COMPANY_CONTEXT_QUERY_KEY"), "usa a chave canônica compartilhada");
assert(bar.includes("selecionar-cliente"), "reutiliza o picker real para trocar de empresa, nunca um segundo picker");

console.log("[test] 2 — API wrapper reaproveita resolveCompanyContext(), nunca duplica lógica");
const apiWrapper = read("src/app/api/company-context/route.ts");
assert(apiWrapper.includes("resolveCompanyContext"), "chama o resolver real existente");
assert(!/isCompanyAuthorizedForAdmin|validateExplicitCompany/.test(apiWrapper), "não reimplementa autorização — delega inteiramente ao resolver");

console.log("[test] 3 — CompanyContextBar está montada na shell global (nunca dentro do REC OS)");
const shell = read("src/app/admin/_layout-client.tsx");
assert(shell.includes("<CompanyContextBar"), "montada na shell administrativa global");
assert(!read("src/app/admin/contentos/page.tsx").includes("CompanyContextBar"), "REC OS não monta uma segunda instância — o seletor é global, REC OS é módulo");

console.log("[test] 4 — sidebar preserva Company nas rotas company-scoped, sem vazar para rotas não-scoped");
const sidebar = read("src/components/app-sidebar.tsx");
assert(sidebar.includes("COMPANY_SCOPED_ROUTES") && sidebar.includes("withCompanyContext"), "usa o helper canônico, nunca concatenação manual de '?client='");
for (const scoped of ["/admin/empresa", "/admin/escritorio", "/admin/projetos", "/admin/calendario", "/admin/contentos"]) {
  assert(new RegExp(`"${scoped.replace(/\//g, "\\/")}"`).test(sidebar), `${scoped} está entre as rotas company-scoped`);
}
console.log("[test] 5 — rotas que não devem ser Company-scoped ficam de fora (Fase 10)");
const scopedSetMatch = sidebar.match(/COMPANY_SCOPED_ROUTES = new Set\(\[([\s\S]*?)\]\)/);
assert(!!scopedSetMatch, "bloco COMPANY_SCOPED_ROUTES encontrado");
const scopedList = scopedSetMatch ? scopedSetMatch[1] : "";
for (const notScoped of ["/admin/inicio", "/admin/clientes", "/admin/equipe", "/admin/financeiro", "/admin/status", "/admin/configuracoes", "/admin/leads"]) {
  assert(!scopedList.includes(`"${notScoped}"`), `${notScoped} corretamente FORA do escopo de Company (não deve receber ?client=)`);
}

console.log("[test] 6 — Jarvis já lia ?client= da URL corrente (confirma que o gap era só navegação, não o painel)");
const jarvisPanel = read("src/components/jarvis/jarvis-panel.tsx");
assert(jarvisPanel.includes("useSearchParams") && jarvisPanel.includes('searchParams.get("client")'), "painel do Jarvis lê o client real da URL, nunca um estado paralelo");

console.log("[test] 7 — Início (Fase 12/13) mostra convite para selecionar empresa ou atalhos company-scoped reais");
const inicio = read("src/app/admin/inicio/page.tsx");
assert(inicio.includes("resolveCompanyContext"), "reaproveita o resolver real, nenhum segundo sistema");
assert(inicio.includes("inicio-select-company-cta") && inicio.includes("inicio-company-entry"), "estados vazio/ativo cobertos com testids estáveis");
assert(!inicio.includes("REC OS") || inicio.includes("Company Central"), "não reduz 'selecionar empresa' a 'entrar no REC OS' — oferece Company Central/Escritório/Projetos");

console.log("[test] 8 — autoridade única de criação de cliente (Fase 2/3 do adendo)");
const picker = read("src/app/contentos/selecionar-cliente/_client-content.tsx");
assert(picker.includes("/admin/clientes"), "estado vazio do picker aponta para a autoridade real de criação");
assert(!picker.includes("useState") || !/name=.*email=.*phone=/.test(picker), "picker não reimplementa um formulário de criação — só linka para o real");

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
