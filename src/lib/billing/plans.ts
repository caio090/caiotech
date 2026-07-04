// ── Billing Plans — draft pricing, all values are editable ────────────────────
// These are NOT final prices. Change MIN_PUBLIC_PRICE and plan prices freely.

export const MIN_PUBLIC_PRICE = 49; // R$ shown on landing: "A partir de R$ 49/mês"

export type PlanSlug = "comunidade" | "start" | "pro" | "agencia";

export type Entitlement =
  | "dashboard_basic"
  | "data_sources_manual"
  | "digital_menu"
  | "meta_connection"
  | "meta_insights"
  | "whatsapp_placeholder"
  | "whatsapp_connection"
  | "approvals"
  | "ai_search"
  | "contentos"
  | "commercial_crm"
  | "multi_client"
  | "team_members"
  | "advanced_reports";

export interface PlanLimits {
  max_clients?: number;     // null = unlimited
  max_team_members?: number;
  max_data_sources?: number;
  ai_search_queries_per_month?: number;
}

export interface BillingPlan {
  slug: PlanSlug;
  name: string;
  tagline: string;
  description: string;
  price_monthly: number;       // BRL, draft
  price_yearly: number | null; // null = not yet available
  trial_days: number;
  currency: "BRL";
  entitlements: Entitlement[];
  limits: PlanLimits;
  highlight?: boolean;
  badge?: string;
  status: "active" | "beta" | "coming_soon";
}

export const PLANS: BillingPlan[] = [
  {
    slug: "comunidade",
    name: "Comunidade",
    tagline: "Para aprender e se preparar",
    description: "Aulas, playbooks e materiais da Lokat. Sem acesso ao sistema operacional.",
    price_monthly: 38,
    price_yearly: null,
    trial_days: 0,
    currency: "BRL",
    entitlements: ["dashboard_basic"],
    limits: { max_clients: 0 },
    status: "coming_soon",
    badge: "Em breve",
  },
  {
    slug: "start",
    name: "Start · Beta",
    tagline: "Para testar e começar",
    description: "1 cliente/marca. Fontes manuais, relatórios básicos e busca IA.",
    price_monthly: MIN_PUBLIC_PRICE,
    price_yearly: null,
    trial_days: 14,
    currency: "BRL",
    entitlements: [
      "dashboard_basic",
      "data_sources_manual",
      "digital_menu",
      "meta_connection",
      "approvals",
      "ai_search",
      "contentos",
    ],
    limits: { max_clients: 1, max_team_members: 1, ai_search_queries_per_month: 50 },
    status: "beta",
    badge: "14 dias grátis",
    highlight: false,
  },
  {
    slug: "pro",
    name: "Pro",
    tagline: "Para agências em operação",
    description: "Meta Insights, Cardápio Digital, relatórios avançados, aprovações e WhatsApp (quando disponível).",
    price_monthly: 149,
    price_yearly: null,
    trial_days: 14,
    currency: "BRL",
    entitlements: [
      "dashboard_basic",
      "data_sources_manual",
      "digital_menu",
      "meta_connection",
      "meta_insights",
      "whatsapp_placeholder",
      "approvals",
      "ai_search",
      "contentos",
      "advanced_reports",
    ],
    limits: { max_clients: 5, max_team_members: 3, ai_search_queries_per_month: 300 },
    status: "active",
    badge: "Mais popular",
    highlight: true,
  },
  {
    slug: "agencia",
    name: "Agência",
    tagline: "Para escalar com múltiplos clientes",
    description: "Multi-clientes, equipe, CRM comercial, painel operacional e limites expandidos.",
    price_monthly: 349,
    price_yearly: null,
    trial_days: 7,
    currency: "BRL",
    entitlements: [
      "dashboard_basic",
      "data_sources_manual",
      "digital_menu",
      "meta_connection",
      "meta_insights",
      "whatsapp_placeholder",
      "whatsapp_connection",
      "approvals",
      "ai_search",
      "contentos",
      "commercial_crm",
      "multi_client",
      "team_members",
      "advanced_reports",
    ],
    limits: { max_clients: undefined, max_team_members: undefined, ai_search_queries_per_month: 1000 },
    status: "active",
  },
];

export function getPlan(slug: PlanSlug): BillingPlan | undefined {
  return PLANS.find((p) => p.slug === slug);
}

export function hasEntitlement(plan: BillingPlan, entitlement: Entitlement): boolean {
  return plan.entitlements.includes(entitlement);
}

export function formatPrice(price: number): string {
  return `R$ ${price.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
}
