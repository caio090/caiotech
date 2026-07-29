(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("node:fs") as typeof import("node:fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("node:path") as typeof import("node:path");
const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const section = read("src/components/motion/motion-section.tsx");
const stagger = read("src/components/motion/motion-stagger.tsx");
const workspace = read("src/app/admin/meu-negocio/_restaurant-workspace.tsx");
let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("\n[test] canUseDecorativeWebGL -- comportamento real sob no-preference vs reduced motion (não apenas texto)");
{
  type MediaState = Record<string, boolean>;
  function withEnvironment<T>(width: number, media: MediaState, run: () => T): T {
    const globalAny = globalThis as unknown as { innerWidth: number; matchMedia: (query: string) => { matches: boolean } };
    const previousWidth = globalAny.innerWidth;
    const previousMatchMedia = globalAny.matchMedia;
    globalAny.innerWidth = width;
    globalAny.matchMedia = (query: string) => ({ matches: media[query] ?? false });
    try { return run(); } finally { globalAny.innerWidth = previousWidth; globalAny.matchMedia = previousMatchMedia; }
  }
  function loadFresh() {
    const modulePath = require.resolve("../motion-preferences.ts");
    delete require.cache[modulePath];
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("../motion-preferences.ts") as typeof import("../motion-preferences");
  }

  const desktopNoPreference = withEnvironment(1440, { "(pointer: coarse)": false, "(prefers-reduced-motion: reduce)": false }, () => loadFresh().canUseDecorativeWebGL());
  assert(desktopNoPreference === true, "desktop + no-preference + ponteiro fino -> WebGL decorativo PERMITIDO (Orb elegível)");

  const desktopReduced = withEnvironment(1440, { "(pointer: coarse)": false, "(prefers-reduced-motion: reduce)": true }, () => loadFresh().canUseDecorativeWebGL());
  assert(desktopReduced === false, "desktop + reduced motion -> WebGL decorativo BLOQUEADO");

  const mobileNoPreference = withEnvironment(390, { "(pointer: coarse)": true, "(prefers-reduced-motion: reduce)": false }, () => loadFresh().canUseDecorativeWebGL());
  assert(mobileNoPreference === false, "mobile (390px) + no-preference -> WebGL decorativo BLOQUEADO (largura manda, não a preferência de movimento)");

  const tabletCoarsePointer = withEnvironment(1024, { "(pointer: coarse)": true, "(prefers-reduced-motion: reduce)": false }, () => loadFresh().canUseDecorativeWebGL());
  assert(tabletCoarsePointer === false, "largura desktop mas ponteiro coarse (touch) -> WebGL decorativo BLOQUEADO");
}

console.log("\n[test] animação normal só existe sob no-preference (gsap.matchMedia), nunca por padrão");
{
  for (const [label, src] of [["MotionSection", section], ["MotionStagger", stagger]] as const) {
    assert(src.includes('media.add("(prefers-reduced-motion: no-preference)"'), `${label} só registra a animação de entrada dentro do matchMedia no-preference`);
    assert(src.includes("media.revert()"), `${label} reverte o matchMedia no cleanup (sem listener/timeline órfã)`);
    assert(!/className="[^"]*opacity-0/.test(src) && !/style=\{\{[^}]*opacity:\s*0/.test(src), `${label} não esconde o conteúdo via className/style estático (conteúdo disponível antes da animação rodar)`);
  }
  assert(section.includes("dependencies: [motionKey], revertOnUpdate: true"), "MotionSection reverte e recria a timeline a cada motionKey (sem acumular/duplicar execução do GSAP ao trocar de área)");
}

console.log("\n[test] Framer Motion não coexiste com GSAP no escopo do Meu Negócio (sem conflito de propriedade)");
{
  assert(!/framer-motion/.test(section) && !/framer-motion/.test(stagger) && !/framer-motion/.test(workspace), "nenhum arquivo de motion do Meu Negócio importa framer-motion");
}

console.log(`[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
