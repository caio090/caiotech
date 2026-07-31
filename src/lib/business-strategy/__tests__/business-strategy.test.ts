/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/business-strategy/__tests__/business-strategy.test.ts
 */
import {
  STRATEGY_DNA_FIELD_ORDER, EIGHT_P_ORDER, EIGHT_PS_DESCRIPTION,
  buildDnaForCurrentCompany, buildEmptyEightPs, buildExampleSwotForArchetype,
  buildDefaultSalesGoals, buildDefaultSeasonality, buildExampleCompetitorsForArchetype,
  buildPositioningSummary, findCompetitorGaps, computeStrategyDataQuality,
  buildSwotCrossSuggestions, buildLivingManual,
  COMPETITOR_RESEARCH_PROVIDER,
} from "../index";
import type { CompetitorComparison, CompetitorProfile } from "../types";
import type { SwotItem } from "@/lib/motor-lokat/business-types";

let passed = 0;
let failed = 0;
const assert = (condition: boolean, label: string) => {
  if (condition) { passed++; console.log(`  ok - ${label}`); }
  else { failed++; console.error(`  FAIL - ${label}`); }
};

// ── DNA restaurado ───────────────────────────────────────────────────────────

console.log("[test] DNA restaurado — 19 campos históricos");
assert(STRATEGY_DNA_FIELD_ORDER.length === 19, "DNA_FIELD_ORDER tem exatamente 19 campos");
const HISTORICAL_KEYS = [
  "companyName", "businessModel", "description", "mainProducts", "problemSolved", "desiresServed",
  "valueProposition", "differentiators", "audiences", "priceRange", "salesChannels", "units",
  "regionsServed", "seasonality", "goals", "restrictions", "contactNetwork", "competitors", "positioning",
];
assert(
  JSON.stringify(STRATEGY_DNA_FIELD_ORDER.map((f) => f.key)) === JSON.stringify(HISTORICAL_KEYS),
  "as 19 chaves batem exatamente com o commit histórico 671db53 (mesma ordem)"
);

const dna = buildDnaForCurrentCompany("Restaurante Demonstração", "food_service");
assert(dna.companyName.value === "Restaurante Demonstração", "nome existente preservado");
assert(dna.companyName.confirmed === true, "nome vem confirmado (já existia na fixture do Command Center)");
assert(dna.segment.value === "food_service", "segmento existente preservado");
assert(dna.description.value === "", "campo desconhecido fica vazio, não inventado");
assert(dna.description.source === "missing", "campo desconhecido tem source=missing");
assert(dna.description.missingReason === "Não informado", "campo ausente declara motivo");
assert(dna.positioning.value === "", "positioning não preenchido automaticamente");

console.log("[test] nenhum campo fictício");
const allDnaValues = Object.values(dna).map((f) => f.value);
assert(!allDnaValues.some((v) => typeof v === "string" && /missão|visão institucional/i.test(v)), "nenhuma missão/visão inventada");

// ── 8Ps LOKAT ────────────────────────────────────────────────────────────────

console.log("[test] 8Ps LOKAT — oito Ps exatos");
assert(EIGHT_P_ORDER.length === 8, "exatamente 8 Ps, nenhum nono P");
const EIGHT_P_KEYS = EIGHT_P_ORDER.map((p) => p.key);
assert(new Set(EIGHT_P_KEYS).size === 8, "IDs únicos entre os 8Ps");
for (const key of ["product", "price", "place", "promotion", "audience", "positioning", "process", "performance"]) {
  assert(EIGHT_P_KEYS.includes(key as never), `8Ps inclui "${key}"`);
}
assert(
  EIGHT_PS_DESCRIPTION === "Os 8Ps LOKAT organizam como a empresa cria valor, cobra, vende, comunica, atende, se posiciona, executa e mede resultado.",
  "texto explicativo bate exatamente com o texto obrigatório do ticket"
);

const eightPs = buildEmptyEightPs();
assert(Object.keys(eightPs).length === 8, "objeto EightPs tem 8 chaves");
assert(eightPs.product.text === "", "Produto não duplica dado de Produtos e Fichas (começa vazio, é resumo)");

