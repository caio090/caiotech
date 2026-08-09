/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/__tests__/project-status.test.ts
 *
 * Sprint Recalibração LOKAT OS 2026-08 (correção pós-auditoria
 * independente) — este teste existe para nunca deixar
 * src/lib/project-status.ts (a fachada exibida na interface) divergir
 * de src/config/project-status.ts (o sistema canônico) de novo, do jeito
 * que já aconteceu (81% na tela vs. 65% na recalibração).
 */
import { V1_PROGRESS as LIB_V1, V2_PROGRESS as LIB_V2 } from "../project-status";
import { V1_PROGRESS as CONFIG_V1, V2_PROGRESS as CONFIG_V2 } from "../../config/project-status";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("[test] src/lib/project-status.ts é uma fachada de src/config/project-status.ts, nunca um segundo valor independente");
assert(LIB_V1 === CONFIG_V1, "V1_PROGRESS da fachada é idêntico ao canônico (mesma referência de módulo)");
assert(LIB_V2 === CONFIG_V2, "V2_PROGRESS da fachada é idêntico ao canônico (mesma referência de módulo)");

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
