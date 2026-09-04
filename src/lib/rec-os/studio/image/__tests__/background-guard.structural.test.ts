/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/rec-os/studio/image/__tests__/background-guard.structural.test.ts
 * Prompt 13 (REC OS Core Experience) — Fase 26/27/28: applyBackgroundGuardPolicy
 * é pura, sem I/O.
 */
import { applyBackgroundGuardPolicy, BACKGROUND_GUARD_STATUS } from "../background-guard";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

async function main() {
  console.log("[test] política sempre anexada ao prompt real");
  {
    const result = applyBackgroundGuardPolicy("Cenário de café ensolarado, tons quentes.");
    assert(result.startsWith("Cenário de café ensolarado, tons quentes."), "prompt original preservado no início, nunca reordenado");
    assert(/NUNCA inclua texto, palavras, letras/i.test(result), "proíbe texto explicitamente");
    assert(/NUNCA inclua logotipos, marcas d'água/i.test(result), "proíbe logo/marca d'água explicitamente");
    assert(/interface \(botões, menus, ícones/i.test(result), "proíbe UI falsa explicitamente");
    assert(/branding decorativo/i.test(result), "proíbe branding decorativo explicitamente");
  }

  console.log("[test] prompt vazio -- ainda devolve a política, nunca string vazia");
  {
    const result = applyBackgroundGuardPolicy("");
    assert(result.length > 0, "nunca vazio");
    assert(/NUNCA inclua texto/i.test(result), "política presente mesmo sem prompt base");
  }

  console.log("[test] prompt com espaços nas bordas -- trim aplicado, sem duplicar espaços");
  {
    const result = applyBackgroundGuardPolicy("   fundo minimalista   ");
    assert(result.startsWith("fundo minimalista\n\n"), "trim aplicado ao prompt original antes de anexar a política");
  }

  console.log("[test] status do guard -- prevention_only, nunca finge validação automatizada");
  {
    assert(BACKGROUND_GUARD_STATUS === "prevention_only", "status honesto: só prevenção (Defesa 1), Defesa 2 não implementada nesta sprint");
  }

  console.log(`\n[result] ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
