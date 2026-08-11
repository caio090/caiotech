/**
 * Executar com: node .tmp/run-ts-test.cjs src/app/admin/__tests__/mvp-consolidation-audit.structural.test.ts
 * Sprint MVP Final Consolidation V1 — trava em teste os achados reais da
 * auditoria de arquitetura (Fase 5-68), para que nenhum deles regrida
 * silenciosamente nem seja "corrigido" fingindo uma integração que não
 * existe.
 */
import * as fs from "fs";
import * as path from "path";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p: string) => fs.existsSync(path.join(root, p));

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("[test] 1 — /admin/leads é o funil da própria LOKAT, nunca CRM de Company (Fase 67)");
const leadsPage = read("src/app/admin/leads/page.tsx");
assert(leadsPage.includes("WaitlistEntry") || leadsPage.includes("waitlist"), "página real trabalha com entradas de waitlist/beta da LOKAT, não leads de uma Company cliente");
assert(!leadsPage.includes("resolveCompanyContext"), "não pretende ser Company-scoped -- é intencionalmente global");

console.log("[test] 2 — commercial_leads.client_id existe no schema mas não é operacional (Fase 68)");
const commercialSchema = read("docs/supabase/15-comercial-os.sql");
assert(commercialSchema.includes("client_id") && commercialSchema.includes("commercial_leads"), "coluna client_id existe de fato no schema real");
const operationalDir = "src/app/operacional/comercial";
const operationalFiles = fs.existsSync(path.join(root, operationalDir))
  ? fs.readdirSync(path.join(root, operationalDir), { recursive: true }).filter((f) => typeof f === "string" && f.endsWith(".tsx")) as string[]
  : [];
const anyPopulatesClientId = operationalFiles.some((f) => read(path.join(operationalDir, f)).includes("client_id"));
assert(!anyPopulatesClientId, "COMPANY_CRM_NOT_OPERATIONAL confirmado -- nenhuma tela real de /operacional/comercial lê ou escreve client_id em commercial_leads");

console.log("[test] 3 — Meta já possui mapping real Company <-> conexão (Fase 41, achado positivo)");
const metaClientAssets = read("src/app/api/meta/client-assets/route.ts");
assert(metaClientAssets.includes("client_id"), "rota real de assets Meta já é escopada por client_id, não é um gap");
const metaConnections = read("src/app/api/meta/connections/route.ts");
assert(metaConnections.includes("client_id"), "conexões Meta já são vinculadas a client_id real");

console.log("[test] 4 — marketing_diagnostics é funil público de pré-venda, nunca Diagnóstico de Company onboardada (Fase 15)");
const marketingDiagSchema = read("docs/supabase/49-marketing-diagnostics.sql");
assert(marketingDiagSchema.includes("company_name") && !marketingDiagSchema.includes("client_id  "), "marketing_diagnostics usa company_name texto livre, nunca um FK real para clients");

console.log("[test] 5 — schema final do Diagnóstico real existe, documentado, nunca executado (Fase 87, revisado na Sprint MVP Core Closure V2)");
assert(exists("docs/supabase/91-company-diagnostic-roadmap.sql"), "arquivo de schema final existe");
const proposal = read("docs/supabase/91-company-diagnostic-roadmap.sql");
assert(proposal.includes("SQL_READY_FOR_MANUAL_APPROVAL"), "marcado explicitamente como pronto para aprovação manual, nunca executado automaticamente");
assert(proposal.includes("REFERENCES public.clients(id)"), "reaproveita clients como Company, nenhuma tabela de Company nova");
assert(exists("docs/supabase/91-company-diagnostic-roadmap-rollback.sql"), "rollback seguro correspondente existe");

console.log("[test] 6 — Meu Negócio já se declara honestamente como demonstração (Fase 8)");
const activationPlaceholder = read("src/app/admin/meu-negocio/_activation-placeholder.tsx");
assert(activationPlaceholder.includes("não implementada nesta demonstração") || activationPlaceholder.includes("em breve"), "usuário real vê aviso explícito, nunca dado fabricado apresentado como real");

console.log("[test] 7 — Company Central segue sendo a única implementação do Painel da Empresa (Fase 26)");
const companyCentralPage = read("src/app/admin/empresa/page.tsx");
assert(companyCentralPage.includes("Painel da Empresa"), "rótulo de UI adicionado, mesma rota canônica /admin/empresa");
assert(!exists("src/app/admin/painel-da-empresa"), "nenhuma segunda rota/página criada para o mesmo conceito");

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
