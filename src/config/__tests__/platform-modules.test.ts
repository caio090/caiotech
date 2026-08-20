(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const registry = require("../platform-modules.ts") as typeof import("../platform-modules");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const capabilities = require("../workspace-capabilities.ts") as typeof import("../workspace-capabilities");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs") as typeof import("fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path") as typeof import("path");
let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

const MATURITIES = new Set(["production", "qa_pending", "preview", "planned", "blocked", "experimental", "not_implemented", "coming_soon"]);
const SURFACES = new Set(["super_admin", "agency", "agency_client", "direct_business", "operational_user"]);
const KNOWN_CAPABILITIES = new Set(Object.keys(capabilities.SURFACE_LABELS).flatMap((surface) => capabilities.resolveCapabilities(surface as never)));

console.log("\n[test 1] Registry sem IDs duplicados");
{
  const ids = registry.PLATFORM_MODULES.map((m) => m.id);
  assert(new Set(ids).size === ids.length, `${ids.length} módulos, todos com id único`);
}

console.log("\n[test 2] Rotas válidas (raiz conhecida)");
{
  // REC OS ARCHITECTURE ALIGNMENT V1: /admin é a raiz esperada da grande
  // maioria dos módulos, mas growth_os vive de propósito fora dela
  // (src/app/growth/**, confirmado em auditoria) -- allowlist explícita em
  // vez de aceitar qualquer prefixo, para continuar pegando um typo real.
  // TELEGRAM ADAPTER V1 acrescentou /api como raiz legítima (webhook em
  // src/app/api/integrations/telegram/webhook, confirmado no build).
  const KNOWN_ROOTS = ["/admin", "/growth", "/api"];
  const invalid = registry.PLATFORM_MODULES.flatMap((m) => m.routes).filter((route) => !KNOWN_ROOTS.some((root) => route.startsWith(root)));
  assert(invalid.length === 0, `todas as rotas começam com uma raiz conhecida (${KNOWN_ROOTS.join(" ou ")}) (inválidas: ${invalid.join(", ") || "nenhuma"})`);
  // conversation_core é uma biblioteca compartilhada consumida pelos
  // adapters de canal (Telegram/futuro WhatsApp), nunca uma superfície
  // HTTP própria -- exceção nomeada e documentada, não um enfraquecimento
  // silencioso da regra para toda maturidade "real".
  const ROUTELESS_BY_DESIGN = new Set(["conversation_core"]);
  const modulesRequiringRoute = registry.PLATFORM_MODULES.filter((m) =>
    m.maturity !== "not_implemented" && m.maturity !== "coming_soon" && m.maturity !== "planned" && !ROUTELESS_BY_DESIGN.has(m.id));
  assert(modulesRequiringRoute.every((m) => m.routes.length > 0), "todo módulo com maturidade real (não planned/coming_soon/not_implemented, exceto exceções nomeadas roteless-by-design) declara ao menos uma rota");
}

console.log("\n[test 3] Dependências existentes");
{
  assert(registry.findMissingDependencies().length === 0, "nenhum módulo depende de um id que não existe no registry");
}

console.log("\n[test 4] Módulo não depende de si próprio");
{
  const selfDependent = registry.PLATFORM_MODULES.filter((m) => m.dependsOn.includes(m.id));
  assert(selfDependent.length === 0, "nenhum módulo lista o próprio id em dependsOn");
}

console.log("\n[test 5] Ciclos inválidos detectados");
{
  assert(registry.findDependencyCycles().length === 0, "nenhum ciclo de dependência no registry atual");
}

console.log("\n[test 6] Superfícies reconhecidas");
{
  const unknown = registry.PLATFORM_MODULES.flatMap((m) => m.surfaces).filter((entry) => !SURFACES.has(entry.surface));
  assert(unknown.length === 0, "toda ModuleSurfaceAvailability usa uma superfície do union ModuleSurface");
  assert(registry.PLATFORM_MODULES.every((m) => m.surfaces.length === SURFACES.size), "todo módulo declara as 5 superfícies (mesmo que not_applicable)");
}

console.log("\n[test 7] Capabilities reconhecidas");
{
  const unknown = registry.PLATFORM_MODULES.flatMap((m) => m.capabilities).filter((cap) => !KNOWN_CAPABILITIES.has(cap as never));
  assert(unknown.length === 0, `toda capability referenciada existe em workspace-capabilities.ts (desconhecidas: ${unknown.join(", ") || "nenhuma"})`);
}

console.log("\n[test 8] Maturidade válida");
{
  const invalid = registry.PLATFORM_MODULES.filter((m) => !MATURITIES.has(m.maturity));
  assert(invalid.length === 0, "toda maturity pertence ao union PlatformModuleMaturity");
  const falseProduction = registry.PLATFORM_MODULES.filter((m) => m.maturity === "production" && m.id === "meu_negocio");
  assert(falseProduction.length === 0, "meu_negocio (100% em memória) nunca é declarado 'production'");
}

console.log("\n[test extra] findModulesBySurface / findModulesByCategory / findModuleById");
{
  assert(registry.findModuleById("workspaces_core") !== undefined, "findModuleById encontra um módulo real");
  assert(registry.findModuleById("nao_existe") === undefined, "findModuleById retorna undefined para id inexistente");
  assert(registry.findModulesBySurface("direct_business").length > 0, "findModulesBySurface retorna módulos visíveis para direct_business");
  assert(registry.findModulesByCategory("core").some((m) => m.id === "workspaces_core"), "findModulesByCategory('core') inclui workspaces_core");
}

console.log("\n[test 9] REC OS GROWTH PLANNER V1 ARCHITECTURE FOUNDATION -- GrowthOS e REC OS Growth separados, árvore de 6 filhos registrada, nenhuma rota criada");
{
  const growthOs = registry.findModuleById("growth_os");
  const recOsGrowth = registry.findModuleById("rec_os_growth");
  assert(growthOs !== undefined && recOsGrowth !== undefined, "growth_os (agência) e rec_os_growth (por cliente) coexistem como entradas distintas");
  assert(growthOs?.routes.every((r) => r.startsWith("/growth")) ?? false, "growth_os só referencia rotas reais /growth/** (agência inteira)");
  assert(recOsGrowth?.routes.length === 0, "rec_os_growth não declara nenhuma rota -- nenhuma UI criada nesta fundação");

  const GROWTH_CHILDREN = [
    "rec_os_growth_planner",
    "rec_os_paid_traffic_planner",
    "rec_os_content_planner",
    "rec_os_creator_dna",
    "rec_os_influencer_radar",
    "rec_os_growth_analytics",
  ];
  for (const id of GROWTH_CHILDREN) {
    const mod = registry.findModuleById(id);
    assert(mod !== undefined, `${id} está registrado`);
    assert(mod?.dependsOn.includes("rec_os_growth") ?? false, `${id} depende de rec_os_growth`);
    assert((mod?.routes.length ?? -1) === 0, `${id} não declara nenhuma rota -- nenhuma UI criada nesta fundação`);
    assert(mod?.maturity === "planned" || mod?.maturity === "not_implemented", `${id} tem maturidade honesta (planned ou not_implemented, nunca production/preview)`);
  }

  // Cada par "REC OS X" / "X" agência-inteira precisa se referenciar mutuamente,
  // nunca um schema compartilhado silencioso.
  const CROSS_REF_PAIRS: [string, string][] = [
    ["rec_os_creator_dna", "creator_dna"],
    ["rec_os_influencer_radar", "creator_radar"],
    ["rec_os_growth_analytics", "creator_analytics"],
  ];
  for (const [recOsId, globalId] of CROSS_REF_PAIRS) {
    const recOsMod = registry.findModuleById(recOsId);
    const globalMod = registry.findModuleById(globalId);
    assert(!!recOsMod?.description.includes(globalId), `${recOsId} referencia ${globalId} explicitamente na descrição (evita confusão de escopo)`);
    assert(!!globalMod?.notes?.includes(recOsId), `${globalId} referencia ${recOsId} de volta nas notes (cross-reference nos dois sentidos)`);
  }
}

console.log("\n[test 10] LKT Operating Standard + Module Lifecycle Registry V1 -- módulos pedidos registrados, docs existem, nenhuma rota nova real criada");
{
  for (const id of ["meu_escritorio", "minha_organizacao", "empresa_central"]) {
    const mod = registry.findModuleById(id);
    assert(mod !== undefined, `${id} está registrado (gap pré-existente confirmado e corrigido nesta missão)`);
    assert((mod?.routes.length ?? 0) === 1 && (mod?.routes[0].startsWith("/admin/") ?? false), `${id} referencia exatamente a rota real já existente, nenhuma rota nova`);
  }

  const orchestrationDoc = fs.readFileSync(path.join(process.cwd(), "docs/architecture/lkt-orchestration-framework-v1.md"), "utf8");
  assert(orchestrationDoc.includes("LKT Deploy Standard v1"), "doc de orquestração documenta o LKT Deploy Standard");
  assert(orchestrationDoc.includes("Preview") && orchestrationDoc.includes("Production") && orchestrationDoc.includes("Desenvolvimento"), "doc distingue Desenvolvimento/Preview/Production explicitamente");
  assert(orchestrationDoc.includes("nenhum recurso é considerado entregue enquanto não existir Production Deploy") || orchestrationDoc.toLowerCase().includes("production deploy"), "regra 'nada é entregue sem Production Deploy' está documentada");
  assert(orchestrationDoc.includes("Merge --ff-only em main"), "fluxo de deploy documenta merge --ff-only (nunca merge commit)");
  assert(orchestrationDoc.includes("LKT Release Record Standard v1"), "doc documenta o padrão de Release Record");
  assert(orchestrationDoc.includes("LKT Navigation Standard v1"), "doc documenta o padrão de navegação contextual");
  assert(orchestrationDoc.includes("LKT Status Activity Standard v1"), "doc documenta o padrão de Status Activity");

  const lifecycleDoc = fs.readFileSync(path.join(process.cwd(), "docs/architecture/module-lifecycle-registry-v1.md"), "utf8");
  for (const moduleName of ["## REC OS", "## REC OS Growth", "## Meu Negócio", "## Meu Escritório", "## Minha Empresa"]) {
    assert(lifecycleDoc.includes(moduleName), `Module Lifecycle Registry documenta ${moduleName.replace("## ", "")}`);
  }
  assert(lifecycleDoc.includes("growth_os") && lifecycleDoc.includes("rec_os_growth"), "doc mantém GrowthOS e REC OS Growth explicitamente separados");
  assert(!/CREATE TABLE|ALTER TABLE|supabase\.from\(/i.test(lifecycleDoc) && !/CREATE TABLE|ALTER TABLE/i.test(orchestrationDoc), "nenhum dos dois documentos contém SQL/schema -- fundação é só documentação e registry");
}

console.log("\n[test 11] TELEGRAM ADAPTER V1 -- Conversational Layer registrada honestamente (Status não pode mentir)");
{
  const EXPECTED: Record<string, string> = {
    conversation_core: "qa_pending",
    telegram_adapter: "qa_pending",
    telegram_identity_link: "planned",
    telegram_domain_actions: "not_implemented",
    telegram_voice: "coming_soon",
    telegram_approvals: "coming_soon",
    whatsapp_adapter: "planned",
  };
  for (const [id, expectedMaturity] of Object.entries(EXPECTED)) {
    const mod = registry.findModuleById(id);
    assert(mod !== undefined, `${id} está registrado`);
    assert(mod?.maturity === expectedMaturity, `${id} tem maturidade honesta '${expectedMaturity}' (real: '${mod?.maturity}')`);
  }
  assert(registry.findModuleById("telegram_adapter")?.routes.includes("/api/integrations/telegram/webhook") ?? false, "telegram_adapter aponta para a rota real do webhook");
  assert(registry.findModuleById("telegram_identity_link")?.maturity !== "production" && registry.findModuleById("telegram_identity_link")?.maturity !== "qa_pending", "Identity Link nunca aparece como pronto -- nenhuma persistência existe");
  assert(registry.findModuleById("whatsapp_adapter")?.dependsOn.includes("conversation_core") ?? false, "whatsapp_adapter já depende do Conversation Core -- arquitetura preparada para reuso, sem trabalho iniciado");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
