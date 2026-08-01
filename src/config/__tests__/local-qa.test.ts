/**
 * Executar com: node .tmp/run-ts-test.cjs src/config/__tests__/local-qa.test.ts
 */
import { LOCAL_QA_CONFIG, isOfficialQaPort } from "../local-qa";

let passed = 0;
let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("[test] Regra das portas");
assert(LOCAL_QA_CONFIG.qaPort === 3100, "porta oficial de QA é 3100");
assert(LOCAL_QA_CONFIG.productionLocalPort === 3200, "Production local é 3200");
assert(LOCAL_QA_CONFIG.freeDevPort === 3000, "3000 é a porta de desenvolvimento livre");
assert(isOfficialQaPort(3100) === true, "3100 é reconhecida como porta oficial de QA");
assert(isOfficialQaPort(3000) === false, "3000 nunca é reconhecida como QA oficial");
assert(isOfficialQaPort(3101) === false, "3101 não é uma porta oficial (nenhum fallback automático)");

console.log("[test] Fonte única de configuração");
assert(LOCAL_QA_CONFIG.qaBaseUrl === `http://${LOCAL_QA_CONFIG.qaHost}:${LOCAL_QA_CONFIG.qaPort}`, "qaBaseUrl é derivado de qaHost+qaPort, não redigitado");
assert(LOCAL_QA_CONFIG.productionLocalBaseUrl === `http://${LOCAL_QA_CONFIG.qaHost}:${LOCAL_QA_CONFIG.productionLocalPort}`, "productionLocalBaseUrl é derivado, não redigitado");

console.log("[test] Rotas esperadas do smoke");
assert(LOCAL_QA_CONFIG.expectedRoutes.includes("/"), "rota raiz presente");
for (const route of ["/admin/dashboard", "/admin/ecossistema", "/admin/meu-negocio", "/admin/contentos", "/admin/relatorios", "/admin/calendario", "/admin/visualizar"]) {
  assert(LOCAL_QA_CONFIG.expectedRoutes.includes(route), `rota esperada presente: ${route}`);
}
assert(LOCAL_QA_CONFIG.expectedUnauthenticatedStatus.root === 200, "raiz sem sessão espera HTTP 200");
assert(LOCAL_QA_CONFIG.expectedUnauthenticatedStatus.adminRedirect === 307, "rotas /admin sem sessão esperam redirect 307 (não é tratado como erro)");

console.log("[test] Timezone e fuso");
assert(LOCAL_QA_CONFIG.timezone === "America/Fortaleza", "fuso operacional é America/Fortaleza");

console.log("[test] Sessão nunca commitada");
assert(LOCAL_QA_CONFIG.sessionFile.startsWith(".tmp/"), "arquivo de sessão vive em .tmp/ (gitignored)");

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
