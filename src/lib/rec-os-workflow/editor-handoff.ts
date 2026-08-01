/**
 * Sprint REC OS 3.0.1.1 (Fase 14) — adaptador central do handoff para o
 * EditorOS. Antes, o fluxo real montava a URL do EditorOS com
 * concatenação de string solta (`?client=...&content_id=...&return_to=...`)
 * mesmo já existindo o tipo `EditorAssetHandoff` em types.ts — o contrato
 * nunca era realmente construído/validado. Esta sprint substitui a
 * concatenação por build → validate → serialize → parse.
 *
 * O brief lista quatro mecanismos aceitáveis para não persistir o handoff:
 * "ID de handoff em memória; token local assinado; state seguro; ou
 * parâmetros mínimos validados". Escolhido aqui: parâmetros mínimos
 * validados — nunca o objeto inteiro (copy/restrictions nunca vão para a
 * URL), nunca localStorage/sessionStorage/banco para o handoff em si. Um
 * carimbo de tempo (`handoff_at`) permite detectar expiração sem precisar
 * de nenhum armazenamento adicional (Fase 16).
 */
import type { ContentFormat, EditorAssetHandoff } from "./types";
import { isEditorAssetHandoffReady } from "./types";

const HANDOFF_TTL_MS = 2 * 60 * 60 * 1000; // 2h — janela de uma sessão de trabalho.

export function buildEditorAssetHandoff(input: Omit<EditorAssetHandoff, "createdAt">): EditorAssetHandoff {
  return { ...input, createdAt: new Date().toISOString() };
}

/** Retorna a lista de problemas — vazio significa handoff válido. Nunca lança. */
export function validateEditorAssetHandoff(handoff: EditorAssetHandoff): string[] {
  const errors: string[] = [];
  if (!handoff.workspaceId) errors.push("workspaceId ausente");
  if (!handoff.clientId) errors.push("clientId ausente");
  if (!handoff.contentId) errors.push("contentId ausente");
  if (!handoff.returnRoute || !handoff.returnRoute.startsWith("/admin/")) errors.push("returnRoute ausente ou fora de /admin/");
  return errors;
}

/** Apenas campos mínimos e não sensíveis — nunca `copy`/`restrictions`/o objeto inteiro (Fase 14). */
export function serializeEditorAssetHandoff(handoff: EditorAssetHandoff): URLSearchParams {
  const params = new URLSearchParams();
  params.set("client", handoff.clientId);
  params.set("content_id", handoff.contentId);
  if (handoff.campaignId) params.set("campaign_id", handoff.campaignId);
  if (handoff.format) params.set("format", handoff.format);
  params.set("has_asset", String(isEditorAssetHandoffReady(handoff)));
  params.set("handoff_at", handoff.createdAt);
  params.set("return_to", handoff.returnRoute);
  return params;
}

export interface RawHandoffParams {
  client?: string;
  content_id?: string;
  campaign_id?: string;
  format?: string;
  has_asset?: string;
  handoff_at?: string;
  return_to?: string;
}

export interface ParsedEditorHandoff {
  clientId: string | null;
  contentId: string | null;
  campaignId: string | null;
  format: ContentFormat | string | null;
  hasAsset: boolean;
  handoffAt: string | null;
  returnRoute: string | null;
  expired: boolean;
}

/** Nunca lança em entrada adulterada — parâmetro ausente/inválido apenas vira `null`/`false` (Fase 3: "query manipulada não pode conceder acesso"). */
export function parseEditorAssetHandoff(params: RawHandoffParams): ParsedEditorHandoff {
  const handoffAt = params.handoff_at ?? null;
  let expired = false;
  if (handoffAt) {
    const parsedTime = new Date(handoffAt).getTime();
    expired = Number.isNaN(parsedTime) ? false : Date.now() - parsedTime > HANDOFF_TTL_MS;
  }
  return {
    clientId: params.client ?? null,
    contentId: params.content_id ?? null,
    campaignId: params.campaign_id ?? null,
    format: params.format ?? null,
    hasAsset: params.has_asset === "true",
    handoffAt,
    returnRoute: params.return_to ?? null,
    expired,
  };
}
