/**
 * Central account permissions for LOKAT OS.
 * Defines roles, account types, plans and pure permission helpers.
 * Import from here — do NOT duplicate this logic elsewhere.
 */

// ── Role constants ────────────────────────────────────────────
export const ROLES = {
  SUPER_ADMIN:    "super_admin",
  ADMIN:          "admin",
  CLIENTE:        "cliente",
  OPERACIONAL:    "operacional",
  SOCIAL_MEDIA:   "social_media",
  DESIGNER:       "designer",
  EDITOR:         "editor",
  VIDEOMAKER:     "videomaker",
  GESTOR_TRAFEGO: "gestor_trafego",
  COMERCIAL:      "comercial",
  SDR:            "sdr",
  CLOSER:         "closer",
  FINANCEIRO:     "financeiro",
  ALUNO:          "aluno",
} as const;

// ── Account types ─────────────────────────────────────────────
export const ACCOUNT_TYPES = {
  LOKAT_INTERNAL:   "lokat_internal",
  AGENCY:           "agencia",
  PRODUCER:         "produtora",
  BUSINESS_OWNER:   "empresa",
  INVITED_CLIENT:   "cliente_atendido",
  DIAGNOSTIC_ONLY:  "diagnostic_only",
  UNDEFINED:        "nao_definido",
} as const;

export type AccountType = typeof ACCOUNT_TYPES[keyof typeof ACCOUNT_TYPES];

// ── Plans ─────────────────────────────────────────────────────
export const PLANS = {
  FREE:           "free",
  STARTER:        "starter",
  AGENCY_START:   "agency_start",
  AGENCY_GROWTH:  "agency_growth",
  AGENCY_PRO:     "agency_pro",
  ENTERPRISE:     "enterprise",
} as const;

export type Plan = typeof PLANS[keyof typeof PLANS];

// ── Client limits per plan ────────────────────────────────────
const CLIENT_LIMITS: Record<Plan | string, number> = {
  [PLANS.FREE]:          1,
  [PLANS.STARTER]:       2,
  [PLANS.AGENCY_START]:  5,
  [PLANS.AGENCY_GROWTH]: 15,
  [PLANS.AGENCY_PRO]:    50,
  [PLANS.ENTERPRISE]:    Infinity,
};

export function getClientLimitByPlan(plan: string | null | undefined): number {
  return CLIENT_LIMITS[plan ?? PLANS.STARTER] ?? 2;
}

// ── Profile shape (minimal — only what helpers need) ─────────
export interface PermissionProfile {
  role:         string | null;
  account_type: string | null;
  plan:         string | null;
  id?:          string;
}

export interface PermissionClient {
  owner_id?:  string | null;
  agency_id?: string | null;
  created_by?: string | null;
}

// ── Pure permission helpers ───────────────────────────────────

export function canCreateClient(
  profile: PermissionProfile,
  currentCount: number,
): boolean {
  const role = profile.role ?? "";
  if (role === ROLES.SUPER_ADMIN) return true;
  if (role === ROLES.ADMIN) {
    const limit = getClientLimitByPlan(profile.plan);
    return currentCount < limit;
  }
  return false;
}

export function canManageClient(
  profile: PermissionProfile,
  client: PermissionClient,
): boolean {
  const role = profile.role ?? "";
  if (role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN) return true;
  // Agency can manage clients they own or created
  if (profile.id) {
    return (
      client.owner_id  === profile.id ||
      client.agency_id === profile.id ||
      client.created_by === profile.id
    );
  }
  return false;
}

export function canViewClient(
  profile: PermissionProfile,
  client: PermissionClient,
): boolean {
  return canManageClient(profile, client);
}

export function canAccessCentralPlatform(profile: PermissionProfile): boolean {
  return profile.role === ROLES.SUPER_ADMIN;
}

export function canUseContentOS(profile: PermissionProfile): boolean {
  const allowed = new Set<string>([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OPERACIONAL, ROLES.SOCIAL_MEDIA, ROLES.DESIGNER, ROLES.EDITOR, ROLES.VIDEOMAKER, ROLES.GESTOR_TRAFEGO]);
  return allowed.has(profile.role ?? "");
}

export function canConfigureConnections(
  profile: PermissionProfile,
  client: PermissionClient,
): boolean {
  return canManageClient(profile, client);
}

export function canInviteClient(
  profile: PermissionProfile,
  client: PermissionClient,
): boolean {
  return canManageClient(profile, client);
}

export function canReceiveClientRequests(
  profile: PermissionProfile,
  client: PermissionClient,
): boolean {
  return canManageClient(profile, client);
}

// ── Upsell detection ──────────────────────────────────────────
export function shouldShowUpsell(
  plan: string | null | undefined,
  currentCount: number,
): boolean {
  const limit = getClientLimitByPlan(plan);
  if (!isFinite(limit)) return false;
  return currentCount / limit >= 0.8;
}

// ── Plan display helpers ──────────────────────────────────────
export const PLAN_LABELS: Record<string, string> = {
  [PLANS.FREE]:          "Grátis",
  [PLANS.STARTER]:       "Starter",
  [PLANS.AGENCY_START]:  "Agência Start",
  [PLANS.AGENCY_GROWTH]: "Agência Growth",
  [PLANS.AGENCY_PRO]:    "Agência Pro",
  [PLANS.ENTERPRISE]:    "Enterprise",
};

export function getPlanLabel(plan: string | null | undefined): string {
  return PLAN_LABELS[plan ?? ""] ?? "Starter";
}

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  [ACCOUNT_TYPES.LOKAT_INTERNAL]:  "Lokat Interno",
  [ACCOUNT_TYPES.AGENCY]:          "Agência",
  [ACCOUNT_TYPES.PRODUCER]:        "Produtora",
  [ACCOUNT_TYPES.BUSINESS_OWNER]:  "Empresa / Autônomo",
  [ACCOUNT_TYPES.INVITED_CLIENT]:  "Cliente Final",
  [ACCOUNT_TYPES.DIAGNOSTIC_ONLY]: "Só diagnóstico",
  [ACCOUNT_TYPES.UNDEFINED]:       "Não definido",
};

export function getAccountTypeLabel(type: string | null | undefined): string {
  return ACCOUNT_TYPE_LABELS[type ?? ""] ?? "Não definido";
}
