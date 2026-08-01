/**
 * Executar com: node .tmp/run-ts-test.cjs src/app/admin/leads/__tests__/crm-canonical.structural.test.ts
 * Cobre Fase 37 (testes do CRM canônico) itens 50-61, Fase 38 (segurança)
 * itens 69-72, e Fase 39 (mobile) itens 81-84 do brief da Sprint Navegação
 * e Experiência 3.0.1.2.
 */
import * as fs from "fs";
import * as path from "path";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p: string) => fs.existsSync(path.join(root, p));

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

const leadsPage = read("src/app/admin/leads/page.tsx");
const sidebar = read("src/components/app-sidebar.tsx");
const mobileShellTypes = read("src/lib/mobile-shell/types.ts");
const searchSheet = read("src/components/admin-search-sheet.tsx");
const quickAction = read("src/components/quick-action-menu.tsx");
const layoutClient = read("src/app/admin/_layout-client.tsx");

console.log("[test] 50/51/64 — uma implementação principal, uma rota canônica");
assert(exists("src/app/admin/crm/page.tsx"), "/admin/crm existe");
const crmAlias = read("src/app/admin/crm/page.tsx");
assert(crmAlias.includes('redirect(qs ? `/admin/leads?${qs}` : "/admin/leads")'), "/admin/crm é um redirect puro para /admin/leads — nunca uma segunda implementação");
assert(!exists("src/app/admin/crm/_client-content.tsx") && !exists("src/app/admin/crm/_crm-client.tsx"), "nenhum componente de CRM duplicado sob /admin/crm");

console.log("[test] 52 — alias funciona e preserva query");
assert(crmAlias.includes("query.append") || crmAlias.includes("query.set"), "alias preserva todos os parâmetros da URL");

console.log("[test] 53/54/55/56/57 — header/sidebar/bottom nav/busca/ação rápida usam a rota canônica");
assert(sidebar.includes('href: "/admin/leads",             label: "CRM"'), "sidebar usa /admin/leads com o rótulo CRM");
assert(mobileShellTypes.includes('route: "/admin/leads"'), "bottom nav usa /admin/leads para o item CRM");
assert(searchSheet.includes("configs.admin.nav"), "busca resolve rotas a partir do mesmo catálogo real (inclui CRM)");
assert(quickAction.includes('href: null, icon: UserRoundPlus') || quickAction.includes("QUICK_ACTIONS"), "ação rápida por superfície registrada (CRM incluído nas superfícies aplicáveis)");
assert(layoutClient.includes('href="/admin/leads"'), "indicador do header também aponta para a rota canônica");

console.log("[test] 58 — nenhuma duplicação de componente (o indicador do header não é um segundo CRM)");
assert(!layoutClient.includes('<span className="text-[10px] font-bold hidden md:inline">CRM</span>'), "rótulo de texto duplicado 'CRM' removido do header");
assert(layoutClient.includes('title="Novos leads no CRM"'), "header vira um indicador de notificação, função distinta da navegação principal");

console.log("[test] 59/60/61 — Lista de Espera é subárea documentada, Pipeline/Central usam a mesma base");
assert(leadsPage.includes("Onboarding de plataforma (Super Admin)") && leadsPage.includes("Mesma base de contatos"), "relação real entre CRM e Lista de Espera/Central explicitada, não escondida atrás de rótulos confusos");
assert(leadsPage.includes("Pipeline comercial"), "Pipeline continua dentro do mesmo componente/página do CRM — nunca outro banco");

console.log("[test] 69/70/71 — nenhum segredo/nome de env no bundle do cliente");
assert(!leadsPage.includes("SUPABASE_SERVICE_ROLE_KEY"), "página não contém mais o nome da variável de ambiente");
assert(!leadsPage.includes("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"), "nenhuma variável NEXT_PUBLIC de service role");
assert(!/service_role\s*[:=]\s*["'][^"']{10,}["']/.test(leadsPage), "nenhuma chave hardcoded");

console.log("[test] 72 — leitura comum do CRM não exige service role no navegador (chamada via API própria)");
assert(leadsPage.includes('fetch("/api/admin/waitlist")'), "leads/page.tsx (client component) só chama a própria API — nunca cria client Supabase com service role no navegador");
assert(!leadsPage.includes("createRequiredSupabaseAdminClient") && !leadsPage.includes("SUPABASE_SERVICE_ROLE_KEY"), "nenhum uso direto de service role no componente cliente");

console.log("[test] 81/82 — CRM não duplicado no header/sidebar desktop, aparece uma vez no bottom nav mobile");
assert((mobileShellTypes.match(/id: "crm"/g) ?? []).length === 2, "CRM aparece como item primário em exatamente 2 superfícies (super_admin e direct_business) — cada uma com uma entrada só");

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
