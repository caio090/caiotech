/**
 * Sprint REC OS Studio Foundation V0.1 — contratos do domínio Studio.
 * Reaproveita AgentStatus (neural-core/agents.ts) para o vocabulário
 * "contrato existe, runtime não" -- já é o padrão estabelecido para
 * exatamente esse conceito (available_contract/planned/locked/
 * experimental/unavailable); nenhum segundo vocabulário paralelo
 * criado aqui. Reaproveita DesignFormat (providers/shared/types.ts)
 * para o campo de formato -- já é o enum canônico de formatos de peça
 * usado pelo Design Editor Provider.
 *
 * Nenhuma execução de IA, nenhum import de Supabase/next neste
 * arquivo -- domínio puro.
 */
import type { AgentStatus } from "@/lib/neural-core/agents";
import type { CanonicalBusinessContext } from "@/lib/neural-core/context";
import type { DesignFormat } from "@/lib/providers/shared/types";

export type StudioSkillCategory = "visual_direction";

/** "documented" = módulo com regras já definidas (ver o master prompt referenciado em instructions.ts).
 *  "placeholder_contract" = módulo registrado na árvore mas sem comportamento definido ainda -- nunca inventar aqui. */
export type StudioModuleStatus = "documented" | "placeholder_contract";

/** Único valor hoje. Campo mantido explícito (em vez de um boolean) para que uma sprint futura
 *  que conecte runtime real tenha um único ponto a estender, sem precisar migrar o formato do campo. */
export type StudioSkillRuntimeStatus = "not_connected";

export interface StudioSkillModule {
  id: string;
  label: string;
  status: StudioModuleStatus;
  description: string;
}

/**
 * Contrato mínimo de uma skill do Studio. `status: "available_contract"`
 * NUNCA significa "roda de verdade" -- só que a definição existe e pode
 * ser referenciada pelo Registry/UI. Ver isStudioSkillRuntimeAvailable()
 * em registry.ts, que retorna false para toda skill nesta Foundation.
 */
export interface StudioSkillDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  category: StudioSkillCategory;
  status: AgentStatus;
  runtimeStatus: StudioSkillRuntimeStatus;
  /** Chaves de StudioBriefInput que esta skill sabe interpretar. */
  supportedInputs: readonly string[];
  /** Chaves do contrato de saída desta skill (ver skills/<id>/output.ts). */
  produces: readonly string[];
  modules: readonly StudioSkillModule[];
  /** Lista livre e descritiva -- nada aqui está implementado. */
  futureCapabilities: readonly string[];
}

/**
 * Briefing de entrada genérico do Studio. A maioria dos campos é
 * opcional de propósito (Fase 5 do brief): a UI não pode virar
 * formulário obrigatório gigante -- por isso `freeformBrief` existe,
 * para um pedido como "Quero uma arte do aniversário da Duh para
 * feed." já ser um input válido sozinho.
 */
export interface StudioBriefInput {
  companyId?: string;
  projectId?: string;
  campaignId?: string;
  objective?: string;
  pieceType?: string;
  format?: DesignFormat;
  headline?: string;
  supportingCopy?: string;
  cta?: string;
  references?: string[];
  brandContext?: string;
  assets?: string[];
  restrictions?: string[];
  variationCount?: number;
  notes?: string;
  freeformBrief?: string;
}

/**
 * Fase 8 (preparação Neural, NÃO implementada) — quando o Studio ganhar
 * runtime real, o input deve ser enriquecido a partir do contexto
 * canônico já existente, nunca de um resolver de Company paralelo.
 * Fluxo futuro: Company Context -> Neural Context -> Studio -> Skill ->
 * Executor. Este alias só documenta que campos de CanonicalBusinessContext
 * (neural-core/context.ts) já cobrem o que o Studio precisaria consumir
 * -- nenhuma implementação, nenhum caller usa isto ainda.
 */
export type FutureStudioNeuralBridge = Pick<
  CanonicalBusinessContext,
  "companyId" | "workspaceId" | "role" | "capabilities" | "connections"
>;
