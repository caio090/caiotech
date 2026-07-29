(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("node:fs") as typeof import("node:fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("node:path") as typeof import("node:path");
const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const panel = read("src/app/admin/meu-negocio/_ask-lokat-panel.tsx");
const orb = read("src/components/motion/lokat-intelligence-orb.tsx");
const preferences = read("src/lib/motion/motion-preferences.ts");
let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("\n[test] fallback estático do Orb visível no mobile e reduced motion (bug relatado no QA visual)");
{
  const wrapperLine = panel.split("\n").find((line) => line.includes("<LokatIntelligenceOrb")) ?? "";
  assert(!/\bhidden\b/.test(wrapperLine), "wrapper do Orb não usa a classe hidden (display:none) que escondia o fallback abaixo de 768px");
  assert(!/md:block/.test(wrapperLine), "wrapper do Orb não depende de md:block para aparecer");
  assert(panel.includes("<LokatIntelligenceOrb"), "Orb continua renderizado dentro do Assistente");
}

console.log("\n[test] Three.js continua fora do caminho de fallback (sem regressão)");
{
  assert(orb.includes("if (!container || !canUseDecorativeWebGL()) return;"), "efeito retorna antes de qualquer import(\"three\") quando WebGL decorativo não é permitido");
  assert(orb.split("if (!container || !canUseDecorativeWebGL()) return;")[0]?.includes('import("three")') !== true, "import(\"three\") nunca ocorre antes do gate de compatibilidade");
  assert(preferences.includes("innerWidth >= 768"), "gate de largura mínima para WebGL decorativo preservado");
  assert(preferences.includes("prefers-reduced-motion: reduce"), "gate de reduced motion para WebGL decorativo preservado");
  assert(orb.includes("useState(true)"), "estado do componente começa como fallback (visível) até o WebGL confirmar sucesso");
  assert((orb.match(/<canvas/g) ?? []).length === 0, "componente não declara <canvas> estático; o canvas só existe via WebGLRenderer quando permitido");
}

console.log("\n[test] dimensões estáveis (sem layout shift estrutural)");
{
  assert(orb.includes('className="relative grid h-44 w-44 place-items-center"'), "contêiner do Orb mantém dimensões fixas em qualquer estado (canvas ou fallback)");
}

console.log(`[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
