/**
 * Prompt 13 (REC OS Core Experience) — Fase 09/10: resolver do Social
 * Profile Context.
 *
 * Auditoria confirmou: NÃO existe (nem parcialmente) uma entidade
 * "SocialProfile" hoje -- mas `client_meta_assets` (docs/supabase/
 * 37-client-meta-assets.sql), já wired em produção (ver
 * src/app/api/meta/hub-assets/route.ts), já guarda exatamente os dados
 * necessários (asset_id/asset_name/username/picture_url) e referencia
 * `meta_connections` por FK -- nunca duplica token. Por isso este
 * resolver NÃO cria tabela nova: ele projeta `client_meta_assets` no
 * contrato canônico `SocialProfileContext` (Fase 10: "se existir,
 * reaproveitar").
 *
 * Nunca seleciona `access_token`/`refresh_token` (nem da própria
 * `meta_connections`, que este resolver nem consulta diretamente).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SocialProfileContext } from "./types";
import { buildNotConnectedSocialProfile } from "./types";

interface ClientMetaAssetRow {
  id: string;
  asset_id: string | null;
  asset_name: string | null;
  username: string | null;
  picture_url: string | null;
  meta_connection_id: string | null;
  is_primary: boolean | null;
}

/**
 * Resolve o Social Profile (Instagram, V1) de uma Company. `companyId
 * = null` (Free Creation Mode) sempre devolve `null` -- nunca resolve
 * contexto social sem Company real. Nunca lança -- erro de schema/rede
 * degrada para "não conectado" (Fase 09: REC OS continua utilizável).
 */
export async function resolveSocialProfileContext(
  db: SupabaseClient,
  companyId: string | null,
): Promise<SocialProfileContext | null> {
  if (!companyId) return null;

  try {
    const { data, error } = await db
      .from("client_meta_assets")
      .select("id, asset_id, asset_name, username, picture_url, meta_connection_id, is_primary")
      .eq("client_id", companyId)
      .eq("asset_type", "instagram_business");

    if (error) {
      // 42P01 = tabela ausente (nunca deveria acontecer para esta,
      // já está em produção -- mas degrada com segurança do mesmo jeito
      // que hub-assets/route.ts já trata isso).
      return buildNotConnectedSocialProfile(companyId);
    }

    const rows = (data ?? []) as ClientMetaAssetRow[];
    if (rows.length === 0) return buildNotConnectedSocialProfile(companyId);

    const primary = rows.find((r) => r.is_primary) ?? rows[0];
    return {
      id: primary.id,
      companyId,
      platform: "instagram",
      externalAccountId: primary.asset_id,
      handle: primary.username,
      displayName: primary.asset_name,
      profileImageUrl: primary.picture_url,
      connectionId: primary.meta_connection_id,
      status: "connected",
    };
  } catch {
    return buildNotConnectedSocialProfile(companyId);
  }
}
