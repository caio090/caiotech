/**
 * Executar com: node .tmp/run-ts-test.cjs src/app/admin/audiovisual/__tests__/audiovisual-route-separation.structural.test.ts
 * LOKAT OS CENTRAL — Audiovisual Route Separation. Prova que /admin/audiovisual
 * é a implementação real (movida de /admin/recos, nenhuma lógica duplicada) e
 * que /admin/recos/* virou redirect puro de compatibilidade, preservando
 * query params e IDs. REC OS (/admin/contentos) fica fora do escopo -- nenhum
 * arquivo desse domínio é tocado por esta missão.
 */
import * as fs from "fs";
import * as path from "path";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p: string) => fs.existsSync(path.join(root, p));

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("[test] 1 — /admin/audiovisual é a implementação real (não um wrapper vazio)");
{
  assert(exists("src/app/admin/audiovisual/page.tsx"), "page.tsx existe");
  const page = read("src/app/admin/audiovisual/page.tsx");
  assert(page.includes('.from("rec_projects")'), "consulta real a rec_projects, mesma fonte de sempre");
  assert(page.includes("RecosDashboardContent"), "reaproveita o componente real (movido, não duplicado)");
  assert(!page.includes("redirect("), "não é um redirect -- é a implementação real");
}

console.log("[test] 2 — /admin/audiovisual/criar é o fluxo real de criação (não um wrapper vazio)");
{
  assert(exists("src/app/admin/audiovisual/criar/page.tsx"), "page.tsx existe");
  const page = read("src/app/admin/audiovisual/criar/page.tsx");
  assert(page.includes('.from("rec_projects")') && page.includes(".insert("), "INSERT real em rec_projects, autoridade única de criação (Command Center Problema 4)");
  assert(page.includes("router.push(`/admin/audiovisual/${data.id}`)"), "após criar, navega para a rota canônica nova, nunca para /admin/recos");
  assert(!page.includes("/admin/recos"), "nenhuma referência residual a /admin/recos neste arquivo");
}

console.log("[test] 3 — /admin/audiovisual/[id] é o detalhe real (não um wrapper vazio)");
{
  assert(exists("src/app/admin/audiovisual/[id]/page.tsx"), "page.tsx existe");
  const page = read("src/app/admin/audiovisual/[id]/page.tsx");
  assert(page.includes('.from("rec_projects")') && page.includes('.eq("id", id)'), "busca real por id em rec_projects");
  assert(page.includes("RecosProjectContent"), "reaproveita o componente real (movido, não duplicado)");
  const content = read("src/app/admin/audiovisual/[id]/_client-content.tsx");
  assert(content.includes('href="/admin/audiovisual"'), "link de voltar aponta para a rota canônica nova");
  assert(!content.includes("/admin/recos"), "nenhuma referência residual a /admin/recos no client content");
}

console.log("[test] 4 — /admin/recos vira redirect puro, mesmo padrão já usado por /admin/crm");
{
  const page = read("src/app/admin/recos/page.tsx");
  assert(page.includes('import { redirect } from "next/navigation"'), "usa o redirect real do Next, nunca meta refresh/client redirect");
  assert(/redirect\(qs \? `\/admin\/audiovisual\?\$\{qs\}` : "\/admin\/audiovisual"\)/.test(page), "redireciona para /admin/audiovisual preservando query params quando existirem");
  assert(!exists("src/app/admin/recos/_client-content.tsx"), "componente antigo removido do caminho legado (vive só em /admin/audiovisual agora)");
}

console.log("[test] 5 — /admin/recos/criar redireciona preservando query params (ex.: ?client=)");
{
  const page = read("src/app/admin/recos/criar/page.tsx");
  assert(page.includes('import { redirect } from "next/navigation"'), "redirect real do Next");
  assert(/\/admin\/audiovisual\/criar\?\$\{qs\}/.test(page), "preserva query string (ex.: client=) no redirect");
}

console.log("[test] 6 — /admin/recos/[id] redireciona preservando o ID");
{
  const page = read("src/app/admin/recos/[id]/page.tsx");
  assert(page.includes('import { redirect } from "next/navigation"'), "redirect real do Next");
  assert(page.includes('params: Promise<{ id: string }>'), "recebe o id real da URL antiga");
  assert(page.includes("redirect(`/admin/audiovisual/${encodeURIComponent(id)}`)"), "preserva o id exato no redirect, nunca perde/reescreve");
  assert(!exists("src/app/admin/recos/[id]/_client-content.tsx"), "componente antigo removido do caminho legado");
}

console.log("[test] 7 — links ativos do produto apontam para /admin/audiovisual, não mais /admin/recos");
{
  const sidebar = read("src/components/app-sidebar.tsx");
  assert(sidebar.includes('{ href: "/admin/audiovisual",       label: "Audiovisual",      icon: Clapperboard }'), "sidebar aponta para a rota canônica nova, label continua 'Audiovisual'");
  assert(!sidebar.includes('"/admin/recos"'), "sidebar não tem mais nenhuma referência a /admin/recos");

  const commandCenter = read("src/components/command-center/inline-project-creation.tsx");
  assert(commandCenter.includes("/admin/audiovisual/criar?client="), "Command Center cria projeto audiovisual direto na rota canônica nova");
  assert(!commandCenter.includes("/admin/recos"), "Command Center não referencia mais /admin/recos");

  const dashboard = read("src/app/admin/dashboard/page.tsx");
  assert(dashboard.includes('{ href: "/admin/audiovisual",   icon: Video,      label: "Audiovisual",  color: "red"    }'), "card do dashboard usa a rota nova E o label correto ('Audiovisual', nunca 'RecOS')");
  assert(!dashboard.includes('"/admin/recos"'), "dashboard não referencia mais /admin/recos");

  const adapters = read("src/lib/project-projection/adapters.ts");
  assert(adapters.includes("sourceUrl: `/admin/audiovisual/${row.id}`"), "gerador real de URL (consumido por Company Central) aponta para a rota canônica nova");
}

console.log("[test] 8 — REC OS (/admin/contentos) permanece totalmente intocado por esta missão");
{
  assert(exists("src/app/admin/contentos/page.tsx"), "hub do REC OS continua existindo, sem alteração de escopo");
  const platformModules = read("src/config/platform-modules.ts");
  assert(platformModules.includes('routes: ["/admin/audiovisual"]'), "registro de módulos reflete a nova rota canônica do Audiovisual");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
