// Relative import (not the "@/" alias), kept extensionless like the rest of
// the app — this file's tests run via the "npm run test:meta" pipeline
// (tsc-compiles this + its dependencies to CommonJS, then plain `node` runs
// the output), not via Node's native TS stripping directly on this source,
// so no source-level extension trick is needed here.
import { dbStatusToUi } from "../supabase/types";
import type { DbContentItem } from "../supabase/types";

/**
 * Single source of truth for "can this content be published to Meta right
 * now, and if not, why". Both the API route (src/app/api/meta/publish) and
 * the frontend button (src/app/contentos/publicacoes/_client-content.tsx)
 * must derive eligibility from these functions instead of keeping their own
 * independent status lists — that duplication is what let the backend
 * accept "pronto_para_agendar" while no UI path could ever reach it.
 */

// A DB status is publishable exactly when it maps to the UI "approved"
// status — the same status the frontend uses to decide whether to render
// the button at all. Today that's { aprovado, agendado }; if dbStatusToUi's
// map changes, this follows automatically instead of drifting.
export function isMetaPublishableDbStatus(dbStatus: string): boolean {
  return dbStatusToUi(dbStatus) === "approved";
}

// Only a plain Instagram Feed image post is supported end-to-end today
// (single media_url via /media + /media_publish). Stories, Reels and
// carousels need different Graph API endpoints/parameters this branch does
// not implement, so they must stay blocked rather than silently mis-publish.
export type MetaContentFormat = "feed_image" | "unsupported_format";

const FEED_IMAGE_TYPES = new Set(["feed", "post"]);

export function resolveMetaContentFormat(
  content: Pick<DbContentItem, "type" | "carousel_pages_count">,
): MetaContentFormat {
  const type = (content.type ?? "").trim().toLowerCase();
  if ((content.carousel_pages_count ?? 0) > 1) return "unsupported_format";
  if (!FEED_IMAGE_TYPES.has(type)) return "unsupported_format";
  return "feed_image";
}

// docs/supabase/37-client-meta-assets.sql has no constraint preventing the
// same physical asset_id (asset_type = instagram_business) from being
// linked to more than one client_id — the unique constraint is scoped to
// (client_id, asset_type, asset_id), which only prevents a duplicate WITHIN
// one client. Publishing through a cross-linked account would mean two
// different clients' workflows can both trigger posts to the same real
// Instagram account, so this must fail closed rather than pick one client
// arbitrarily.
export type MetaAssetLinkageState = "exclusive" | "ambiguous" | "not_found";

// rows must already be filtered to the resolved asset's exact
// (asset_type, asset_id) pair — this function only counts distinct clients
// among rows it's given, it does not do any filtering itself.
export function resolveMetaAssetLinkage(
  rowsForThisAsset: readonly { client_id: string }[],
): MetaAssetLinkageState {
  const distinctClients = new Set(rowsForThisAsset.map((row) => row.client_id));
  if (distinctClients.size === 0) return "not_found";
  if (distinctClients.size > 1) return "ambiguous";
  return "exclusive";
}

export type MetaConnectionState = "not_connected" | "needs_reconnect" | "ready";

export function resolveMetaConnectionState(
  connection: { status?: string | null; scopes?: string | null } | null | undefined,
): MetaConnectionState {
  if (!connection || connection.status !== "active") return "not_connected";
  const scopes = String(connection.scopes ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!scopes.includes("instagram_content_publish")) return "needs_reconnect";
  return "ready";
}

export type MetaPublishBlockReason =
  | "not_approved"
  | "already_published"
  | "unsupported_format"
  | "instagram_not_linked"
  | "asset_link_ambiguous"
  | "invalid_media"
  | "connection_inactive"
  | "permission_missing";

export const META_PUBLISH_BLOCK_MESSAGES: Record<MetaPublishBlockReason, string> = {
  not_approved: "Somente conteúdo aprovado pode ser publicado.",
  already_published: "Este conteúdo já foi publicado.",
  unsupported_format: "Somente posts de Feed com imagem podem ser publicados por aqui. Stories, Reels e carrossel ainda não são suportados.",
  instagram_not_linked: "Vincule uma conta Instagram Business ao cliente.",
  asset_link_ambiguous: "Esta conta Meta está vinculada a mais de uma empresa. Revise as conexões antes de publicar.",
  invalid_media: "Adicione uma URL HTTPS pública da arte final em metadata.publication_media_url.",
  connection_inactive: "Reconecte a conta Meta antes de publicar.",
  permission_missing: "A conexão não possui a permissão instagram_content_publish. Reconecte a conta Meta para conceder o novo escopo.",
};

/**
 * Ordered eligibility check shared by dry_run and publish modes. Returns
 * null when the content is clear to publish, otherwise the first reason
 * that blocks it (checked in the order a user would need to fix them).
 *
 * assetLinkage is checked before hasMediaUrl/connectionState — an ambiguous
 * asset must block regardless of whether the media/connection would
 * otherwise be fine, and the caller is expected to resolve it (and decide
 * whether to even look up the connection/token at all) before this runs.
 */
export function resolveMetaPublishBlockReason(params: {
  dbStatus: string;
  alreadyPublished: boolean;
  format: MetaContentFormat;
  hasMediaUrl: boolean;
  hasInstagramAsset: boolean;
  assetLinkage: MetaAssetLinkageState;
  connectionState: MetaConnectionState;
}): MetaPublishBlockReason | null {
  if (params.alreadyPublished) return "already_published";
  if (!isMetaPublishableDbStatus(params.dbStatus)) return "not_approved";
  if (params.format === "unsupported_format") return "unsupported_format";
  if (!params.hasInstagramAsset) return "instagram_not_linked";
  if (params.assetLinkage === "ambiguous") return "asset_link_ambiguous";
  if (!params.hasMediaUrl) return "invalid_media";
  if (params.connectionState === "not_connected") return "connection_inactive";
  if (params.connectionState === "needs_reconnect") return "permission_missing";
  return null;
}
