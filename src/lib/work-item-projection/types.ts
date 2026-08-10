/**
 * Sprint MVP Dogfood Spine V0.1 (Bloco C, Fase 19-20) — Work Item Projection.
 * READ MODEL sobre fontes reais (Fase 22: NUNCA source-of-truth). Reaproveita
 * BusinessOfficeFeedItem (já testado, já usado por Meu Escritório) em vez de
 * re-consultar content_items/operational_tasks/approvals separadamente.
 */

export type WorkItemType =
  | "task" | "deliverable" | "pending" | "approval" | "event"
  | "decision" | "milestone" | "follow_up" | "activity" | "alert";

export interface WorkItemProjection {
  id: string;
  workspaceId: string;
  companyId: string;
  projectId: string | null;
  module: string;
  type: WorkItemType;
  title: string;
  status: string;
  priority: "alta" | "media" | "baixa" | null;
  owner: string | null;
  startAt: string | null;
  dueAt: string | null;
  completedAt: string | null;
  sourceModule: string;
  sourceEntityType: string;
  sourceEntityId: string;
  sourceUrl: string;
  approvalRef: string | null;
  dependencies: null;
  updatedAt: string | null;
}
