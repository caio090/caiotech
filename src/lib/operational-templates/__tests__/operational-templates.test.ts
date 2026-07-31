(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const templates = require("../types.ts") as typeof import("../types");
let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("\n[test 36] Operational template");
{
  assert(templates.DEMO_OPERATIONAL_TEMPLATES.length > 0, "existe ao menos uma fixture de OperationalTemplate");
  const template = templates.DEMO_OPERATIONAL_TEMPLATES[0];
  assert(template.nichePackId === "food_service", "template de exemplo está associado a um nichePackId real");
  assert(template.steps.every((step) => "responsible" in step || step.responsible === undefined), "cada etapa suporta responsável (núcleo universal: tarefa/responsável/prazo/status)");
  const dependentStep = template.steps.find((step) => step.dependsOnStepId);
  assert(dependentStep !== undefined, "ao menos uma etapa declara dependência de outra etapa");
  assert(template.steps.every((step) => typeof step.requiresApproval === "boolean"), "toda etapa declara explicitamente se requer aprovação");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
