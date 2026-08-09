/**
 * Sprint Gota Neural Foundation V1 (Fase 37-39) — Agent Registry.
 * Metadata apenas -- nenhum agente executa LLM real. `available_contract`
 * significa "o contrato existe e pode ser referenciado pelo
 * Orchestrator", nunca "roda IA de verdade".
 */
import type { Capability } from "./capabilities";
import type { ResponseBlockType } from "./response-blocks";

export type AgentDomain =
  | "business_strategy" | "project" | "commercial" | "crm" | "content"
  | "growth" | "finance" | "operations" | "integration" | "documents" | "analytics";

export type AgentStatus = "available_contract" | "planned" | "locked" | "experimental" | "unavailable";

export interface AgentDefinition {
  id: AgentDomain;
  name: string;
  domain: AgentDomain;
  description: string;
  status: AgentStatus;
  allowedContextScopes: Array<"global" | "company" | "project" | "module" | "item">;
  requiredCapabilities: Capability[];
  readScopes: string[];
  supportedResponseBlocks: ResponseBlockType[];
  draftActions: string[];
  confirmableActions: string[];
  forbiddenActions: string[];
}

export const AGENT_REGISTRY: readonly AgentDefinition[] = [
  { id: "business_strategy", name: "Estratégia de Negócio", domain: "business_strategy", description: "DNA, diagnóstico, posicionamento, metas.", status: "available_contract", allowedContextScopes: ["company"], requiredCapabilities: [], readScopes: ["company_profile", "business_dna"], supportedResponseBlocks: ["insight", "diagnosis", "strategy", "priority"], draftActions: [], confirmableActions: [], forbiddenActions: ["delete_company"] },
  { id: "project", name: "Projetos", domain: "project", description: "Estruturação e acompanhamento de Projects/Work Items.", status: "available_contract", allowedContextScopes: ["company", "project"], requiredCapabilities: [], readScopes: ["project"], supportedResponseBlocks: ["project", "task"], draftActions: ["create_work_item_draft"], confirmableActions: [], forbiddenActions: ["delete_project"] },
  { id: "commercial", name: "Comercial", domain: "commercial", description: "Oportunidades, propostas, follow-ups.", status: "available_contract", allowedContextScopes: ["company", "project"], requiredCapabilities: ["crm"], readScopes: ["crm"], supportedResponseBlocks: ["crm", "priority"], draftActions: [], confirmableActions: [], forbiddenActions: ["send_proposal"] },
  { id: "crm", name: "CRM", domain: "crm", description: "Leads, pipeline, relacionamento.", status: "available_contract", allowedContextScopes: ["company"], requiredCapabilities: ["crm"], readScopes: ["crm"], supportedResponseBlocks: ["crm", "connection"], draftActions: [], confirmableActions: [], forbiddenActions: ["delete_lead"] },
  { id: "content", name: "Conteúdo (REC OS)", domain: "content", description: "Radar, criação, produção, aprovações.", status: "available_contract", allowedContextScopes: ["company", "project"], requiredCapabilities: ["social_content"], readScopes: ["content"], supportedResponseBlocks: ["content", "campaign"], draftActions: ["create_content_draft"], confirmableActions: [], forbiddenActions: ["publish_content", "send_for_approval"] },
  { id: "growth", name: "Growth", domain: "growth", description: "Diagnóstico de funil, metas, ofertas.", status: "planned", allowedContextScopes: ["company"], requiredCapabilities: ["analytics"], readScopes: ["growth"], supportedResponseBlocks: ["metric", "priority"], draftActions: [], confirmableActions: [], forbiddenActions: [] },
  { id: "finance", name: "Financeiro", domain: "finance", description: "Indicadores e compromissos financeiros.", status: "planned", allowedContextScopes: ["company"], requiredCapabilities: ["payment"], readScopes: ["financial"], supportedResponseBlocks: ["financial"], draftActions: [], confirmableActions: [], forbiddenActions: ["execute_payment", "issue_refund"] },
  { id: "operations", name: "Operacional", domain: "operations", description: "Tarefas, kanban, pendências internas.", status: "available_contract", allowedContextScopes: ["company", "project", "item"], requiredCapabilities: [], readScopes: ["operational_tasks"], supportedResponseBlocks: ["task", "warning"], draftActions: ["create_task_draft"], confirmableActions: [], forbiddenActions: ["delete_task"] },
  { id: "integration", name: "Integrações", domain: "integration", description: "Estado de Connections e capabilities.", status: "available_contract", allowedContextScopes: ["company"], requiredCapabilities: [], readScopes: ["connections"], supportedResponseBlocks: ["connection", "warning"], draftActions: [], confirmableActions: [], forbiddenActions: ["connect_integration", "disconnect_integration"] },
  { id: "documents", name: "Documentos", domain: "documents", description: "LOKAT Docs -- referências e templates.", status: "planned", allowedContextScopes: ["company", "project"], requiredCapabilities: ["documents"], readScopes: ["documents"], supportedResponseBlocks: ["document"], draftActions: [], confirmableActions: [], forbiddenActions: ["delete_document"] },
  { id: "analytics", name: "Analytics", domain: "analytics", description: "Métricas agregadas e leitura de indicadores.", status: "experimental", allowedContextScopes: ["company", "project"], requiredCapabilities: ["analytics"], readScopes: ["analytics"], supportedResponseBlocks: ["metric"], draftActions: [], confirmableActions: [], forbiddenActions: [] },
] as const;

export function findAgent(id: AgentDomain): AgentDefinition | undefined {
  return AGENT_REGISTRY.find((a) => a.id === id);
}

/** Fase 39 — nunca chamar um agente `planned`/`locked`/`experimental`/`unavailable` de "disponível para execução". */
export function isAgentRuntimeAvailable(agent: AgentDefinition): boolean {
  return agent.status === "available_contract";
}
