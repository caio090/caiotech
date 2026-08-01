/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/mobile-shell/__tests__/mobile-shell.structural.test.ts
 */
import * as fs from "fs";
import * as path from "path";
import { SURFACE_BOTTOM_NAV_PRIMARY, SURFACE_BOTTOM_NAV_LABEL, MAX_BOTTOM_NAV_ITEMS } from "../types";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("[test] Viewport meta (Fase 29/37 — causa raiz)");
const rootLayout = read("src/app/layout.tsx");
assert(rootLayout.includes("export const viewport"), "layout raiz exporta viewport");
assert(rootLayout.includes('width: "device-width"'), "viewport usa device-width");
assert(rootLayout.includes('viewportFit: "cover"'), "viewport-fit=cover presente (necessário para safe-area-inset)");

console.log("[test] PageHeader — stacking mobile, sem overflow");
const pageHeader = read("src/components/page-header.tsx");
assert(pageHeader.includes("flex-col") && pageHeader.includes("sm:flex-row"), "PageHeader empilha em coluna até sm:, depois vira linha");
assert(pageHeader.includes("min-w-0") && pageHeader.includes("truncate"), "título nunca força overflow do contêiner pai");

console.log("[test] DashboardCard — min-w-0/break-words");
const dashboardCard = read("src/components/dashboard-card.tsx");
assert((dashboardCard.match(/min-w-0/g) ?? []).length >= 2, "min-w-0 aplicado nas duas variantes (padrão e premium)");
assert((dashboardCard.match(/break-words/g) ?? []).length >= 2, "break-words aplicado nas duas variantes");
assert((dashboardCard.match(/flex-shrink-0/g) ?? []).length >= 2, "ícone nunca é espremido pelo título longo");

console.log("[test] Ação rápida — full width no mobile");
// Sprint REC OS 3.0.1.1 (Fase 23): o <button> estático virou QuickActionMenu
// (menu real, contextual por superfície) — a classe de largura mobile foi
// junto para dentro do componente, dashboard/page.tsx só monta <QuickActionMenu />.
const dashboardPage = read("src/app/admin/dashboard/page.tsx");
const quickActionMenu = read("src/components/quick-action-menu.tsx");
assert(dashboardPage.includes("<QuickActionMenu"), "dashboard monta o menu de ação rápida real");
assert(quickActionMenu.includes("w-full sm:w-auto"), "botão Ação rápida não ultrapassa a viewport no mobile (agora dentro do componente)");

console.log("[test] Bottom navigation por superfície (Fase 31)");
assert(Object.keys(SURFACE_BOTTOM_NAV_PRIMARY).length === 4, "4 superfícies mapeadas");
for (const surface of ["super_admin", "agency", "agency_client", "direct_business"] as const) {
  assert(SURFACE_BOTTOM_NAV_PRIMARY[surface].length + 1 <= MAX_BOTTOM_NAV_ITEMS, `${surface}: máximo 5 itens (4 fixos + Mais)`);
}
assert(SURFACE_BOTTOM_NAV_LABEL.super_admin.join(",") === "Início,Meu Escritório,REC OS,CRM", "rótulos Super ADM batem com o ticket (Sprint 3.0.1.2 substituiu Ecossistema por Meu Escritório)");
assert(SURFACE_BOTTOM_NAV_LABEL.agency.join(",") === "Início,REC OS,Operação,Clientes", "rótulos Agência batem com o ticket");
assert(SURFACE_BOTTOM_NAV_LABEL.agency_client.join(",") === "Início,Conteúdos,Aprovações,Calendário", "rótulos Cliente da Agência batem com o ticket");
assert(SURFACE_BOTTOM_NAV_LABEL.direct_business.join(",") === "Início,Meu Negócio,CRM,Calendário", "rótulos Empresa Direta batem com o ticket");

const mobileNav = read("src/components/mobile-nav.tsx");
assert(mobileNav.includes("surface?: WorkspaceSurface"), "MobileBottomNav aceita surface opcional (não quebra quem não passa)");
assert(mobileNav.includes("allItems.filter"), "itens de superfície são sempre filtrados contra o que a capability já libera — nunca concede acesso novo");

const layoutClient = read("src/app/admin/_layout-client.tsx");
assert(layoutClient.includes("surface={previewContext?.surface"), "layout do admin passa a superfície do preview quando ativo");
assert(layoutClient.includes('userRole === "super_admin" ? "super_admin"'), "sessão real de super_admin também usa a navegação correta");

console.log("[test] Não implementado nesta sprint — sem API/tabela nova");
assert(!fs.existsSync(path.join(root, "src/app/api/mobile-shell")), "nenhuma rota de API nova para o app shell mobile");

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
