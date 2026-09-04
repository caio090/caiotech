import { NextRequest, NextResponse } from "next/server";
import { resolveCompanyContext } from "@/lib/company-context/resolve";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { withMutationProtection } from "@/lib/workspaces/assert-not-preview";
import { createCreativeSeries, findRecentCreativeSeries } from "@/lib/rec-os/studio/series/repository";
import type { CreativeSeriesSize } from "@/lib/rec-os/studio/series/types";

/**
 * Prompt 16 (REC OS Persistence Completion) — Fase 18-21/25/26: cria
 * uma Série Visual (N rows independentes, nunca 1 imagem com N
 * layouts) e permite localizar a série recente de um contexto (pra
 * "continuar" em vez de sempre recomeçar -- Fase 25).
 *
 * Mesmo padrão de autorização de /api/studio/images/generate/route.ts:
 * Company Mode -> resolveCompanyContext() (único resolver canônico);
 * Free Mode -> só getCurrentUser(), created_by do próprio usuário
 * (nunca Company fictícia). SEMPRE usa o client Supabase da SESSÃO
 * pra criar/ler series/items (RLS real, Fase 53).
 */

const VALID_SIZES: CreativeSeriesSize[] = [1, 3, 6, 9];
const MAX_BRIEF_CHARS = 4000;

interface CreateBody {
  clientId?: string;
  contentId?: string;
  campaignId?: string;
  format?: string;
  placement?: string;
  freeformBrief?: string;
  count?: number;
}

function parseCreateBody(raw: unknown): { ok: true; body: CreateBody & { freeformBrief: string; count: CreativeSeriesSize } } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "JSON inválido." };
  const b = raw as Record<string, unknown>;
  const freeformBrief = typeof b.freeformBrief === "string" ? b.freeformBrief.trim() : "";
  if (!freeformBrief || freeformBrief.length > MAX_BRIEF_CHARS) return { ok: false, error: "Briefing obrigatório (até 4000 caracteres)." };
  const count = typeof b.count === "number" && VALID_SIZES.includes(b.count as CreativeSeriesSize) ? (b.count as CreativeSeriesSize) : null;
  if (!count) return { ok: false, error: "Quantidade inválida (use 1, 3, 6 ou 9)." };
  return {
    ok: true,
    body: {
      clientId: typeof b.clientId === "string" ? b.clientId.trim() : undefined,
      contentId: typeof b.contentId === "string" ? b.contentId.trim() : undefined,
      campaignId: typeof b.campaignId === "string" ? b.campaignId.trim() : undefined,
      format: typeof b.format === "string" ? b.format : undefined,
      placement: typeof b.placement === "string" ? b.placement : undefined,
      freeformBrief, count,
    },
  };
}

export const POST = withMutationProtection(async function POST(request: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido.", code: "SERIES_INVALID_INPUT" }, { status: 400 });
  }
  const parsed = parseCreateBody(rawBody);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error, code: "SERIES_INVALID_INPUT" }, { status: 400 });
  }
  const { clientId, contentId, campaignId, format, placement, freeformBrief, count } = parsed.body;

  let resolvedCompanyId: string | null = null;
  let userId: string;

  if (clientId) {
    const resolution = await resolveCompanyContext(clientId);
    if (!resolution.valid || !resolution.context) {
      const unauthorized = resolution.reason === "role_not_supported";
      return NextResponse.json(
        { ok: false, error: unauthorized ? "Sem permissão para criar séries nesta Company." : "Contexto de Company necessário.", code: unauthorized ? "SERIES_UNAUTHORIZED" : "SERIES_COMPANY_REQUIRED" },
        { status: unauthorized ? 403 : 401 },
      );
    }
    if (resolution.context.readOnly) {
      return NextResponse.json({ ok: false, error: "Contexto somente leitura (preview).", code: "SERIES_READ_ONLY" }, { status: 403 });
    }
    resolvedCompanyId = resolution.context.companyId;
    const db = await createServerSupabaseClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Sessão necessária.", code: "SERIES_COMPANY_REQUIRED" }, { status: 401 });
    userId = user.id;
  } else {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "Sessão necessária.", code: "SERIES_COMPANY_REQUIRED" }, { status: 401 });
    userId = user.id;
  }

  const db = await createServerSupabaseClient();
  // Fase 21 -- rótulo neutro determinístico por posição, nunca uma
  // categoria fabricada (mesma decisão de series-orchestrator.ts).
  const itemBriefs = Array.from({ length: count }, (_, i) => ({ position: i + 1, role: `Peça ${i + 1}`, brief: freeformBrief }));

  const result = await createCreativeSeries(db, {
    clientId: resolvedCompanyId, contentId: contentId ?? null, campaignId: campaignId ?? null,
    title: null, count, placement: placement ?? null, format: format ?? null, creativeDirection: null,
    createdBy: userId, itemBriefs,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error, code: "SERIES_CREATE_FAILED" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, series: result.series });
});

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const clientId = params.get("client_id");
  const contentId = params.get("content_id");

  if (clientId) {
    const resolution = await resolveCompanyContext(clientId);
    if (!resolution.valid || !resolution.context) {
      const unauthorized = resolution.reason === "role_not_supported";
      return NextResponse.json(
        { ok: false, error: unauthorized ? "Sem permissão para ver séries desta Company." : "Contexto de Company necessário.", code: unauthorized ? "SERIES_UNAUTHORIZED" : "SERIES_COMPANY_REQUIRED" },
        { status: unauthorized ? 403 : 401 },
      );
    }
  } else {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "Sessão necessária.", code: "SERIES_COMPANY_REQUIRED" }, { status: 401 });
  }

  const db = await createServerSupabaseClient();
  const recent = await findRecentCreativeSeries(db, { clientId, contentId });
  return NextResponse.json({ ok: true, series: recent });
}
