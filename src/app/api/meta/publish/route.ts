import { NextResponse } from "next/server";
import { createServerSupabaseClient, createSupabaseAdminClient, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";
import type { DbContentItem } from "@/lib/supabase/types";
import { buildInstagramFeedPlan, getPublicationMediaUrl, publishInstagramFeed, type MetaPublishMode } from "@/lib/meta/publishing";
import {
  META_PUBLISH_BLOCK_MESSAGES,
  resolveMetaAssetLinkage,
  resolveMetaConnectionState,
  resolveMetaContentFormat,
  resolveMetaPublishBlockReason,
} from "@/lib/meta/publish-eligibility";
import { withMutationProtection } from "@/lib/workspaces/assert-not-preview";

const ALLOWED_ROLES = new Set(["admin", "super_admin", "operacional", "social_media"]);

interface PublishRequest { content_id?: string; mode?: MetaPublishMode }

async function handlePublish(request: Request): Promise<NextResponse> {
  let body: PublishRequest;
  try { body = await request.json() as PublishRequest; }
  catch { return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 }); }

  if (!body.content_id || !["dry_run", "publish"].includes(body.mode ?? "")) {
    return NextResponse.json({ ok: false, reason: "invalid_request" }, { status: 400 });
  }

  const sessionDb = await createServerSupabaseClient();
  const { data: { user } } = await sessionDb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

  const { data: profile } = await sessionDb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile?.role || !ALLOWED_ROLES.has(profile.role)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  // Tokens remain server-side. The service client is only used after authentication and role checks.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any = sessionDb;
  if (hasSupabaseServiceRoleKey()) {
    try { db = createSupabaseAdminClient(); } catch { /* keep the session client */ }
  }

  const { data: rawContent, error: contentError } = await db
    .from("content_items")
    .select("id, client_id, title, type, channel, caption, status, carousel_pages_count, metadata")
    .eq("id", body.content_id)
    .maybeSingle();
  if (contentError || !rawContent) {
    return NextResponse.json({ ok: false, reason: "content_not_found" }, { status: 404 });
  }
  const content = rawContent as DbContentItem;

  const previousMediaId = typeof content.metadata?.meta_publication_id === "string"
    ? content.metadata.meta_publication_id : null;
  if (previousMediaId) {
    return NextResponse.json({ ok: true, already_published: true, media_id: previousMediaId });
  }

  // client_id is derived from the content record itself, never from request
  // input — this is what keeps publication isolated to the content's own
  // client, regardless of who is calling.
  const { data: asset } = await db
    .from("client_meta_assets")
    .select("asset_id, username, meta_connection_id")
    .eq("client_id", content.client_id)
    .eq("asset_type", "instagram_business")
    .order("is_primary", { ascending: false })
    .limit(1)
    .maybeSingle();

  const hasInstagramAsset = !!asset?.asset_id && !!asset.meta_connection_id;

  // Cross-client ambiguity check — runs, and can block, BEFORE the
  // connection/token is ever loaded. docs/supabase/37-client-meta-assets.sql
  // only enforces uniqueness within one client (client_id, asset_type,
  // asset_id); nothing stops the same physical Instagram account from also
  // being linked to a different client. If it is, we must not pick one
  // client's connection arbitrarily and publish through it — fail closed
  // and stop here, without querying meta_connections at all.
  const assetLinkage = hasInstagramAsset
    ? resolveMetaAssetLinkage(
        (await db
          .from("client_meta_assets")
          .select("client_id")
          .eq("asset_type", "instagram_business")
          .eq("asset_id", asset.asset_id)).data ?? [],
      )
    : "not_found";

  if (assetLinkage === "ambiguous") {
    return NextResponse.json(
      { ok: false, reason: "asset_link_ambiguous", message: META_PUBLISH_BLOCK_MESSAGES.asset_link_ambiguous },
      { status: 409 },
    );
  }

  const connection = hasInstagramAsset
    ? (await db
        .from("meta_connections")
        .select("access_token, scopes, status")
        .eq("id", asset.meta_connection_id)
        .maybeSingle()).data
    : null;

  // Single shared eligibility check — same function backs dry_run and
  // publish, so a dry-run reflects the full picture (including whether the
  // connection needs to be reconnected) instead of only surfacing that at
  // actual-publish time. assetLinkage can never be "ambiguous" here — that
  // case already returned above, before this function even runs.
  const blockReason = resolveMetaPublishBlockReason({
    dbStatus: content.status,
    alreadyPublished: false, // handled by the early return above
    format: resolveMetaContentFormat(content),
    hasMediaUrl: getPublicationMediaUrl(content) !== null,
    hasInstagramAsset,
    assetLinkage,
    connectionState: resolveMetaConnectionState(connection),
  });

  if (blockReason) {
    return NextResponse.json(
      { ok: false, reason: blockReason, message: META_PUBLISH_BLOCK_MESSAGES[blockReason] },
      { status: 409 },
    );
  }

  // blockReason === null guarantees asset, connection and a valid media URL
  // are all present, so this cannot throw.
  const plan = buildInstagramFeedPlan(content, asset.asset_id as string);

  if (body.mode === "dry_run") {
    return NextResponse.json({
      ok: true,
      dry_run: true,
      plan: { channel: plan.channel, account: asset.username ?? asset.asset_id, media_url: plan.mediaUrl, caption: plan.caption },
    });
  }

  try {
    const result = await publishInstagramFeed(
      plan,
      connection.access_token as string,
      process.env.META_API_VERSION?.trim() || "v21.0",
    );
    const publishedAt = new Date().toISOString();
    const nextMetadata = {
      ...(content.metadata ?? {}),
      meta_publication_id: result.mediaId,
      meta_container_id: result.containerId,
      meta_published_at: publishedAt,
      meta_publication_channel: plan.channel,
      meta_publication_account_id: plan.instagramAccountId,
      meta_publication_confirmed_by: user.id,
    };

    // The Graph API call already succeeded at this point — we must never
    // repeat it just because the local write failed, since media_publish
    // has no idempotency key and a retry could double-post. One bounded
    // retry of the LOCAL write (never of publishInstagramFeed) covers a
    // transient DB hiccup without looping.
    let updateError = (await db.from("content_items").update({ status: "publicado", metadata: nextMetadata }).eq("id", content.id)).error;
    if (updateError) {
      updateError = (await db.from("content_items").update({ status: "publicado", metadata: nextMetadata }).eq("id", content.id)).error;
    }
    if (updateError) {
      return NextResponse.json({ ok: false, reason: "published_but_not_recorded", media_id: result.mediaId }, { status: 502 });
    }
    return NextResponse.json({ ok: true, media_id: result.mediaId, published_at: publishedAt });
  } catch (error) {
    return NextResponse.json({ ok: false, reason: "meta_error", message: error instanceof Error ? error.message : "Falha ao publicar na Meta." }, { status: 502 });
  }
}

// withMutationProtection is the explicit route-level Workspaces guard — the
// P0 finding from the audit. The coarse proxy-level namespace block
// (src/proxy.ts) stays in place too; the two are deliberately redundant
// defense-in-depth, not a replacement for one another.
export const POST = withMutationProtection(handlePublish);
