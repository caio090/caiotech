/**
 * Sprint Recovery 2.1.3 — arquitetura futura do CRM adaptativo. Contratos
 * puros (tipos + rótulos), exatamente como src/lib/messaging/types.ts e
 * src/lib/fiscal/types.ts da Core 2.1: nenhuma tela, nenhuma API, nenhuma
 * tabela, nenhuma lógica de persistência. O CRM real hoje continua sendo
 * `crm` em src/config/project-status.ts (leads/funil/oportunidades) — este
 * módulo não o substitui nem o altera.
 */

// ── Núcleo universal (Fase 15) ──────────────────────────────────────────────

export interface CrmLead {
  id: string;
  contactId: string;
  companyId: string | null;
  source: string;
  temperature: CrmLeadTemperature;
  score: number | null;
  ownerId: string | null;
  segment: string | null;
}

export interface CrmContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface CrmCompany {
  id: string;
  name: string;
  segment: string | null;
}

export interface CrmOpportunity {
  id: string;
  leadId: string;
  pipelineId: string;
  stageId: string;
  value: number | null;
  probability: number | null;
  nextAction: string | null;
  lossReason: string | null;
}

export interface CrmPipeline {
  id: string;
  name: string;
  stages: CrmStage[];
}

export interface CrmStage {
  id: string;
  name: string;
  order: number;
}

export interface CrmActivity {
  id: string;
  opportunityId: string;
  type: string;
  occurredAt: string;
  ownerId: string;
}

export interface CrmHistoryEntry {
  id: string;
  leadId: string;
  occurredAt: string;
  description: string;
}

export interface CrmTask {
  id: string;
  leadId: string;
  dueAt: string;
  description: string;
}

export interface CrmDocument {
  id: string;
  leadId: string;
  name: string;
}

export interface CrmMessage {
  id: string;
  leadId: string;
  channel: string;
  sentAt: string;
}

export interface CrmTag {
  id: string;
  label: string;
}

export interface CrmSegment {
  id: string;
  label: string;
}

// ── Superfícies (Fase 16) ────────────────────────────────────────────────────

export type CrmSurface = "super_admin" | "agency" | "agency_client" | "direct_business" | "operational_user";

export interface CrmSurfaceVisibility {
  surface: CrmSurface;
  description: string;
  canSeeOwnCrm: boolean;
  canSeeOtherWorkspaceCrm: boolean;
  crossWorkspaceAccessRule: string | null;
}

/**
 * Isolamento futuro por superfície. `operational_user` continua conceitual
 * (mesmo princípio de src/config/platform-modules.ts — nunca uma
 * WorkspaceSurface real nova).
 */
export const CRM_SURFACE_VISIBILITY: CrmSurfaceVisibility[] = [
  {
    surface: "super_admin",
    description: "CRM da própria Lokat: leads/empresas/agências interessadas, onboarding, expansão, upsell, churn, suporte comercial.",
    canSeeOwnCrm: true,
    canSeeOtherWorkspaceCrm: false,
    crossWorkspaceAccessRule: "Nunca misturado com os leads internos dos clientes.",
  },
  {
    surface: "agency",
    description: "CRM da própria agência: leads de novos clientes, propostas, negociações, contratos, renovações, follow-ups, indicações.",
    canSeeOwnCrm: true,
    canSeeOtherWorkspaceCrm: true,
    crossWorkspaceAccessRule: "Só quando o cliente possuir módulo ativo, a capability permitir, o relacionamento for válido e o acesso estiver dentro do workspace correto.",
  },
  {
    surface: "agency_client",
    description: "CRM próprio quando contratado.",
    canSeeOwnCrm: true,
    canSeeOtherWorkspaceCrm: false,
    crossWorkspaceAccessRule: "Nunca vê o CRM comercial da agência, leads de outros clientes ou oportunidades da plataforma.",
  },
  {
    surface: "direct_business",
    description: "CRM do próprio negócio, adaptado por nicho (campos, pipeline, score, dashboards, follow-up, terminologia, automações, indicadores).",
    canSeeOwnCrm: true,
    canSeeOtherWorkspaceCrm: false,
    crossWorkspaceAccessRule: null,
  },
  {
    surface: "operational_user",
    description: "Vê somente leads atribuídos, tarefas, follow-ups e atividades permitidas — nunca configurações globais ou outras carteiras.",
    canSeeOwnCrm: false,
    canSeeOtherWorkspaceCrm: false,
    crossWorkspaceAccessRule: null,
  },
];

