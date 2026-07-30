(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { interpretCmv } = require("../interpretation.ts") as typeof import("../interpretation");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const f = require("../fixtures.ts") as typeof import("../fixtures");
let passed = 0, failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

const high = interpretCmv({ amount: 400000, percentagePoints: 0.05, relativeToTheoretical: 0.12, classification: "critical" }, f.CMV_COVERAGE, 0.33, 0.38, f.CMV_POLICY);
assert(high.investigation.hypotheses.length >= 2, "real acima gera hipóteses");
assert(high.investigation.hypotheses.some((h) => h.checks.length > 0), "gera verificações práticas");
assert(high.investigation.hypotheses.some((h) => h.priority === "high"), "gera prioridade");
assert(high.investigation.hypotheses.every((h) => h.rationale.includes("sugere") || h.rationale.includes("possível")), "linguagem de hipótese");
const low = interpretCmv({ amount: -100000, percentagePoints: -0.03, relativeToTheoretical: -0.1, classification: "below" }, f.CMV_COVERAGE, 0.33, 0.3, f.CMV_POLICY);
assert(low.investigation.hypotheses.some((h) => h.id === "below-theoretical"), "real abaixo também é investigado");
const insufficientCoverage = { ...f.CMV_COVERAGE, confidence: "insufficient" as const, salesCoverage: 0.4 };
const insufficient = interpretCmv({ amount: null, percentagePoints: null, relativeToTheoretical: null, classification: "inconclusive" }, insufficientCoverage, null, null, f.CMV_POLICY);
assert(insufficient.confidence === "insufficient", "baixa cobertura não conclui");
assert(insufficient.explanation.includes("não há informação suficiente"), "explica evidência ausente");
const structural = interpretCmv({ amount: 0, percentagePoints: 0, relativeToTheoretical: 0, classification: "aligned" }, f.CMV_COVERAGE, 0.38, 0.38, f.CMV_POLICY);
assert(structural.investigation.hypotheses.some((h) => h.id === "structural-margin"), "teórico elevado gera hipótese estrutural");
const allText = JSON.stringify([high, low, insufficient, structural]).toLowerCase();
assert(!allText.includes("houve roubo"), "não acusa roubo");
assert(!allText.includes("houve fraude"), "não acusa fraude");
assert(!allText.includes("a equipe desviou"), "não acusa equipe");
assert(!allText.includes("o desperdício foi"), "não afirma desperdício");
assert(high.investigation.hypotheses.some((h) => h.missingEvidence.length > 0), "dados ausentes explícitos");
assert(high.action.length > 10, "ação principal presente");
assert(high.situation.includes("lacuna"), "linguagem simples na situação");

console.log(`[result] ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
})();
