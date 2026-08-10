/**
 * Sprint MVP Dogfood Spine V0.1 (Bloco B) — Company Context.
 * Auditoria (Fase 3-4) confirmou que "Company Context" hoje está
 * fragmentado entre pelo menos 4 resolvers parciais (resolveCurrentClient,
 * resolveClientContext, resolveCrmWorkspaceContext, getWorkspacePreviewContext)
 * -- nenhum deles compõe "sessão -> cliente selecionado -> business direto
 * -> preview" num único objeto. Este módulo NÃO cria uma Company table nem
 * altera schema: é um resolver read-only que COMPÕE os resolvers reais já
 * existentes. `clients` continua sendo a fonte de verdade.
 */
import type { WorkspaceSurface } from "@/lib/workspaces/types";

export type CompanyContextSource =
  | "workspace_preview"
  | "client_portal"
  | "admin_explicit_selection";

export type CompanyContextUnmetReason =
  | "not_authenticated"
  | "company_required"
  | "company_not_found"
  | "role_not_supported";

/**
 * Fase 6 — campos mínimos pedidos pelo brief. `accountType` espelha
 * `surface` hoje (não existe uma segunda taxonomia de tipo de conta ainda);
 * mantido como campo distinto porque o brief pede explicitamente e porque
 * `CanonicalBusinessContext` (neural-core) já reserva esse nome para uma
 * futura distinção mais fina.
 */
export interface ResolvedCompanyContext {
  workspaceId: string | null;
  companyId: string;
  companyName: string | null;
  surface: WorkspaceSurface;
  role: string | null;
  accountType: WorkspaceSurface;
  preview: boolean;
  readOnly: boolean;
  source: CompanyContextSource;
  sourceClientId: string;
}

export interface CompanyContextResolution {
  valid: boolean;
  reason?: CompanyContextUnmetReason;
  context: ResolvedCompanyContext | null;
}
