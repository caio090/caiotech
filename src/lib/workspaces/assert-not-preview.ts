import { NextResponse } from "next/server";
import { getWorkspacePreviewContext } from "./context";
import { recordWorkspaceAuditEvent } from "./audit-log";

export const WORKSPACE_PREVIEW_READ_ONLY_CODE = "WORKSPACE_PREVIEW_READ_ONLY";

/**
 * The real security boundary for Fase "Somente leitura". Fixed in this
 * sprint (1.0.1) to no longer accept a caller-supplied boolean — the
 * previous version trusted a `readOnly` flag the CLIENT sent in the request
 * body, which is exactly the "frontend disable is not enough" problem this
 * sprint exists to close. It now independently determines preview state by
 * reading the signed, HttpOnly session cookie itself
 * (src/lib/workspaces/context.ts) and re-validating against the database —
 * nothing the request body/query string says can influence the result.
 *
 * Every mutating API route reachable from a workspace preview should call
 * this (or the withMutationProtection wrapper below) BEFORE touching
 * Supabase, sending email, or calling any integration.
 */
export async function assertWorkspaceMutationAllowed(): Promise<NextResponse | null> {
  const resolved = await getWorkspacePreviewContext();
  if (resolved.status !== "active_read_only" || !resolved.context) return null;
  recordWorkspaceAuditEvent({
    type: "workspace_preview_mutation_blocked",
    uid: null, // getWorkspacePreviewContext() re-validates uid internally but does not surface it here — avoids re-deriving it just for logging
    surface: resolved.context.surface,
    workspaceId: resolved.context.workspaceId,
    isBlueprint: resolved.context.workspaceId?.startsWith("blueprint-") ?? null,
  });
  return NextResponse.json(
    { error: "Esta ação está indisponível no modo de visualização.", code: WORKSPACE_PREVIEW_READ_ONLY_CODE },
    { status: 403 }
  );
}

/** Wraps a Next.js Route Handler so the guard always runs first, before any of the handler's own logic. */
export function withMutationProtection<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    const blocked = await assertWorkspaceMutationAllowed();
    if (blocked) return blocked;
    return handler(...args);
  };
}
