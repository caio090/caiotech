// Helpers server-side para controle de acesso por entitlements.
// Verificações devem ocorrer no servidor — nunca apenas no frontend.

import type { Entitlement, PlanLimits } from "./plans";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "restricted"
  | "paused"
  | "canceled"
  | "expired"
  | "beta_free"
  | "incomplete"
  | "unpaid";

export interface AccountSubscription {
  plan_slug: string;
  status: SubscriptionStatus;
  trial_end_at: string | null;
  current_period_end: string | null;
  entitlements: Entitlement[];
  limits: PlanLimits;
  grace_period_days?: number;
}

// Período de tolerância padrão após vencimento antes de restringir acesso.
export const DEFAULT_GRACE_PERIOD_DAYS = 3;

export function isSubscriptionOperational(
  sub: Pick<AccountSubscription, "status" | "trial_end_at" | "current_period_end"> | null | undefined
): boolean {
  if (!sub) return false;
  const now = new Date();
  switch (sub.status) {
    case "trialing":
      return !sub.trial_end_at || new Date(sub.trial_end_at) > now;
    case "active":
    case "beta_free":
      return true;
    case "past_due": {
      // Permite acesso durante grace period
      if (!sub.current_period_end) return true;
      const end = new Date(sub.current_period_end);
      const grace = new Date(end);
      grace.setDate(grace.getDate() + DEFAULT_GRACE_PERIOD_DAYS);
      return now <= grace;
    }
    default:
      return false;
  }
}

export function getTrialDaysRemaining(
  trialEndAt: string | null | undefined
): number | null {
  if (!trialEndAt) return null;
  const end = new Date(trialEndAt);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export function getTrialBannerMessage(daysRemaining: number): string {
  if (daysRemaining <= 0) return "Seu período de teste encerrou.";
  if (daysRemaining === 1) return "Último dia do seu período de teste.";
  if (daysRemaining <= 3) return `${daysRemaining} dias restantes no período de teste.`;
  if (daysRemaining <= 7) return `${daysRemaining} dias restantes no seu teste grátis.`;
  return `${daysRemaining} dias restantes no período de teste.`;
}

export function hasEntitlementInSubscription(
  sub: Pick<AccountSubscription, "entitlements"> | null | undefined,
  entitlement: Entitlement
): boolean {
  return sub?.entitlements?.includes(entitlement) ?? false;
}

export function checkClientLimit(
  sub: Pick<AccountSubscription, "limits"> | null | undefined,
  currentCount: number
): { allowed: boolean; limit: number | null } {
  const limit = sub?.limits?.max_clients ?? null;
  if (limit === null || limit === undefined) return { allowed: true, limit: null };
  return { allowed: currentCount < limit, limit };
}

// Estados que permitem leitura (mas não criação/edição)
export const READ_ONLY_STATUSES: SubscriptionStatus[] = ["past_due", "restricted"];

// Estados que bloqueiam totalmente a operação
export const BLOCKED_STATUSES: SubscriptionStatus[] = ["canceled", "expired", "unpaid"];
