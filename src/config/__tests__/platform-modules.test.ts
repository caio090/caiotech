(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const registry = require("../platform-modules.ts") as typeof import("../platform-modules");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const capabilities = require("../workspace-capabilities.ts") as typeof import("../workspace-capabilities");
let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

const MATURITIES = new Set(["production", "qa_pending", "preview", "planned", "blocked", "experimental"]);
const SURFACES = new Set(["super_admin", "agency", "agency_client", "direct_business", "operational_user"]);
const KNOWN_CAPABILITIES = new Set(Object.keys(capabilities.SURFACE_LABELS).flatMap((surface) => capabilities.resolveCapabilities(surface as never)));

console.log("\n[test 1] Registry sem IDs duplicados");
{
  const ids = registry.PLATFORM_MODULES.map((m) => m.id);
  assert(new Set(ids).size === ids.length, `${ids.length} módulos, todos com id único`);
}

console.log("\n[test 2] Rotas válidas (começam com /admin)");
{
  const invalid = registry.PLATFORM_MODULES.flatMap((m) => m.routes).filter((route) => !route.startsWith("/admin"));
  assert(invalid.length === 0, `todas as rotas começam com /admin (inválidas: ${invalid.join(", ") || "nenhuma"})`);
  assert(registry.PLATFORM_MODULES.every((m) => m.routes.length > 0), "todo módulo declara ao menos uma rota");
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

console.log(`\n[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
