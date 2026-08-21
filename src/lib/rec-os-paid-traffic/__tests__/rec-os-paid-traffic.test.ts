/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/rec-os-paid-traffic/__tests__/rec-os-paid-traffic.test.ts
 *
 * REC OS PAID TRAFFIC PLANNER V1 FOUNDATION — testes unitários: plano
 * recebe objetivo/empresa do Growth Plan real (nunca cria estratégia
 * própria), catálogos de canal/conversão fechados, orçamento nunca
 * calcula ROI, plano sempre honesto (status planned, honestNotice
 * presente).
 */
import { buildGrowthDiagnosticFromCompanyContext, buildGrowthPlanPlaceholder } from "@/lib/rec-os-growth/diagnostic";
import type { ResolvedCompanyContext } from "@/lib/company-context/types";
import { buildPaidTrafficPlanFromGrowthPlan } from "../planner";
import { isKnownPaidTrafficChannel, PAID_TRAFFIC_CHANNEL_LABEL } from "../channels";
import { isKnownConversionGoal, CONVERSION_GOAL_LABEL } from "../conversion";
import { describeBudget } from "../budget";
import { PAID_TRAFFIC_CHANNELS, PAID_TRAFFIC_CAMPAIGN_TYPES, CONVERSION_GOALS } from "../types";

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

console.log("[test] Catálogos fechados exatamente como pedidos pela missão");
{
  assert(PAID_TRAFFIC_CHANNELS.length === 3 && PAID_TRAFFIC_CHANNELS.includes("meta_ads") && PAID_TRAFFIC_CHANNELS.includes("google_ads") && PAID_TRAFFIC_CHANNELS.includes("organic_support"), "META_ADS/GOOGLE_ADS/ORGANIC_SUPPORT presentes, nenhum a mais");
  assert(PAID_TRAFFIC_CAMPAIGN_TYPES.length === 3 && PAID_TRAFFIC_CAMPAIGN_TYPES.includes("aquisicao") && PAID_TRAFFIC_CAMPAIGN_TYPES.includes("remarketing") && PAID_TRAFFIC_CAMPAIGN_TYPES.includes("posicionamento"), "aquisição/remarketing/posicionamento presentes");
  assert(CONVERSION_GOALS.length === 4 && CONVERSION_GOALS.includes("whatsapp_message") && CONVERSION_GOALS.includes("lead_capture") && CONVERSION_GOALS.includes("purchase") && CONVERSION_GOALS.includes("store_visit"), "os 4 eventos de conversão do card estão presentes");
}

console.log("[test] buildPaidTrafficPlanFromGrowthPlan -- NUNCA cria estratégia própria (objective/context vêm do Growth Plan real)");
{
  const context = fakeCompanyContext({ companyId: "c-77", companyName: "Cardápio Alto" });
  const diagnostic = buildGrowthDiagnosticFromCompanyContext(context, { objective: "gerar_leads", channels: ["meta"] });
  const growthPlan = buildGrowthPlanPlaceholder(diagnostic);

  const plan = buildPaidTrafficPlanFromGrowthPlan(diagnostic, growthPlan, {
    channel: ["meta_ads"],
    campaignType: "aquisicao",
  });

  assert(plan.context.companyId === "c-77" && plan.context.companyName === "Cardápio Alto", "context do plano de tráfego é exatamente o do diagnóstico -- nunca um valor novo");
  assert(plan.objective === "gerar_leads", "objective do plano de tráfego é exatamente o do Growth Plan real, nunca reinterpretado");
  assert(plan.status === "planned", "status sempre 'planned' nesta fundação");
  assert(plan.honestNotice.length > 0 && !plan.honestNotice.toLowerCase().includes("garant"), "honestNotice presente e nunca soa como garantia");
}

console.log("[test] buildPaidTrafficPlanFromGrowthPlan -- campos do usuário nunca são inventados, só ecoados");
{
  const context = fakeCompanyContext();
  const diagnostic = buildGrowthDiagnosticFromCompanyContext(context, { objective: "vender_mais", channels: [] });
  const growthPlan = buildGrowthPlanPlaceholder(diagnostic);

  const planWithoutExtras = buildPaidTrafficPlanFromGrowthPlan(diagnostic, growthPlan, { channel: ["google_ads"], campaignType: "remarketing" });
  assert(planWithoutExtras.creativeRequirements.length === 0, "creativeRequirements vazio quando não informado, nunca preenchido com sugestão inventada");
  assert(planWithoutExtras.conversionEvent === undefined, "conversionEvent ausente quando não informado, nunca um palpite");
  assert(planWithoutExtras.budget === undefined, "budget ausente quando não informado");

  const planWithExtras = buildPaidTrafficPlanFromGrowthPlan(diagnostic, growthPlan, {
    channel: ["meta_ads", "organic_support"],
    campaignType: "posicionamento",
    creativeRequirements: ["3 vídeos verticais", "1 carrossel"],
    conversionEvent: "lead_capture",
    budget: { dailyBudget: 100, monthlyBudget: 3000 },
  });
  assert(planWithExtras.creativeRequirements.length === 2, "creativeRequirements informados são preservados exatamente");
  assert(planWithExtras.conversionEvent === "lead_capture", "conversionEvent informado é preservado");
  assert(planWithExtras.channel.length === 2, "canais múltiplos são preservados");
}

console.log("[test] audience herda do diagnóstico quando não informado explicitamente (nunca duplica contexto)");
{
  const context = fakeCompanyContext();
  const diagnostic = buildGrowthDiagnosticFromCompanyContext(context, {
    objective: "aumentar_ticket",
    channels: [],
    audience: { location: "Fortaleza", profile: "25-40 anos" },
  });
  const growthPlan = buildGrowthPlanPlaceholder(diagnostic);
  const plan = buildPaidTrafficPlanFromGrowthPlan(diagnostic, growthPlan, { channel: ["meta_ads"], campaignType: "aquisicao" });
  assert(plan.audience?.location === "Fortaleza", "audience do plano de tráfego herda do diagnóstico quando o input não sobrescreve, nunca um valor novo inventado");
}

console.log("[test] isKnownPaidTrafficChannel / isKnownConversionGoal");
{
  assert(isKnownPaidTrafficChannel("meta_ads") && isKnownPaidTrafficChannel("google_ads") && isKnownPaidTrafficChannel("organic_support"), "canais reais reconhecidos");
  assert(!isKnownPaidTrafficChannel("tiktok_ads"), "canal desconhecido rejeitado");
  assert(isKnownConversionGoal("purchase") && !isKnownConversionGoal("signup"), "eventos de conversão validados corretamente");
  assert(Object.keys(PAID_TRAFFIC_CHANNEL_LABEL).length === 3 && Object.keys(CONVERSION_GOAL_LABEL).length === 4, "todo valor do catálogo tem rótulo -- nenhum órfão");
}

console.log("[test] describeBudget -- nunca calcula ROI, só descreve o que foi informado");
{
  assert(describeBudget(undefined) === "Nenhum orçamento informado ainda.", "sem orçamento, mensagem honesta");
  assert(describeBudget({}) === "Nenhum orçamento informado ainda.", "orçamento vazio também é honesto");
  const desc = describeBudget({ dailyBudget: 50, monthlyBudget: 1500, investmentPeriodDays: 30 });
  assert(desc.includes("50") && desc.includes("1500") && desc.includes("30"), "descrição inclui exatamente os valores informados");
  assert(!/roi|retorno|lucro/i.test(desc), "descrição nunca menciona ROI/retorno/lucro -- é só um resumo do que foi digitado");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
