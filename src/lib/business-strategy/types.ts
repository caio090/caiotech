/**
 * Sprint Meu Negócio 2.1.2 — restaura a camada estratégica (DNA, 8Ps, SWOT,
 * concorrência, posicionamento, metas, sazonalidade) dentro do Centro de
 * Comando real (`_restaurant-workspace.tsx`), não do demo órfão
 * `_client-content.tsx`/`_business-tab.tsx` (que continua existindo e
 * compilando, intocado — ver docs/meu-negocio/business-dna-restoration.md).
 *
 * Reaproveita `DataConfidence` do Data Hub (Core 2.1) em vez de inventar uma
 * segunda escala de confiança — os seis valores batem exatamente com o que
 * a Fase 1 do ticket pediu. A origem ("source") precisa de um vocabulário
 * próprio porque `DataSourceType` do Data Hub descreve FORMATO de arquivo
 * (csv/xlsx/pdf/...), não categoria de proveniência estratégica — este é o
 * único adaptador novo desta sprint, não um segundo sistema de proveniência.
 */
import type { DataConfidence } from "@/lib/data-hub/types";
import type { BusinessArchetypeId } from "@/lib/business-archetypes/types";

export type { DataConfidence };

export type StrategyDataSource =
  | "diagnostico"
  | "manual"
  | "imported"
  | "existing_profile"
  | "calculated"
  | "estimated"
  | "missing";

export interface StrategyField<T = string> {
  value: T;
  source: StrategyDataSource;
  confidence: DataConfidence;
  evidence: string;
  notes: string;
  updatedAt: string | null;
  confirmed: boolean;
  missingReason: string | null;
}

export function emptyStrategyField<T>(value: T, source: StrategyDataSource = "missing"): StrategyField<T> {
  return {
    value, source,
    confidence: source === "missing" ? "unknown" : "estimated",
    evidence: "", notes: "", updatedAt: null, confirmed: false,
    missingReason: source === "missing" ? "Não informado" : null,
  };
}

// ── DNA do Negócio — 19 campos históricos (feat/product-engineering-preview-v1,
// commit 671db53), restaurados com o mesmo conjunto de chaves e rótulos,
// tipados contra os sistemas atuais em vez do BusinessSegment antigo (que não
// inclui "food_service") ──────────────────────────────────────────────────

export interface BusinessDnaProfile {
  companyName: StrategyField<string>;
  segment: StrategyField<BusinessArchetypeId>;
  businessModel: StrategyField<string>;
  description: StrategyField<string>;
  mainProducts: StrategyField<string>;
  problemSolved: StrategyField<string>;
  desiresServed: StrategyField<string>;
  valueProposition: StrategyField<string>;
  differentiators: StrategyField<string>;
  audiences: StrategyField<string>;
  priceRange: StrategyField<string>;
  salesChannels: StrategyField<string>;
  units: StrategyField<string>;
  regionsServed: StrategyField<string>;
  seasonality: StrategyField<string>;
  goals: StrategyField<string>;
  restrictions: StrategyField<string>;
  contactNetwork: StrategyField<string>;
  competitors: StrategyField<string>;
  positioning: StrategyField<string>;
}

export const STRATEGY_DNA_FIELD_ORDER: Array<{ key: keyof Omit<BusinessDnaProfile, "segment">; label: string }> = [
  { key: "companyName", label: "Nome da empresa" },
  { key: "businessModel", label: "Modelo de negócio" },
  { key: "description", label: "Descrição" },
  { key: "mainProducts", label: "Produtos ou serviços principais" },
  { key: "problemSolved", label: "Problema resolvido" },
  { key: "desiresServed", label: "Desejos atendidos" },
  { key: "valueProposition", label: "Proposta de valor" },
  { key: "differentiators", label: "Diferenciais" },
  { key: "audiences", label: "Públicos" },
  { key: "priceRange", label: "Faixa de preço" },
  { key: "salesChannels", label: "Canais de venda" },
  { key: "units", label: "Unidades" },
  { key: "regionsServed", label: "Regiões atendidas" },
  { key: "seasonality", label: "Sazonalidades" },
  { key: "goals", label: "Metas" },
  { key: "restrictions", label: "Restrições" },
  { key: "contactNetwork", label: "Rede de contatos" },
  { key: "competitors", label: "Concorrentes" },
  { key: "positioning", label: "Posicionamento" },
];

// ── 8Ps LOKAT — metodologia própria do produto: os 4 Ps tradicionais
// (histórico, preservados) + Público + Posicionamento + Processo +
// Performance (Fase 5-12) ───────────────────────────────────────────────────

