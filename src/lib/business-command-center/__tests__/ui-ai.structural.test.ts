(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("node:fs") as typeof import("node:fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("node:path") as typeof import("node:path");
const root = process.cwd(); const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const overview = read("src/app/admin/meu-negocio/_restaurant-overview.tsx"); const products = read("src/app/admin/meu-negocio/_product-command-center.tsx"); const ai = read("src/lib/business-command-center/ai.ts"); const route = read("src/app/api/meu-negocio/ai/analyze/route.ts"); const selector = read("src/app/admin/meu-negocio/_company-selector.tsx"); const layout = read("src/app/admin/_layout-client.tsx"); const cmv = read("src/app/admin/meu-negocio/_cmv-center.tsx");
let passed = 0, failed = 0; const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };
for (const token of ["Centro de comando", "Pergunte à Lokat", "Como calculamos", "Situação das fontes", "O que precisa da sua atenção"]) assert(overview.includes(token), `dashboard contém ${token}`);
assert(selector.includes("Exemplo simulado"), "Duh possui selo individual"); assert(layout.includes('userRole === "super_admin" ? "Super Admin"'), "papel visual usa role canônica");
for (const label of ["Estrela", "Muito vendido, mas deixa pouco resultado", "Rentável, mas pouco conhecido", "Baixo desempenho"]) assert(cmv.includes(label), `quadrante simples ${label}`);
assert(cmv.includes("Ver detalhes no Modo Gestor"), "visão simples recolhe detalhes"); assert(cmv.includes("Produtos analisados"), "matriz possui legenda");
for (const token of ["Buscar nome", "Ficha técnica", "Custo por porção", "Revisar vínculo", "somente nesta sessão"]) assert(products.includes(token), `produtos contém ${token}`);
assert(ai.includes("client.responses.create"), "Responses API"); assert(ai.includes("store: false"), "store false"); assert(ai.includes('type: "json_schema"'), "JSON Schema estrito"); assert(!ai.includes("web_search"), "web search desabilitada"); assert(!ai.match(/model:\s*["']/), "modelo não hardcodado");
assert(route.includes("getCurrentUser"), "rota autentica server-side"); assert(route.includes("MAX_INPUT = 500"), "input limitado"); assert(route.includes("MAX_REQUESTS = 8"), "rate limit"); assert(route.includes("TIMEOUT_MS = 15_000"), "timeout"); assert(route.includes("Assistente IA ainda não configurado"), "fallback sem chave"); assert(!route.includes("console.log"), "sem log de payload");
console.log(`[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();

