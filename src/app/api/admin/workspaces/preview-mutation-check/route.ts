import { NextResponse } from "next/server";
import { withMutationProtection } from "@/lib/workspaces/assert-not-preview";

/**
 * Demonstration/test route only — proves the guard blocks a write end to
 * end using the REAL server-side preview session (cookie), not a
 * client-supplied flag. Not a real business mutation.
 */
export const POST = withMutationProtection(async () => {
  return NextResponse.json({ ok: true, mutated: true });
});