export type EightPKey = "product" | "price" | "place" | "promotion" | "audience" | "positioning" | "process" | "performance";

export interface EightPSection {
  text: string;
  evidence: string;
  notes: string;
  source: StrategyDataSource;
  confidence: DataConfidence;
}

export type EightPs = Record<EightPKey, EightPSection>;

export const EIGHT_P_ORDER: Array<{ key: EightPKey; label: string; question: string; description: string }> = [
  { key: "product", label: "Produto", question: "O que a empresa vende?", description: "O que a empresa vende e qual necessidade atende. Resume o portfólio de Produtos e Fichas, nunca o duplica." },
  { key: "price", label: "Preço", question: "Como a empresa cobra?", description: "Faixa, lógica de precificação e percepção de valor. Referencia o motor de precificação, nunca recalcula margem." },
  { key: "place", label: "Praça", question: "Onde e como a empresa vende?", description: "Canais, cobertura, logística e horários." },
  { key: "promotion", label: "Promoção", question: "Como a empresa se comunica?", description: "Canais de comunicação e campanhas. Promoção não significa apenas desconto." },
  { key: "audience", label: "Público", question: "Para quem a empresa vende?", description: "Segmentos, perfil, dores, desejos e critérios de escolha do público." },
  { key: "positioning", label: "Posicionamento", question: "Como a empresa quer ser percebida?", description: "Categoria, promessa, diferencial e território de comunicação." },
  { key: "process", label: "Processo", question: "Como a empresa executa?", description: "Do atendimento à recompra. Resume a operação, nunca duplica o painel Operacional." },
  { key: "performance", label: "Performance", question: "Como a empresa mede resultado?", description: "Conecta estratégia e resultado real — ponte para Relatórios, Financeiro e Produtos." },
];

export const EIGHT_PS_DESCRIPTION =
  "Os 8Ps LOKAT organizam como a empresa cria valor, cobra, vende, comunica, atende, se posiciona, executa e mede resultado.";

export function emptyEightPs(): EightPs {
  const section = (): EightPSection => ({ text: "", evidence: "", notes: "", source: "missing", confidence: "unknown" });
  return {
    product: section(), price: section(), place: section(), promotion: section(),
    audience: section(), positioning: section(), process: section(), performance: section(),
  };
}

// ── SWOT / FOFA — reaproveita SwotCategory/SwotImpact/SwotPriority de
// src/lib/motor-lokat/business-types.ts (mesmos valores em português já
// usados pelo componente real _business-tab.tsx) para não duplicar o
// vocabulário; adiciona só os campos novos que a Fase 14 pediu ──────────────

export type SwotCrossQuadrant = "potencializar" | "proteger" | "melhorar_para_aproveitar" | "reduzir_risco";

export interface SwotCrossSuggestion {
  quadrant: SwotCrossQuadrant;
  strengthOrWeaknessId: string;
  opportunityOrThreatId: string;
  label: string;
  reason: string;
}

// ── Concorrência — inteiramente nova nesta sprint (o DNA histórico só tinha
// um campo de texto livre "competitors"; não havia estrutura antes, Fase 18) ─

export type CompetitorType = "direct" | "indirect" | "substitute" | "benchmark" | "emerging";

export const COMPETITOR_TYPE_LABEL: Record<CompetitorType, string> = {
  direct: "Direto", indirect: "Indireto", substitute: "Substituto", benchmark: "Referência", emerging: "Emergente",
};

export type CompetitorStatus = "draft" | "confirmed" | "outdated";

export interface CompetitorProfile {
  id: string;
  name: string;
  type: CompetitorType;
  segment: string;
  city: string;
  state: string;
  serviceArea: string;
  website: string;
  socialProfiles: string[];
  products: string;
  services: string;
  audience: string;
  positioning: string;
  valueProposition: string;
  priceRange: string;
  channels: string;
  strengths: string;
  weaknesses: string;
  customerExperience: string;
  digitalPresence: string;
  salesModel: string;
  deliveryModel: string;
  reputationSummary: string;
  evidence: string;
  source: StrategyDataSource;
  confidence: DataConfidence;
  lastCheckedAt: string | null;
  status: CompetitorStatus;
  notes: string;
  isExample: boolean;
}

export type CompetitorDimension =
  | "preco" | "portfolio" | "qualidade" | "experiencia" | "atendimento" | "velocidade"
  | "localizacao" | "entrega" | "presenca_digital" | "conteudo" | "reputacao"
  | "promocoes" | "facilidade_de_compra" | "posicionamento" | "capacidade_operacional";