// ── SWOT / FOFA ──────────────────────────────────────────────────────────────

console.log("[test] SWOT — exemplos e cruzamento");
const swotExamples = buildExampleSwotForArchetype("food_service");
assert(swotExamples.length === 4, "4 exemplos de SWOT para food_service (um por categoria)");
assert(swotExamples.every((i) => i.isExample === true && i.confirmed === false), "todo exemplo é isExample=true e confirmed=false");
assert(buildExampleSwotForArchetype("retail").length === 0, "nenhum exemplo genérico incoerente para arquétipos sem experiência real");

const realSwot: SwotItem[] = [
  { id: "s1", category: "forca", text: "Equipe treinada", source: "manual", evidence: "e", impact: "alto", priority: "alta", confirmed: true },
  { id: "o1", category: "oportunidade", text: "Novo bairro", source: "manual", evidence: "e", impact: "alto", priority: "alta", confirmed: true },
  { id: "t1", category: "ameaca", text: "Novo concorrente", source: "manual", evidence: "e", impact: "medio", priority: "media", confirmed: true },
  { id: "w1", category: "fraqueza", text: "Estoque parado", source: "manual", evidence: "e", impact: "medio", priority: "media", confirmed: false },
];
const crosses = buildSwotCrossSuggestions(realSwot);
assert(crosses.some((c) => c.quadrant === "potencializar"), "cruzamento força+oportunidade gera 'potencializar'");
assert(crosses.some((c) => c.quadrant === "proteger"), "cruzamento força+ameaça gera 'proteger'");
assert(!crosses.some((c) => c.strengthOrWeaknessId === "w1"), "item SWOT não confirmado nunca entra em um cruzamento");
assert(!crosses.some((c) => c.strengthOrWeaknessId.startsWith("swot-example")), "exemplo não confirmado nunca entra em um cruzamento");

// ── Concorrência ─────────────────────────────────────────────────────────────

console.log("[test] Concorrência — fixtures e gaps");
const competitors = buildExampleCompetitorsForArchetype("food_service");
assert(competitors.length === 2, "2 concorrentes de exemplo para food_service");
assert(competitors.every((c) => c.isExample), "todo concorrente de fixture é isExample=true");
assert(!competitors.some((c) => /duh lanches|pedreir[aã]o/i.test(JSON.stringify(c))), "nenhum concorrente real (Duh Lanches/O Pedreirão) nas fixtures");
assert(buildExampleCompetitorsForArchetype("retail").length === 0, "sem fixture de concorrente para arquétipo sem experiência real");

const ourCompetitor: CompetitorProfile = { ...competitors[0], id: "c1", name: "Concorrente Teste", type: "direct", status: "confirmed", confidence: "confirmed" };
const strongerComparison: CompetitorComparison = { competitorId: "c1", entries: [{ dimension: "preco", value: "stronger", evidence: "Cardápio publicado", interpretation: "Preço mais baixo" }] };
const gaps = findCompetitorGaps([strongerComparison], [ourCompetitor]);
assert(gaps.some((g) => g.type === "concorrente_forte_em_preco"), "concorrente mais forte em preço vira gap 'concorrente_forte_em_preco'");
assert(gaps.every((g) => g.confidence !== undefined), "todo gap carrega confiança, nunca uma nota inventada de 0 a 10");

const unknownComparison: CompetitorComparison = { competitorId: "c1", entries: [{ dimension: "reputacao", value: "unknown", evidence: "", interpretation: "" }] };
const gapsUnknown = findCompetitorGaps([unknownComparison], [ourCompetitor]);
assert(gapsUnknown.some((g) => g.type === "informacao_insuficiente"), "dimensão sem nenhuma informação vira 'informacao_insuficiente', nunca uma nota baixa");

console.log("[test] Provider de pesquisa de concorrentes");
assert(COMPETITOR_RESEARCH_PROVIDER.availability === "unavailable", "pesquisa automática de concorrentes permanece unavailable nesta sprint");
assert(COMPETITOR_RESEARCH_PROVIDER.unavailableReason.length > 0, "motivo da indisponibilidade é explicado ao usuário");

