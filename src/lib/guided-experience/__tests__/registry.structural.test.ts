/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/guided-experience/__tests__/registry.structural.test.ts
 * Prompt 13 (REC OS Core Experience) — Fase 35/36/37: registry declarativo
 * + persistência localStorage (nunca banco, nunca bloqueia a experiência).
 */

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

function fakeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  };
}

async function main() {
  console.log("[test] SSR (sem window) -- nunca lança, first-run tratado como 'já visto' (nunca bloqueia render)");
  {
    const { hasSeenFirstRun, markFirstRunSeen, resetFirstRun } = await import("../registry");
    assert(hasSeenFirstRun("studio") === true, "sem window -> 'já visto' (não força modal em SSR)");
    markFirstRunSeen("studio"); // não deve lançar
    resetFirstRun("studio"); // não deve lançar
    assert(true, "markFirstRunSeen/resetFirstRun nunca lançam sem window");
  }

  console.log("[test] com window/localStorage fake -- ciclo completo ver -> marcar -> reabrir (Fase 36)");
  {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = { localStorage: fakeLocalStorage() };
    const { hasSeenFirstRun, markFirstRunSeen, resetFirstRun, FEATURE_GUIDE_REGISTRY } = await import(`../registry?t=${Date.now()}`);

    assert(hasSeenFirstRun("studio") === false, "nunca visto ainda -> false");
    markFirstRunSeen("studio");
    assert(hasSeenFirstRun("studio") === true, "depois de marcado -> true");
    resetFirstRun("studio");
    assert(hasSeenFirstRun("studio") === false, "Fase 36: reabrir ajuda -- reset funciona, nunca 'visto uma vez, nunca mais'");

    assert(hasSeenFirstRun("rec-os") === false, "chaves por feature são independentes -- marcar 'studio' não afeta 'rec-os'");

    console.log("[test] localStorage indisponível/lança -- nunca derruba a chamada (Fase 37)");
    (globalThis as any).window = {
      localStorage: {
        getItem() { throw new Error("blocked"); },
        setItem() { throw new Error("blocked"); },
        removeItem() { throw new Error("blocked"); },
      },
    };
    const mod2 = await import(`../registry?t=${Date.now()}-2`);
    assert(mod2.hasSeenFirstRun("studio") === true, "getItem lançando -> degrada pra 'já visto', nunca lança");
    mod2.markFirstRunSeen("studio");
    mod2.resetFirstRun("studio");
    assert(true, "setItem/removeItem lançando nunca propaga -- guided experience nunca bloqueia a UI real");

    delete (globalThis as any).window;

    console.log("[test] estrutura do registry -- first-run curto (nunca modal grande), feature 'studio' cobre os 5 conceitos centrais");
    assert(FEATURE_GUIDE_REGISTRY.studio.firstRun.points.length <= 6, "first-run do Studio continua curto (frases, não um documento)");
    assert(FEATURE_GUIDE_REGISTRY["rec-os"].firstRun.points.length === 3, "first-run do REC OS explica Criar/Studio/EditorOS em 3 frases, nunca jargão extenso");
    assert(FEATURE_GUIDE_REGISTRY.studio.emptyStates.some((e: { id: string }) => e.id === "instagram_not_connected"), "empty state 'Instagram não conectado' presente (Fase 09/35)");
  }

  console.log(`\n[result] ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
