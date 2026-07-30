(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const trap = require("../use-focus-trap.ts") as typeof import("../use-focus-trap");
let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("\n[test] resolveFocusTarget -- comportamento real do ciclo de foco (não apenas texto)");
{
  type El = { id: string };
  const close: El = { id: "close" };
  const link: El = { id: "revisar-vinculo" };
  const fechar: El = { id: "fechar" };
  const focusable = [close, link, fechar];
  const inside = () => true;
  const outside = () => false;

  assert(trap.resolveFocusTarget(focusable, fechar, inside, false) === close, "Tab no último elemento (Fechar) volta para o primeiro (Fechar do topo)");
  assert(trap.resolveFocusTarget(focusable, close, inside, true) === fechar, "Shift+Tab no primeiro elemento volta para o último");
  assert(trap.resolveFocusTarget(focusable, link, inside, false) === null, "Tab em um elemento do meio não força nada (deixa o navegador seguir a ordem natural)");
  assert(trap.resolveFocusTarget(focusable, link, inside, true) === null, "Shift+Tab em um elemento do meio não força nada");
  assert(trap.resolveFocusTarget(focusable, null, outside, false) === close, "foco fora do container (escapou) é trazido de volta ao primeiro elemento em Tab");
  assert(trap.resolveFocusTarget(focusable, null, outside, true) === fechar, "foco fora do container é trazido de volta ao último elemento em Shift+Tab");
  assert(trap.resolveFocusTarget([], close, inside, false) === null, "lista vazia de focáveis não quebra a função (fallback tratado no hook, via container.focus())");
  assert(trap.resolveFocusTarget([close], close, inside, false) === close, "único elemento focável: Tab nele mesmo mantém o próprio elemento (não escapa)");
  assert(trap.resolveFocusTarget([close], close, inside, true) === close, "único elemento focável: Shift+Tab nele mesmo mantém o próprio elemento");
}

console.log(`[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