export const COMPETITOR_DIMENSION_LABEL: Record<CompetitorDimension, string> = {
  preco: "Preço", portfolio: "Portfólio", qualidade: "Qualidade", experiencia: "Experiência",
  atendimento: "Atendimento", velocidade: "Velocidade", localizacao: "Localização", entrega: "Entrega",
  presenca_digital: "Presença digital", conteudo: "Conteúdo", reputacao: "Reputação", promocoes: "Promoções",
  facilidade_de_compra: "Facilidade de compra", posicionamento: "Posicionamento", capacidade_operacional: "Capacidade operacional",
};

export type CompetitorComparisonValue = "unknown" | "weaker" | "similar" | "stronger" | "divergent";

export interface CompetitorComparisonEntry {
  dimension: CompetitorDimension;
  value: CompetitorComparisonValue;
  evidence: string;
  interpretation: string;
}

export interface CompetitorComparison {
  competitorId: string;
  entries: CompetitorComparisonEntry[];
}

export type CompetitorGapType =
  | "atributo_nao_explorado" | "concorrente_forte_em_preco" | "concorrente_forte_em_conveniencia"
  | "oportunidade_de_posicionamento" | "lacuna_de_canal" | "lacuna_de_comunicacao"
  | "risco_de_substituicao" | "benchmark_operacional" | "informacao_insuficiente" | "dado_desatualizado";

export interface CompetitorGap {
  id: string;
  type: CompetitorGapType;
  competitorId: string;
  dimension: CompetitorDimension;
  evidence: string;
  whyItMatters: string;
  impact: "low" | "medium" | "high" | "critical";
  confidence: DataConfidence;
  nextQuestion: string;
  nextAction: string;
}

export type CompetitorResearchAvailability = "unavailable" | "planned" | "configured" | "blocked" | "available" | "error";
export type CompetitorResearchCapability = "search_web" | "analyze_website" | "analyze_social" | "analyze_reviews" | "compare_prices" | "track_changes";

export interface CompetitorResearchProvider {
  id: string;
  availability: CompetitorResearchAvailability;
  capabilities: CompetitorResearchCapability[];
  unavailableReason: string;
}

export const COMPETITOR_RESEARCH_PROVIDER: CompetitorResearchProvider = {
  id: "competitor_research_v1",
  availability: "unavailable",
  capabilities: ["search_web", "analyze_website", "analyze_social", "analyze_reviews", "compare_prices", "track_changes"],
  unavailableReason: "A pesquisa automática ainda não está disponível neste ambiente.",
};

// ── Metas e Sazonalidade (Fase 26/27) — SalesGoal já existe em
// motor-lokat/business-types.ts com as 6 métricas exatas pedidas; só a
// sazonalidade é nova ──────────────────────────────────────────────────────

export type SeasonalEventType = "commercial_date" | "holiday" | "local_event" | "climate" | "operational_cycle" | "company_custom";

export const SEASONAL_EVENT_TYPE_LABEL: Record<SeasonalEventType, string> = {
  commercial_date: "Data comercial", holiday: "Feriado", local_event: "Evento local",
  climate: "Clima", operational_cycle: "Ciclo operacional", company_custom: "Específico da empresa",
};

export interface BusinessSeasonalEvent {
  id: string;
  name: string;
  type: SeasonalEventType;
  startDate: string | null;
  endDate: string | null;
  recurrence: "yearly" | "monthly" | "weekly" | "once";
  scope: "national" | "regional" | "local" | "company";
  region: string;
  segment: BusinessArchetypeId | null;
  expectedImpact: "low" | "medium" | "high" | "unknown";
  affectedProducts: string;
  affectedChannels: string;
  preparationLeadTimeDays: number | null;
  source: StrategyDataSource;
  confidence: DataConfidence;
  confirmed: boolean;
  notes: string;
}

// ── Qualidade dos dados estratégicos (Fase 28) ──────────────────────────────

export type StrategyAreaId = "dna" | "eight_ps" | "swot" | "competitors" | "positioning" | "goals" | "seasonality";

export interface StrategyAreaQuality {
  area: StrategyAreaId;
  completenessPct: number;
  confirmedCount: number;
  missingCount: number;
  estimatedCount: number;
  outdatedCount: number;
  divergentCount: number;
  totalCount: number;
}

export interface StrategyDataQualitySummary {
  overallCompletenessPct: number;
  areas: StrategyAreaQuality[];
  exampleItemsNotConfirmed: number;
}

// ── Manual Vivo (Fase 4) — nunca uma cópia separada, sempre derivado ────────

export interface LivingManualSection {
  id: string;
  title: string;
  content: string;
  pending: boolean;
}

export interface LivingManual {
  companyName: string;
  sections: LivingManualSection[];
  generatedAt: string;
}
