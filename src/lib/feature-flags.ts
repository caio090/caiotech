export type FlagKey =
  | "editor_os"
  | "crm_inbox"
  | "social_scheduler"
  | "editor_templates"
  | "editor_brand_context"
  | "social_metrics";

interface FlagConfig {
  enabled: boolean;
  roles?: string[];
  description: string;
}

const FLAGS: Record<FlagKey, FlagConfig> = {
  editor_os: {
    enabled: true,
    roles: ["super_admin"],
    description: "EditorOS — em avaliação de motor, acesso restrito a super_admin",
  },
  crm_inbox: {
    enabled: false,
    description: "CRM Inbox — provedor Chatwoot não configurado",
  },
  social_scheduler: {
    enabled: false,
    description: "Social Scheduler — provedor Postiz não configurado",
  },
  editor_templates: {
    enabled: false,
    description: "Templates de design — aguardando motor aprovado",
  },
  editor_brand_context: {
    enabled: true,
    roles: ["super_admin"],
    description: "Contexto de marca no EditorOS — super_admin only",
  },
  social_metrics: {
    enabled: false,
    description: "Métricas sociais — aguardando integração de canais",
  },
};

export interface FlagResult {
  enabled: boolean;
  reason?: string;
}

export function getFeatureFlag(key: FlagKey, ctx?: { role?: string }): FlagResult {
  const flag = FLAGS[key];
  if (!flag) return { enabled: false, reason: "flag_not_found" };
  if (!flag.enabled) return { enabled: false, reason: "flag_disabled" };
  if (flag.roles && ctx?.role && !flag.roles.includes(ctx.role)) {
    return { enabled: false, reason: "role_not_allowed" };
  }
  return { enabled: true };
}

export function isFeatureEnabled(key: FlagKey, ctx?: { role?: string }): boolean {
  return getFeatureFlag(key, ctx).enabled;
}

export function getAllFlagsStatus(role?: string): Record<FlagKey, FlagResult> {
  return Object.fromEntries(
    (Object.keys(FLAGS) as FlagKey[]).map((key) => [key, getFeatureFlag(key, { role })])
  ) as Record<FlagKey, FlagResult>;
}

export { FLAGS as FEATURE_FLAGS_CONFIG };
