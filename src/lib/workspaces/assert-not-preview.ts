import { NextResponse } from "next/server";

/**
 * The real security boundary for Fase "Somente leitura": every server
 * action / API route that mutates data must call this before writing, using
 * the SAME `previewReadOnly` flag the page passed down — never trusting the
 * frontend's disabled state alone. A request from a tampered/adulterated
 * query string that claims readOnly=false without a valid preview
 * resolution never reaches here with readOnly=true in the first place,
 * because resolveWorkspacePreview() (src/lib/workspaces/preview.ts) is the
 * only place readOnly is set to true, and it always sets it to true for
 * every preview it approves — there is no code path that produces
 * `{ isPreview: true, readOnly: false }`.
 */
export function assertNotPreview(readOnly: boolean): NextResponse | null {
  if (!readOnly) return null;
  return NextResponse.json(
    { error: "Ação bloqueada: este é um acesso de visualização somente leitura." },
    { status: 403 }
  );
}
