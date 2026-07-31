/** Fase 31: núcleo universal de operação -- tarefa/responsável/prazo/status/evidência/custo/dependência/aprovação/resultado, adaptável por nicho via nichePackId. */
export interface OperationalTemplateStepDetail {
  id: string;
  label: string;
  responsible?: string;
  dueDate?: string;
  status: "pending" | "in_progress" | "blocked" | "approved" | "done";
  evidence?: string[];
  cost?: number;
  dependsOnStepId?: string;
  requiresApproval: boolean;
  result?: string;
}

export interface OperationalTemplate {
  id: string;
  nichePackId: string;
  name: string;
  steps: OperationalTemplateStepDetail[];
  requiredFields: string[];
  optionalFields: string[];
  metrics: string[];
  evidenceTypes: string[];
  dependencies: string[];
  automationOpportunities: string[];
}

/** Fixture demonstrativa -- nenhum painel operacional completo implementado nesta sprint. */
export const DEMO_OPERATIONAL_TEMPLATES: OperationalTemplate[] = [
  {
    id: "op_template_food_service_order",
    nichePackId: "food_service",
    name: "Preparo e entrega de pedido (exemplo)",
    steps: [
      { id: "step_receive", label: "Receber pedido", status: "done", requiresApproval: false },
      { id: "step_prepare", label: "Preparar", status: "in_progress", dependsOnStepId: "step_receive", requiresApproval: false },
      { id: "step_deliver", label: "Entregar", status: "pending", dependsOnStepId: "step_prepare", requiresApproval: false },
    ],
    requiredFields: ["canal", "horario_pedido"],
    optionalFields: ["observacoes"],
    metrics: ["tempo_preparo", "tempo_entrega"],
    evidenceTypes: ["foto_pedido", "comprovante_entrega"],
    dependencies: [],
    automationOpportunities: ["notificar_cliente_status"],
  },
];
