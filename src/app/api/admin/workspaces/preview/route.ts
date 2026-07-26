import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveWorkspacePreview } from "@/lib/workspaces/preview";
import {
  createPreviewSessionToken,
  verifyPreviewSessionToken,
  WorkspacePreviewSigningKeyUnavailableError,
  WORKSPACE_PREVIEW_COOKIE,
  WORKSPACE_PREVIEW_COOKIE_MAX_AGE_SECONDS,
} from "@/lib/workspaces/preview-session";
import { BLUEPRINT_AGENCY, BLUEPRINT_AGENCY_CLIENTS, BLUEPRINT_DIRECT_BUSINESS } from "@/lib/workspaces/blueprint-fixtures";
import { recordWorkspaceAuditEvent } from "@/lib/workspaces/audit-log";
import type { WorkspaceSurface } from "@/lib/workspaces/types";

const BLUEPRINT_IDS = new Set([BLUEPRINT_AGENCY.id, BLUEPRINT_DIRECT_BUSINESS.id, ...BLUEPRINT_AGENCY_CLIENTS.map((c) => c.id)]);

/**
 * Fase 5 — the only way a preview session cookie is ever created. Never
 * accepts readOnly (there is no such field to accept — see
 * preview-session.ts), never accepts capabilities or role from the client.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

  const authClient = await createServerSupabaseClient();
  const { data: profile } = await authClient.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || profile.role !== "super_admin") {
    return NextResponse.json({ ok: false, reason: "forbidden_not_super_admin" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const surface = body.surface as WorkspaceSurface | undefined;
  const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : undefined;
  const isBlueprintRequested = body.isBlueprint === true;

  if (!surface || !workspaceId) return NextResponse.json({ ok: false, reason: "missing_params" }, { status: 400 });

  if (isBlueprintRequested) {
    if (!BLUEPRINT_IDS.has(workspaceId)) return NextResponse.json({ ok: false, reason: "unknown_blueprint" }, { status: 400 });
    const parentWorkspaceId = BLUEPRINT_AGENCY_CLIENTS.some((c) => c.id === workspaceId) ? BLUEPRINT_AGENCY.id : null;
    let token: string;
    try {
      token = createPreviewSessionToken({ uid: user.id, surface, workspaceId, parentWorkspaceId, isBlueprint: true });
    } catch (e) {
      if (e instanceof WorkspacePreviewSigningKeyUnavailableError) {
        return NextResponse.json({ ok: false, reason: "signing_key_unavailable" }, { status: 503 });
      }
      throw e;
    }
    const res = NextResponse.json({ ok: true, destination: "/admin/visualizar" });
    res.headers.set("Cache-Control", "no-store");
    res.cookies.set(WORKSPACE_PREVIEW_COOKIE, token, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
      path: "/", maxAge: WORKSPACE_PREVIEW_COOKIE_MAX_AGE_SECONDS,
    });
    recordWorkspaceAuditEvent({ type: "workspace_preview_started", uid: user.id, surface, workspaceId, isBlueprint: true });
    return res;
  }

  // Real workspace — validate exactly the same way the context resolver will re-validate on every subsequent read.
  const resolution = await resolveWorkspacePreview({ previewSurface: surface, workspaceId });
  if (!resolution.ok) return NextResponse.json({ ok: false, reason: resolution.reason }, { status: 400 });

  let token: string;
  try {
    token = createPreviewSessionToken({
      uid: user.id, surface, workspaceId,
      parentWorkspaceId: resolution.context.parentWorkspaceId, isBlueprint: false,
    });
  } catch (e) {
    if (e instanceof WorkspacePreviewSigningKeyUnavailableError) {
      return NextResponse.json({ ok: false, reason: "signing_key_unavailable" }, { status: 503 });
    }
    throw e;
  }
  const res = NextResponse.json({ ok: true, destination: "/admin/visualizar" });
  res.headers.set("Cache-Control", "no-store");
  res.cookies.set(WORKSPACE_PREVIEW_COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: WORKSPACE_PREVIEW_COOKIE_MAX_AGE_SECONDS,
  });
  recordWorkspaceAuditEvent({ type: "workspace_preview_started", uid: user.id, surface, workspaceId, isBlueprint: false });
  return res;
}

/** Fase 6 — the only way the cookie is ever cleared. Never touches the Supabase auth session. */
export async function DELETE(req: NextRequest) {
  const cookieHeader = req.cookies.get(WORKSPACE_PREVIEW_COOKIE)?.value;
  const verified = verifyPreviewSessionToken(cookieHeader);
  const payload = verified.ok ? verified.payload : verified.reason === "expired" ? verified.payload : null;

  const res = NextResponse.json({ ok: true });
  res.headers.set("Cache-Control", "no-store");
  res.cookies.set(WORKSPACE_PREVIEW_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  if (payload) {
    recordWorkspaceAuditEvent({
      type: "workspace_preview_ended", uid: payload.uid, surface: payload.surface,
      workspaceId: payload.workspaceId, isBlueprint: payload.isBlueprint,
    });
  }
  return res;
}
