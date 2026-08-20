/**
 * Executar com: node .tmp/run-ts-test.cjs src/app/admin/__tests__/meu-negocio-access-restore.structural.test.ts
 * LOKAT OS CENTRAL — Meu Negócio Access Restore. Prova que "Meu Negócio"
 * (módulo operacional: estoque/fichas técnicas/CMV/relatórios, ainda
 * 100% em memória) e "Minha Organização"/"Minha Agência" (institucional,
 * account_type-based) são conceitos distintos -- nunca alias um do outro --
 * corrigindo a sidebar/bottom-nav que apontava "Meu Negócio" para
 * /admin/organizacao por engano.
 */
import * as fs from "fs";
import * as path from "path";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p: string) => fs.existsSync(path.join(root, p));

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("[test] A — sidebar: Meu Negócio -> /admin/meu-negocio");
{
  const sidebar = read("src/components/app-sidebar.tsx");
  assert(sidebar.includes('href: "/admin/meu-negocio",       label: "Meu Negócio"'), "item de nav 'Meu Negócio' aponta para a rota real do módulo operacional");
  assert(!/href:\s*"\/admin\/organizacao"/.test(sidebar), "nenhum item de nav aponta mais para /admin/organizacao");
}

console.log("[test] A2 — bottom nav mobile (direct_business): mesmo destino correto");
{
  const mobileShell = read("src/lib/mobile-shell/types.ts");
  assert(mobileShell.includes('route: "/admin/meu-negocio"'), "bottom nav mobile 'Meu Negócio' (direct_business) também corrigido -- mesmo bug existia lá");
  assert(!mobileShell.includes('label: "Meu Negócio", route: "/admin/organizacao"'), "nenhuma entrada de bottom nav trata organizacao como Meu Negócio");
}

console.log("[test] B — /admin/meu-negocio continua sendo rota real, com o workspace operacional esperado");
{
  assert(exists("src/app/admin/meu-negocio/page.tsx"), "page.tsx existe");
  const entry = read("src/app/admin/meu-negocio/_entry.tsx");
  assert(entry.includes("Estoque, fichas técnicas, CMV e relatórios"), "workspace operacional (estoque/fichas técnicas/CMV/relatórios) presente, mesma experiência de antes");
  assert(entry.includes("food_service"), "arquétipo food_service continua sendo o vertical slice real");
}

console.log("[test] C — /admin/organizacao continua existindo separadamente, intocada");
{
  assert(exists("src/app/admin/organizacao/page.tsx"), "rota institucional preservada em disco");
  const orgPage = read("src/app/admin/organizacao/page.tsx");
  assert(orgPage.includes("resolveOwnOrganizationKind"), "lógica de account_type (agencia/empresa/not_applicable) não foi tocada nesta missão");
  assert(orgPage.includes('title="Minha Agência"') || orgPage.includes('"Minha Agência"'), "conceito institucional (Minha Agência) preservado");
}

console.log("[test] D — nenhum redirect entre /admin/meu-negocio e /admin/organizacao");
{
  const meuNegocioPage = read("src/app/admin/meu-negocio/page.tsx");
  assert(!meuNegocioPage.includes("organizacao"), "/admin/meu-negocio não redireciona nem referencia /admin/organizacao");
  const orgPage = read("src/app/admin/organizacao/page.tsx");
  assert(!/redirect\([^)]*meu-negocio/.test(orgPage), "/admin/organizacao não redireciona para /admin/meu-negocio (comentário histórico explicando a separação é esperado, redirect real não)");
}

console.log("[test] E — REC OS (/admin/contentos) não foi tocado por esta missão");
{
  assert(exists("src/app/admin/contentos/page.tsx"), "hub do REC OS continua existindo, sem alteração de escopo");
}

console.log("[test] F — Audiovisual (/admin/audiovisual) não foi tocado por esta missão");
{
  assert(exists("src/app/admin/audiovisual/page.tsx"), "rota canônica do Audiovisual continua existindo, sem alteração de escopo");
  const sidebar = read("src/components/app-sidebar.tsx");
  assert(sidebar.includes('href: "/admin/audiovisual",       label: "Audiovisual"'), "item de nav do Audiovisual permanece intacto");
}

console.log("[test] G — Company Context não foi tocado por esta missão");
{
  const resolve = read("src/lib/company-context/resolve.ts");
  assert(resolve.includes("export async function resolveCompanyContext"), "resolveCompanyContext() presente e intocado");
  assert(exists("src/components/company-selector-dialog.tsx"), "Company Selector (modal) continua existindo, sem alteração de escopo");
}

console.log("[test] H — módulo Meu Negócio continua honestamente rotulado como demonstração (não Supabase-backed)");
{
  const entry = read("src/app/admin/meu-negocio/_entry.tsx");
  assert(!entry.includes("createServerSupabaseClient") && !entry.includes("createSupabaseAdminClient"), "_entry.tsx não faz nenhuma consulta real ao Supabase -- 100% em memória, como já documentado");
}

console.log("[test] I — Deployment Production Flow + Organization Naming Separation V1: /admin/organizacao (business) não usa mais o título 'Meu Negócio'");
{
  const orgPage = read("src/app/admin/organizacao/page.tsx");
  assert(!orgPage.includes('title="Meu Negócio"'), "PageHeader não usa mais o título 'Meu Negócio' (comentário histórico explicando a correção é esperado, JSX real não)");
  assert(!/label\s*=.*"Meu Negócio"/.test(orgPage), "variável de label não atribui mais 'Meu Negócio'");
  assert(orgPage.includes('title="Minha Organização"'), "PageHeader da apresentação business usa 'Minha Organização'");
  assert(orgPage.includes('kind === "agency" ? "Minha Agência" : "Minha Organização"'), "label do fallback (sem service role) também usa 'Minha Organização' para business");
  const meuNegocioEntry = read("src/app/admin/meu-negocio/_entry.tsx");
  assert(meuNegocioEntry.includes("Estoque, fichas técnicas, CMV e relatórios"), "módulo operacional real (/admin/meu-negocio) continua com seu próprio título/conteúdo, intocado por esta correção");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
