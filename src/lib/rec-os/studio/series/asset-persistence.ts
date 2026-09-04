/**
 * Prompt 18 (Creative Series Control & Asset Link Repair) — P1-C fix.
 *
 * Auditoria em Production (Supabase MCP, read-only) confirmou o bug
 * EXATO deixado pelo Prompt 16/17: dois `client_visual_assets` reais
 * existiam (upload PASS, insert PASS, signed URL PASS,
 * `generation_metadata.persisted: true`), mas
 * `creative_series_items.visual_asset_id` continuava `NULL` -- o
 * Prompt 16 nunca escrevia esse FK de volta no item, só guardava a URL
 * ASSINADA (que expira) dentro de `generation_metadata`. Corrigido
 * aqui: `persistGeneratedSeriesItemAsset()` é a ÚNICA operação
 * server-side que faz upload + client_visual_assets + o vínculo real
 * em `creative_series_items.visual_asset_id`, nesta ordem exata, com
 * compensação se qualquer passo falhar depois de um passo anterior ter
 * sucesso -- nunca um ativo órfão silencioso.
 *
 * PATH (Fase "PATH"/"ASSET VERSION"): SQL 93 só valida o PRIMEIRO
 * segmento do path como `client_id` (`(storage.foldername(name))[1]`)
 * -- confirmado lendo a policy real -- então evoluir pra
 * `{clientId}/{seriesItemId}/{generationId}.{ext}` (um id único por
 * TENTATIVA de geração, nunca sobrescrevendo o arquivo anterior) é
 * seguro SEM nova migration. Isso viabiliza o ATOMIC SWAP: a versão
 * nova só é vinculada ao item DEPOIS de persistida com sucesso: a
 * antiga só é removida DEPOIS que a nova já está linkada -- nunca
 * antes (Fase "REGENERATE FAILURE": se a nova geração falhar, a antiga
 * continua intacta e visível).
 *
 * Signed URL NUNCA persistida no banco (expira) -- só
 * `storage_path`/metadata; a URL é sempre gerada on-demand na
 * hidratação (ver repository.ts).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { decodeImageDataUrl } from "../render/data-url";

export const STUDIO_VISUAL_ASSETS_BUCKET = "client-visual-assets";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1h -- suficiente pra uma sessão de revisão/uso, nunca permanente.

export interface PersistGeneratedSeriesItemAssetInput {
  clientId: string;
  seriesId: string;
  seriesItemId: string;
  dataUrl: string;
  createdBy: string;
  /** Fase "ATOMIC SWAP" -- id do asset ANTERIOR do item, se houver (regenerate). Só removido DEPOIS do novo estar linkado com sucesso. */
  previousAssetId?: string | null;
}

export type PersistGeneratedSeriesItemAssetResult =
  | { ok: true; assetId: string; signedUrl: string | null }
  | { ok: false; code: "INVALID_IMAGE" | "STORAGE_NOT_CONFIGURED" | "UPLOAD_FAILED" | "ASSET_INSERT_FAILED" | "ITEM_LINK_FAILED"; error: string };

/**
 * Fase "PERSIST GENERATED ITEM" -- única operação server-side pra
 * ligar uma geração bem-sucedida a um item de série. NUNCA aceita
 * `visual_asset_id`/`storage_path`/`companyId` vindos do client como
 * verdade -- tudo resolvido/gerado aqui. Ordem segura: upload -> asset
 * row -> item link -> (só então) limpeza do asset anterior.
 */
