import type { WorkspaceSurface } from "@/lib/workspaces/types";

/**
 * Mapa mestre da plataforma (Sprint LOKAT Core 2.1). Este registry descreve
 * o que EXISTE hoje na branch feat/lokat-core-platform-map-v1 — não o que
 * está planejado em outras branches. `maturity` é o estado real observado
 * (não confundir com `readiness` de src/config/project-status.ts, que é uma
 * dimensão de release/QA formal, não de arquitetura). Nenhum módulo aqui
 * declarado "production" que não sirva Production de fato.
 */

/** As quatro superfícies reais de workspace-capabilities.ts + uma quinta,
 * conceitual, só para visibilidade de módulo: um usuário operacional dentro
 * de agency/direct_business (produção, execução), sem acesso de dono. Não é
 * um WorkspaceSurface novo — não altera autorização real, é só uma
 * granularidade a mais para a matriz de visibilidade desta página. */
export type ModuleSurface = WorkspaceSurface | "operational_user";

export const MODULE_SURFACE_LABELS: Record<ModuleSurface, string> = {
  super_admin: "Super Admin",
  agency: "Agência",
  agency_client: "Cliente da agência",
  direct_business: "Empresa direta",
  operational_user: "Usuário operacional",
};

export type PlatformModuleCategory =
  | "core"
  | "management"
  | "commercial"
  | "operations"
  | "communication"
  | "intelligence"
  | "integrations"
  | "platform";

/**
 * Maturidade real observada no código, não uma meta. "production" exige que
 * a rota sirva dados reais em Production hoje — um módulo 100% em memória
 * (fixtures, sem Supabase) nunca é "production", mesmo que a UI esteja
 * completa.
 */
export type PlatformModuleMaturity =
  | "production"
  | "qa_pending"
  | "preview"
  | "planned"
  | "blocked"
  | "experimental";

export type ModuleSurfaceAccess =
  | "full_access"
  | "own_data_only"
  | "preview_read_only"
  | "conditional"
  | "not_applicable";

export interface ModuleSurfaceAvailability {
  surface: ModuleSurface;
  access: ModuleSurfaceAccess;
  notes?: string;
}

export interface PlatformModuleDefinition {
  id: string;
  name: string;
  description: string;
  category: PlatformModuleCategory;
  /** Rotas reais de src/app/admin, confirmadas na auditoria desta sprint. */
  routes: string[];
  surfaces: ModuleSurfaceAvailability[];
  /** WorkspaceCapability(s) de src/config/workspace-capabilities.ts que este módulo consulta, quando aplicável. */
  capabilities: string[];
  /** O que o módulo LÊ de outros módulos/fontes. */
  consumes: string[];
  /** O que o módulo PRODUZ para outros módulos consumirem. */
  produces: string[];
  /** IDs de outros módulos deste registry dos quais este depende. */
  dependsOn: string[];
  /** Integrações externas relevantes (mesmo que ainda não conectadas). */
  integrations: string[];
  maturity: PlatformModuleMaturity;
  /** Ponte para src/config/project-status.ts — id de ProjectAreaStatus, quando existir um. */
  readinessAreaId?: string;
  /** true quando o módulo tem alguma adaptação por pacote de nicho (src/config/business-niche-packs.ts). */
  nicheSupport: boolean;
  owner: string;
  notes?: string;
}

