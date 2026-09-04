import { NextRequest, NextResponse } from "next/server";
import { resolveCompanyContext } from "@/lib/company-context/resolve";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { withMutationProtection } from "@/lib/workspaces/assert-not-preview";
import { resolveFeedDnaProfile, saveManualFeedDna } from "@/lib/rec-os/social-profile/feed-dna";
import type { FeedDnaPatternType } from "@/lib/rec-os/social-profile/feed-dna";

/**
 * Prompt 16 (REC OS Persistence Completion) — GET/PUT do Feed DNA
 * manual. Fecha o P1-A do Prompt 13 QA: schema/RLS/resolver já
 * existiam, faltava a rota que autoriza a Company ANTES de tocar
 * `feed_dna_profiles` (RLS é a segunda camada, nunca a única -- Fase
 * 06/53).
 *
 * SEMPRE usa o client Supabase da SESSÃO (nunca o admin/service role)
 * pra ler/gravar `feed_dna_profiles` -- as policies RLS da tabela são
 * baseadas em auth.uid() real via can_access_client_company/
 * can_write_client_company (SQL 91/92), então usar o client da sessão
 * é o que faz RLS valer de verdade como segunda camada (Fase 53:
 * "não usar service role pra contornar RLS no produto normal").
 */

const PATTERN_TYPES = new Set<FeedDnaPatternType>([
  "FREE", "ALTERNATING", "CHECKERBOARD", "COLUMN_RHYTHM", "ROW_BLOCKS", "COLOR_SEQUENCE", "CAMPAIGN_BLOCKS", "CUSTOM",
]);
const MAX_NOTES_CHARS = 500;
const MAX_PALETTE_ITEMS = 8;
const MAX_RHYTHM_CHARS = 200;

export async function GET(request: NextRequest) {
  const companyId = new URL(request.url).searchParams.get("client_id");
  if (!companyId) {
    return NextResponse.json({ ok: false, error: "client_id obrigatório.", code: "FEED_DNA_INVALID_INPUT" }, { status: 400 });
  }

  const resolution = await resolveCompanyContext(companyId);
  if (!resolution.valid || !resolution.context) {
    const unauthorized = resolution.reason === "role_not_supported";
    return NextResponse.json(
      { ok: false, error: unauthorized ? "Sem permissão para ver o Feed DNA desta Company." : "Contexto de Company necessário.", code: unauthorized ? "FEED_DNA_UNAUTHORIZED" : "FEED_DNA_COMPANY_REQUIRED" },
      { status: unauthorized ? 403 : 401 },
    );
  }

  const db = await createServerSupabaseClient();
  const result = await resolveFeedDnaProfile(db, resolution.context.companyId);
  return NextResponse.json({ ok: true, result });
}

interface PutBody {
  clientId?: string;
  patternType?: string;
  notes?: string;
  dominantPalette?: string[];
  secondaryPalette?: string[];
  compositionRhythm?: string;
}

function parsePutBody(raw: unknown): { ok: true; body: Required<Pick<PutBody, "clientId" | "patternType">> & PutBody } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "JSON inválido." };
  const b = raw as Record<string, unknown>;
  const clientId = typeof b.clientId === "string" ? b.clientId.trim() : "";
  if (!clientId) return { ok: false, error: "clientId obrigatório." };
  const patternType = typeof b.patternType === "string" ? b.patternType : "";
  if (!PATTERN_TYPES.has(patternType as FeedDnaPatternType)) return { ok: false, error: "patternType inválido." };
  const notes = typeof b.notes === "string" ? b.notes.slice(0, MAX_NOTES_CHARS) : undefined;
  const compositionRhythm = typeof b.compositionRhythm === "string" ? b.compositionRhythm.slice(0, MAX_RHYTHM_CHARS) : undefined;
  const dominantPalette = Array.isArray(b.dominantPalette) ? b.dominantPalette.filter((c): c is string => typeof c === "string").slice(0, MAX_PALETTE_ITEMS) : undefined;
  const secondaryPalette = Array.isArray(b.secondaryPalette) ? b.secondaryPalette.filter((c): c is string => typeof c === "string").slice(0, MAX_PALETTE_ITEMS) : undefined;
  return { ok: true, body: { clientId, patternType: patternType as FeedDnaPatternType, notes, compositionRhythm, dominantPalette, secondaryPalette } };
}

export const PUT = withMutationProtection(async function PUT(request: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido.", code: "FEED_DNA_INVALID_INPUT" }, { status: 400 });
  }
  const parsed = parsePutBody(rawBody);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error, code: "FEED_DNA_INVALID_INPUT" }, { status: 400 });
  }

  const resolution = await resolveCompanyContext(parsed.body.clientId);
  if (!resolution.valid || !resolution.context) {
    const unauthorized = resolution.reason === "role_not_supported";
    return NextResponse.json(
      { ok: false, error: unauthorized ? "Sem permissão para editar o Feed DNA desta Company." : "Contexto de Company necessário.", code: unauthorized ? "FEED_DNA_UNAUTHORIZED" : "FEED_DNA_COMPANY_REQUIRED" },
      { status: unauthorized ? 403 : 401 },
    );
  }
  if (resolution.context.readOnly) {
    return NextResponse.json({ ok: false, error: "Este contexto é somente leitura (preview).", code: "FEED_DNA_READ_ONLY" }, { status: 403 });
  }

  const db = await createServerSupabaseClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sessão necessária.", code: "FEED_DNA_COMPANY_REQUIRED" }, { status: 401 });
  }

  const result = await saveManualFeedDna(db, {
    companyId: resolution.context.companyId,
    patternType: parsed.body.patternType as FeedDnaPatternType,
    notes: parsed.body.notes,
    dominantPalette: parsed.body.dominantPalette,
    secondaryPalette: parsed.body.secondaryPalette,
    compositionRhythm: parsed.body.compositionRhythm,
    updatedBy: user.id,
  });

  if (!result.ok) {
    const status = result.code === "FEED_DNA_STORAGE_NOT_CONFIGURED" ? 503 : 500;
    return NextResponse.json({ ok: false, error: result.error, code: result.code }, { status });
  }
  return NextResponse.json({ ok: true, profile: result.profile });
});
