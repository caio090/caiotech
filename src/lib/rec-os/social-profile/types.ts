/**
 * Prompt 13 (REC OS Core Experience) — Fase 09/10: Social Profile
 * Context. Não assume que Company = Instagram (uma Company pode ter
 * Instagram/Facebook/TikTok/YouTube no futuro) -- V1 prioriza Instagram,
 * já que é a única rede com integração real (Meta OAuth) hoje.
 *
 * NUNCA um token de acesso trafega neste tipo -- `connectionId` é só a
 * referência opaca à linha real em `meta_connections` (auditoria
 * confirmou: `client_meta_assets` já segue este padrão, nunca duplica
 * `access_token`/`refresh_token`).
 */
export type SocialPlatform = "instagram" | "facebook" | "tiktok" | "youtube";

export type SocialProfileStatus = "connected" | "not_connected";

export interface SocialProfileContext {
  id: string;
  companyId: string;
  platform: SocialPlatform;
  externalAccountId: string | null;
  handle: string | null;
  displayName: string | null;
  profileImageUrl: string | null;
  connectionId: string | null;
  status: SocialProfileStatus;
}

/** Estado explícito quando a Company não tem Instagram conectado -- REC OS continua utilizável (Fase 09). */
export function buildNotConnectedSocialProfile(companyId: string): SocialProfileContext {
  return {
    id: `not_connected:${companyId}:instagram`,
    companyId,
    platform: "instagram",
    externalAccountId: null,
    handle: null,
    displayName: null,
    profileImageUrl: null,
    connectionId: null,
    status: "not_connected",
  };
}
