/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/rec-os-growth/__tests__/rec-os-growth.test.ts
 *
 * REC OS GROWTH PLANNER V1 FOUNDATION — testes unitários das funções
 * puras: diagnóstico reusa Company Context real (nunca duplica), plano
 * de saída nunca inventa estratégia/oportunidade/criativo, Projection
 * Engine nunca calcula um número real.
 */
import type { ResolvedCompanyContext } from "@/lib/company-context/types";
import { buildGrowthDiagnosticFromCompanyContext, buildGrowthPlanPlaceholder, isKnownGrowthChannel } from "../diagnostic";
import { estimateProjection } from "../projection-engine-contract";
import { GROWTH_OBJECTIVES, GROWTH_CHANNELS } from "../types";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

function fakeCompanyContext(overrides: Partial<ResolvedCompanyContext> = {}): ResolvedCompanyContext {
  return {
    workspaceId: null,
    companyId: "company-abc",
    companyName: "Duh Lanches",
    surface: "direct_business",
    role: "admin",
    accountType: "direct_business",
    preview: false,
    readOnly: false,
    source: "admin_explicit_selection",
    sourceClientId: "company-abc",
    ...overrides,
  };
}

console.log("[test] GROWTH_OBJECTIVES / GROWTH_CHANNELS -- vocabulário fechado exatamente como pedido pela missão");
{
  assert(GROWTH_OBJECTIVES.length === 4 && GROWTH_OBJECTIVES.includes("vender_mais") && GROWTH_OBJECTIVES.includes("gerar_leads") && GROWTH_OBJECTIVES.includes("aumentar_ticket") && GROWTH_OBJECTIVES.includes("fortalecer_marca"), "os 4 objetivos do card estão presentes, nenhum a mais");
  assert(GROWTH_CHANNELS.length === 4 && GROWTH_CHANNELS.includes("meta") && GROWTH_CHANNELS.includes("google") && GROWTH_CHANNELS.includes("organico") && GROWTH_CHANNELS.includes("conteudo"), "os 4 canais do card estão presentes, nenhum a mais");
}

console.log("[test] buildGrowthDiagnosticFromCompanyContext -- reusa Company Context real, nunca inventa companyId/companyName");
{
  const context = fakeCompanyContext({ companyId: "c-42", companyName: "O Pedreirão" });
  const diagnostic = buildGrowthDiagnosticFromCompanyContext(context, {
    objective: "gerar_leads",
    channels: ["meta", "conteudo"],
  });
  assert(diagnostic.company.companyId === "c-42", "companyId vem exatamente do Company Context real, nunca de um valor arbitrário");
  assert(diagnostic.company.companyName === "O Pedreirão", "companyName idem");
  assert(diagnostic.objective === "gerar_leads" && diagnostic.channels.length === 2, "campos informados pelo usuário são preservados");
}

console.log("[test] buildGrowthDiagnosticFromCompanyContext -- companyName null é preservado honestamente (nunca inventa nome)");
{
  const context = fakeCompanyContext({ companyName: null });
  const diagnostic = buildGrowthDiagnosticFromCompanyContext(context, { objective: "vender_mais", channels: [] });
  assert(diagnostic.company.companyName === null, "companyName null do contexto real permanece null, nunca vira uma string inventada");
}

console.log("[test] buildGrowthPlanPlaceholder -- nunca inventa estratégia/oportunidade/criativo/próxima ação");
{
  const context = fakeCompanyContext();
  const diagnostic = buildGrowthDiagnosticFromCompanyContext(context, { objective: "vender_mais", channels: ["meta", "google"] });
  const plan = buildGrowthPlanPlaceholder(diagnostic);

  assert(plan.objective === "vender_mais", "objetivo ecoado corretamente");
  assert(plan.currentScenario.includes("Duh Lanches") && plan.currentScenario.includes("vender mais"), "cenário atual descreve o que foi informado, sem inventar dado novo");
  assert(plan.opportunity === null, "oportunidade nunca é inventada -- null enquanto não houver análise real");
  assert(plan.recommendedStrategy.length === 0, "estratégia recomendada vazia -- nenhum motor de recomendação real existe ainda");
  assert(plan.requiredCreatives.length === 0, "criativos necessários vazio -- mesma razão");
  assert(plan.nextActions.length === 0, "próximas ações vazio -- mesma razão");
  assert(plan.indicatedChannels.length === 2 && plan.indicatedChannels.includes("meta") && plan.indicatedChannels.includes("google"), "canais indicados ecoam exatamente o que o usuário informou, nunca uma lista inventada");
  assert(plan.honestNotice.length > 0, "honestNotice sempre presente -- nunca omitido enquanto o plano for placeholder");
  assert(!plan.honestNotice.toLowerCase().includes("garant"), "honestNotice nunca soa como garantia de resultado");
}

console.log("[test] buildGrowthPlanPlaceholder -- nunca promete resultado, mesmo com todos os 4 objetivos");
{
  for (const objective of GROWTH_OBJECTIVES) {
    const context = fakeCompanyContext();
    const diagnostic = buildGrowthDiagnosticFromCompanyContext(context, { objective, channels: [] });
    const plan = buildGrowthPlanPlaceholder(diagnostic);
    assert(plan.recommendedStrategy.length === 0 && plan.opportunity === null, `objetivo '${objective}' também nunca gera estratégia/oportunidade inventada`);
  }
}

console.log("[test] isKnownGrowthChannel");
{
  assert(isKnownGrowthChannel("meta") && isKnownGrowthChannel("google") && isKnownGrowthChannel("organico") && isKnownGrowthChannel("conteudo"), "os 4 canais reais são reconhecidos");
  assert(!isKnownGrowthChannel("tiktok"), "canal desconhecido é rejeitado, nunca aceito por acidente");
}

console.log("[test] estimateProjection -- Projection Engine NUNCA calcula um número real nesta fundação");
{
  const result = estimateProjection({ investment: 1000, averageTicket: 50, objective: "vender_mais" });
  assert(result.status === "not_implemented", "status é sempre not_implemented");
  assert(result.scenarios.length === 0, "nenhum cenário é gerado -- nunca um número inventado");
  assert(result.honestNotice.length > 0, "honestNotice explica que o motor ainda não existe");

  // Mesmo com inputs diferentes, o resultado nunca varia para além do contrato -- prova que não há cálculo escondido.
  const result2 = estimateProjection({ investment: 999999, averageTicket: 1, objective: "gerar_leads" });
  assert(result2.status === "not_implemented" && result2.scenarios.length === 0, "resultado é sempre not_implemented, independente do input -- nenhum cálculo real esconde-se aqui");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