export const PLATFORM_MODULES: PlatformModuleDefinition[] = [
  {
    id: "workspaces_core",
    name: "Workspaces (núcleo de superfícies e capacidades)",
    description: "Camada que resolve superfície ativa (super_admin/agency/agency_client/direct_business), preview read-only e capacidades — base de autorização para todos os outros módulos administrativos.",
    category: "core",
    routes: ["/admin/visualizar"],
    surfaces: [
      { surface: "super_admin", access: "full_access" },
      { surface: "agency", access: "full_access" },
      { surface: "agency_client", access: "full_access" },
      { surface: "direct_business", access: "full_access" },
      { surface: "operational_user", access: "not_applicable", notes: "Ainda não existe um sub-papel operacional dentro de uma superfície — todo usuário autenticado herda a superfície inteira." },
    ],
    capabilities: ["support.preview_workspace"],
    consumes: [],
    produces: ["workspace_context", "capability_resolution"],
    dependsOn: [],
    integrations: [],
    maturity: "qa_pending",
    readinessAreaId: "workspace_preview_security",
    nicheSupport: false,
    owner: "platform",
    notes: "src/lib/workspaces/types.ts + src/config/workspace-capabilities.ts. Não duplicar: qualquer módulo novo consulta resolveCapabilities()/hasCapability(), nunca reimplementa checagem de papel.",
  },
  {
    id: "super_admin_console",
    name: "Super Admin (contas, billing, leads, waitlist)",
    description: "Console administrativo da própria LOKAT: contas da plataforma, billing, leads comerciais e waitlist de pré-acesso.",
    category: "platform",
    routes: ["/admin/super/accounts", "/admin/super/billing", "/admin/super/leads", "/admin/super/waitlist"],
    surfaces: [
      { surface: "super_admin", access: "full_access" },
      { surface: "agency", access: "not_applicable" },
      { surface: "agency_client", access: "not_applicable" },
      { surface: "direct_business", access: "not_applicable" },
      { surface: "operational_user", access: "not_applicable" },
    ],
    capabilities: ["platform.manage", "platform.manage_agencies", "platform.manage_businesses"],
    consumes: [],
    produces: [],
    dependsOn: ["workspaces_core"],
    integrations: [],
    maturity: "production",
    nicheSupport: false,
    owner: "platform",
  },
  {
    id: "meu_negocio",
    name: "Meu Negócio",
    description: "Experiência de gestão para empresa direta/autônomo: visão geral, empresa, produtos e serviços, precificação, campanhas, fluxo de caixa, fontes e glossário. Hoje 100% em memória (fixtures do Motor LOKAT), sem Supabase.",
    category: "management",
    routes: ["/admin/meu-negocio"],
    surfaces: [
      { surface: "super_admin", access: "preview_read_only" },
      { surface: "agency", access: "conditional", notes: "Por cliente, conforme plano — ainda não implementado nesta branch." },
      { surface: "agency_client", access: "conditional", notes: "Somente quando permitido pela agência." },
      { surface: "direct_business", access: "full_access" },
      { surface: "operational_user", access: "conditional", notes: "Somente tarefas relacionadas, não a empresa inteira." },
    ],
    capabilities: ["business.manage_own_business", "business.manage_own_finance"],
    consumes: ["business_profile", "product_campaign_bridge"],
    produces: ["product_campaign_bridge", "financial_reconciliation"],
    dependsOn: ["workspaces_core"],
    integrations: [],
    maturity: "preview",
    nicheSupport: true,
    owner: "management",
    notes: "src/app/admin/meu-negocio/_client-content.tsx (MeuNegocioContent), 8 abas: overview, business, products, pricing, campaigns, cashflow, sources, glossary. Modelo de qualidade de dado já existe (FinancialDataSource/FinancialConfidence em src/lib/motor-lokat/types.ts) — Data Hub desta sprint não duplica, referencia.",
  },
  {
    id: "rec_os",
    name: "REC OS",
    description: "Produção de conteúdo: briefing, produção, aprovações, distribuição, calendário, resultados. Implementação real sob /admin/contentos; /admin/rec-os é apenas redirect para o nome público oficial.",
    category: "commercial",
    routes: ["/admin/contentos", "/admin/rec-os"],
    surfaces: [
      { surface: "super_admin", access: "preview_read_only", notes: "Gestão e preview." },
      { surface: "agency", access: "full_access", notes: "Multicliente." },
      { surface: "agency_client", access: "conditional", notes: "Aprovações, calendário e resultados permitidos; produção não." },
      { surface: "direct_business", access: "full_access", notes: "Uso da própria empresa." },
      { surface: "operational_user", access: "conditional", notes: "Produção e execução, sem aprovar o próprio trabalho." },
    ],
    capabilities: ["agency.view_multi_client_rec_os", "business.view_own_rec_os", "client_portal.approve_content"],
    consumes: ["commercial_campaign_brief", "domain_events"],
    produces: ["content_published_event", "domain_events"],
    dependsOn: ["workspaces_core"],
    integrations: [],
    maturity: "production",
    nicheSupport: false,
    owner: "commercial",
    notes: "AMBIGUIDADE DE NOME confirmada nesta auditoria (docs/DECISIONS.md): 'REC OS' (este módulo, rota /contentos) é diferente de /admin/recos (Audiovisual, tabela rec_projects) e de /admin/rec + /admin/rec/videos (plataforma de vídeo 'Lokat.rec'). Nenhum dos três foi renomeado nesta sprint — só documentado.",
  },
  {
    id: "recos_audiovisual",
    name: "REC (Audiovisual)",
    description: "Dashboard de projetos de vídeo, tabela rec_projects — módulo distinto de REC OS apesar do nome parecido.",
    category: "commercial",
    routes: ["/admin/recos"],
    surfaces: [
      { surface: "super_admin", access: "full_access" },
      { surface: "agency", access: "conditional" },
      { surface: "agency_client", access: "not_applicable" },
      { surface: "direct_business", access: "conditional" },
      { surface: "operational_user", access: "not_applicable" },
    ],
    capabilities: [],
    consumes: [],
    produces: [],
    dependsOn: ["workspaces_core"],
    integrations: [],
    maturity: "qa_pending",
    nicheSupport: false,
    owner: "commercial",
    notes: "Não confundir com rec_os. Fora de escopo de alteração nesta sprint (regra de isolamento).",
  },
  {
    id: "crm_leads_clientes",
    name: "CRM (Leads e Clientes)",
    description: "Pipeline de leads/waitlist e gestão de clientes da agência.",
    category: "commercial",
    routes: ["/admin/leads", "/admin/clientes"],
    surfaces: [
      { surface: "super_admin", access: "full_access" },
      { surface: "agency", access: "full_access" },
      { surface: "agency_client", access: "not_applicable" },
      { surface: "direct_business", access: "not_applicable" },
      { surface: "operational_user", access: "not_applicable" },
    ],
    capabilities: ["agency.manage_clients"],
    consumes: [],
    produces: ["client_directory"],
    dependsOn: ["workspaces_core"],
    integrations: [],
    maturity: "production",
    nicheSupport: false,
    owner: "commercial",
  },
  {
    id: "financeiro",
    name: "Financeiro",
    description: "Painel financeiro — hoje demonstrativo, sem modelo de dado real conectado a Supabase.",
    category: "management",
    routes: ["/admin/financeiro"],
    surfaces: [
      { surface: "super_admin", access: "preview_read_only" },
      { surface: "agency", access: "conditional" },
      { surface: "agency_client", access: "conditional", notes: "client_portal.view_finance." },
      { surface: "direct_business", access: "full_access" },
      { surface: "operational_user", access: "not_applicable" },
    ],
    capabilities: ["business.manage_own_finance", "client_portal.view_finance"],
    consumes: ["financial_reconciliation"],
    produces: ["financial_reconciliation"],
    dependsOn: ["workspaces_core"],
    integrations: [],
    maturity: "experimental",
    nicheSupport: true,
    owner: "management",
    notes: "Nenhum modelo de dado real hoje — mais próximo é src/lib/billing/{entitlements,plans}.ts, que é sobre a própria assinatura LOKAT, não sobre as finanças da empresa do cliente.",
  },
  {
    id: "calendario_global",
    name: "Calendário Global",
    description: "Visão cross-cliente somente leitura, agregando content_items, operational_tasks e approvals via GlobalCalendarEvent.",
    category: "operations",
    routes: ["/admin/calendario"],
    surfaces: [
      { surface: "super_admin", access: "full_access" },
      { surface: "agency", access: "full_access" },
      { surface: "agency_client", access: "conditional", notes: "client_portal.view_calendar." },
      { surface: "direct_business", access: "full_access" },
      { surface: "operational_user", access: "conditional" },
    ],
    capabilities: ["client_portal.view_calendar"],
    consumes: ["content_item", "operational_task", "approval"],
    produces: ["calendar_event_v2"],
    dependsOn: ["rec_os"],
    integrations: [],
    maturity: "qa_pending",
    readinessAreaId: "global_calendar",
    nicheSupport: false,
    owner: "operations",
    notes: "src/lib/global-calendar.ts é a fonte real (GlobalCalendarEvent). Esta sprint adiciona contratos 2.0 (categorias, providers, feriados) em src/lib/global-calendar-v2/ SEM duplicar o tipo existente.",
  },
  {
    id: "relatorios",
    name: "Relatórios (Dados & Insights)",
    description: "Central de relatórios — hoje sem um único modelo de dado; consome marketing-intelligence e analytics do cardápio digital.",
    category: "intelligence",
    routes: ["/admin/relatorios", "/admin/relatorios/conteudo", "/admin/relatorios/faturamento"],
    surfaces: [
      { surface: "super_admin", access: "full_access" },
      { surface: "agency", access: "full_access", notes: "agency.view_multi_client_reports." },
      { surface: "agency_client", access: "conditional", notes: "client_portal.view_reports." },
      { surface: "direct_business", access: "full_access" },
      { surface: "operational_user", access: "not_applicable" },
    ],
    capabilities: ["agency.view_multi_client_reports", "business.view_own_reports", "client_portal.view_reports"],
    consumes: ["financial_reconciliation", "domain_events"],
    produces: [],
    dependsOn: ["workspaces_core"],
    integrations: [],
    maturity: "qa_pending",
    nicheSupport: false,
    owner: "intelligence",
    notes: "Fase 19 desta sprint só renomeia o rótulo visível para 'Relatórios' quando ainda aparecer 'Dados e Insights' — rota e IDs técnicos preservados. Ganha ReportViewMode (Essencial/Analítica) sobre a mesma fonte.",
  },
  {
    id: "fontes_dados",
    name: "Fontes de Dados",
    description: "Página de configuração/listagem de fontes de dados conectadas.",
    category: "integrations",
    routes: ["/admin/fontes-dados"],
    surfaces: [
      { surface: "super_admin", access: "full_access" },
      { surface: "agency", access: "conditional" },
      { surface: "agency_client", access: "not_applicable" },
      { surface: "direct_business", access: "conditional", notes: "business.manage_own_integrations." },
      { surface: "operational_user", access: "not_applicable" },
    ],
    capabilities: ["business.manage_own_integrations"],
    consumes: [],
    produces: ["data_source_registry"],
    dependsOn: ["workspaces_core"],
    integrations: [],
    maturity: "preview",
    nicheSupport: false,
    owner: "integrations",
  },
  {
    id: "conexoes",
    name: "Conexões / Integrações",
    description: "Hub de integrações (Meta, cardápio digital e futuras conexões).",
    category: "integrations",
    routes: ["/admin/conexoes"],
    surfaces: [
      { surface: "super_admin", access: "full_access" },
      { surface: "agency", access: "conditional" },
      { surface: "agency_client", access: "not_applicable" },
      { surface: "direct_business", access: "conditional" },
      { surface: "operational_user", access: "not_applicable" },
    ],
    capabilities: ["business.manage_own_integrations"],
    consumes: [],
    produces: [],
    dependsOn: ["workspaces_core"],
    integrations: ["meta", "digital_menu"],
    maturity: "qa_pending",
    nicheSupport: false,
    owner: "integrations",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    description: "Página hoje é só roadmap/placeholder — nenhuma conexão real de número.",
    category: "communication",
    routes: ["/admin/whatsapp"],
    surfaces: [
      { surface: "super_admin", access: "full_access" },
      { surface: "agency", access: "conditional" },
      { surface: "agency_client", access: "not_applicable" },
      { surface: "direct_business", access: "conditional" },
      { surface: "operational_user", access: "not_applicable" },
    ],
    capabilities: [],
    consumes: [],
    produces: [],
    dependsOn: ["workspaces_core"],
    integrations: ["whatsapp_meta_cloud_api", "whatsapp_evolution"],
    maturity: "planned",
    nicheSupport: false,
    owner: "communication",
    notes: "Esta sprint adiciona somente contratos (src/lib/messaging/types.ts). Nenhum número conectado, nenhum webhook, nenhuma instância Evolution.",
  },
  {
    id: "equipe",
    name: "Equipe",
    description: "Gestão de equipe, papéis e convites.",
    category: "management",
    routes: ["/admin/equipe"],
    surfaces: [
      { surface: "super_admin", access: "full_access" },
      { surface: "agency", access: "full_access", notes: "agency.manage_team." },
      { surface: "agency_client", access: "not_applicable" },
      { surface: "direct_business", access: "full_access", notes: "business.manage_own_team." },
      { surface: "operational_user", access: "not_applicable" },
    ],
    capabilities: ["agency.manage_team", "business.manage_own_team"],
    consumes: [],
    produces: [],
    dependsOn: ["workspaces_core"],
    integrations: [],
    maturity: "production",
    nicheSupport: false,
    owner: "management",
  },
  {
    id: "operacional",
    name: "Operacional",
    description: "Kanban/dashboard operacional — hoje um núcleo genérico, sem templates por nicho ainda conectados.",
    category: "operations",
    routes: ["/admin/operacional", "/admin/operacional/kanban", "/admin/operacional/dashboard"],
    surfaces: [
      { surface: "super_admin", access: "preview_read_only" },
      { surface: "agency", access: "conditional" },
      { surface: "agency_client", access: "not_applicable" },
      { surface: "direct_business", access: "full_access" },
      { surface: "operational_user", access: "full_access" },
    ],
    capabilities: [],
    consumes: ["operational_template"],
    produces: [],
    dependsOn: ["workspaces_core"],
    integrations: [],
    maturity: "preview",
    nicheSupport: true,
    owner: "operations",
    notes: "Esta sprint só adiciona o contrato OperationalTemplate — nenhum painel operacional completo por nicho.",
  },
  {
    id: "diagnosticos",
    name: "Diagnósticos",
    description: "Diagnóstico rápido de marketing/negócio, com identificação.",
    category: "intelligence",
    routes: ["/admin/diagnosticos"],
    surfaces: [
      { surface: "super_admin", access: "full_access" },
      { surface: "agency", access: "conditional" },
      { surface: "agency_client", access: "not_applicable" },
      { surface: "direct_business", access: "conditional" },
      { surface: "operational_user", access: "not_applicable" },
    ],
    capabilities: [],
    consumes: [],
    produces: [],
    dependsOn: ["workspaces_core"],
    integrations: [],
    maturity: "production",
    nicheSupport: false,
    owner: "intelligence",
  },
  {
    id: "configuracoes",
    name: "Configurações",
    description: "Configurações administrativas, incluindo status de IA/voz configurada.",
    category: "platform",
    routes: ["/admin/configuracoes"],
    surfaces: [
      { surface: "super_admin", access: "full_access" },
      { surface: "agency", access: "conditional" },
      { surface: "agency_client", access: "not_applicable" },
      { surface: "direct_business", access: "conditional" },
      { surface: "operational_user", access: "not_applicable" },
    ],
    capabilities: [],
    consumes: [],
    produces: [],
    dependsOn: ["workspaces_core"],
    integrations: ["openai"],
    maturity: "production",
    nicheSupport: false,
    owner: "platform",
  },
  {
    id: "status",
    name: "Status da plataforma",
    description: "Página de status de deployment/sistema — a mesma fonte que alimenta src/config/project-status.ts.",
    category: "platform",
    routes: ["/admin/status"],
    surfaces: [
      { surface: "super_admin", access: "full_access" },
      { surface: "agency", access: "not_applicable" },
      { surface: "agency_client", access: "not_applicable" },
      { surface: "direct_business", access: "not_applicable" },
      { surface: "operational_user", access: "not_applicable" },
    ],
    capabilities: ["platform.view_status"],
    consumes: [],
    produces: [],
    dependsOn: ["workspaces_core"],
    integrations: [],
    maturity: "production",
    nicheSupport: false,
    owner: "platform",
  },
];

