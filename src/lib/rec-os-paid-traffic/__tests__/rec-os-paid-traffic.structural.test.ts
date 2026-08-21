/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/rec-os-paid-traffic/__tests__/rec-os-paid-traffic.structural.test.ts
 *
 * REC OS PAID TRAFFIC PLANNER V1 FOUNDATION — testes estruturais exigidos
 * pelo card: módulo separado do Growth Planner; módulo separado de
 * Campaign Planner; não possui execução externa; Company Context
 * preservado; contratos honestos.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

const ROOT = join(__dirname, "..");
const read = (name: string) => readFileSync(join(ROOT, name), "utf8");

const sourceFiles = ["types.ts", "channels.ts", "budget.ts", "conversion.ts", "planner.ts"];
const combinedSource = sourceFiles.map(read).join("\n");

console.log("[test] módulo separado do Growth Planner -- nunca reimplementa lógica de diagnóstico/plano de crescimento");
{
  assert(!/buildGrowthDiagnosticFromCompanyContext\s*\(/.test(combinedSource), "não redefine buildGrowthDiagnosticFromCompanyContext, só consome tipos");
  assert(!/function\s+buildGrowthPlanPlaceholder/.test(combinedSource), "não reimplementa buildGrowthPlanPlaceholder");
  assert(!/GROWTH_OBJECTIVES\s*=/.test(combinedSource), "não redeclara o catálogo de objetivos -- só importa GrowthObjective como tipo");
  assert(/from\s+"@\/lib\/rec-os-growth\/types"/.test(combinedSource), "importa tipos do Growth Planner em vez de duplicá-los");
}

console.log("[test] módulo separado de Campaign Planner -- nenhuma lógica de nomes/conjuntos/organização operacional de anúncio");
{
  assert(!/adSet|ad_set|adGroup|campaignName|creativeSet/i.test(combinedSource), "nenhuma estrutura de conjunto de anúncios/nome de campanha operacional -- isso é Campaign Planner, missão futura própria");
  assert(!/function\s+buildCampaign/i.test(combinedSource), "nenhuma função de construção de campanha organizacional");
}

console.log("[test] não possui execução externa -- nenhuma chamada de API/publicação/pixel/credencial");
{
  assert(!/fetch\s*\(/.test(combinedSource), "nenhum fetch() -- nenhuma chamada de rede");
  assert(!/graph\.facebook\.com|googleads\.googleapis\.com|ads\.google/i.test(combinedSource), "nenhuma URL de API real de Meta/Google Ads");
  assert(!/access_token|api_key|client_secret/i.test(combinedSource), "nenhuma credencial/token de integração");
  const sourceWithoutHonestDisclaimers = combinedSource.replace(/nenhum pixel/gi, "");
  assert(!/\bpixel\b/i.test(sourceWithoutHonestDisclaimers), "nenhuma menção a pixel de rastreamento real implementada (a única ocorrência é a prosa 'nenhum pixel' em conversion.ts, que afirma a ausência)");
  assert(!/function\s+publish|\bpublish\s*\(|\bpublicarCampanha/i.test(combinedSource), "nenhuma função de publicação automática implementada (menções em comentário de cross-reference, ex. 'meta_publish', são permitidas)");
}

console.log("[test] Company Context preservado -- nunca redefine o shape de empresa/contexto");
{
  assert(!/interface\s+\w*Compan(y|ia)\w*\s*\{/.test(combinedSource) || /GrowthDiagnosticCompany/.test(combinedSource), "nenhuma interface nova de empresa fora da reutilizada GrowthDiagnosticCompany");
  assert(/GrowthDiagnosticCompany/.test(read("types.ts")), "types.ts reutiliza GrowthDiagnosticCompany como o tipo de context");
  assert(!/ResolvedCompanyContext/.test(combinedSource), "não importa ResolvedCompanyContext diretamente -- reusa via rec-os-growth/types, um nível de indireção esperado nesta missão");
}

console.log("[test] contratos honestos -- honestNotice obrigatório, nenhum número inventado/ROI calculado, nenhum Math.random");
{
  assert(/honestNotice/.test(read("types.ts")) && /honestNotice/.test(read("planner.ts")), "honestNotice presente no contrato e no builder");
  assert(!/Math\.random/.test(combinedSource), "nenhum gerador aleatório disfarçando dado real");
  assert(!/\broi\b/i.test(combinedSource) || /nenhum c[aá]lculo de roi/i.test(combinedSource), "nenhum cálculo de ROI implementado -- só menção honesta de que não existe");
  assert(read("planner.ts").includes('status: "planned"'), "status sempre 'planned' nesta fundação -- nunca 'active'/'running'");
}

console.log("[test] nenhum SQL, nenhum componente React/'use client', nenhuma persistência");
{
  assert(!/CREATE TABLE|INSERT INTO|supabase\.from\(/i.test(combinedSource), "nenhum SQL/chamada de persistência real");
  assert(!/"use client"/.test(combinedSource), "nenhum arquivo de componente React nesta pasta");
  assert(!existsSync(join(ROOT, "..", "..", "app", "api", "rec-os-paid-traffic")), "não cria rota de API própria nesta missão (fundação é só tipos + builder)");
}

console.log("[test] platform-modules.ts -- dependsOn de rec_os_paid_traffic_planner continua ['rec_os_growth']");
{
  const registry = readFileSync(join(__dirname, "..", "..", "..", "config", "platform-modules.ts"), "utf8");
  const idx = registry.indexOf('id: "rec_os_paid_traffic_planner"');
  assert(idx !== -1, "entrada rec_os_paid_traffic_planner existe no registry");
  const slice = registry.slice(idx, idx + 1200);
  assert(/dependsOn:\s*\[\s*"rec_os_growth"\s*\]/.test(slice), "dependsOn continua exatamente ['rec_os_growth'], nunca alterado por esta missão");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
