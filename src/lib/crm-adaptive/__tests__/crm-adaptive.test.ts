/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/crm-adaptive/__tests__/crm-adaptive.test.ts
 */
import {
  CRM_SURFACE_VISIBILITY, CRM_LEAD_TEMPERATURE_LABEL, CRM_TEMPERATURE_SCORE_FACTORS,
  CRM_DASHBOARD_ESSENTIAL_WIDGETS, CRM_DASHBOARD_MANAGER_WIDGETS,
  CRM_INTELLIGENCE_CAPABILITIES, CRM_INTELLIGENCE_FORBIDDEN_AUTO_ACTIONS,
  CRM_NICHE_CONCEPTS, findCrmNicheConcepts,
} from "../index";
import * as fs from "fs";
import * as path from "path";

let passed = 0;
let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("[test] CRM não implementado — nenhuma tela/API/tabela nova");
const root = process.cwd();
assert(!fs.existsSync(path.join(root, "src/app/api/crm-adaptive")), "nenhuma rota de API nova do CRM adaptativo");
assert(!fs.existsSync(path.join(root, "src/app/admin/crm-adaptive")), "nenhuma tela nova do CRM adaptativo");
const crmAdaptiveSource = fs.readFileSync(path.join(root, "src/lib/crm-adaptive/types.ts"), "utf8");
assert(!crmAdaptiveSource.includes("supabase"), "nenhuma referência a Supabase no módulo do CRM adaptativo");
assert(!crmAdaptiveSource.includes("fetch("), "nenhuma chamada fetch() no módulo do CRM adaptativo");
assert(!/CREATE TABLE|ALTER TABLE/i.test(crmAdaptiveSource), "nenhuma migration/SQL no módulo do CRM adaptativo");

console.log("[test] Superfícies do CRM — isoladas");
const superAdmin = CRM_SURFACE_VISIBILITY.find((s) => s.surface === "super_admin")!;
const agency = CRM_SURFACE_VISIBILITY.find((s) => s.surface === "agency")!;
const agencyClient = CRM_SURFACE_VISIBILITY.find((s) => s.surface === "agency_client")!;
const directBusiness = CRM_SURFACE_VISIBILITY.find((s) => s.surface === "direct_business")!;
const operationalUser = CRM_SURFACE_VISIBILITY.find((s) => s.surface === "operational_user")!;
assert(superAdmin.canSeeOtherWorkspaceCrm === false, "Super Admin CRM separado dos clientes");
assert(agency.canSeeOtherWorkspaceCrm === true && agency.crossWorkspaceAccessRule !== null, "Agência só acessa CRM de cliente com regra explícita");
assert(agencyClient.canSeeOtherWorkspaceCrm === false, "Cliente da agência isolado");
assert(directBusiness.canSeeOwnCrm === true, "Empresa direta possui CRM próprio");
assert(operationalUser.canSeeOwnCrm === false, "Operacional vê somente o que for atribuído (não o CRM inteiro)");
assert(new Set(CRM_SURFACE_VISIBILITY.map((s) => s.surface)).size === 5, "5 superfícies únicas registradas");

console.log("[test] Nichos do CRM");
assert(!!findCrmNicheConcepts("food_service"), "nicho Alimentação existe");
assert(!!findCrmNicheConcepts("construction_materials"), "nicho Materiais de construção existe");
assert(!!findCrmNicheConcepts("agency_services"), "nicho Agência e serviços existe");
assert(!!findCrmNicheConcepts("construction_projects"), "nicho Construção civil existe");
assert(!!findCrmNicheConcepts("retail"), "nicho Varejo geral existe");
assert(CRM_NICHE_CONCEPTS.length === 5, "5 nichos registrados");

console.log("[test] Temperatura do lead");
const temperatureKeys = Object.keys(CRM_LEAD_TEMPERATURE_LABEL);
assert(new Set(temperatureKeys).size === temperatureKeys.length, "temperaturas possuem IDs únicos");
assert(temperatureKeys.length === 7, "7 estados de temperatura (cold/warming/warm/hot/customer/inactive/lost)");
assert(new Set(CRM_TEMPERATURE_SCORE_FACTORS).size === CRM_TEMPERATURE_SCORE_FACTORS.length, "fatores de score sem duplicata");

console.log("[test] Dashboards Essencial e Gestor — mesma fonte prevista");
assert(CRM_DASHBOARD_ESSENTIAL_WIDGETS.length > 0, "Dashboard Essential existe");
assert(CRM_DASHBOARD_MANAGER_WIDGETS.length > 0, "Dashboard Gestor existe");
assert(CRM_DASHBOARD_MANAGER_WIDGETS.length > CRM_DASHBOARD_ESSENTIAL_WIDGETS.length, "Gestor tem mais densidade que Essencial (mesma fonte, mais detalhe)");

console.log("[test] IA do CRM nunca decide sozinha");
assert(CRM_INTELLIGENCE_CAPABILITIES.length > 0, "capacidades futuras de IA registradas");
assert(CRM_INTELLIGENCE_FORBIDDEN_AUTO_ACTIONS.includes("fechar_lead"), "IA nunca fecha lead sozinha");
assert(CRM_INTELLIGENCE_FORBIDDEN_AUTO_ACTIONS.includes("enviar_mensagem"), "IA nunca envia mensagem sozinha");
assert(CRM_INTELLIGENCE_FORBIDDEN_AUTO_ACTIONS.includes("mover_oportunidade"), "IA nunca move oportunidade sozinha");
assert(
  CRM_INTELLIGENCE_CAPABILITIES.every((c) => !(CRM_INTELLIGENCE_FORBIDDEN_AUTO_ACTIONS as readonly string[]).includes(c)),
  "nenhuma capacidade de IA se sobrepõe às ações proibidas"
);

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
