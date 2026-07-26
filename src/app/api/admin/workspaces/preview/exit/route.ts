import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { verifyPreviewSessionToken, WORKSPACE_PREVIEW_COOKIE } from "@/lib/workspaces/preview-session";
import { recordWorkspaceAuditEvent } from "@/lib/workspaces/audit-log";
import {
  buildAtomicExitRedirect,
  buildSafeRedirect,
  WORKSPACE_PREVIEW_EXIT_DESTINATION,
  WORKSPACE_PREVIEW_EXIT_LOGIN_DESTINATION,
} from "@/lib/workspaces/atomic-exit";

/**
 * Hotfix 1.0.10 — the only atomic way to end a preview: a real document
 * <form method="post"> submission lands here, and the cookie deletion +
 * the redirect are written onto the exact same response (see
 * atomic-exit.ts). Never called via fetch; never a client-side navigation
 * decision — the browser follows the 303 exactly like any other form POST.
 *
 * Authorization is re-verified against Supabase here, the same way every
 * other privileged mutation in this codebase re-verifies role server-side
 * instead of trusting anything the client claims — the preview cookie's own
 * signature proves it wasn't tampered with, never that the bearer is still
 * allowed to hold it (see the docstring in preview-session.ts).
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    // Not authenticated: never touch the cookie, just send them to log in.
    return buildSafeRedirect(req.url, WORKSPACE_PREVIEW_EXIT_LOGIN_DESTINATION);
  }

  const authClient = await createServerSupabaseClient();
  const { data: profile } = await authClient.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || profile.role !== "super_admin") {
    // Authenticated but not (or no longer) super_admin: land them somewhere
    // safe without pretending an exit happened and without touching any
    // cookie — there is nothing this session is entitled to end.
    return buildSafeRedirect(req.url, WORKSPACE_PREVIEW_EXIT_DESTINATION);
  }

  const cookieHeader = req.cookies.get(WORKSPACE_PREVIEW_COOKIE)?.value;
  const verified = verifyPreviewSessionToken(cookieHeader);
  const payload = verified.ok ? verified.payload : verified.reason === "expired" ? verified.payload : null;
  if (payload) {
    recordWorkspaceAuditEvent({
      type: "workspace_preview_ended", uid: payload.uid, surface: payload.surface,
      workspaceId: payload.workspaceId, isBlueprint: payload.isBlueprint,
    });
  }

  return buildAtomicExitRedirect(req.url, WORKSPACE_PREVIEW_COOKIE);
}
