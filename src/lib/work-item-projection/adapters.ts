/**
 * Sprint MVP Dogfood Spine V0.1 (Bloco C, Fase 21-25) — Work Item adapters.
 * Fonte primária: BusinessOfficeFeedItem (já reúne content_items/
 * operational_tasks/approvals, já company-scoped via clientId, já usado por
 * Meu Escritório) -- reuso explícito pedido pela Regra de Ouro. Só os três
 * tipos que hoje têm `dataAvailability: "available"` (content/task/approval)
 * viram WorkItemProjection real; os demais (meeting/finance/campaign/
 * decision/goal/document/note) são placeholders "not_integrated" e nunca
 * chegam aqui como item real.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getBusinessOfficeFeed } from "@/lib/business-office/data";
import type { BusinessOfficeFeedItem, BusinessOfficeFeedType } from "@/lib/business-office/types";
import type { WorkItemProjection, WorkItemType } from "./types";

const TYPE_MAP: Partial<Record<BusinessOfficeFeedType, WorkItemType>> = {
  task: "task",
  operational_item: "task",
  content: "deliverable",
  approval: "approval",
  meeting: "event",
  follow_up: "follow_up",
  campaign: "milestone",
  finance: "alert",
  deadline: "alert",
  decision: "decision",
};

function workItemTypeFromBusinessOffice(type: BusinessOfficeFeedType): WorkItemType {
  return TYPE_MAP[type] ?? "activity";
}

/**
 * Fase 22 — a source-of-truth continua sendo Approval/Calendar/REC OS,
 * nunca este projection. Fase 24 — nenhum projectId inventado: nenhuma
 * BusinessOfficeFeedItem carrega relação com rec_projects hoje.
 */
export function workItemFromBusinessOfficeItem(item: BusinessOfficeFeedItem): WorkItemProjection {
  return {
    id: `business_office:${item.id}`,
    workspaceId: item.workspaceId,
    companyId: item.workspaceId,
    projectId: null,
    module: item.sourceModule,
    type: workItemTypeFromBusinessOffice(item.type),
    title: item.title,
    status: item.status,
    priority: item.priority,
    owner: item.responsible,
    startAt: item.startsAt,
    dueAt: item.dueAt,
    completedAt: item.completedAt,
    sourceModule: item.sourceModule,
    sourceEntityType: item.type,
    sourceEntityId: item.sourceEntityId,
    sourceUrl: item.href,
    approvalRef: item.type === "approval" ? item.sourceEntityId : null,
    dependencies: null,
    updatedAt: null,
  };
}

/**
 * Fase 21 — só adapta itens realmente disponíveis (Fase 43: nenhum dado
 * fake) e faz uma segunda checagem de isolamento (Fase 48) mesmo já tendo
 * pedido o feed filtrado por company -- nunca confia em uma única camada.
 */
export async function getWorkItemProjections(
  adminDb: SupabaseClient,
  companyId: string,
): Promise<WorkItemProjection[]> {
  const { items } = await getBusinessOfficeFeed(adminDb, { clientId: companyId });
  return items
    .filter((item) => item.dataAvailability === "available" && item.workspaceId === companyId)
    .map(workItemFromBusinessOfficeItem);
}

// ── CRM follow-up (Fase 51: "quando source suportar") ───────────────────
// commercial_leads NÃO tem vínculo com uma Company (clients.id) hoje --
// auditoria confirmou (src/app/operacional/comercial/follow-ups/page.tsx
// nunca filtra por client_id). Este adapter existe e é testado
// isoladamente, mas NÃO é chamado por getWorkItemProjections() -- ligar um
// lead comercial a uma Company específica exigiria inventar uma relação
// que não existe, o que a Regra de Ouro proíbe. Fica documentado como
// próximo passo quando commercial_leads ganhar esse vínculo real.

export interface CommercialLeadFollowUpRow {
  id: string;
  company_name: string;
  contact_name: string | null;
  pipeline_stage: string;
  next_action: string | null;
  next_action_at: string | null;
}

export function workItemFromCommercialLeadFollowUp(row: CommercialLeadFollowUpRow): WorkItemProjection {
  return {
    id: `commercial_leads:${row.id}`,
    workspaceId: "",
    companyId: "",
    projectId: null,
    module: "operacional_comercial",
    type: "follow_up",
    title: row.next_action ?? `Follow-up: ${row.company_name}`,
    status: row.pipeline_stage,
    priority: null,
    owner: row.contact_name,
    startAt: null,
    dueAt: row.next_action_at,
    completedAt: null,
    sourceModule: "commercial_leads",
    sourceEntityType: "commercial_lead",
    sourceEntityId: row.id,
    sourceUrl: "/operacional/comercial/follow-ups",
    approvalRef: null,
    dependencies: null,
    updatedAt: null,
  };
}
