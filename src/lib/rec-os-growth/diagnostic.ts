/**
 * REC OS GROWTH PLANNER V1 FOUNDATION — funções puras que montam o
 * diagnóstico (a partir do Company Context REAL, nunca duplicado) e
 * geram o plano de saída. Nenhuma delas decide estratégia de verdade --
 * "Growth Planner: RESPONSÁVEL — 'qual estratégia devemos executar?'" é
 * a pergunta que este módulo existe para responder no futuro; esta
 * fundação só garante que a pergunta é bem formada (tipos corretos,
 * contexto real) antes de qualquer motor de recomendação existir.
 */
import type { ResolvedCompanyContext } from "@/lib/company-context/types";
import { GROWTH_CHANNELS, type GrowthDiagnosticInput, type GrowthPlanOutput, type GrowthObjective, type GrowthChannel } from "./types";

const OBJECTIVE_LABEL: Record<GrowthObjective, string> = {
  vender_mais: "vender mais",
  gerar_leads: "gerar leads",
  aumentar_ticket: "aumentar ticket médio",
  fortalecer_marca: "fortalecer marca",
};

/**
 * Monta o diagnóstico combinando o Company Context REAL (resolvido por
 * resolveCompanyContext(), nunca reimplementado aqui) com os campos que
 * só o usuário pode informar (objetivo/produto/público/canais/orçamento).
 * Nunca inventa companyId/companyName -- vêm sempre do contexto real.
 */
export function buildGrowthDiagnosticFromCompanyContext(
  context: ResolvedCompanyContext,
  input: Omit<GrowthDiagnosticInput, "company">,
): GrowthDiagnosticInput {
  return {
    ...input,
    company: {
      companyId: context.companyId,
      companyName: context.companyName,
    },
  };
}

/**
 * Gera o placeholder honesto do plano -- nunca inventa estratégia,
 * criativo ou próxima ação. Os únicos campos preenchidos com conteúdo
 * "opinativo" são os que o PRÓPRIO usuário informou (objetivo, canais);
 * tudo que exigiria análise real fica vazio + `honestNotice` explicando
 * por quê. "Não gerar promessa de resultado" (regra da missão).
 */
export function buildGrowthPlanPlaceholder(input: GrowthDiagnosticInput): GrowthPlanOutput {
  const companyLabel = input.company.companyName ?? "esta empresa";
  const channelsLabel = input.channels.length > 0 ? input.channels.join(", ") : "nenhum canal informado ainda";

  return {
    objective: input.objective,
    currentScenario: `${companyLabel} quer ${OBJECTIVE_LABEL[input.objective]}. Canais considerados: ${channelsLabel}.`,
    opportunity: null,
    recommendedStrategy: [],
    indicatedChannels: [...input.channels],
    requiredCreatives: [],
    nextActions: [],
    honestNotice: "Growth Planner ainda é fundação (tipos + diagnóstico) -- nenhum motor de recomendação real existe. Oportunidade/estratégia/criativos/próximas ações não são gerados nesta versão, nunca preenchidos com dado inventado.",
  };
}

export function isKnownGrowthChannel(value: string): value is GrowthChannel {
  return (GROWTH_CHANNELS as readonly string[]).includes(value);
}
