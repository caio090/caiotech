/**
 * Prompt 16 (REC OS Persistence Completion) — Fase 31-38: persistência
 * do ATIVO gerado (a imagem em si), quando aplicável.
 *
 * Auditoria confirmou: `client_visual_assets` já existe no schema
 * (Prompt 13), correta pro propósito, só nunca foi wired -- REUTILIZADA
 * aqui, nenhuma tabela nova. Nenhum bucket de Storage apropriado existe
 * hoje (só `rec-videos`, público, pra vídeos -- auditado via Supabase
 * MCP nesta sprint) -- a Fase 33 proíbe criar bucket "por conveniência",
 * mas aqui é uma IMPOSSIBILIDADE ESTRUTURAL real e documentada (Fase
 * 04): não existe bucket privado, Company-scoped, pra imagens estáticas
 * geradas. O bucket `client-visual-assets` está desenhado em
 * docs/supabase/93-studio-visual-assets-storage.sql (privado + RLS via
 * can_access_client_company), NÃO executado ainda -- ver AÇÕES
 * MANUAIS/WEB do relatório.
 *
 * Este módulo funciona nos dois estados: se o bucket ainda não existe,
 * `persistSeriesItemAsset` devolve `persisted:false` de forma honesta
 * (nunca finge sucesso, nunca grava base64 em SQL -- Fase 34) e o
 * chamador mantém o item "ready" mas sem asset sobrevivendo ao
 * refresh, documentado. Assim que o SQL 93 for aplicado, o MESMO
 * código passa a persistir de verdade, sem precisar de deploy novo.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { decodeImageDataUrl } from "../render/data-url";

export const STUDIO_VISUAL_ASSETS_BUCKET = "client-visual-assets";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1h -- suficiente pra uma sessão de revisão/uso, nunca permanente.

export interface PersistSeriesItemAssetInput {
  clientId: string;
  seriesItemId: string;
  dataUrl: string;
  createdBy: string;
}

export type PersistSeriesItemAssetResult =
  | { persisted: true; assetId: string; signedUrl: string; width: number; height: number }
  | { persisted: false; reason: string };

/** Fase 34 -- nunca grava base64 em SQL; só storage_path/URL/metadata. Fase 32/36 -- Company Mode prefere persistência real quando o bucket existe. */
export async function persistSeriesItemAsset(db: SupabaseClient, input: PersistSeriesItemAssetInput): Promise<PersistSeriesItemAssetResult> {
  const bytes = decodeImageDataUrl(input.dataUrl);
  if (!bytes) return { persisted: false, reason: "Imagem inválida (não decodificável)." };

  const mime = /^data:(image\/[a-z]+);base64,/i.exec(input.dataUrl)?.[1] ?? "image/png";
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const storagePath = `${input.clientId}/${input.seriesItemId}.${ext}`;

  const upload = await db.storage.from(STUDIO_VISUAL_ASSETS_BUCKET).upload(storagePath, bytes, { contentType: mime, upsert: true });
  if (upload.error) {
    // Bucket ausente (SQL 93 pendente) ou outra falha de storage -- nunca lança, degrada honesto.
    return { persisted: false, reason: "Armazenamento de assets ainda não configurado neste ambiente." };
  }

  const { data: assetRow, error: assetError } = await db
    .from("client_visual_assets")
    .insert({
      client_id: input.clientId, asset_type: "generated", asset_name: `Série -- item ${input.seriesItemId}`,
      storage_path: storagePath, source: "generated", is_global: false, is_primary: false,
      metadata: { seriesItemId: input.seriesItemId, mime }, created_by: input.createdBy,
    })
    .select("id")
    .single();
  if (assetError || !assetRow) {
    return { persisted: false, reason: "Upload concluído, mas não foi possível registrar o ativo." };
  }

  const signed = await db.storage.from(STUDIO_VISUAL_ASSETS_BUCKET).createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (signed.error || !signed.data) {
    return { persisted: false, reason: "Ativo salvo, mas não foi possível gerar a URL de acesso." };
  }

  return { persisted: true, assetId: assetRow.id as string, signedUrl: signed.data.signedUrl, width: 1080, height: 1080 };
}

/** Fase 42 -- reidrata a URL assinada de um asset já persistido (assinaturas expiram, nunca reusa uma antiga guardada). */
export async function resolvePersistedAssetSignedUrl(db: SupabaseClient, clientId: string, storagePath: string): Promise<string | null> {
  const signed = await db.storage.from(STUDIO_VISUAL_ASSETS_BUCKET).createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (signed.error || !signed.data) return null;
  void clientId; // path já é Company-scoped (prefixo clientId/) -- parâmetro mantido só pra clareza de chamada.
  return signed.data.signedUrl;
}
