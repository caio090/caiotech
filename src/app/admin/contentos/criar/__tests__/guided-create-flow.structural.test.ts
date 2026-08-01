/**
 * Executar com: node .tmp/run-ts-test.cjs src/app/admin/contentos/criar/__tests__/guided-create-flow.structural.test.ts
 */
import * as fs from "fs";
import * as path from "path";

const root = process.cwd();
const source = fs.readFileSync(path.join(root, "src/app/admin/contentos/criar/_guided-create-flow.tsx"), "utf8");

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("[test] Quatro macroetapas / ordem dos passos");
const stepsBlockMatch = source.match(/const steps: Array<\{[\s\S]*?\]\;/);
const stepsBlock = stepsBlockMatch ? stepsBlockMatch[0] : "";
const idOrder = [...stepsBlock.matchAll(/id: "(\w+)"/g)].map((m) => m[1]);
assert(idOrder.join(",") === "brief,content,review,destination,visual", "ordem real dos steps: brief, content, review, destination, visual (Visual Final por último)");
assert(source.includes('label: "Visual Final"'), "rótulo Visual Final presente");
assert(source.includes('label: "Ideia & Briefing"'), "rótulo Ideia & Briefing presente (Fase 6/8)");
assert(source.includes('label: "Aplicação & Formato"'), "rótulo Aplicação & Formato presente (Fase 9)");
assert(source.includes('label: "Revisão & Aprovação"'), "rótulo Revisão & Aprovação presente (Fase 13)");
assert(source.includes('label: "Destino & Especificações"'), "rótulo Destino & Especificações presente (Fase 14)");

console.log("[test] Visual Final é o último bloco criativo exibido");
const visualHeaderIdx = source.indexOf('5. Visual Final');
const destinationHeaderIdx = source.indexOf('4. Destino');
const reviewHeaderIdx = source.indexOf('3. Revisão');
assert(visualHeaderIdx > destinationHeaderIdx && destinationHeaderIdx > reviewHeaderIdx, "numeração 3→4→5 confirma Revisão antes de Destino antes de Visual Final");
assert((source.match(/activeStep === "visual"/g) ?? []).length === 1, "nenhum bloco JSX duplicado para o step visual");

console.log("[test] Roteiro condicional (Fase 10)");
assert(source.includes("freeTextFormatRequiresScript"), "usa a função de roteiro condicional, não sempre visível");
assert(source.includes("freeTextFormatUsesPageStructure"), "carrossel usa estrutura de páginas, não roteiro");
assert(!/label="Roteiro" textarea value=\{content\.script\} onChange=\{[^}]*\}\s*\/>\s*<Field label="Estrutura/.test(source), "Roteiro não é mais incondicional (não aparece sempre em sequência fixa com Estrutura de slides)");

console.log("[test] Destino tem next para Visual Final; Visual Final não avança mais (é o último)");
assert(source.includes("Ir para Visual Final"), "Destino ganhou botão para avançar para Visual Final");
assert(source.includes("Último passo criativo"), "Visual Final indica explicitamente que é o encerramento criativo");

console.log("[test] Nenhuma persistência nova, nenhuma chamada externa nova");
assert(!/tesseract|OCR real|scanner\.run/i.test(source), "nenhuma integração real de scanner/OCR no fluxo de criação");

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
