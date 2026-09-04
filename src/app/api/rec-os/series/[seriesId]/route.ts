import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCreativeSeriesWithItems } from "@/lib/rec-os/studio/series/repository";

/**
 * Prompt 16/18 — hidrata uma série (com items) pra reconstruir o
 * SeriesPanel depois de um refresh. RLS (via client Supabase da
 * sessão) é a autorização real aqui -- uma série de outra Company
 * nunca aparece, sem precisar revelar se o id existe ou não (mesmo 404
 * genérico pros dois casos, mesmo princípio de "nunca revelar
 * existência" já usado em validateExplicitCompany).
 *
 * Prompt 18 -- toda hidratação primeiro reconcilia items presos em
 * "generating" há tempo demais (Fase "STALE GENERATING") antes de
 * devolver os dados -- nunca re-dispara geração, só corrige o status
 * pra "error" quando a execução foi claramente abandonada.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ seriesId: string }> }) {
  const { seriesId } = await params;
  if (!seriesId) {
    return NextResponse.json({ ok: false, error: "seriesId obrigatório.", code: "SERIES_INVALID_INPUT" }, { status: 400 });
  }
  const db = await createServerSupabaseClient();
  const result = await getCreativeSeriesWithItems(db, seriesId);
  if (!result) {
    return NextResponse.json({ ok: false, error: "Série não encontrada.", code: "SERIES_NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, series: result });
}
