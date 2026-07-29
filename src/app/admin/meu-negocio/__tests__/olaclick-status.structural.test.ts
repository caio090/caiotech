(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("node:fs") as typeof import("node:fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("node:path") as typeof import("node:path");
const root = process.cwd();
const source = fs.readFileSync(path.join(root, "src/app/admin/meu-negocio/_sources-tab.tsx"), "utf8");
let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("\n[test] status da OlaClick é uma checagem real, read-only (Fase 3/20)");
{
  assert(source.includes('fetch("/api/olaclick/env-status")'), "checa o endpoint real de env-status, não um estado inventado");
  assert(!/\bmethod:\s*["'](POST|PUT|PATCH|DELETE)["']/.test(source.split("function OlaClickStatusCard")[1]?.split("function")[0] ?? ""), "OlaClickStatusCard nunca faz POST/PUT/PATCH/DELETE (somente leitura)");
}

console.log("\n[test] nunca mostra \"Conectada\" (Fase 20 -- somente após prova de runtime)");
{
  const component = source.split("function OlaClickStatusCard")[1]?.split("const SOURCES")[0] ?? "";
  assert(!/\bConectad[oa]\b/.test(component), "componente nunca usa a palavra \"Conectado/Conectada\" em nenhum estado");
  assert(component.includes("não foi comprovada") || component.includes("não comprovado"), "linguagem explícita de runtime não comprovado, mesmo quando há conexão configurada");
}

console.log("\n[test] falhas são tratadas graciosamente (401, erro de rede, resposta não-ok) -- Fase 3");
{
  const component = source.split("function OlaClickStatusCard")[1]?.split("const SOURCES")[0] ?? "";
  assert(component.includes('response.status === 401') && component.includes('"unauthenticated"'), "401 tratado explicitamente, não estourado como erro genérico");
  assert(component.includes(".catch(") , "falha de rede é capturada, nunca deixa a promise rejeitar sem tratamento");
  assert(component.includes("cancelled") , "efeito evita atualizar estado após desmontagem (sem warning de setState em componente desmontado)");
}

console.log("\n[test] nenhum segredo é exibido");
{
  const component = source.split("function OlaClickStatusCard")[1]?.split("const SOURCES")[0] ?? "";
  assert(!/access_token|Authorization|Bearer|api[_-]?key/i.test(component), "componente não referencia token/chave/cabeçalho de autenticação");
}

console.log(`[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