export function findModuleById(id: string): PlatformModuleDefinition | undefined {
  return PLATFORM_MODULES.find((module) => module.id === id);
}

export function findModulesByCategory(category: PlatformModuleCategory): PlatformModuleDefinition[] {
  return PLATFORM_MODULES.filter((module) => module.category === category);
}

export function findModulesBySurface(surface: ModuleSurface): PlatformModuleDefinition[] {
  return PLATFORM_MODULES.filter((module) => module.surfaces.some((entry) => entry.surface === surface && entry.access !== "not_applicable"));
}

/** Todo id referenciado em dependsOn precisa existir no próprio registry — usado pelo teste de integridade. */
export function findMissingDependencies(): Array<{ moduleId: string; missing: string[] }> {
  const knownIds = new Set(PLATFORM_MODULES.map((module) => module.id));
  const problems: Array<{ moduleId: string; missing: string[] }> = [];
  for (const mod of PLATFORM_MODULES) {
    const missing = mod.dependsOn.filter((id) => !knownIds.has(id));
    if (missing.length > 0) problems.push({ moduleId: mod.id, missing });
  }
  return problems;
}

/** Detecta ciclos de dependência via DFS -- um módulo nunca pode depender (direta ou indiretamente) de si mesmo. */
export function findDependencyCycles(): string[][] {
  const byId = new Map(PLATFORM_MODULES.map((module) => [module.id, module]));
  const cycles: string[][] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(id: string, path: string[]) {
    if (visiting.has(id)) { cycles.push([...path, id]); return; }
    if (visited.has(id)) return;
    visiting.add(id);
    const mod = byId.get(id);
    for (const dep of mod?.dependsOn ?? []) visit(dep, [...path, id]);
    visiting.delete(id);
    visited.add(id);
  }

  for (const mod of PLATFORM_MODULES) visit(mod.id, []);
  return cycles;
}
