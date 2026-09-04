import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { withMutationProtection } from "@/lib/workspaces/assert-not-preview";
import { getCreativeSeriesWithItems, updateCreativeSeriesItemStatus, recomputeSeriesStatus } from "@/lib/rec-os/studio/series/repository";
import { persistGeneratedSeriesItemAsset } from "@/lib/rec-os/studio/series/asset-persistence";
import type { CreativeSeriesItemStatus } from "@/lib/rec-os/studio/series/types";

/**
 * Prompt 18 (Creative Series Control & Asset Link Repair) — transição
 * de status de UM item da série. Reescrito a partir do Prompt 16 pra
 * corrigir o P1-C real de Production: "ready" com imagem SEMPRE passa
 * por persistGeneratedSeriesItemAsset() (upload -> asset row -> item
 * link -> só então status=ready) -- nunca mais é possível um item
 * terminar "ready" Company-scoped sem `visual_asset_id` (Test 08).
 *
 * Máquina de estado explícita (Fase "REGRA DE CANCELAMENTO"/"STALE
 * GENERATING"):
 *   planned    -> generating (início de uma geração)
 *   generating -> ready  (via persistGeneratedSeriesItemAsset, ou
 *                          direto pra Free Mode sem asset)
 *   generating -> error  (falha do provider)
 *   planned    -> canceled (só itens NUNCA iniciados -- 409 se o item
 *                          já está generating/ready/error)
 *   canceled/error -> planned (reativar/retry -- NUNCA gera sozinho)
 * "ready" nunca é alcançável a partir de "planned"/"canceled"
 * diretamente -- sempre passa por "generating" primeiro (o client
 * sempre PATCHa generating antes de chamar o provider).
 *
 * Regenerate de um item "ready" NUNCA passa por esta máquina de status
 * antes do resultado -- ver _series-panel.tsx: só chama este endpoint
 * com "ready"+imageDataUrl no SUCESSO (atomic swap, asset antigo
 * continua válido até então) ou não chama nada no fracasso (o item
 * "ready" antigo nunca é tocado).
 */

const VALID_STATUSES = new Set<CreativeSeriesItemStatus>(["planned", "generating", "ready", "error", "canceled"]);
const MAX_DATA_URL_CHARS = 8_000_000;
const MAX_ERROR_MESSAGE_CHARS = 500;

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
  const currentItem = seriesWithItems?.items.find((i) => i.id === itemId);
  if (!seriesWithItems || !currentItem) {
    return NextResponse.json({ ok: false, error: "Item não encontrado.", code: "SERIES_ITEM_NOT_FOUND" }, { status: 404 });
  }

  // Fase "REGRA DE CANCELAMENTO" -- cancel só se o item ainda estiver
  // "planned"; nunca aborta um request já em voo (item generating).
  if (status === "canceled" && currentItem.status !== "planned") {
    return NextResponse.json({ ok: false, error: "Só é possível cancelar itens ainda não iniciados.", code: "SERIES_ITEM_NOT_CANCELABLE" }, { status: 409 });
  }
  // "generating" só a partir de "planned" -- nunca reinicia um item já em voo/pronto.
  if (status === "generating" && currentItem.status !== "planned") {
    return NextResponse.json({ ok: false, error: "Este item não está pronto para iniciar geração.", code: "SERIES_ITEM_INVALID_TRANSITION" }, { status: 409 });
  }
  // "planned" (reativar/retry) só a partir de "canceled"/"error" -- nunca de "ready" (regenerate de item ready nunca passa por este status) nem de "generating" (em voo).
  if (status === "planned" && !["canceled", "error"].includes(currentItem.status)) {
    return NextResponse.json({ ok: false, error: "Este item não pode voltar para planejado agora.", code: "SERIES_ITEM_INVALID_TRANSITION" }, { status: 409 });
  }

  let assetId: string | null = null;
  let assetPersisted = false;

  if (status === "ready") {
    if (!body.imageDataUrl) {
      return NextResponse.json({ ok: false, error: "imageDataUrl obrigatória para marcar como pronto.", code: "SERIES_ITEM_INVALID_INPUT" }, { status: 400 });
    }
    if (seriesWithItems.series.clientId) {
      const { data: { user } } = await db.auth.getUser();
      const persisted = await persistGeneratedSeriesItemAsset(db, {
        clientId: seriesWithItems.series.clientId, seriesId, seriesItemId: itemId, dataUrl: body.imageDataUrl,
        createdBy: user?.id ?? "", previousAssetId: currentItem.visualAssetId ?? null,
      });
      if (!persisted.ok) {
        // Fase "NO READY WITHOUT LINK" (Test 08) -- Company-scoped nunca
        // termina "ready" sem visual_asset_id: se a persistência falhar,
        // o item vira "error" explícito, nunca um "ready" fantasma.
        await updateCreativeSeriesItemStatus(db, itemId, { status: "error", error: persisted.error });
        await recomputeSeriesStatus(db, seriesId);
        return NextResponse.json({ ok: false, error: persisted.error, code: persisted.code }, { status: 502 });
      }
      assetId = persisted.assetId;
      assetPersisted = true;
      // persistGeneratedSeriesItemAsset já marcou o item "ready" + visual_asset_id -- nunca um update duplicado/divergente aqui.
      await recomputeSeriesStatus(db, seriesId);
      return NextResponse.json({ ok: true, assetPersisted, assetId, signedUrl: persisted.signedUrl });
    }
    // Free Mode -- sem persistência de asset por design (Fase 35: ephemeral + download).
    const updated = await updateCreativeSeriesItemStatus(db, itemId, { status: "ready" });
    if (!updated) return NextResponse.json({ ok: false, error: "Não foi possível atualizar o item.", code: "SERIES_ITEM_UPDATE_FAILED" }, { status: 500 });
    await recomputeSeriesStatus(db, seriesId);
    return NextResponse.json({ ok: true, assetPersisted: false, assetId: null });
  }

  const errorMessage = status === "error" ? (body.errorMessage ?? "Falha na geração.").slice(0, MAX_ERROR_MESSAGE_CHARS) : null;
  const updated = await updateCreativeSeriesItemStatus(db, itemId, { status: status as CreativeSeriesItemStatus, error: errorMessage });
  if (!updated) {
    return NextResponse.json({ ok: false, error: "Não foi possível atualizar o item.", code: "SERIES_ITEM_UPDATE_FAILED" }, { status: 500 });
  }
  await recomputeSeriesStatus(db, seriesId);
  return NextResponse.json({ ok: true, assetPersisted, assetId });
});