export async function persistGeneratedSeriesItemAsset(db: SupabaseClient, input: PersistGeneratedSeriesItemAssetInput): Promise<PersistGeneratedSeriesItemAssetResult> {
  const bytes = decodeImageDataUrl(input.dataUrl);
  if (!bytes) return { ok: false, code: "INVALID_IMAGE", error: "Imagem inválida (não decodificável)." };

  const mime = /^data:(image\/[a-z]+);base64,/i.exec(input.dataUrl)?.[1] ?? "image/png";
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  // Fase "IDEMPOTÊNCIA"/"PATH" -- um id novo por TENTATIVA (nunca reaproveita o path do item), então um retry nunca colide com/sobrescreve uma versão anterior ainda válida.
  const generationId = randomUUID();
  const storagePath = `${input.clientId}/${input.seriesItemId}/${generationId}.${ext}`;

  const upload = await db.storage.from(STUDIO_VISUAL_ASSETS_BUCKET).upload(storagePath, bytes, { contentType: mime, upsert: false });
  if (upload.error) {
    return { ok: false, code: "STORAGE_NOT_CONFIGURED", error: "Armazenamento de assets indisponível neste ambiente." };
  }

  const { data: assetRow, error: assetError } = await db
    .from("client_visual_assets")
    .insert({
      client_id: input.clientId, asset_type: "generated", asset_name: `Série ${input.seriesId} -- item ${input.seriesItemId}`,
      storage_path: storagePath, source: "generated", is_global: false, is_primary: false,
      metadata: { seriesId: input.seriesId, seriesItemId: input.seriesItemId, generationId, mime }, created_by: input.createdBy,
    })
    .select("id")
    .single();
  if (assetError || !assetRow) {
    // Fase "COMPENSATING ROLLBACK" -- upload PASS + asset INSERT FAIL -> remove o arquivo recém-criado via Storage API (nunca DELETE manual em storage.objects).
    await db.storage.from(STUDIO_VISUAL_ASSETS_BUCKET).remove([storagePath]);
    return { ok: false, code: "ASSET_INSERT_FAILED", error: "Não foi possível registrar o ativo gerado." };
  }
  const newAssetId = assetRow.id as string;

  const { error: linkError } = await db
    .from("creative_series_items")
    .update({ visual_asset_id: newAssetId, status: "ready", generation_metadata: { mime } })
    .eq("id", input.seriesItemId);
  if (linkError) {
    // Fase "COMPENSATING ROLLBACK" -- asset INSERT PASS + item LINK FAIL -> remove o asset recém-criado e o arquivo (nada mais referencia nenhum dos dois ainda).
    await db.from("client_visual_assets").delete().eq("id", newAssetId);
    await db.storage.from(STUDIO_VISUAL_ASSETS_BUCKET).remove([storagePath]);
    return { ok: false, code: "ITEM_LINK_FAILED", error: "Não foi possível vincular o ativo ao item." };
  }

  // Fase "REGENERATE ASSET STRATEGY" -- só limpa a versão anterior DEPOIS que a nova já está linkada com sucesso; falha aqui é best-effort (log), nunca desfaz o vínculo novo que já é a fonte de verdade.
  if (input.previousAssetId && input.previousAssetId !== newAssetId) {
    const { data: oldAsset } = await db.from("client_visual_assets").select("storage_path").eq("id", input.previousAssetId).maybeSingle();
    if (oldAsset?.storage_path) {
      const removed = await db.storage.from(STUDIO_VISUAL_ASSETS_BUCKET).remove([oldAsset.storage_path]);
      if (removed.error) console.warn("[series/asset-persistence] falha ao remover storage do asset anterior (best-effort)", { previousAssetId: input.previousAssetId });
    }
    const { error: oldDeleteError } = await db.from("client_visual_assets").delete().eq("id", input.previousAssetId);
    if (oldDeleteError) console.warn("[series/asset-persistence] falha ao remover row do asset anterior (best-effort)", { previousAssetId: input.previousAssetId });
  }

  const signed = await db.storage.from(STUDIO_VISUAL_ASSETS_BUCKET).createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  return { ok: true, assetId: newAssetId, signedUrl: signed.error ? null : signed.data.signedUrl };
}

/** Fase "HYDRATION"/"SIGNED URL" -- gera uma URL assinada NOVA a partir do storage_path persistido; nunca reusa uma assinatura antiga guardada em banco. */
export async function resolveAssetSignedUrl(db: SupabaseClient, storagePath: string): Promise<string | null> {
  const signed = await db.storage.from(STUDIO_VISUAL_ASSETS_BUCKET).createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  return signed.error ? null : signed.data.signedUrl;
}
