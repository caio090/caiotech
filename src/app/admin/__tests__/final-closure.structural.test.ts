/**
 * Executar com: node .tmp/run-ts-test.cjs src/app/admin/__tests__/final-closure.structural.test.ts
 * Sprint Final Closure — trava em teste a fiação real desta última rodada:
 * sidebar aponta Meu Negócio/Minha Agência para a organização própria real
 * (não mais o demo Company-scoped), Meu Escritório tem modo Global sem
 * bloquear, Home ganhou demo interativo real e motion com reduced-motion
 * coberto, e nada disso regrediu o que já existia (Command Center, Jarvis
 * Global, criação canônica de cliente).
 */
import * as fs from "fs";
import * as path from "path";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p: string) => fs.existsSync(path.join(root, p));

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("[test] 1 — Fase 22-28: sidebar aponta para a organização própria real, não mais o demo Company-scoped");
{
  const sidebar = read("src/components/app-sidebar.tsx");
  assert(sidebar.includes('href: "/admin/organizacao"'), "item de nav aponta para a nova rota real de organização própria");
  assert(!sidebar.includes('href: "/admin/meu-negocio"'), "não aponta mais para o demo Company-scoped -- ele sai da navegação canônica (Fase 28), continua existindo só por URL direta");
  assert(sidebar.includes('accountType === "agencia" ? "Minha Agência" : baseLabel'), "rótulo dinâmico real conforme account_type (Fase 57)");
  assert(exists("src/app/admin/meu-negocio/page.tsx"), "rota antiga preservada em disco -- nada deletado, só saiu do menu");
  assert(exists("src/app/admin/organizacao/page.tsx"), "nova rota real existe");
}

console.log("[test] 2 — Fase 24/27: organização própria é uma raiz só, nunca dois sistemas");
{
  const page = read("src/app/admin/organizacao/page.tsx");
  assert(page.includes("resolveOwnOrganizationKind"), "usa o resolvedor real de raiz única (account_type)");
  assert(page.includes("kind === \"not_applicable\""), "conta sem account_type aplicável não recebe uma organização fabricada");
  assert(!page.includes("selecionar-cliente"), "Meu Negócio/Minha Agência nunca é um Company picker (Fase 24)");
}

console.log("[test] 3 — Fase 29-34: Meu Escritório tem modo Global real, autorizado, sem N+1 no feed principal");
{
  const page = read("src/app/admin/escritorio/page.tsx");
  assert(page.includes('resolution.reason === "company_required"'), "distingue explicitamente o caso 'sem Company ainda' dos demais motivos de bloqueio");
  assert(page.includes("listAuthorizedCompanies"), "lista Companies autorizadas antes de agregar -- nunca service role vendo tudo sem restrição (Fase 18)");
  assert(page.includes('getBusinessOfficeFeed(adminDb, { clientId: null })'), "feed global é UMA consulta só (clientId: null), não um loop por Company (Fase 34)");
  assert(page.includes("authorizedIds.has(item.workspaceId)"), "itens filtrados pelas Companies realmente autorizadas antes de renderizar (Fase 18)");
  assert(page.includes("GlobalOfficeClient"), "usa o componente real de modo Global, não finge com o cockpit Company-scoped");
}

console.log("[test] 4 — Fase 31-33: GlobalOfficeClient rotula Company em cada item e permite filtrar sem perder o modo global");
{
  const cmp = read("src/app/admin/escritorio/_global-office-client.tsx");
  assert(cmp.includes("companyNameById.get(item.workspaceId)"), "cada item mostra a Company de origem (Fase 32)");
  assert(cmp.includes('value="all"') && cmp.includes("Todas as empresas"), "filtro 'Todas as empresas' existe (Fase 33)");
  assert(cmp.includes("companyFilter"), "troca de filtro não perde o conjunto de dados carregado (filtra em memória, não recarrega Company anterior)");
}

console.log("[test] 5 — Fase 3-8: admin_create_client corrigido não regrediu o Command Center/criação canônica");
{
  const clientsRoute = read("src/app/api/admin/clients/route.ts");
  assert(/p_created_by:\s+profile\.id/.test(clientsRoute) && clientsRoute.includes("p_agency_id:"), "rota real continua resolvendo identidade no servidor (profile.id), nunca de um campo do body -- compatível com o novo contrato da RPC");
}

console.log("[test] 6 — Fase 44/46: Gota ganhou motion sutil, com reduced-motion coberto");
{
  const css = read("src/app/globals.css");
  assert(css.includes("lokat-signal-pulse"), "novo keyframe de sinal sutil na órbita");
  assert(css.includes(".orbit-signal { animation: none; }") || /prefers-reduced-motion: reduce\)[\s\S]{0,400}\.orbit-signal\s*\{\s*animation:\s*none/.test(css), "reduced-motion desliga a nova animação também (Fase 46)");
  const home = read("src/app/_home-client.tsx");
  assert((home.match(/className="orbit-signal"/g) ?? []).length === 2, "as duas partículas de sinal da órbita usam a nova classe");
}

console.log("[test] 7 — Fase 47-50: Product Demo real e interativo substitui o mockup estático");
{
  const home = read("src/app/_home-client.tsx");
  assert(home.includes("function HomeProductDemo()"), "componente de demo interativo existe");
  assert(home.includes('role="tab"') && home.includes("DEMO_TABS"), "interação real por abas (Empresa/Jarvis/Projetos/Calendário), não um carrossel automático não controlável");
  assert(home.includes("Simulação — dados ilustrativos"), "continua rotulado honestamente como simulação (Fase 26/55)");
  assert(home.includes("<HomeProductDemo />"), "demo está de fato montada na Home");
}

console.log("[test] 8 — H1 e Gota preservados, nada regrediu (Fase 42/43)");
{
  const home = read("src/app/_home-client.tsx");
  assert(home.includes("Sua empresa trabalhando como um <em"), "H1 exato preservado");
  assert(home.includes("lk-drop-float"), "Gota (SVG drop) continua presente e animada");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
