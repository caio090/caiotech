import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { withMutationProtection } from "@/lib/workspaces/assert-not-preview";
import { getCreativeSeriesWithItems, updateCreativeSeriesItem, recomputeSeriesStatus } from "@/lib/rec-os/studio/series/repository";
import { persistSeriesItemAsset } from "@/lib/rec-os/studio/series/asset-persistence";
import type { CreativeSeriesItemStatus } from "@/lib/rec-os/studio/series/types";

/**
 * Prompt 16 (REC OS Persistence Completion) — Fase 23/27/28/29/30/32:
 * transição de status de UM item da série (planned/generating/ready/
 * error/canceled) -- nunca recria a série nem os demais items (Fase
 * 29). Mesmo endpoint cobre: marcar "generating" antes do request real
 * ao provider, marcar "ready"/"error" depois, "regenerar" (volta pra
 * "planned") e "cancelar" (planned -> canceled).
 *
 * Autorização: a série é buscada primeiro (RLS via client da sessão já
 * impede ler/mutar item de série de outra Company/usuário -- Fase 53).
 * Se `imageDataUrl` vier junto de status "ready" e a série for
 * Company-scoped, tenta persistir o asset de verdade (Fase 32/36-38);
 * se o bucket ainda não existir (SQL 93 pendente), degrada honesto
 * (Fase 34: nunca grava base64 em SQL).
 */

const VALID_STATUSES = new Set<CreativeSeriesItemStatus>(["planned", "generating", "ready", "error", "canceled"]);
const MAX_DATA_URL_CHARS = 8_000_000;

interface PatchBody {
  status?: string;
  imageDataUrl?: string;
  errorMessage?: string;
}

export const PATCH = withMutationProtection(async function PATCH(request: NextRequest, { params }: { params: Promise<{ seriesId: string; itemId: string }> }) {
  const { seriesId, itemId } = await params;
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido.", code: "SERIES_ITEM_INVALID_INPUT" }, { status: 400 });
  }
  const body = rawBody as PatchBody;
  const status = body.status;
  if (!status || !VALID_STATUSES.has(status as CreativeSeriesItemStatus)) {
    return NextResponse.json({ ok: false, error: "status inválido.", code: "SERIES_ITEM_INVALID_INPUT" }, { status: 400 });
  }
  if (body.imageDataUrl !== undefined && (typeof body.imageDataUrl !== "string" || body.imageDataUrl.length > MAX_DATA_URL_CHARS)) {
    return NextResponse.json({ ok: false, error: "imageDataUrl inválida.", code: "SERIES_ITEM_INVALID_INPUT" }, { status: 400 });
  }

  const db = await createServerSupabaseClient();
  // RLS (via client da sessão) já garante que só quem pode acessar a
  // série consegue lê-la aqui -- série de outra Company/usuário
  // devolve null, nunca revela existência (mesmo 404 genérico).
  const seriesWithItems = await getCreativeSeriesWithItems(db, seriesId);
  if (!seriesWithItems || !seriesWithItems.items.some((i) => i.id === itemId)) {
    return NextResponse.json({ ok: false, error: "Item não encontrado.", code: "SERIES_ITEM_NOT_FOUND" }, { status: 404 });
  }

  // Fase 24/30 -- cancel só se o item ainda estiver "planned"; nunca aborta um request já em voo.
  const currentItem = seriesWithItems.items.find((i) => i.id === itemId)!;
  if (status === "canceled" && currentItem.status !== "planned") {
    return NextResponse.json({ ok: false, error: "Só é possível cancelar itens ainda não iniciados.", code: "SERIES_ITEM_NOT_CANCELABLE" }, { status: 409 });
  }

  let assetUrl: string | null = null;
  let assetPersisted = false;
  if (status === "ready" && body.imageDataUrl) {
    if (seriesWithItems.series.clientId) {
      const { data: { user } } = await db.auth.getUser();
      const persisted = await persistSeriesItemAsset(db, {
        clientId: seriesWithItems.series.clientId, seriesItemId: itemId, dataUrl: body.imageDataUrl, createdBy: user?.id ?? "",
      });
      if (persisted.persisted) { assetUrl = persisted.signedUrl; assetPersisted = true; }
      // Bucket ainda não configurado (SQL 93 pendente) -- item ainda fica
      // "ready", mas sem asset sobrevivendo ao refresh (Fase 34: nunca
      // grava base64 como fallback). Documentado em AÇÕES MANUAIS/WEB.
    }
    // Free Mode (sem clientId): sem persistência de asset por design (Fase 35) -- ephemeral + download continua o caminho real.
  }

  const updated = await updateCreativeSeriesItem(db, itemId, {
    status: status as CreativeSeriesItemStatus,
    assetUrl, assetPersisted,
    width: 1080, height: 1080,
    error: status === "error" ? (body.errorMessage ?? "Falha na geração.") : null,
  });
  if (!updated) {
    return NextResponse.json({ ok: false, error: "Não foi possível atualizar o item.", code: "SERIES_ITEM_UPDATE_FAILED" }, { status: 500 });
  }
  await recomputeSeriesStatus(db, seriesId);

  return NextResponse.json({ ok: true, assetPersisted });
});
