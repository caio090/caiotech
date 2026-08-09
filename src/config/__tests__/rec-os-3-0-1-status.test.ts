/**
 * Executar com: node .tmp/run-ts-test.cjs src/config/__tests__/rec-os-3-0-1-status.test.ts
 */
import { PROJECT_AREAS, V1_PROGRESS, V2_PROGRESS } from "../project-status";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

const NEW_IDS = [
  "rec_os_canonical_creation_flow", "rec_os_briefing_concept_workspace", "rec_os_format_application_matrix",
  "rec_os_finalization_workspace", "rec_os_roadmap", "rec_os_client_map", "rec_os_calendar_handoff",
  "rec_os_editor_handoff", "editor_os_layer_scanner_integration", "paid_media_handoff",
  "mobile_app_shell", "mobile_bottom_navigation", "mobile_quick_action", "crm_mobile_experience",
  "crm_mobile_filters", "business_diagnostic_gateway", "diagnostic_ai_conversation",
  "diagnostic_context_distribution", "business_rhythm_workspace", "osp_definition_audit",
  "visible_reports_naming",
];

console.log("[test] 21 novas áreas registradas, nenhum ID duplicado");
for (const id of NEW_IDS) {
  const matches = PROJECT_AREAS.filter((a) => a.id === id);
  assert(matches.length === 1, `${id}: existe exatamente uma vez`);
}
const allIds = PROJECT_AREAS.map((a) => a.id);
assert(new Set(allIds).size === allIds.length, "nenhum ID duplicado em todo o arquivo (não só os novos)");

console.log("[test] Nenhuma área validated, V1/V2/global_calendar intocados");
for (const id of NEW_IDS) {
  const area = PROJECT_AREAS.find((a) => a.id === id)!;
  assert(area.readiness !== "validated", `${id}: readiness nunca é validated`);
}
// Sprint Recalibração LOKAT OS 2026-08: V1_PROGRESS recalculado
// deliberadamente de 81 para 65 (mesma fórmula calcV1Readiness() já
// existente, sobre o conjunto atual de áreas phase:"v1" -- ver
// docs/recalibration/lokat-os-recalibration-2026-08.md). Este teste
// continua travando o valor contra mudanças ACIDENTAIS futuras, agora
// no novo baseline.
assert(V1_PROGRESS === 65, "V1_PROGRESS recalibrado para 65 (Sprint Recalibração 2026-08)");
assert(V2_PROGRESS === 12, "V2_PROGRESS permanece 12 (não recalculado nesta sprint -- ver justificativa no doc de recalibração)");
const globalCalendar = PROJECT_AREAS.find((a) => a.id === "global_calendar")!;
assert(globalCalendar.readiness === "qa_pending", "global_calendar permanece qa_pending");

console.log("[test] Prioridades P0 (defeitos reais confirmados por print)");
for (const id of ["mobile_app_shell", "mobile_bottom_navigation", "mobile_quick_action", "crm_mobile_experience"]) {
  const area = PROJECT_AREAS.find((a) => a.id === id)!;
  assert(area.priority === "P0", `${id}: priority P0`);
}

console.log("[test] OSP — definition_pending, nunca inventado");
const osp = PROJECT_AREAS.find((a) => a.id === "osp_definition_audit")!;
assert(osp.readiness === "blocked", "OSP fica blocked (falta de informação, não falta de trabalho)");
assert(/definition_pending|nenhuma definição/i.test(osp.notes ?? ""), "notas registram explicitamente a ausência de definição, sem inventar uma");

console.log("[test] CRM adaptativo continua não implementado (regressão)");
const crmAdaptiveCore = PROJECT_AREAS.find((a) => a.id === "crm_adaptive_core");
assert(!!crmAdaptiveCore && crmAdaptiveCore.readiness === "planned", "crm_adaptive_core continua planned (Sprint Recovery 2.1.3, não alterado)");

console.log("[test] Diagnóstico/Rotina do Negócio permanecem planned (nunca implementados às pressas)");
for (const id of ["business_diagnostic_gateway", "diagnostic_ai_conversation", "diagnostic_context_distribution", "business_rhythm_workspace", "paid_media_handoff"]) {
  const area = PROJECT_AREAS.find((a) => a.id === id)!;
  assert(area.readiness === "planned", `${id}: readiness planned (nenhuma implementação nova)`);
}

// Sprint REC OS 3.0.1.1 fechou rec_os_roadmap/rec_os_client_map com telas
// reais (/admin/contentos/roadmap, /admin/contentos/mapa-cliente) — não são
// mais apenas registry. Ver src/config/__tests__/rec-os-3-0-1-1-status.test.ts
// para a cobertura completa da sprint de fechamento.
console.log("[test] rec_os_roadmap/rec_os_client_map avançaram para qa_pending (Sprint REC OS 3.0.1.1)");
for (const id of ["rec_os_roadmap", "rec_os_client_map"]) {
  const area = PROJECT_AREAS.find((a) => a.id === id)!;
  assert(area.readiness === "qa_pending", `${id}: readiness qa_pending (telas reais implementadas na Sprint REC OS 3.0.1.1)`);
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
