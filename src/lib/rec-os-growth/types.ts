/**
 * REC OS GROWTH PLANNER V1 FOUNDATION — contratos do módulo que responde
 * "qual estratégia devemos executar?" (rec_os_growth_planner). Nunca
 * responde "como configurar mídia paga" (rec_os_paid_traffic_planner),
 * "como organizar campanhas/criativos" (rec_os_campaign_planner) nem
 * "qual cenário numérico esperado" (rec_os_projection_engine,
 * projection-engine-contract.ts) -- três responsabilidades vizinhas e
 * deliberadamente separadas, nunca fundidas aqui.
 *
 * Fundação apenas: tipos + builders honestos, nenhum motor de
 * recomendação real, nenhuma persistência, nenhuma UI.
 */
import type { ResolvedCompanyContext } from "@/lib/company-context/types";

export const GROWTH_OBJECTIVES = ["vender_mais", "gerar_leads", "aumentar_ticket", "fortalecer_marca"] as const;
export type GrowthObjective = (typeof GROWTH_OBJECTIVES)[number];

export const GROWTH_CHANNELS = ["meta", "google", "organico", "conteudo"] as const;
export type GrowthChannel = (typeof GROWTH_CHANNELS)[number];

/**
 * `company` nunca é um objeto novo -- é exatamente o subconjunto de
 * ResolvedCompanyContext (src/lib/company-context/types.ts) que este
 * módulo precisa, nunca uma segunda fonte de contexto de empresa.
 */
export interface GrowthDiagnosticCompany extends Pick<ResolvedCompanyContext, "companyId" | "companyName"> {
  segment?: string;
  city?: string;
}

export interface GrowthDiagnosticProduct {
  name?: string;
  averageTicket?: number;
  /** Margem é explicitamente "futuro" no card da missão -- campo existe, nunca alimentado por esta fundação. */
  margin?: number;
}

export interface GrowthDiagnosticAudience {
  location?: string;
  profile?: string;
  behavior?: string;
}

export interface GrowthDiagnosticBudget {
  estimatedInvestment?: number;
}

export interface GrowthDiagnosticInput {
  company: GrowthDiagnosticCompany;
  objective: GrowthObjective;
  product?: GrowthDiagnosticProduct;
  audience?: GrowthDiagnosticAudience;
  channels: GrowthChannel[];
  budget?: GrowthDiagnosticBudget;
}

/**
 * Estrutura de saída pedida pela missão (OBJETIVO/CENÁRIO ATUAL/
 * OPORTUNIDADE/ESTRATÉGIA RECOMENDADA/CANAIS INDICADOS/CRIATIVOS
 * NECESSÁRIOS/PRÓXIMAS AÇÕES). "Não gerar promessa de resultado" --
 * `honestNotice` é obrigatório e sempre presente enquanto o motor de
 * recomendação real não existir (ver builders em diagnostic.ts).
 */
export interface GrowthPlanOutput {
  objective: GrowthObjective;
  currentScenario: string;
  opportunity: string | null;
  recommendedStrategy: string[];
  indicatedChannels: GrowthChannel[];
  requiredCreatives: string[];
  nextActions: string[];
  /** Nunca omitido enquanto recommendedStrategy/requiredCreatives forem gerados por placeholder, não por análise real. */
  honestNotice: string;
}