// ── Metas e Sazonalidade ─────────────────────────────────────────────────────

console.log("[test] Metas e sazonalidade");
const goals = buildDefaultSalesGoals();
assert(goals.length === 6, "6 metas históricas restauradas");
assert(new Set(goals.map((g) => g.metric)).size === 6, "6 métricas distintas (unidades/faturamento/clientes_novos/recompra/margem/ticket)");
assert(goals.every((g) => g.actualValue === 0 && g.goalValue === 0), "nenhum valor de meta inventado (tudo começa em 0, não em um número fictício)");
assert(buildDefaultSeasonality().length === 0, "nenhuma sazonalidade pré-carregada (Fase 27 proíbe pesquisar datas)");

// ── Posicionamento ───────────────────────────────────────────────────────────

console.log("[test] Posicionamento — resumo derivado");
assert(buildPositioningSummary(dna, eightPs) === null, "sem dados suficientes, resumo de posicionamento é null (nunca uma frase com lacunas)");

const filledDna = buildDnaForCurrentCompany("Restaurante Demonstração", "food_service");
filledDna.audiences.value = "famílias do bairro";
filledDna.valueProposition.value = "comida caseira entregue rápido";
filledDna.differentiators.value = "receitas próprias e ingredientes frescos";
const filledEightPs = buildEmptyEightPs();
filledEightPs.positioning.text = "a opção caseira e rápida do bairro";
const summary = buildPositioningSummary(filledDna, filledEightPs);
assert(summary !== null && summary.startsWith("Para famílias do bairro"), "resumo derivado usa exatamente os campos preenchidos");

// ── Qualidade dos dados ──────────────────────────────────────────────────────

console.log("[test] Qualidade dos dados estratégicos");
const quality = computeStrategyDataQuality(dna, eightPs, swotExamples, competitors, goals, buildDefaultSeasonality());
assert(quality.areas.length === 7, "7 áreas de qualidade (dna/8ps/swot/concorrência/posicionamento/metas/sazonalidade)");
assert(Number.isFinite(quality.overallCompletenessPct), "completude geral nunca é NaN/Infinity");
assert(!quality.areas.some((a) => Number.isNaN(a.completenessPct)), "nenhuma área com completude NaN");
assert(quality.exampleItemsNotConfirmed === swotExamples.length + competitors.length, "exemplos não confirmados contabilizados (SWOT + concorrentes de fixture)");

const emptyQuality = computeStrategyDataQuality(dna, eightPs, [], [], [], []);
assert(Number.isFinite(emptyQuality.overallCompletenessPct), "qualidade com tudo vazio ainda não retorna NaN/Infinity");

// ── Manual Vivo ──────────────────────────────────────────────────────────────

console.log("[test] Manual Vivo — derivado, nunca cópia separada");
const manual1 = buildLivingManual("Restaurante Demonstração", filledDna, filledEightPs, realSwot, competitors, goals, [], "2026-01-01T00:00:00.000Z");
assert(manual1.sections.length >= 15, "Manual Vivo tem pelo menos as seções centrais do ticket");
assert(manual1.sections.find((s) => s.id === "como_se_posiciona")?.content.startsWith("Para famílias") ?? false, "seção de posicionamento reflete o resumo derivado, não um texto fixo");

const updatedDna = { ...filledDna, description: { ...filledDna.description, value: "Nova descrição depois da edição", confirmed: true } };
const manual2 = buildLivingManual("Restaurante Demonstração", updatedDna, filledEightPs, realSwot, competitors, goals, [], "2026-01-01T00:00:00.000Z");
assert(manual2.sections.find((s) => s.id === "quem_somos")?.content === "Nova descrição depois da edição", "mudar um campo do DNA muda o Manual Vivo imediatamente (sem estado duplicado)");

const manualWithExampleOnly = buildLivingManual("Restaurante Demonstração", dna, eightPs, swotExamples, competitors, [], [], "2026-01-01T00:00:00.000Z");
assert(manualWithExampleOnly.sections.find((s) => s.id === "swot")!.pending === true, "SWOT só com exemplos não confirmados aparece como pendente, nunca como fato");

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
