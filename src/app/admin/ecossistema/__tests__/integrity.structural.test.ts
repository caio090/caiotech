(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("node:fs") as typeof import("node:fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("node:path") as typeof import("node:path");
const root = process.cwd();
let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

/** Todos os arquivos novos desta sprint (LOKAT Core 2.1). */
const SPRINT_FILES = [
  "src/config/platform-modules.ts",
  "src/config/business-niche-packs.ts",
  "src/app/admin/ecossistema/page.tsx",
  "src/app/admin/ecossistema/_ecosystem-client.tsx",
  "src/lib/product-research/types.ts",
  "src/lib/product-research/fixtures.ts",
  "src/lib/product-research/analyzer.ts",
  "src/lib/data-hub/types.ts",
  "src/lib/data-hub/sources.ts",
  "src/lib/data-hub/capabilities.ts",
  "src/lib/data-hub/provenance.ts",
  "src/lib/data-hub/confidence.ts",
  "src/lib/data-hub/quality.ts",
  "src/lib/data-hub/normalizers.ts",
  "src/lib/data-hub/registry.ts",
  "src/lib/data-hub/events.ts",
  "src/lib/business-profile/types.ts",
  "src/lib/intelligence/types.ts",
  "src/lib/intelligence/availability.ts",
  "src/lib/intelligence/capabilities.ts",
  "src/lib/intelligence/context-builder.ts",
  "src/lib/intelligence/module-context.ts",
  "src/lib/intelligence/actions.ts",
  "src/lib/intelligence/recommendations.ts",
  "src/components/intelligence/intelligence-action-button.tsx",
  "src/components/intelligence/context-help-card.tsx",
  "src/components/intelligence/field-explanation.tsx",
  "src/components/intelligence/missing-information-alert.tsx",
  "src/components/intelligence/next-step-suggestion.tsx",
  "src/lib/reports/view-modes.ts",
  "src/lib/financial-reconciliation/types.ts",
  "src/lib/financial-reconciliation/calculations.ts",
  "src/lib/global-calendar-v2/types.ts",
  "src/lib/global-calendar-v2/providers.ts",
  "src/lib/global-calendar-v2/location.ts",
  "src/lib/global-calendar-v2/holidays.ts",
  "src/lib/domain-events/types.ts",
  "src/lib/domain-events/registry.ts",
  "src/lib/domain-events/bridges.ts",
  "src/lib/domain-events/canonical-flow.ts",
  "src/lib/operational-templates/types.ts",
  "src/lib/messaging/types.ts",
  "src/lib/fiscal/types.ts",
];

const sources = SPRINT_FILES.map((relativePath) => ({ relativePath, content: fs.readFileSync(path.join(root, relativePath), "utf8") }));
const allSource = sources.map((entry) => entry.content).join("\n");

console.log("\n[test 37] Blueprint sem persistência");
{
  const persistencePatterns = [/from ["']@supabase/, /createClient\(/, /\.from\(["']\w+["']\)\.insert/, /\.from\(["']\w+["']\)\.update/, /\.from\(["']\w+["']\)\.delete/];
  const offenders = sources.filter((entry) => persistencePatterns.some((pattern) => pattern.test(entry.content)));
  assert(offenders.length === 0, `nenhum arquivo desta sprint importa Supabase ou faz insert/update/delete (ofensores: ${offenders.map((o) => o.relativePath).join(", ") || "nenhum"})`);
}

console.log("\n[test 38] Nenhuma API externa chamada");
{
  const externalCallPatterns = [/fetch\(/, /axios\./, /new (WebSocket|EventSource)\(/];
  const offenders = sources.filter((entry) => externalCallPatterns.some((pattern) => pattern.test(entry.content)));
  assert(offenders.length === 0, `nenhum arquivo desta sprint chama fetch/axios/WebSocket diretamente (ofensores: ${offenders.map((o) => o.relativePath).join(", ") || "nenhum"})`);
}

console.log("\n[test 39] Mobile structure (390x844)");
{
  const client = sources.find((entry) => entry.relativePath === "src/app/admin/ecossistema/_ecosystem-client.tsx")!.content;
  assert(client.includes("overflow-x-auto"), "abas rolam horizontalmente em vez de estourar a largura (390px)");
  assert(/sm:grid-cols-\d/.test(client), "grids usam breakpoint sm: -- uma coluna em mobile, múltiplas a partir de sm:");
  assert(!client.includes("hover:") || client.includes("onClick"), "nenhuma ação depende só de hover -- toda interação relevante também tem onClick");
  assert(client.includes("flex-wrap"), "layout usa flex-wrap para não estourar horizontalmente em telas estreitas");
}

console.log("\n[test 40] Nenhum segredo exposto");
{
  const secretPatterns = [/OPENAI_API_KEY\s*[:=]\s*["'][^"']+["']/, /GEMINI_API_KEY\s*[:=]\s*["'][^"']+["']/, /service_role/i, /sk-[a-zA-Z0-9]{20,}/];
  const offenders = sources.filter((entry) => secretPatterns.some((pattern) => pattern.test(entry.content)));
  assert(offenders.length === 0, `nenhum arquivo desta sprint contém chave/token hardcoded (ofensores: ${offenders.map((o) => o.relativePath).join(", ") || "nenhum"})`);
  assert(!allSource.includes("NEXT_PUBLIC_OPENAI"), "nenhuma variável de ambiente de IA referenciada nesta sprint");
}

console.log("\n[test] Nenhuma integração real (google calendar OAuth real, whatsapp real, olaclick, aipede)");
{
  assert(!/google\.oauth2|googleapis\.com/.test(allSource), "nenhuma chamada real a APIs do Google");
  assert(!allSource.includes("olaclick") && !allSource.includes("aipede"), "nenhuma referência a integrações reais de OlaClick/AiPede nesta sprint");
  assert(!/new Evolution|evolution-api\.com/.test(allSource), "nenhuma instância real de Evolution API");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
