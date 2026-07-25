/**
 * Fase 13 do hotfix 1.0.5 — cobre o contrato de fonte (blueprint vs real) do
 * seletor de workspaces (src/app/api/admin/workspaces/route.ts), e a
 * garantia central deste hotfix: um branch `source === "blueprint"` nunca
 * referencia Supabase.
 *
 * Por que uma checagem estrutural, e não um teste HTTP end-to-end: a causa
 * raiz do bug desta sprint (P1 do QA 1.0.4 — os três blueprints retornavam
 * "Nenhum registro encontrado") era que a rota exigia
 * SUPABASE_SERVICE_ROLE_KEY (ausente neste .env.local, confirmado por
 * grep) ANTES de sequer olhar para surface/source — bloqueando também os
 * ramos que nunca deveriam precisar de Supabase. Provar "este branch nunca
 * chama Supabase" é uma pergunta sobre a FORMA do código, não sobre
 * comportamento em runtime, e testar isso exige uma sessão real de
 * super_admin (não disponível neste sandbox) só para chegar depois dela.
 * Este teste extrai o texto de cada bloco `source === "blueprint"` do
 * arquivo real (por contagem de chaves, não regex frágil) e confirma que
 * nenhum identificador ligado ao Supabase aparece nele — e, para provar que
 * o teste não é vácuo, confirma que esses mesmos identificadores SÃO
 * encontrados no restante do arquivo (o caminho "real").
 *
 * Roda com `node` puro, sem framework de teste instalado no projeto:
 *   node src/lib/workspaces/__tests__/workspace-picker-source.test.ts
 */
(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { readFileSync } = require("fs") as typeof import("fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { join } = require("path") as typeof import("path");

let passed = 0;
let failed = 0;
function assert(condition: boolean, label: string) {
  if (condition) { passed++; console.log(`  ok   - ${label}`); }
  else { failed++; console.error(`  FAIL - ${label}`); }
}

const ROUTE_PATH = join(__dirname, "..", "..", "..", "app", "api", "admin", "workspaces", "route.ts");
const SOURCE_TEXT = readFileSync(ROUTE_PATH, "utf8");

const SUPABASE_IDENTIFIERS = ["adminDb", "hasSupabaseServiceRoleKey", "createRequiredSupabaseAdminClient"];

/**
 * Extracts the body of every `if (source === "blueprint" ...) { ... }` block
 * by counting braces from the opening `{`. Matches both the plain form and
 * the agency_client form (`source === "blueprint" || !agencyId || ...`) —
 * searches for the condition substring, not a fixed full `if (...)` shape.
 */
function extractBlueprintBlocks(text: string): string[] {
  const marker = 'source === "blueprint"';
  const blocks: string[] = [];
  let searchFrom = 0;
  for (;;) {
    const markerIndex = text.indexOf(marker, searchFrom);
    if (markerIndex === -1) break;
    const openBrace = text.indexOf("{", markerIndex);
    let depth = 0;
    let i = openBrace;
    for (; i < text.length; i++) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    blocks.push(text.slice(openBrace, i + 1));
    searchFrom = i + 1;
  }
  return blocks;
}

console.log("[test] workspace-picker-source — structural contract of route.ts");

const blueprintBlocks = extractBlueprintBlocks(SOURCE_TEXT);
assert(blueprintBlocks.length === 3, `found exactly 3 "source === blueprint" blocks (one per surface), found ${blueprintBlocks.length}`);

for (const [i, block] of blueprintBlocks.entries()) {
  for (const id of SUPABASE_IDENTIFIERS) {
    assert(!block.includes(id), `blueprint block #${i + 1} never references ${id}`);
  }
}

// Sanity: the same identifiers DO appear elsewhere in the file (the real
// path) — proves the absence above is meaningful, not a vacuous match
// against an empty/truncated file.
for (const id of SUPABASE_IDENTIFIERS) {
  assert(SOURCE_TEXT.includes(id), `${id} is used somewhere in route.ts (the real-source path) — the test file itself is not stale/broken`);
}

// The three blueprint fixture names must appear verbatim, matching the
// exact strings the ticket requires.
assert(SOURCE_TEXT.includes("BLUEPRINT_AGENCY"), "route.ts references BLUEPRINT_AGENCY");
assert(SOURCE_TEXT.includes("BLUEPRINT_AGENCY_CLIENTS"), "route.ts references BLUEPRINT_AGENCY_CLIENTS");
assert(SOURCE_TEXT.includes("BLUEPRINT_DIRECT_BUSINESS"), "route.ts references BLUEPRINT_DIRECT_BUSINESS");

// "source" defaults to blueprint, never real, when the query param is absent.
assert(
  /source.*=.*req\.nextUrl\.searchParams\.get\("source"\)\s*===\s*"real"\s*\?\s*"real"\s*:\s*"blueprint"/.test(SOURCE_TEXT),
  "source defaults to \"blueprint\" whenever ?source=real is not explicitly passed"
);

console.log(`\n[test] workspace-picker-source — ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
})();
