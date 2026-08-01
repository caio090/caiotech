/**
 * Executar com: node .tmp/run-ts-test.cjs src/config/__tests__/delivery-status.test.ts
 */
import {
  resolveDeliveryStatus, computeOverdueDays, compareForStatusPanel,
  MVP_INTERNO_AGOSTO_2026, MVP_RECOVERY_CHECKPOINTS, MODULE_VALIDATION_REQUIREMENTS,
  type DeliveryExecutionFields,
} from "../delivery-status";

let passed = 0;
let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

const base: DeliveryExecutionFields = { readiness: "qa_pending" };

console.log("[test] resolveDeliveryStatus — casos centrais");
assert(resolveDeliveryStatus({ readiness: "validated" }, "2026-08-01") === "completed", "readiness=validated sempre vira completed");
assert(resolveDeliveryStatus({ ...base, releaseBlocker: true }, "2026-08-01") === "blocked", "releaseBlocker=true vira blocked");
assert(resolveDeliveryStatus({ ...base, blockers: ["dependência externa"] }, "2026-08-01") === "blocked", "blockers não-vazio vira blocked");
assert(resolveDeliveryStatus({ ...base, validationRequired: ["authenticated_local_qa"] }, "2026-08-01") === "waiting_validation", "validationRequired sem evidência vira waiting_validation");
assert(resolveDeliveryStatus({ ...base, validationRequired: ["authenticated_local_qa"], validationEvidence: "QA feito em 01/08" }, "2026-08-01") === "planned", "validationRequired COM evidência não fica preso em waiting_validation");

console.log("[test] Datas e atraso — nunca negativo, nunca NaN");
assert(computeOverdueDays("2026-08-01", "2026-08-05") === 4, "4 dias de atraso calculados corretamente");
assert(computeOverdueDays("2026-08-05", "2026-08-01") === null, "data futura nunca é 'atraso negativo' — retorna null");
assert(computeOverdueDays("2026-08-01", "2026-08-01") === null, "vencendo hoje não é atraso ainda");
assert(computeOverdueDays(undefined, "2026-08-01") === null, "sem targetDate, sem atraso — nunca NaN");
assert(!Number.isNaN(computeOverdueDays("2026-08-01", "2026-08-05")), "resultado nunca é NaN");

console.log("[test] resolveDeliveryStatus — prazo");
assert(resolveDeliveryStatus({ ...base, targetDate: "2026-08-01" }, "2026-08-03") === "overdue", "prazo vencido vira overdue");
assert(resolveDeliveryStatus({ ...base, targetDate: "2026-08-02" }, "2026-08-01") === "at_risk", "prazo em 1 dia vira at_risk (janela de 2 dias)");
assert(resolveDeliveryStatus({ ...base, targetDate: "2026-08-10" }, "2026-08-01") === "on_track", "prazo distante vira on_track");
assert(resolveDeliveryStatus(base, "2026-08-01") === "planned", "sem prazo e sem bloqueio vira planned");

console.log("[test] Status concluído nunca fica overdue");
assert(resolveDeliveryStatus({ readiness: "validated", targetDate: "2020-01-01" }, "2026-08-01") === "completed", "validated com prazo muito antigo continua completed, nunca overdue");

console.log("[test] Ordenação do painel de status (P0 bloqueado primeiro)");
const items = [
  { priority: "P2" as const, status: "on_track" as const },
  { priority: "P0" as const, status: "blocked" as const },
  { priority: "P1" as const, status: "overdue" as const },
  { priority: "P3" as const, status: "completed" as const },
];
const sorted = [...items].sort(compareForStatusPanel);
assert(sorted[0].status === "blocked", "bloqueado aparece primeiro");
assert(sorted[sorted.length - 1].status === "completed", "concluído aparece por último");
assert(sorted[1].status === "overdue", "atrasado aparece logo depois de bloqueado");

console.log("[test] Marco MVP_INTERNO_AGOSTO_2026");
assert(MVP_INTERNO_AGOSTO_2026.targetDate === "2026-08-07", "marco existe com data-alvo 2026-08-07");
assert(MVP_RECOVERY_CHECKPOINTS.length === 7, "7 checkpoints de 01 a 07 de agosto");
assert(MVP_RECOVERY_CHECKPOINTS.every((c) => c.completed === false), "nenhum checkpoint começa concluído");
assert(MVP_RECOVERY_CHECKPOINTS[MVP_RECOVERY_CHECKPOINTS.length - 1].date === "2026-08-07", "último checkpoint é o início do uso diário interno");
assert(new Set(MVP_RECOVERY_CHECKPOINTS.map((c) => c.date)).size === 7, "datas dos checkpoints são únicas");

console.log("[test] Matriz de validação por módulo");
assert(MODULE_VALIDATION_REQUIREMENTS.some((m) => m.moduleId === "workspaces_core"), "Workspaces tem requisitos de validação registrados");
assert(MODULE_VALIDATION_REQUIREMENTS.some((m) => m.moduleId === "business_strategy_workspace"), "DNA & Estratégia tem requisitos de validação registrados");
const googleCalendar = MODULE_VALIDATION_REQUIREMENTS.find((m) => m.moduleId === "global_calendar_google");
assert(!!googleCalendar && googleCalendar.requiredStages.includes("real_data_validation"), "Google Calendar exige validação com dado real (integração planejada não vira validada só porque o contrato compila)");

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
