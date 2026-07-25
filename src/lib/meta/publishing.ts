import type { DbContentItem } from "../supabase/types";

export const META_OAUTH_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "instagram_basic",
  "instagram_manage_insights",
  "instagram_content_publish",
  "business_management",
] as const;

export type MetaPublishMode = "dry_run" | "publish";

export interface MetaPublishPlan {
  channel: "instagram_feed";
  instagramAccountId: string;
  mediaUrl: string;
  caption: string;
}

export interface MetaGraphErrorBody {
  error?: { message?: string; code?: number; error_subcode?: number };
}

const URL_KEYS = ["publication_media_url", "media_url", "final_asset_url", "asset_url"] as const;

// Hostnames/ranges that must never be handed to the Meta Graph API as
// image_url — Meta's servers fetch that URL server-side, so accepting a
// loopback/private/link-local address would turn this feature into an SSRF
// primitive against internal infrastructure.
const BLOCKED_HOSTNAMES = new Set(["localhost", "0.0.0.0"]);

function isPrivateOrLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTNAMES.has(host)) return true;
  if (host === "::1") return true;
  if (host.endsWith(".local")) return true;
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const a = Number(ipv4[1]);
    const b = Number(ipv4[2]);
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true;
  }
  return false;
}

function isSafePublicHttpsUrl(url: URL): boolean {
  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false; // no embedded credentials
  if (url.port && url.port !== "443") return false; // no unusual ports
  if (isPrivateOrLoopbackHost(url.hostname)) return false;
  return true;
}

export function getPublicationMediaUrl(content: Pick<DbContentItem, "metadata">): string | null {
  const metadata = content.metadata ?? {};
  for (const key of URL_KEYS) {
    const value = metadata[key];
    if (typeof value !== "string" || !value.trim()) continue;
    try {
      const url = new URL(value.trim());
      if (isSafePublicHttpsUrl(url)) return url.toString();
    } catch { /* invalid URL; try the next supported key */ }
  }
  return null;
}

export function buildInstagramFeedPlan(
  content: Pick<DbContentItem, "caption" | "metadata">,
  instagramAccountId: string,
): MetaPublishPlan {
  const mediaUrl = getPublicationMediaUrl(content);
  if (!mediaUrl) {
    throw new Error("Adicione uma URL HTTPS pública da arte final em metadata.publication_media_url.");
  }

  return {
    channel: "instagram_feed",
    instagramAccountId,
    mediaUrl,
    caption: content.caption?.trim() ?? "",
  };
}

// No retry logic here on purpose: Meta's media_publish endpoint has no
// idempotency key, so re-sending it after a lost response could double-post
// the same content. A bounded timeout (fail fast, surface the error) is the
// safe choice — the caller decides what to do with a failure, it never
// retries the publish step itself.
const GRAPH_API_TIMEOUT_MS = 15_000;

export async function publishInstagramFeed(
  plan: MetaPublishPlan,
  accessToken: string,
  apiVersion: string,
): Promise<{ containerId: string; mediaId: string }> {
  const createBody = new URLSearchParams({
    image_url: plan.mediaUrl,
    caption: plan.caption,
    access_token: accessToken,
  });
  const createResponse = await fetch(
    `https://graph.facebook.com/${apiVersion}/${plan.instagramAccountId}/media`,
    { method: "POST", body: createBody, cache: "no-store", signal: AbortSignal.timeout(GRAPH_API_TIMEOUT_MS) },
  );
  const created = await createResponse.json() as { id?: string } & MetaGraphErrorBody;
  if (!createResponse.ok || !created.id) {
    throw new Error(created.error?.message ?? "A Meta não criou o container da publicação.");
  }

  const publishBody = new URLSearchParams({
    creation_id: created.id,
    access_token: accessToken,
  });
  const publishResponse = await fetch(
    `https://graph.facebook.com/${apiVersion}/${plan.instagramAccountId}/media_publish`,
    { method: "POST", body: publishBody, cache: "no-store", signal: AbortSignal.timeout(GRAPH_API_TIMEOUT_MS) },
  );
  const published = await publishResponse.json() as { id?: string } & MetaGraphErrorBody;
  if (!publishResponse.ok || !published.id) {
    throw new Error(published.error?.message ?? "A Meta não concluiu a publicação.");
  }

  return { containerId: created.id, mediaId: published.id };
}
