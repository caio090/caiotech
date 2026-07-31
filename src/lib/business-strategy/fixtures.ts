/**
 * Fixtures 100% demonstrativas para a área DNA & Estratégia. Nunca preenche
 * um campo desconhecido (Fase 2: "Não preencher informações desconhecidas")
 * e nunca referencia um cliente real (Fase 43 / restrição geral desta
 * sprint) — nomes de concorrentes são genéricos e claramente fictícios.
 */
import type { BusinessArchetypeId } from "@/lib/business-archetypes/types";
import type { SwotItem } from "@/lib/motor-lokat/business-types";
import {
  type BusinessDnaProfile, type EightPs, type CompetitorProfile, type BusinessSeasonalEvent,
  emptyStrategyField, emptyEightPs,
} from "./types";
import type { SalesGoal } from "@/lib/motor-lokat/business-types";

/**
 * Para a empresa atualmente exibida no Centro de Comando: só nome e
 * segmento vêm preenchidos (com a origem "existing_profile", porque já
 * existiam na fixture do Command Center antes desta sprint) — todo o
 * resto fica "Não informado", nunca inventado (Fase 2).
 */
export function buildDnaForCurrentCompany(companyName: string, segment: BusinessArchetypeId): BusinessDnaProfile {
  const known = (value: string): ReturnType<typeof emptyStrategyField<string>> => ({
    ...emptyStrategyField(value, "existing_profile"),
    confidence: "confirmed",
    confirmed: true,
    missingReason: null,
  });
  return {
    companyName: known(companyName),
    segment: { ...emptyStrategyField(segment, "existing_profile"), confidence: "confirmed", confirmed: true, missingReason: null },
    businessModel: emptyStrategyField(""),
    description: emptyStrategyField(""),
    mainProducts: emptyStrategyField(""),
    problemSolved: emptyStrategyField(""),
    desiresServed: emptyStrategyField(""),
    valueProposition: emptyStrategyField(""),
    differentiators: emptyStrategyField(""),
    audiences: emptyStrategyField(""),
    priceRange: emptyStrategyField(""),
    salesChannels: emptyStrategyField(""),
    units: emptyStrategyField(""),
    regionsServed: emptyStrategyField(""),
    seasonality: emptyStrategyField(""),
    goals: emptyStrategyField(""),
    restrictions: emptyStrategyField(""),
    contactNetwork: emptyStrategyField(""),
    competitors: emptyStrategyField(""),
    positioning: emptyStrategyField(""),
  };
}

export function buildEmptyEightPs(): EightPs {
  return emptyEightPs();
}

/**
 * Exemplos de SWOT por arquétipo — sempre `isExample: true`,
 * `confirmed: false` (Fase 15). Cobre só `food_service`, o único arquétipo
 * com experiência real hoje no Centro de Comando; os demais arquétipos
 * ficam sem exemplo pré-carregado em vez de inventar um genérico incoerente.
 */
export function buildExampleSwotForArchetype(archetype: BusinessArchetypeId): SwotItem[] {
  if (archetype !== "food_service") return [];
  const base = (id: string, category: SwotItem["category"], text: string): SwotItem => ({
    id: `swot-example-${id}`, category, text, source: "estimated", evidence: "",
    impact: "medio", priority: "media", confirmed: false, isExample: true, status: "draft",
  });
  return [
    base("forca", "forca", "Ficha técnica e CMV já calculados para o cardápio principal"),
    base("fraqueza", "fraqueza", "Dependência de um único canal de pedidos"),
    base("oportunidade", "oportunidade", "Crescimento de pedidos diretos por WhatsApp"),
    base("ameaca", "ameaca", "Aumento das taxas de marketplace de delivery"),
  ];
}

export function buildDefaultSalesGoals(): SalesGoal[] {
  const goal = (id: string, label: string, metric: SalesGoal["metric"], unit: string): SalesGoal => ({
    id, label, metric, actualValue: 0, goalValue: 0, period: "Mês atual (demonstração)", channel: "Todos", product: "Todos", unit,
  });
  return [
    goal("goal-unidades", "Unidades vendidas", "unidades", "un."),
    goal("goal-faturamento", "Faturamento", "faturamento", "R$"),
    goal("goal-clientes-novos", "Clientes novos", "clientes_novos", "clientes"),
    goal("goal-recompra", "Recompra", "recompra", "%"),
    goal("goal-margem", "Margem de contribuição", "margem_contribuicao", "R$"),
    goal("goal-ticket", "Ticket médio", "ticket_medio", "R$"),
  ];
}

/** Nenhuma sazonalidade pré-carregada — Fase 27 proíbe pesquisar datas ou ativar feriados automaticamente nesta sprint. */
export function buildDefaultSeasonality(): BusinessSeasonalEvent[] {
  return [];
}

/**
 * Concorrentes genéricos e claramente fictícios — nunca Duh Lanches, nunca
 * O Pedreirão, nunca qualquer cliente real (Fase 19/43). Cobrem só
 * food_service, pelo mesmo motivo do SWOT de exemplo.
 */
export function buildExampleCompetitorsForArchetype(archetype: BusinessArchetypeId): CompetitorProfile[] {
  if (archetype !== "food_service") return [];
  const base = (id: string, overrides: Partial<CompetitorProfile>): CompetitorProfile => ({
    id, name: "", type: "direct", segment: "food_service", city: "", state: "", serviceArea: "",
    website: "", socialProfiles: [], products: "", services: "", audience: "", positioning: "",
    valueProposition: "", priceRange: "", channels: "", strengths: "", weaknesses: "",
    customerExperience: "", digitalPresence: "", salesModel: "", deliveryModel: "", reputationSummary: "",
    evidence: "", source: "estimated", confidence: "unknown", lastCheckedAt: null,
    status: "draft", notes: "", isExample: true,
    ...overrides,
  });
  return [
    base("competitor-example-1", {
      name: "Concorrente Genérico A (exemplo)", type: "direct", channels: "Delivery, retirada no balcão",
      priceRange: "Similar", notes: "Exemplo demonstrativo — confirme, edite ou remova antes de usar na estratégia.",
    }),
    base("competitor-example-2", {
      name: "Concorrente Genérico B (exemplo)", type: "indirect", channels: "Loja física apenas",
      priceRange: "Abaixo", notes: "Exemplo demonstrativo — confirme, edite ou remova antes de usar na estratégia.",
    }),
  ];
}
