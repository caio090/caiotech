import type { WorkspaceSurface } from "./types";

/**
 * Fase 16 do hotfix 1.0.1 — contrato de eventos de auditoria para o preview
 * de workspaces. Deliberadamente NÃO persiste em nenhuma tabela: apenas
 * define o formato e emite via console.info em um único canal, para que a
 * persistência real (tabela + política RLS) possa ser adicionada depois sem
 * reabrir os call sites que já emitem estes eventos.
 */
export type WorkspaceAuditEventType =
  | "workspace_preview_started"
  | "workspace_preview_ended"
  | "workspace_preview_expired"
  | "workspace_preview_mutation_blocked";

export interface WorkspaceAuditEvent {
  type: WorkspaceAuditEventType;
  uid: string | null;
  surface: WorkspaceSurface | null;
  workspaceId: string | null;
  isBlueprint: boolean | null;
  at: string;
  detail?: string;
}

export function recordWorkspaceAuditEvent(
  event: Omit<WorkspaceAuditEvent, "at">
): void {
  const full: WorkspaceAuditEvent = { ...event, at: new Date().toISOString() };
  // Placeholder de emissão — trocar por insert em tabela de auditoria real
  // (ver docs/workspace-preview-security.md, seção "Audit log") quando o
  // schema for aprovado. Nenhum dado sensível (token, cookie) é logado aqui.
  console.info("[workspace_audit]", JSON.stringify(full));
}
