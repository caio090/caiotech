// Status do projeto LOKAT OS — V1 e V2.
// V1_PROGRESS e V2_PROGRESS são imutáveis até QA formal em produção.
// Altere apenas os status das áreas após validação.

export type AreaReadiness =
  | "validated"       // testado e aprovado em produção
  | "implemented"     // código pronto, sem QA formal
  | "deployed"        // em produção, QA pendente
  | "qa_pending"      // aguardando QA
  | "in_progress"     // em desenvolvimento
  | "blocked"         // dependência externa ou decisão pendente
  | "planned"         // planejado, não iniciado
  | "out_of_scope";   // fora do escopo desta versão

export type AreaPhase = "v1" | "v2" | "future";

export interface ProjectAreaStatus {
  id: string;
  name: string;
  description: string;
  phase: AreaPhase;
  readiness: AreaReadiness;
  blockers?: string[];
  next_actions?: string[];
  last_updated: string;
}

export const V1_PROGRESS = 81; // IMUTÁVEL — alterar apenas após QA formal
export const V2_PROGRESS = 12; // IMUTÁVEL — alterar apenas após QA formal

export const PROJECT_AREAS: ProjectAreaStatus[] = [
  // ── Infraestrutura ─────────────────────────────────────────
  { id: "auth",           name: "Autenticação",          description: "Login, convites, sessão e RLS.",                         phase: "v1", readiness: "validated",    last_updated: "2026-07-12" },
  { id: "db_schema",      name: "Schema do banco",        description: "70+ SQLs evolutivos, RLS, políticas.",                   phase: "v1", readiness: "deployed",     last_updated: "2026-07-12" },
  { id: "storage",        name: "Storage",                description: "Buckets de uploads, políticas de acesso.",               phase: "v1", readiness: "deployed",     last_updated: "2026-07-12" },
  // ── Clientes e onboarding ──────────────────────────────────
  { id: "clients",        name: "Gestão de clientes",     description: "CRUD, filtros, ciclo de vida, soft delete.",             phase: "v1", readiness: "implemented",  last_updated: "2026-07-12" },
  { id: "onboarding",     name: "Onboarding",             description: "Checklist e fluxo de ativação de cliente.",             phase: "v1", readiness: "qa_pending",   last_updated: "2026-07-12" },
  // ── Conteúdo (ContenOS) ────────────────────────────────────
  { id: "contentos",      name: "ContenOS",               description: "Calendário editorial, aprovação por link, fluxo.",       phase: "v1", readiness: "implemented",  last_updated: "2026-07-12" },
  { id: "approvals",      name: "Aprovações",             description: "Aprovação pública por link, sem login.",                 phase: "v1", readiness: "implemented",  last_updated: "2026-07-12" },
  // ── Audiovisual (REC OS) ───────────────────────────────────
  { id: "rec_os",         name: "REC OS",                 description: "Briefing, roteiro, decupagem, produção audiovisual.",    phase: "v1", readiness: "implemented",  last_updated: "2026-07-12" },
  { id: "storyboard",     name: "Storyboard",             description: "Visualização visual de cenas.",                          phase: "v1", readiness: "qa_pending",   last_updated: "2026-07-12" },
  // ── Integrações ────────────────────────────────────────────
  { id: "meta",           name: "Meta / Instagram",       description: "OAuth, insights básicos, conexão por cliente.",          phase: "v1", readiness: "deployed",     last_updated: "2026-07-12" },
  { id: "cardapio",       name: "Cardápio Digital",       description: "Integração OlaClick — faturamento e pedidos.",           phase: "v1", readiness: "deployed",     last_updated: "2026-07-12" },
  { id: "whatsapp",       name: "WhatsApp",               description: "Canal em preparação — não homologado.",                  phase: "v1", readiness: "blocked",      blockers: ["Homologação Meta Business API pendente"], last_updated: "2026-07-12" },
  // ── Relatórios e diagnósticos ──────────────────────────────
  { id: "reports",        name: "Relatórios",             description: "Faturamento, Meta insights, diagnóstico.",               phase: "v1", readiness: "implemented",  last_updated: "2026-07-12" },
  { id: "diagnostics",    name: "Diagnósticos",           description: "Diagnóstico de marketing e saúde da empresa.",          phase: "v1", readiness: "deployed",     last_updated: "2026-07-12" },
  // ── Comercial ─────────────────────────────────────────────
  { id: "crm",            name: "CRM Comercial",          description: "Leads, funil, oportunidades.",                          phase: "v1", readiness: "qa_pending",   last_updated: "2026-07-12" },
  { id: "team",           name: "Equipe",                 description: "Papéis, convites, acessos.",                            phase: "v1", readiness: "implemented",  last_updated: "2026-07-12" },
  // ── Billing e assinatura ──────────────────────────────────
  { id: "billing_arch",   name: "Arquitetura de billing", description: "Planos, cupons, assinaturas, providers.",               phase: "v1", readiness: "implemented",  last_updated: "2026-07-12" },
  { id: "asaas",          name: "Gateway Asaas",          description: "Integração de pagamento — sandbox não homologado.",     phase: "v1", readiness: "blocked",      blockers: ["Credenciais Asaas sandbox pendentes", "SQL 77 não executado"], last_updated: "2026-07-12" },
  { id: "checkout",       name: "Checkout público",       description: "Fluxo de assinatura pública.",                          phase: "v1", readiness: "planned",      blockers: ["Depende de Asaas homologado"], last_updated: "2026-07-12" },
  // ── Público ───────────────────────────────────────────────
  { id: "landing",        name: "Landing page",           description: "Home multinicho, hero, ciclo visual, FAQ, módulos.",    phase: "v1", readiness: "deployed",     last_updated: "2026-07-12" },
  { id: "blog",           name: "Blog público",           description: "Fundação: listagem, artigo, categorias, admin, SEO.",   phase: "v1", readiness: "deployed",     last_updated: "2026-07-12" },
  { id: "contato",        name: "Página de contato",      description: "Formulário, API, registro de lead.",                    phase: "v1", readiness: "deployed",     last_updated: "2026-07-12" },
  { id: "seo",            name: "SEO técnico",            description: "robots.ts, sitemap.ts, canonical, JSON-LD, metadataBase.", phase: "v1", readiness: "deployed",  last_updated: "2026-07-12" },
  // ── V2 ─────────────────────────────────────────────────────
  { id: "v2_adsense",     name: "Google AdSense (blog)",  description: "Monetização do blog.",                                   phase: "v2", readiness: "planned",     last_updated: "2026-07-12" },
  { id: "v2_affiliate",   name: "Afiliados",              description: "Programa de afiliados.",                                 phase: "v2", readiness: "planned",     last_updated: "2026-07-12" },
];

export function getAreasByPhase(phase: AreaPhase): ProjectAreaStatus[] {
  return PROJECT_AREAS.filter((a) => a.phase === phase);
}

export function getBlockedAreas(): ProjectAreaStatus[] {
  return PROJECT_AREAS.filter((a) => a.readiness === "blocked");
}

export function getQaPendingAreas(): ProjectAreaStatus[] {
  return PROJECT_AREAS.filter((a) => a.readiness === "qa_pending");
}
