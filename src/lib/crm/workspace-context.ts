/**
 * Sprint Navegação e Experiência 3.0.1.2 (Fase 24) — resolução de contexto
 * do CRM. Auditoria honesta do estado real: `waitlist_entries` (a fonte
 * hoje usada por /admin/leads via /api/admin/waitlist) não tem nenhuma
 * coluna de workspace/agência/cliente — é uma tabela única, de escopo
 * PLATAFORMA (leads da própria Lokat), consistente com "Super ADM: CRM
 * comercial da Lokat" (Fase 23). Segmentação real por agência/cliente
 * ("CRM adaptativo completo") está explicitamente FORA do escopo desta
 * sprint — este resolver nunca finge uma segmentação que não existe.
 *
 * Nunca confia em query isolada, client_id do navegador ou role enviado
 * pelo frontend — sempre a partir do contexto de sessão/preview já
 * resolvido no servidor (mesmo padrão usado em toda esta sprint).
 */
import type { WorkspaceSurface } from "@/lib/workspaces/types";

export type CrmScope = "platform" | "not_yet_segmented";

export interface CrmWorkspaceContext {
  surface: WorkspaceSurface | null;
  workspaceId: string | null;
  readOnly: boolean;
  scope: CrmScope;
}

/**
 * `surface`/`workspaceId`/`isPreview` devem vir de um resolvedor de sessão
 * real (getWorkspacePreviewContext() ou a sessão admin/super_admin já
 * validada pelo proxy) — nunca de um parâmetro de URL ou de um valor
 * enviado pelo cliente.
 */
export function resolveCrmWorkspaceContext(input: {
  surface: WorkspaceSurface | null;
  workspaceId: string | null;
  isPreview: boolean;
}): CrmWorkspaceContext {
  const scope: CrmScope = input.surface === "super_admin" || input.surface === null ? "platform" : "not_yet_segmented";
  return {
    surface: input.surface,
    workspaceId: input.workspaceId,
    readOnly: input.isPreview,
    scope,
  };
}
