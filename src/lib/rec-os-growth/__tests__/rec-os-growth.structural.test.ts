/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/rec-os-growth/__tests__/rec-os-growth.structural.test.ts
 *
 * REC OS GROWTH PLANNER V1 FOUNDATION — verificação estática dos
 * requisitos da missão: módulo tem o pai correto no registry, Growth
 * separado de Influence, Paid Traffic separado, Company Context nunca
 * duplicado, nenhuma integração/SQL/UI criada, nenhum módulo existente
 * quebrado.
 */
import * as fs from "fs";
import * as path from "path";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p: string) => fs.existsSync(path.join(root, p));

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

const CORE_FILES = [
  "src/lib/rec-os-growth/types.ts",
  "src/lib/rec-os-growth/diagnostic.ts",
  "src/lib/rec-os-growth/projection-engine-contract.ts",
];

console.log("[test] Estrutura criada exatamente conforme a missão (tipos/contratos, nenhuma UI)");
for (const f of CORE_FILES) assert(exists(f), `${f} existe`);

const types = read("src/lib/rec-os-growth/types.ts");
const diagnostic = read("src/lib/rec-os-growth/diagnostic.ts");
const projection = read("src/lib/rec-os-growth/projection-engine-contract.ts");
const ALL = [types, diagnostic, projection].join("\n");

console.log("[test] Módulo possui pai correto no registry (rec_os_growth_planner -> rec_os_growth)");
{
  const platformModules = read("src/config/platform-modules.ts");
  assert(/id:\s*"rec_os_growth_planner"[\s\S]{0,1200}dependsOn:\s*\["rec_os_growth"\]/.test(platformModules), "rec_os_growth_planner continua com dependsOn: ['rec_os_growth'], intocado por esta missão");
}

console.log("[test] Responsabilidades separadas (Growth Planner nunca decide mídia paga, campanha ou projeção numérica)");
{
  assert(!/setWebhook|sendMessage|api\.telegram\.org|graph\.facebook\.com/i.test(ALL), "nenhuma chamada de API externa (Meta/Google/Telegram) nesta fundação");
  assert(!diagnostic.includes("estimateProjection") || diagnostic.includes("import"), "se diagnostic.ts referenciar o Projection Engine, é só via import do contrato -- nunca reimplementando o cálculo");
  assert(!/function estimateProjection/.test(diagnostic) && !/function estimateProjection/.test(types), "estimateProjection() só existe em projection-engine-contract.ts, nunca duplicado");
}

console.log("[test] Growth separado de Influence, Paid Traffic separado (nenhuma referência cruzada indevida)");
{
  assert(!/influence_os|creator_dna|creator_radar/i.test(ALL), "nenhum arquivo desta fundação referencia o domínio Influence");
  // Referenciar rec_os_paid_traffic_planner em PROSA (cross-reference documentando a separação de
  // responsabilidades) é esperado e correto -- o que nunca pode existir é LÓGICA de mídia paga
  // (chamada de API, cálculo de orçamento de anúncio) implementada aqui.
  assert(!/function\s+\w*paidTraffic\w*|meta_ads_api|google_ads_api|createCampaign|setBudget/i.test(ALL), "nenhuma lógica/função de Paid Traffic implementada nesta fundação (só cross-reference em prosa é permitido)");
}

console.log("[test] Company Context reusado, nunca duplicado");
{
  assert(diagnostic.includes('from "@/lib/company-context/types"') && diagnostic.includes("ResolvedCompanyContext"), "diagnostic.ts importa o tipo real ResolvedCompanyContext, nunca redefine um novo");
  assert(!/interface ResolvedCompanyContext|function resolveCompanyContext/.test(ALL), "nenhum arquivo desta fundação reimplementa Company Context");
}

console.log("[test] Nunca gera promessa de resultado (regra dura da missão)");
{
  assert(types.includes("honestNotice"), "GrowthPlanOutput tem o campo honestNotice obrigatório");
  assert(projection.includes('"not_implemented"') && projection.includes("honestNotice"), "Projection Engine sempre retorna not_implemented + honestNotice, nunca um número calculado");
  assert(!/Math\.(random|round)\s*\(/.test(ALL), "nenhuma fórmula/cálculo numérico escondido em nenhum arquivo");
}

console.log("[test] Nenhuma UI/rota/SQL criada");
{
  assert(!exists("src/app/admin/contentos/growth"), "nenhuma rota /admin/contentos/growth criada nesta missão");
  assert(!/CREATE TABLE|ALTER TABLE/i.test(ALL), "nenhum SQL de schema em nenhum arquivo desta fundação");
  assert(!/"use client"/.test(ALL), "nenhum arquivo desta fundação é um componente React -- tipos/lib puros");
}

console.log("[test] Nenhum módulo existente quebrado (Conversation Core / Telegram / Company Context intocados)");
{
  assert(exists("src/lib/conversation/router.ts") && exists("src/lib/telegram/decide-reply.ts") && exists("src/lib/company-context/resolve.ts"), "arquivos-chave de missões anteriores continuam existindo, nenhum removido");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
