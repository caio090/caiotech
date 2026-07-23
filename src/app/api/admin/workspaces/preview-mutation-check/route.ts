import { NextRequest, NextResponse } from "next/server";
import { assertNotPreview } from "@/lib/workspaces/assert-not-preview";

/**
 * Demonstration/test route only — proves assertNotPreview() actually blocks
 * a write when previewReadOnly is true, end to end (Fase "Testes": "Mutação
 * bloqueada no backend"). Not a real business mutation. Real endpoints
 * (Meu Negócio, REC OS, etc.) do not yet call assertNotPreview() — that
 * retrofit is explicitly out of scope this sprint (see final report) since
 * a super_admin previewing already has unrestricted write access under the
 * current role model; enforcement here matters once SupportAccessGrant
 * (non-super-admin, real access, not yet persisted) ships for real.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const blocked = assertNotPreview(body.previewReadOnly === true);
  if (blocked) return blocked;
  return NextResponse.json({ ok: true, mutated: true });
}
