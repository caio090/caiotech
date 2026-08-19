/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/lkt-activity/__tests__/lkt-activity.test.ts
 *
 * STATUS LIVE ACTIVITY V1 — testes unitários puros (sem I/O) para
 * validação/ordenação/última-movimentação do LKT Activity Log. A leitura
 * real do arquivo (getLktActivity/store.ts) é coberta pelo teste
 * estrutural, que confere que o arquivo/leitura existem e nunca dependem
 * de Supabase/SQL.
 */
import {
  validateLktActivityEvent,
  sortLktActivityDesc,
  getLatestLktMovement,
  type LktActivityEvent,
} from "../types";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

function baseEvent(overrides: Partial<LktActivityEvent> = {}): LktActivityEvent {
  return {
    id: "evt-999",
    timestamp: "2026-08-19T10:00:00-03:00",
    module: "Test Module",
    title: "Test Title",
    kind: "FEATURE",
    ...overrides,
  };
}

console.log("[test] validateLktActivityEvent — campos obrigatórios");
{
  const missingModule = validateLktActivityEvent({ title: "x", kind: "FEATURE" });
  assert(!missingModule.valid, "rejeita evento sem module");
  assert(missingModule.errors.some(e => e.includes("module")), "erro menciona module");

  const missingTitle = validateLktActivityEvent({ module: "x", kind: "FEATURE" });
  assert(!missingTitle.valid, "rejeita evento sem title");

  const missingKind = validateLktActivityEvent({ module: "x", title: "y" });
  assert(!missingKind.valid, "rejeita evento sem kind");

  const invalidKind = validateLktActivityEvent({ module: "x", title: "y", kind: "NOT_A_KIND" as LktActivityEvent["kind"] });
  assert(!invalidKind.valid, "rejeita kind fora do vocabulário fechado");

  const valid = validateLktActivityEvent({ module: "x", title: "y", kind: "FEATURE" });
  assert(valid.valid, "aceita o mínimo válido (module + title + kind)");
  assert(valid.errors.length === 0, "evento válido não tem erros");
}

console.log("[test] validateLktActivityEvent — regras específicas");
{
  const blockerWithoutReason = validateLktActivityEvent({ module: "x", title: "y", kind: "BLOCKER" });
  assert(!blockerWithoutReason.valid, "BLOCKER sem campo blocker é rejeitado (regra: bloqueio precisa dizer o motivo)");

  const blockerWithReason = validateLktActivityEvent({ module: "x", title: "y", kind: "BLOCKER", blocker: "fixture ausente" });
  assert(blockerWithReason.valid, "BLOCKER com blocker preenchido é aceito");

  const invalidStatus = validateLktActivityEvent({ module: "x", title: "y", kind: "FEATURE", status: "MAYBE" as LktActivityEvent["status"] });
  assert(!invalidStatus.valid, "status fora do vocabulário fechado é rejeitado");

  const invalidEnvironment = validateLktActivityEvent({ module: "x", title: "y", kind: "FEATURE", environment: "staging" as LktActivityEvent["environment"] });
  assert(!invalidEnvironment.valid, "environment fora de local/preview/production é rejeitado");

  const invalidBuild = validateLktActivityEvent({ module: "x", title: "y", kind: "FEATURE", build: "MAYBE" as LktActivityEvent["build"] });
  assert(!invalidBuild.valid, "build fora de PASS/FAIL/NOT_RUN é rejeitado");

  const invalidTests = validateLktActivityEvent({ module: "x", title: "y", kind: "FEATURE", tests: [{ suite: "", passed: -1, failed: 0 }] });
  assert(!invalidTests.valid, "tests[] com suite vazio e passed negativo é rejeitado");
  assert(invalidTests.errors.length >= 2, "reporta um erro por campo de tests[] inválido");

  const validTests = validateLktActivityEvent({ module: "x", title: "y", kind: "FEATURE", tests: [{ suite: "unit", passed: 10, failed: 0 }] });
  assert(validTests.valid, "tests[] bem formado é aceito");
}

console.log("[test] validateLktActivityEvent — nunca aceita campos de segredo");
{
  for (const forbidden of ["secret", "token", "password", "senha", "cookie", "apiKey", "api_key"]) {
    const withSecret = validateLktActivityEvent({ module: "x", title: "y", kind: "FEATURE", [forbidden]: "leak" } as Partial<LktActivityEvent>);
    assert(!withSecret.valid, `rejeita evento contendo o campo '${forbidden}'`);
  }
}

console.log("[test] validateLktActivityEvent — campos opcionais podem ser omitidos");
{
  const onlyRequired = validateLktActivityEvent({ module: "x", title: "y", kind: "RELEASE" });
  assert(onlyRequired.valid, "evento sem description/status/environment/build/deployment/devUrl/nextAction/tests/references é válido");
}

console.log("[test] sortLktActivityDesc — ordena por timestamp decrescente, nunca pela ordem de inserção");
{
  const oldest = baseEvent({ id: "evt-001", timestamp: "2026-01-01T00:00:00-03:00" });
  const middle = baseEvent({ id: "evt-002", timestamp: "2026-06-01T00:00:00-03:00" });
  const newest = baseEvent({ id: "evt-003", timestamp: "2026-08-19T00:00:00-03:00" });

  const sorted = sortLktActivityDesc([oldest, newest, middle]);
  assert(sorted.map(e => e.id).join(",") === "evt-003,evt-002,evt-001", "ordem final é mais-recente-primeiro independente da ordem de entrada");

  const original = [oldest, newest, middle];
  sortLktActivityDesc(original);
  assert(original[0].id === "evt-001", "sortLktActivityDesc não muta o array original (retorna cópia)");
}

console.log("[test] getLatestLktMovement");
{
  const oldest = baseEvent({ id: "evt-001", timestamp: "2026-01-01T00:00:00-03:00" });
  const newest = baseEvent({ id: "evt-003", timestamp: "2026-08-19T00:00:00-03:00" });

  assert(getLatestLktMovement([oldest, newest])?.id === "evt-003", "retorna o evento com timestamp mais recente, não o último do array");
  assert(getLatestLktMovement([]) === null, "retorna null para lista vazia, nunca lança exceção");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