// ── Temperatura do lead (Fase 18) ────────────────────────────────────────────

export type CrmLeadTemperature = "cold" | "warming" | "warm" | "hot" | "customer" | "inactive" | "lost";

export const CRM_LEAD_TEMPERATURE_LABEL: Record<CrmLeadTemperature, string> = {
  cold: "Frio", warming: "Em aquecimento", warm: "Morno", hot: "Quente",
  customer: "Cliente", inactive: "Inativo", lost: "Perdido",
};

/** Fatores futuros do score — nenhum motor de cálculo implementado nesta sprint. */
export const CRM_TEMPERATURE_SCORE_FACTORS = [
  "recencia", "frequencia", "interacao", "canal", "resposta", "reuniao",
  "proposta", "orcamento", "comportamento", "perfil", "fit", "valor",
  "urgencia", "historico",
] as const;

// ── Follow-up (Fase 19) ──────────────────────────────────────────────────────

export type CrmFollowUpType = "manual" | "automatic" | "suggested" | "recurring" | "event_triggered";

export type CrmFollowUpStatus = "pending" | "due_today" | "overdue" | "completed" | "cancelled" | "rescheduled" | "waiting_response";

export interface CrmFollowUpDefinition {
  id: string;
  type: CrmFollowUpType;
  objective: string;
}

export interface CrmFollowUpSchedule {
  leadId: string;
  ownerId: string;
  dueAt: string;
  channel: string;
}

export interface CrmFollowUpExecution {
  id: string;
  scheduleId: string;
  status: CrmFollowUpStatus;
  messageContext: string | null;
}

export interface CrmFollowUpOutcome {
  executionId: string;
  outcome: string;
  nextAction: string | null;
}

export interface CrmFollowUpRule {
  id: string;
  createdBy: string;
  source: string;
  confidence: "confirmed" | "calculated" | "estimated" | "incomplete" | "divergent" | "unknown";
}

// ── Dashboards (Fase 20) ─────────────────────────────────────────────────────

export type CrmDashboardMode = "essential" | "manager";

export const CRM_DASHBOARD_ESSENTIAL_WIDGETS = [
  "novos_leads", "leads_quentes", "follow_ups_hoje", "follow_ups_atrasados",
  "propostas_abertas", "valor_em_negociacao", "conversao", "proxima_acao",
] as const;

export const CRM_DASHBOARD_MANAGER_WIDGETS = [
  "funil", "conversao_por_etapa", "tempo_por_etapa", "origem", "responsavel",
  "valor", "previsao", "perdas", "motivos", "temperatura", "sla_follow_up",
  "cohort", "recorrencia", "comparacao_de_periodos", "nicho", "produto", "canal",
] as const;

// ── IA futura do CRM (Fase 21) ───────────────────────────────────────────────

export const CRM_INTELLIGENCE_CAPABILITIES = [
  "resumir_lead", "sugerir_proxima_acao", "sugerir_follow_up",
  "identificar_lead_esfriando", "detectar_falta_de_resposta",
  "classificar_intencao", "preparar_reuniao", "gerar_plano_de_fechamento",
  "identificar_objecoes", "sugerir_perguntas", "revisar_proposta",
  "prever_risco", "analisar_perda",
] as const;

/** A IA nunca decide isto automaticamente — toda ação exige revisão ou regra explícita. */
export const CRM_INTELLIGENCE_FORBIDDEN_AUTO_ACTIONS = [
  "fechar_lead", "descartar", "alterar_valor", "enviar_mensagem",
  "prometer_condicao", "alterar_pipeline", "mover_oportunidade",
] as const;
