/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/mobile-shell/__tests__/mobile-shell-3-0-1-1.structural.test.ts
 * Cobre Fase 34 (testes Mobile) itens 69-83 do brief da Sprint REC OS 3.0.1.1.
 */
import * as fs from "fs";
import * as path from "path";
import { SURFACE_BOTTOM_NAV_ITEMS, SURFACE_BOTTOM_NAV_PRIMARY, SURFACE_BOTTOM_NAV_LABEL, MAX_BOTTOM_NAV_ITEMS } from "../types";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("[test] 69 — quatro superfícies mapeadas com itens completos (id/label/route/requiredCapability/activeMatch/priority)");
const surfaces = Object.keys(SURFACE_BOTTOM_NAV_ITEMS);
assert(surfaces.length === 4, "4 superfícies: super_admin, agency, agency_client, direct_business");
for (const surface of surfaces as (keyof typeof SURFACE_BOTTOM_NAV_ITEMS)[]) {
  for (const item of SURFACE_BOTTOM_NAV_ITEMS[surface]) {
    assert(!!item.id && !!item.label && !!item.route && !!item.requiredCapability && !!item.activeMatch && typeof item.priority === "number",
      `${surface}/${item.id}: possui id/label/route/requiredCapability/activeMatch/priority`);
  }
}

console.log("[test] 70 — máximo 5 itens (4 fixos + Mais) em toda superfície");
assert(MAX_BOTTOM_NAV_ITEMS === 5, "constante de máximo é 5");
for (const surface of surfaces as (keyof typeof SURFACE_BOTTOM_NAV_ITEMS)[]) {
  assert(SURFACE_BOTTOM_NAV_ITEMS[surface].length + 1 <= MAX_BOTTOM_NAV_ITEMS, `${surface}: 4 fixos + Mais nunca excede 5`);
}

console.log("[test] 71/83 — capabilities respeitadas: toda rota fixa sugerida precisa existir no config real da sidebar (nenhum fallback indevido, defeito da 3.0.1 corrigido)");
const sidebar = read("src/components/app-sidebar.tsx");
const adminNavBlockMatch = sidebar.match(/admin: \{[\s\S]*?nav: \[([\s\S]*?)\],\s*\},/);
const adminNavBlock = adminNavBlockMatch ? adminNavBlockMatch[1] : "";
for (const surface of surfaces as (keyof typeof SURFACE_BOTTOM_NAV_ITEMS)[]) {
  for (const item of SURFACE_BOTTOM_NAV_ITEMS[surface]) {
    assert(adminNavBlock.includes(`"${item.route}"`), `${surface}: rota ${item.route} existe de verdade em configs.admin.nav (nunca é descartada silenciosamente)`);
  }
}

console.log("[test] 72/73/74/75 — rótulos batem exatamente com o que o ticket pediu por superfície");
assert(SURFACE_BOTTOM_NAV_LABEL.super_admin.join(",") === "Início,Meu Escritório,REC OS,CRM", "Super ADM: Início/Meu Escritório/REC OS/CRM (Sprint 3.0.1.2 — Ecossistema saiu da posição operacional)");
assert(SURFACE_BOTTOM_NAV_LABEL.agency.join(",") === "Início,REC OS,Operação,Clientes", "Agência: Início/REC OS/Operação/Clientes");
assert(SURFACE_BOTTOM_NAV_LABEL.agency_client.join(",") === "Início,Conteúdos,Aprovações,Calendário", "Cliente da Agência: Início/Conteúdos/Aprovações/Calendário");
assert(SURFACE_BOTTOM_NAV_LABEL.direct_business.join(",") === "Início,Meu Negócio,CRM,Calendário", "Empresa Direta: Início/Meu Negócio/CRM/Calendário");
assert(Object.values(SURFACE_BOTTOM_NAV_PRIMARY).every((routes) => routes.length === 4), "todas as superfícies têm exatamente 4 rotas fixas");

console.log("[test] 76 — menu Mais abre uma sheet contextual, nunca navega para página genérica vazia");
const mobileNav = read("src/components/mobile-nav.tsx");
assert(mobileNav.includes("showMais") && mobileNav.includes('Drawer "Mais"'), "Mais é um drawer/sheet, não uma navegação de página");
assert(mobileNav.includes("secondaryItems.map"), "Mais só mostra itens que o usuário já pode acessar (secondaryItems, derivado de allItems)");

console.log("[test] 77/78 — busca mobile abre e recebe foco");
const searchSheet = read("src/components/admin-search-sheet.tsx");
assert(searchSheet.includes('data-testid="admin-search-trigger"') && searchSheet.includes('data-testid="admin-search-sheet"'), "botão real abre a sheet de busca");
assert(searchSheet.includes("inputRef.current?.focus()"), "input recebe foco ao abrir");
assert(searchSheet.includes("clientes e conteúdos ainda não são pesquisáveis"), "escopo honesto: só módulos/rotas, nunca finge busca completa");

console.log("[test] 79/80 — ação rápida contextual por superfície, ação planned desabilitada");
const quickAction = read("src/components/quick-action-menu.tsx");
assert(quickAction.includes("QUICK_ACTIONS: Record<QuickActionSurface, QuickAction[]>"), "ações diferentes por superfície, não uma lista fixa única");
assert(quickAction.includes('data-testid="quick-action-planned"') && quickAction.includes("Em breve"), "ação sem rota real fica visivelmente desabilitada com badge Em breve");
assert(quickAction.includes("a.href ? (") , "só ações com href real disparam navegação — nunca uma ação inexistente");

console.log("[test] 81/82 — safe area e padding inferior preservados (já existiam, confirmado sem regressão)");
assert(mobileNav.includes('env(safe-area-inset-bottom'), "bottom nav respeita safe-area-inset-bottom");
const layoutClient = read("src/app/admin/_layout-client.tsx");
assert(layoutClient.includes("pb-20 md:pb-6"), "conteúdo principal reserva espaço para o bottom nav no mobile");

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
