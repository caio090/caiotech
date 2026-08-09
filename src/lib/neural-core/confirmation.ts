/**
 * Sprint Gota Neural Foundation V1 (Fase 50) — Confirmation Layer.
 * Nenhum executor criado aqui -- só o contrato do pedido de confirmação.
 */

export type ActionConfirmationStatus = "pending" | "confirmed" | "rejected" | "expired";

export interface ActionConfirmation {
  actionId: string;
  companyId: string;
  projectId?: string;
  requestedBy: string;
  summary: string;
  impact: string;
  status: ActionConfirmationStatus;
  confirmedBy?: string;
  confirmedAt?: string;
}
