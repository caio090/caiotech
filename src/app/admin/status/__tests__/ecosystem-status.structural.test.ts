/**
 * Executar com: node .tmp/run-ts-test.cjs src/app/admin/status/__tests__/ecosystem-status.structural.test.ts
 * Cobre Fase 35 (testes Ecossistema e Status) itens 17-25 do brief da
 * Sprint Navegação e Experiência 3.0.1.2.
 */
import * as fs from "fs";
import * as path from "path";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p: string) => fs.existsSync(path.join(root, p));

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

const ecosystemAlias = read("src/app/admin/ecossistema/page.tsx");
const architecturePage = read("src/app/admin/status/arquitetura/page.tsx");
const statusClient = read("src/app/admin/status/_status-client.tsx");
const sidebar = read("src/components/app-sidebar.tsx");
const mobileShellTypes = read("src/lib/mobile-shell/types.ts");
const ecosystemClient = read("src/app/admin/ecossistema/_ecosystem-client.tsx");

console.log("[test] 17 — Ecossistema não aparece mais como área operacional principal");
assert(!sidebar.includes('label: "Ecossistema"'), "sidebar não lista mais 'Ecossistema' como item principal");
assert(!mobileShellTypes.includes('"/admin/ecossistema"'), "bottom nav não usa mais /admin/ecossistema como rota fixa de nenhuma superfície");
assert(mobileShellTypes.includes('"Meu Escritório"'), "Meu Escritório ocupa o lugar coerente para Super ADM");

console.log("[test] 18 — Arquitetura aparece dentro/abaixo de Status");
assert(exists("src/app/admin/status/arquitetura/page.tsx"), "/admin/status/arquitetura existe");
assert(statusClient.includes('href="/admin/status/arquitetura"') && statusClient.includes("Arquitetura da Plataforma"), "Status linca para a Arquitetura da Plataforma");
assert(architecturePage.includes('href="/admin/status"'), "Arquitetura linca de volta para Status");

console.log("[test] 19/20/21/22 — Status não duplicado, registry/módulos/dependências preservados");
assert(architecturePage.includes("EcosystemMapClient"), "reaproveita o componente existente, não reescreve o conteúdo técnico");
assert(ecosystemClient.includes("PLATFORM_MODULES") && ecosystemClient.includes("findDependencyCycles"), "registry e cálculo de dependências preservados, intocados");

console.log("[test] 23/24 — /admin/ecossistema continua compatível (alias), sem loop");
assert(ecosystemAlias.includes('redirect("/admin/status/arquitetura")'), "/admin/ecossistema redireciona para a nova localização, nunca 404");
assert(!ecosystemAlias.includes("/admin/ecossistema\""), "alias não redireciona para si mesmo (sem loop)");

console.log("[test] 25 — arquitetura técnica continua atrás do mesmo gate de autorização do admin (nenhum gate novo mais fraco)");
assert(!architecturePage.includes("createServerSupabaseClient") && !architecturePage.includes("requireAdminContentOSContext"), "página não introduz um segundo gate de autorização paralelo — herda o mesmo layout /admin/* já protegido pelo proxy");

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
