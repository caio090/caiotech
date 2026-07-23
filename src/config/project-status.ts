// Status do projeto LOKAT OS — V1 e V2.
// V1_PROGRESS e V2_PROGRESS são imutáveis até QA formal em produção.
// V1_READINESS é calculado dinamicamente a partir dos pesos por readiness.

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

export type QAStatus =
  | "approved"           // sem ressalvas
  | "approved_with_p2"   // aprovado com ressalvas P2 (não bloqueiam V1)
  | "pending"            // pendente de execução
  | "not_started"        // ainda não iniciado
  | "not_required";      // não requer QA externo

export type RiskLevel = "none" | "low" | "medium" | "high" | "critical";

export type AreaCategory =
  | "infraestrutura"
  | "conteudo"
  | "crm"
  | "integracao"
  | "billing"
  | "publico"
  | "admin"
  | "banco"
  | "operacional";

export interface AreaQA {
  status: QAStatus;
  date?: string;
  auditor?: string;
  result?: string[];
  p2?: string[];
}

export interface AreaEstimate {
  hoursMin?: number;
  hoursLikely?: number;
  hoursMax?: number;
}

export interface ProjectAreaStatus {
  id: string;
  name: string;
  description: string;
  phase: AreaPhase;
  readiness: AreaReadiness;
  category: AreaCategory;
  blockers?: string[];
  next_actions?: string[];
  qa?: AreaQA;
  commit?: string;
  deployment?: string;
  sql_dependency?: string;
  estimate?: AreaEstimate;
  risk?: RiskLevel;
  notes?: string;
  last_updated: string;
}

export const V1_PROGRESS = 81;  // IMUTÁVEL — alterar apenas após QA formal
export const V2_PROGRESS = 12;  // IMUTÁVEL — alterar apenas após QA formal

// Pesos de prontidão por readiness (0.0 – 1.0).
// Representa "quanto essa área está realmente pronta para lançamento".
export const READINESS_WEIGHTS: Record<AreaReadiness, number> = {
  validated:    1.00,
  qa_pending:   0.75,
  deployed:     0.65,
  implemented:  0.50,
  in_progress:  0.30,
  blocked:      0.10,
  planned:      0.10,
  out_of_scope: 0.00,
};

export function calcV1Readiness(): { score: number; label: string } {
  const v1 = PROJECT_AREAS.filter((a) => a.phase === "v1");
  const total = v1.reduce((s, a) => s + (READINESS_WEIGHTS[a.readiness] ?? 0), 0);
  const score = Math.round((total / v1.length) * 100);
  const label =
    score >= 85 ? "Alta" :
    score >= 70 ? "Média-alta" :
    score >= 55 ? "Média" :
    "Em desenvolvimento";
  return { score, label };
}

export const PROJECT_AREAS: ProjectAreaStatus[] = [
  // ── Infraestrutura ─────────────────────────────────────────
  {
    id: "auth", name: "Autenticação", category: "infraestrutura",
    description: "Login, convites, sessão e RLS.",
    phase: "v1", readiness: "validated",
    qa: { status: "approved", date: "2026-07-01", auditor: "interno", result: ["Login funcional", "RLS ativo", "Convites testados"] },
    risk: "none", last_updated: "2026-07-12",
  },
  {
    id: "db_schema", name: "Schema do banco", category: "banco",
    description: "85+ SQLs evolutivos, RLS, políticas de acesso.",
    phase: "v1", readiness: "deployed",
    qa: { status: "pending", p2: ["SQL 85 pendente de execução"] },
    risk: "low", notes: "SQL 82 e SQL 84 falharam — SQL 85 corretivo criado, não executado.",
    last_updated: "2026-07-13",
  },
  {
    id: "storage", name: "Storage", category: "infraestrutura",
    description: "Buckets de uploads, políticas de acesso.",
    phase: "v1", readiness: "deployed",
    qa: { status: "pending" }, risk: "low", last_updated: "2026-07-12",
  },

  // ── Público ───────────────────────────────────────────────
  {
    id: "hero_visual", name: "Hero visual", category: "publico",
    description: "Gota flutuante (vai-e-vem 8px↔−12px / 4.5s), glow orgânico sem borda reta, dois anéis orbitais com direções opostas, efeito de átomo.",
    phase: "v1", readiness: "validated",
    commit: "d06b5c1", deployment: "dpl_6TWxhJHpk3QGh896c7kJEvzwAB8E",
    qa: {
      status: "approved_with_p2",
      date: "2026-07-13", auditor: "Codex Web",
      result: [
        "Gota sobe e desce — vai-e-vem real",
        "Duração 4.5s — suave",
        "Órbita 1 gira (22s)",
        "Órbita 2 gira sentido oposto (35s)",
        "Efeito de átomo visível",
        "Glow sem borda reta",
        "Sem overflow",
        "Sem React #418",
        "Mobile sem regressão",
      ],
      p2: ["prefers-reduced-motion não validado com mídia ativa"],
    },
    risk: "none", last_updated: "2026-07-13",
  },
  {
    id: "profile_entry_cards", name: "Cards de perfil", category: "publico",
    description: "Grid 2 colunas, 4 cards interativos (Building2/Briefcase/Users/Sparkles), ArrowRight com hover, micro-CTA em mono accent.",
    phase: "v1", readiness: "validated",
    commit: "d06b5c1", deployment: "dpl_6TWxhJHpk3QGh896c7kJEvzwAB8E",
    qa: {
      status: "approved_with_p2",
      date: "2026-07-13", auditor: "Codex Web",
      result: [
        "Quatro cards visíveis",
        "Cards inteiros clicáveis",
        "Contraste aprovado",
        "Mobile — coluna única",
        "Rotas corretas para /pre-acesso?perfil=*",
      ],
      p2: ["Hover state: aprovado visualmente, fine-tune opcional", "Focus-visible: P2"],
    },
    risk: "none", last_updated: "2026-07-13",
  },
  {
    id: "landing", name: "Landing page", category: "publico",
    description: "Home multinicho, hero, ciclo visual, FAQ, módulos. Perfis 4-way, /pre-acesso?perfil= routing.",
    phase: "v1", readiness: "validated",
    commit: "4d8357a", deployment: "dpl_6TWxhJHpk3QGh896c7kJEvzwAB8E",
    qa: {
      status: "approved_with_p2",
      date: "2026-07-13", auditor: "Codex Web",
      result: ["Headline nova aprovada", "Seções públicas visíveis", "Sem 404 ou 500", "Sem overflow"],
      p2: ["Reduced motion: validação completa pendente"],
    },
    risk: "none", last_updated: "2026-07-13",
  },
  {
    id: "pre_acesso", name: "Pré-acesso (waitlist)", category: "publico",
    description: "Formulário beta com perfil 4-way, ?perfil= param, campo Instagram, Suspense.",
    phase: "v1", readiness: "validated",
    commit: "4d8357a", deployment: "dpl_6TWxhJHpk3QGh896c7kJEvzwAB8E",
    qa: {
      status: "approved_with_p2",
      date: "2026-07-13", auditor: "Codex Web",
      result: [
        "agency selecionado via ?perfil=agency",
        "company selecionado via ?perfil=company",
        "professional selecionado via ?perfil=professional",
        "lokat_client selecionado via ?perfil=lokat_client",
        "Nenhum alias técnico visível ao usuário",
        "Campo Instagram presente e funcional",
      ],
      p2: ["Pré-seleção depende de Suspense — aguardar resultado de QA de hidratação"],
    },
    risk: "none", last_updated: "2026-07-13",
  },
  {
    id: "diagnostico", name: "Diagnóstico rápido", category: "publico",
    description: "Diagnóstico de presença digital. Modal de identificação antes dos resultados.",
    phase: "v1", readiness: "validated",
    commit: "4d8357a", deployment: "dpl_6TWxhJHpk3QGh896c7kJEvzwAB8E",
    qa: {
      status: "approved",
      date: "2026-07-13", auditor: "Codex Web",
      result: [
        "8 perguntas visíveis",
        "Modal de identificação abre antes dos resultados",
        "Campo nome (obrigatório)",
        "Campo e-mail (obrigatório)",
        "Campo WhatsApp (opcional)",
        "Opção de ver sem identificação",
        "Nenhum envio automático em falha de POST",
      ],
    },
    risk: "none", last_updated: "2026-07-13",
  },
  {
    id: "blog", name: "Blog público", category: "publico",
    description: "Fundação: listagem, artigo, categorias, admin, SEO.",
    phase: "v1", readiness: "validated",
    qa: {
      status: "approved",
      date: "2026-07-13", auditor: "Codex Web",
      result: ["Público sem redirect", "Estado vazio honesto", "Sem 404"],
    },
    risk: "none", last_updated: "2026-07-13",
  },
  {
    id: "contato", name: "Página de contato", category: "publico",
    description: "Formulário, API, registro de lead.",
    phase: "v1", readiness: "validated",
    qa: {
      status: "approved",
      date: "2026-07-13", auditor: "Codex Web",
      result: ["Público sem redirect", "Formulário visível", "Sem envio automático de QA"],
    },
    risk: "none", last_updated: "2026-07-13",
  },
  {
    id: "seo", name: "SEO técnico", category: "publico",
    description: "robots.ts, sitemap.ts, canonical, JSON-LD, metadataBase.",
    phase: "v1", readiness: "deployed",
    qa: { status: "pending" }, risk: "low", last_updated: "2026-07-12",
  },

  // ── Navegação administrativa ──────────────────────────────
  {
    id: "admin_navigation", name: "Navegação admin", category: "admin",
    description: "super_admin → /admin/dashboard. ROLE_HOME corrigido em access-control.ts.",
    phase: "v1", readiness: "validated",
    commit: "831b3ea", deployment: "dpl_6TWxhJHpk3QGh896c7kJEvzwAB8E",
    qa: {
      status: "approved",
      date: "2026-07-13", auditor: "Codex Web",
      result: [
        "super_admin abre /admin/dashboard",
        "/admin/plataforma redireciona para /admin/super/accounts",
        "Central de Contas abre normalmente",
        "Nenhum loop de redirect",
        "Sidebar preservada sem alteração",
      ],
    },
    risk: "none", last_updated: "2026-07-13",
  },
  {
    id: "legacy_platform_page", name: "Rota legada /plataforma", category: "admin",
    description: "Aposentada. Redireciona para /admin/super/accounts por compatibilidade.",
    phase: "v1", readiness: "validated",
    commit: "9f64291", deployment: "dpl_6TWxhJHpk3QGh896c7kJEvzwAB8E",
    qa: { status: "approved", date: "2026-07-13", auditor: "Codex Web",
      result: ["Redirect server-side confirmado"] },
    risk: "none", last_updated: "2026-07-13",
  },

  // ── Clientes e onboarding ──────────────────────────────────
  {
    id: "clients", name: "Gestão de clientes", category: "crm",
    description: "CRUD, filtros, ciclo de vida, soft delete.",
    phase: "v1", readiness: "implemented",
    qa: { status: "pending" }, risk: "low", last_updated: "2026-07-12",
  },
  {
    id: "onboarding", name: "Onboarding", category: "crm",
    description: "Checklist e fluxo de ativação de cliente.",
    phase: "v1", readiness: "qa_pending",
    qa: { status: "pending" }, risk: "low", last_updated: "2026-07-12",
  },

  // ── Conteúdo (REC OS) ────────────────────────────────────
  {
    id: "contentos", name: "REC OS", category: "conteudo",
    description: "Calendário editorial, aprovação por link, fluxo.",
    phase: "v1", readiness: "implemented",
    qa: { status: "pending" }, risk: "low", last_updated: "2026-07-12",
  },
  {
    id: "approvals", name: "Aprovações", category: "conteudo",
    description: "Aprovação pública por link, sem login.",
    phase: "v1", readiness: "implemented",
    qa: { status: "pending" }, risk: "low", last_updated: "2026-07-12",
  },

  // ── Audiovisual (REC OS) ───────────────────────────────────
  {
    id: "rec_os", name: "REC OS", category: "conteudo",
    description: "Briefing, roteiro, decupagem, produção audiovisual.",
    phase: "v1", readiness: "implemented",
    qa: { status: "pending" }, risk: "low", last_updated: "2026-07-12",
  },
  {
    id: "storyboard", name: "Storyboard", category: "conteudo",
    description: "Visualização visual de cenas.",
    phase: "v1", readiness: "qa_pending",
    qa: { status: "pending" }, risk: "low", last_updated: "2026-07-12",
  },

  // ── Integrações ────────────────────────────────────────────
  {
    id: "meta", name: "Meta / Instagram", category: "integracao",
    description: "OAuth multiconexão, signed state HMAC-SHA256, wizard por cliente, Hub via client_meta_assets.",
    phase: "v1", readiness: "qa_pending",
    commit: "f141e05",
    qa: {
      status: "pending",
      date: "2026-07-13",
      result: [
        "Duh preservada (evidência parcial)",
        "Pedreirão preservado (evidência parcial)",
        "Tela Conexões abre",
        "Meta OAuth aparece conectado",
        "Sem regressão crítica",
      ],
      p2: [
        "QA do wizard completo pendente",
        "Nova conta: não testada",
        "Retorno contextual: não testado",
        "Hub persistido: não testado",
        "Isolamento de connection_id: não testado",
      ],
    },
    next_actions: [
      "QA wizard completo com conta real",
      "Testar nova conexão + retorno contextual",
      "Validar Hub persistido após OAuth",
      "Confirmar isolamento por connection_id e asset_id",
    ],
    risk: "medium",
    estimate: { hoursMin: 4, hoursLikely: 6, hoursMax: 10 },
    last_updated: "2026-07-13",
  },
  {
    id: "cardapio", name: "Cardápio Digital", category: "integracao",
    description: "Integração OlaClick — faturamento e pedidos.",
    phase: "v1", readiness: "deployed",
    qa: { status: "pending" }, risk: "low", last_updated: "2026-07-12",
  },
  {
    id: "whatsapp", name: "WhatsApp", category: "integracao",
    description: "Canal em preparação — não homologado.",
    phase: "v1", readiness: "blocked",
    blockers: ["Homologação Meta Business API pendente"],
    qa: { status: "not_required" }, risk: "low", last_updated: "2026-07-12",
  },

  // ── Relatórios e diagnósticos ──────────────────────────────
  {
    id: "reports", name: "Relatórios", category: "admin",
    description: "Faturamento, Meta insights, diagnóstico.",
    phase: "v1", readiness: "implemented",
    qa: { status: "pending" }, risk: "low", last_updated: "2026-07-12",
  },
  {
    id: "diagnostics", name: "Diagnósticos admin", category: "admin",
    description: "Diagnóstico de marketing e saúde da empresa — área administrativa.",
    phase: "v1", readiness: "deployed",
    qa: { status: "pending" }, risk: "low", last_updated: "2026-07-12",
  },

  // ── Comercial ─────────────────────────────────────────────
  {
    id: "crm", name: "CRM Comercial", category: "crm",
    description: "Leads, funil, oportunidades, coluna Instagram, perfis 4-way.",
    phase: "v1", readiness: "qa_pending",
    commit: "4d8357a",
    qa: { status: "pending" }, risk: "low",
    next_actions: ["Modal de detalhes do lead", "UTM tracking melhorado", "QA da coluna Instagram"],
    estimate: { hoursMin: 4, hoursLikely: 6, hoursMax: 10 },
    last_updated: "2026-07-13",
  },
  {
    id: "team", name: "Equipe", category: "admin",
    description: "Papéis, convites, acessos.",
    phase: "v1", readiness: "implemented",
    qa: { status: "pending" }, risk: "low", last_updated: "2026-07-12",
  },

  // ── Billing e assinatura ──────────────────────────────────
  {
    id: "billing_arch", name: "Arquitetura de billing", category: "billing",
    description: "Planos, cupons, assinaturas, providers.",
    phase: "v1", readiness: "implemented",
    qa: { status: "pending" }, risk: "low", last_updated: "2026-07-12",
  },
  {
    id: "asaas", name: "Gateway Asaas", category: "billing",
    description: "Integração de pagamento — sandbox não homologado. Código preparado.",
    phase: "v1", readiness: "blocked",
    blockers: ["Credenciais Asaas sandbox pendentes"],
    qa: { status: "not_started" }, risk: "high",
    notes: "Código existe: provider, gateway status, checkout preparado, webhook preparado. Falta: chave sandbox, customer, cobrança simulada, webhook, assinatura, checkout visual.",
    next_actions: [
      "Obter chave sandbox Asaas",
      "Testar conexão e customer",
      "Simular cobrança",
      "Validar webhook",
      "QA checkout visual",
    ],
    estimate: { hoursMin: 8, hoursLikely: 12, hoursMax: 18 },
    last_updated: "2026-07-12",
  },
  {
    id: "checkout", name: "Checkout público", category: "billing",
    description: "Fluxo de assinatura pública.",
    phase: "v1", readiness: "planned",
    blockers: ["Depende de Asaas homologado"],
    qa: { status: "not_started" }, risk: "high",
    last_updated: "2026-07-12",
  },

  // ── Operacional ───────────────────────────────────────────
  {
    id: "task_comments", name: "Comentários em tarefas", category: "operacional",
    description: "Comentários internos e externos em tarefas operacionais. Arquitetura, políticas RLS e proposta de tabela existem.",
    phase: "v1", readiness: "blocked",
    sql_dependency: "SQL 85 — BLOCO 1",
    blockers: ["SQL 85 pendente de execução — ALTER TABLE ADD COLUMN is_internal"],
    qa: { status: "not_started" }, risk: "medium",
    notes: "O que existe: proposta de tabela, políticas, arquitetura, status cadastrado. O que falta: executar SQL 85, validar RLS, implementar/liberar interface, testar comentários, menções, anexos e notificações.",
    next_actions: ["Executar SQL 85 BLOCO 1", "Validar RLS is_internal", "Implementar UI de comentários"],
    estimate: { hoursMin: 6, hoursLikely: 10, hoursMax: 14 },
    last_updated: "2026-07-13",
  },
  {
    id: "project_time_tracking", name: "Controle de horas", category: "operacional",
    description: "Sessões de trabalho por tarefa/área, esforço acumulado e previsão de entrega.",
    phase: "v1", readiness: "blocked",
    sql_dependency: "SQL 85 — BLOCO 2",
    blockers: ["SQL 85 pendente de execução — ALTER TABLE ADD COLUMN profile_id"],
    qa: { status: "not_started" }, risk: "medium",
    notes: "O que existe: proposta work_sessions, previsão conceitual, campos de esforço, definição de sessões. O que falta: corrigir banco, validar profile_id, criar interface, registrar sessões, gráficos, calcular velocidade.",
    next_actions: ["Executar SQL 85 BLOCO 2", "Validar profile_id na tabela", "Criar interface de registro"],
    estimate: { hoursMin: 8, hoursLikely: 14, hoursMax: 20 },
    last_updated: "2026-07-13",
  },

  // ── V2 ─────────────────────────────────────────────────────
  {
    id: "v2_adsense", name: "Google AdSense (blog)", category: "billing",
    description: "Monetização do blog.", phase: "v2", readiness: "planned",
    qa: { status: "not_started" }, last_updated: "2026-07-12",
  },
  {
    id: "v2_affiliate", name: "Afiliados", category: "crm",
    description: "Programa de afiliados.", phase: "v2", readiness: "planned",
    qa: { status: "not_started" }, last_updated: "2026-07-12",
  },

  // ── V2 — Arquitetura Modular (Sprint V2.1) ─────────────────
  {
    id: "open_source_provider_architecture",
    name: "Provider Architecture",
    category: "admin",
    description: "Contratos TypeScript para DesignEditorProvider, CustomerInboxProvider e SocialSchedulerProvider. Registry, feature flags e API de status.",
    phase: "v2",
    readiness: "implemented",
    qa: { status: "not_started" },
    commit: "sprint-v2.1",
    last_updated: "2026-07-13",
    notes: "Fundação modular implementada. Providers iniciais: disabled/mock (editor), chatwoot-disabled, postiz-disabled. Nenhum serviço externo ativado.",
  },
  {
    id: "editor_os",
    name: "EditorOS",
    category: "conteudo",
    description: "Editor canvas real no navegador: HTML5 Canvas, presets Feed/Story/Carrossel, texto/imagem/forma, move/resize/rotaciona/duplica, undo/redo, zoom, exportação PNG, rascunho localStorage isolado por clientId. Sprint 3.0.1: return_to sanitizado server-side, botão Voltar ao conteúdo, bridge sessionStorage de imagem temporária. Sprint 3.0.5b: CanvasEditor tornado client-only via next/dynamic (ssr: false).",
    phase: "v2",
    readiness: "qa_pending",
    commit: "7135030", deployment: "dpl_BXYjpnSfhkMbyQy7WMYCrzZ8pBG1",
    qa: {
      status: "approved_with_p2", date: "2026-07-19", auditor: "Codex Web",
      result: ["EditorOS bridge aprovado", "Abertura", "Contexto de cliente", "content_id", "return_to", "Canvas monta", "React #418 não reproduzido"],
      p2: ["Escopo validado nesta rodada cobre abertura/contexto/bridge/hidratação; funcionalidades maiores do editor (persistência em nuvem, undo/redo completo, exportação avançada) permanecem qa_pending — readiness mantido em qa_pending por representar escopo mais amplo que o testado"],
    },
    sql_dependency: "SQL 87 — design_projects (persistência em nuvem bloqueada até execução)",
    last_updated: "2026-07-19",
    notes: "Sprint 3.0.1: return_to aceito/sanitizado em page.tsx; EditorOSWorkspace exibe Voltar ao conteúdo; CanvasEditor detecta rec_os_visual_import_v1_{clientId}_{contentId} em sessionStorage e oferece Adicionar ao canvas / Descartar. Exportação PNG validada em QA anterior (Sprint 3.0 checkpoint).",
  },
  {
    id: "rec_os_information_architecture",
    name: "REC OS — Arquitetura de Informação",
    category: "conteudo",
    description: "Navegação reduzida a 5 itens: Visão Geral, Campanhas, ✦ Criar, Calendário, Resultados. Redirects legados. Tabs por URL. Fusão Calendário+Agendamento e Insights+Radar+Relatórios. Cards de ação rápida na Visão Geral consolidados: 6 ações de negócio, sem cards redundantes de Agendamento/EditorOS.",
    phase: "v2",
    readiness: "validated",
    qa: { status: "approved_with_p2", date: "2026-07-15", auditor: "Codex", p2: ["Rotas técnicas /contentos preservadas por compatibilidade"] },
    last_updated: "2026-07-15",
    notes: "Sprint 3.0: arquitetura visual validada como REC OS. Criar unificado em 5 etapas; links antigos visíveis corrigidos para /admin/contentos/* quando há client.",
  },
  {
    id: "guided_create_flow",
    name: "REC OS — Fluxo Criar Guiado",
    category: "conteudo",
    description: "5 etapas (Brief, Conteúdo, Visual, Revisão, Destino) com persistência real em content_items.metadata.guided_create. POST cria rascunho com status ideia; PATCH atualiza com autosave debounced. URL atualizada com content_id. EditorOS só abre após save. Destinos reais: Calendário, Produção, Aprovação.",
    phase: "v2",
    readiness: "validated",
    commit: "7135030", deployment: "dpl_BXYjpnSfhkMbyQy7WMYCrzZ8pBG1",
    qa: {
      status: "approved", date: "2026-07-19", auditor: "Codex Web",
      result: ["Criar aprovado", "Persistência aprovada", "React #418 não reproduzido", "Nenhum hydration mismatch", "CopyIdButton aprovado", "Mobile aprovado", "Nenhum runtime error"],
    },
    last_updated: "2026-07-19",
    notes: "Sprint 3.0.1 (Claude Code): GuidedCreateFlow reescrito. Sprint 3.0.2 (hotfix): mensagens de erro mapeadas por status HTTP (401/403/404/503/500). Sprint 3.0.5b: CopyIdButton conectado nos resultados de destino. QA Codex Web final aprovado — zero P0, zero P1.",
  },
  {
    id: "guided_create_persistence",
    name: "REC OS — Persistência do Rascunho",
    category: "banco",
    description: "APIs: POST /drafts (cria content_item status ideia), GET /drafts/[id], PATCH /drafts/[id] (preserva metadata externa). send-to-production e send-to-approval idempotentes. Sem novos SQLs. Usa content_items.metadata jsonb (SQL 23). Sprint 3.0.2: authClient para autenticação, adminDb (service role) para writes — contorna RLS.",
    phase: "v2",
    readiness: "validated",
    commit: "7135030", deployment: "dpl_BXYjpnSfhkMbyQy7WMYCrzZ8pBG1",
    qa: {
      status: "approved", date: "2026-07-19", auditor: "Codex Web",
      result: ["Persistência aprovada", "Autosave validado", "Reload validado", "Nenhum runtime error"],
    },
    last_updated: "2026-07-19",
    notes: "Sprint 3.0.2 hotfix: RLS bloqueava INSERT em content_items. Todas as rotas API agora usam requireAdminContentOSContext() — authClient só para auth/role, adminDb para DB. Nenhum SQL executado. Nenhuma RLS alterada. QA Codex Web final aprovado.",
  },
  {
    id: "approval_client_context",
    name: "REC OS — Contexto de Cliente nas Aprovações",
    category: "conteudo",
    description: "Aprovações admin recebem activeClientId e activeClientName do server component. Header mostra nome do cliente. Demo mode suprimido quando activeClientId presente. SubNav recebe initialClientId em todas as páginas REC OS.",
    phase: "v2",
    readiness: "validated",
    commit: "7135030", deployment: "dpl_BXYjpnSfhkMbyQy7WMYCrzZ8pBG1",
    qa: {
      status: "approved", date: "2026-07-19", auditor: "Codex Web",
      result: ["Aprovação aprovada", "React #418 não reproduzido", "Nenhum hydration mismatch", "Nenhum runtime error"],
    },
    last_updated: "2026-07-19",
    notes: "Sprint 3.0.1: aprovacoes/page.tsx busca company_name e repassa ao ContentosAprovacoesContent. isDemo = false quando activeClientId presente. Sprint 3.0.5b: datas com timezone explícito, IDs técnicos copiáveis. QA Codex Web final aprovado.",
  },
  {
    id: "production_destination_visibility",
    name: "REC OS — Visibilidade Produção (Destino)",
    category: "conteudo",
    description: "Página Produção usa adminDb (service role) para listar content_items e operational_tasks. Filtro inclui status 'producao' (canonical) e 'em_producao' (legado). Aceita searchParams content_id e task para highlight. DestinationResult preserva contentId e existed; links incluem content_id e task.",
    phase: "v2",
    readiness: "validated",
    commit: "7135030", deployment: "dpl_BXYjpnSfhkMbyQy7WMYCrzZ8pBG1",
    qa: {
      status: "approved", date: "2026-07-19", auditor: "Codex Web",
      result: ["Produção aprovada", "CopyIdButton aprovado", "Nenhum runtime error"],
    },
    last_updated: "2026-07-19",
    notes: "Sprint 3.0.3 (P1): send-to-production setava status 'producao' mas página filtrava apenas 'em_producao' (legado). Corrigido: adminDb, filtro expandido, seção de operational_tasks, URL params, microcopy diferenciado existed=true/false. Sprint 3.0.5b: CopyIdButton em cada tarefa. QA Codex Web final aprovado.",
  },
  {
    id: "approval_destination_visibility",
    name: "REC OS — Visibilidade Aprovações (Destino)",
    category: "conteudo",
    description: "Página Aprovações usa adminDb (service role) para query em approvals — contorna RLS que bloqueava session client. Aceita content_id como searchParam. Fallback sem join relacional se query falhar. DestinationResult preserva contentId e existed; links incluem content_id e approval.",
    phase: "v2",
    readiness: "validated",
    commit: "7135030", deployment: "dpl_BXYjpnSfhkMbyQy7WMYCrzZ8pBG1",
    qa: {
      status: "approved", date: "2026-07-19", auditor: "Codex Web",
      result: ["Aprovação aprovada", "CopyIdButton aprovado", "Nenhum runtime error"],
    },
    last_updated: "2026-07-19",
    notes: "Sprint 3.0.3 (P1): aprovacoes/page.tsx usava createServerSupabaseClient para approvals — RLS bloqueava. Corrigido: requireAdminContentOSContext + adminDb. Sprint 3.0.5b: modal técnico com CopyIdButton (approval_id/content_id). QA Codex Web final aprovado.",
  },
  {
    id: "olaclick_payment_methods",
    name: "OlaClick — Formas de Pagamento",
    category: "integracao",
    description: "Modelo completo: extractPaymentEntries() com PaymentEntry/PaymentSource, ticket médio por forma, percentuais, completude (complete/partial/unavailable/unknown), pedidos mistos sem duplicação de receita, filtros visíveis e gráfico de barras em /admin/relatorios/faturamento.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "not_started" },
    blockers: ["Provider OlaClick não retornou dados suficientes de formas de pagamento para validação fiscal"],
    last_updated: "2026-07-15",
    notes: "state=blocked_provider_data. V2.2.1 preserva paymentDataCompleteness, ticketMedioPorFormaPagamento, percentualPorFormaPagamento, pedidosComPagamentoMisto; falta dado real completo do provider.",
  },
  {
    id: "fiscal_integration",
    name: "Integração Fiscal",
    category: "integracao",
    description: "FiscalDocumentProvider — contrato TypeScript apenas. Sem emissão, sem ativação, sem integração com SEFAZ/NF-e/NFS-e.",
    phase: "v2",
    readiness: "planned",
    qa: { status: "not_started" },
    blockers: [
      "SQL 87 pendente de execução",
      "Contrato com provider fiscal não estabelecido",
      "Nenhum módulo de emissão ativo",
    ],
    last_updated: "2026-07-14",
    notes: "Contrato em docs/architecture/FISCAL_PAYMENT_MAPPING.md. Não ativar até SQL-87 validado e provider contratado.",
  },
  {
    id: "crm_inbox",
    name: "CRM Inbox",
    category: "crm",
    description: "Módulo de atendimento integrado ao CRM OS. Motor candidato: Chatwoot (MIT). Status: não instalado.",
    phase: "v2",
    readiness: "blocked",
    qa: { status: "not_started" },
    blockers: [
      "Chatwoot: requer VPS + Docker + Redis + Ruby/Rails — não instalado",
      "Infraestrutura de VPS não provisionada",
    ],
    sql_dependency: "SQL 88 — conversation_links",
    last_updated: "2026-07-14",
    notes: "state=blocked_external_infra. CustomerInboxProvider interface e chatwoot-disabled provider implementados. Feature flag crm_inbox=disabled. Painel de integrações mostra status 'não instalado'.",
  },
  {
    id: "social_scheduler",
    name: "Social Scheduler",
    category: "conteudo",
    description: "Agendamento e publicação social integrado ao REC OS. Motor candidato: Postiz (AGPL-3.0). Status: não instalado.",
    phase: "v2",
    readiness: "blocked",
    qa: { status: "not_started" },
    blockers: [
      "Postiz: AGPL-3.0 — não incorporar código; requer VPS + Docker — não instalado",
      "Infraestrutura de VPS não provisionada",
      "Canais sociais não conectados",
    ],
    sql_dependency: "SQL 89 — scheduled_publications, publication_attempts",
    last_updated: "2026-07-14",
    notes: "state=blocked_external_infra. SocialSchedulerProvider interface e postiz-disabled provider implementados. Feature flag social_scheduler=disabled. Painel de integrações mostra status 'não instalado'.",
  },
  {
    id: "global_calendar",
    name: "Calendário Global",
    category: "operacional",
    description: "Sprint 3.1A: visão administrativa cross-cliente somente leitura, agregando content_items, operational_tasks e approvals em /admin/calendario via modelo normalizado GlobalCalendarEvent. Financeiro ainda não incluído como fonte.",
    phase: "v2",
    readiness: "qa_pending",
    qa: {
      status: "pending",
      date: "2026-07-19",
      auditor: "Codex Web",
      result: [
        "Rota, autenticação, sidebar, deep-link direto com year/month/client/source aprovados (3º QA)",
        "Deep-link Duh+Aprovações, deep-link O Pedreirão, isolamento entre clientes aprovados (3º QA)",
        "Estados vazios, zero legítimo de Conteúdos/Produção, Aprovações aprovados (3º QA)",
        "React #418, hidratação, console, mobile e runtime aprovados",
        "Ausência de public_token e de service role no browser confirmada",
      ],
      p2: [
        "P1 (Sprint 3.1A.1): navegação mensal/Hoje corrigida (bug de estado desatualizado, não hidratação)",
        "P1 (Sprint 3.1A.1): parâmetro client na URL agora validado e suportado",
        "P1 (Sprint 3.1A.1): lista de clientes agora independente de eventos do mês",
        "P1 (Sprint 3.1A.1): content_items agora consulta scheduled_at além de scheduled_date",
        "P1 (Sprint 3.1A.2): useState duplicado de filterClient/filterSource removido — URL/props são a única fonte de verdade",
        "REPROVADO (3º QA): navegação client-side (next/link + router.push) instável em navegador real apesar do fix da 3.1A.2 — suspeita de Client Router Cache do Next.js reaproveitando payload antigo",
        "P1 (Sprint 3.1A.3): Anterior/Próximo/Hoje viraram <a href> nativas; selects usam window.location.assign — useRouter/useTransition/router.push removidos do arquivo",
        "Novo QA Codex Web necessário antes de marcar validated — verificar especialmente que a navegação nativa resolve os sintomas de atraso/inversão relatados",
      ],
    },
    last_updated: "2026-07-19",
    notes: "Sprint 3.1A: rota /admin/calendario (requireAdminContentOSContext, adminDb), src/lib/global-calendar.ts com normalizadores puros. Sprint 3.1A.1: hotfix dos 4 P1 do QA (navegação mensal, filtro client, lista de clientes, scheduled_at). Verificado via script ad-hoc, sem framework de teste instalado. Somente leitura, sem SQL, sem reuniões, sem Google Calendar/Meet — adiados para 3.1C/3.1D. Arquitetura original em docs/architecture/GLOBAL_CALENDAR_V1.md.",
  },
  {
    id: "client_360",
    name: "Cliente 360",
    category: "crm",
    description: "Página única de contexto do cliente: dados, integrações, produção, relatórios, financeiro e histórico.",
    phase: "v2",
    readiness: "planned",
    qa: { status: "not_started" },
    last_updated: "2026-07-15",
    notes: "state=planned. Arquitetura documentada em docs/architecture/CLIENT_360_V1.md.",
  },
  {
    id: "client_finance",
    name: "Financeiro por Cliente",
    category: "billing",
    description: "Visão financeira por cliente com contratos, cobranças, status, repasses e conciliação.",
    phase: "v2",
    readiness: "planned",
    qa: { status: "not_started" },
    last_updated: "2026-07-15",
    notes: "state=planned. Arquitetura documentada em docs/architecture/CLIENT_FINANCE_V1.md.",
  },
  {
    id: "rec_os_global_hub",
    name: "REC OS — Central Global",
    category: "operacional",
    description: "Sprint 4.0A-preview: /admin/contentos passa de redirect puro para central operacional cross-cliente (cards, atenção, resumo por cliente, atalhos), reaproveitando content_items/approvals e o padrão de src/lib/global-calendar.ts. Implementado em branch de preview, não integrado a main.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-21",
    notes: "Branch feat/rec-os-global-hub-preview. tsc, build e ESLint passaram limpos nesta sessão; isolamento entre clientes verificado apenas em nível de código (client_id validado contra a lista de clientes visíveis, nunca confiado do navegador) — sem QA em navegador real ainda. Aguardando deployment de preview e QA (Codex Web ou manual) antes de qualquer merge em main.",
  },
  {
    id: "rec_os_clickable_dashboard",
    name: "REC OS — Cards clicáveis",
    category: "operacional",
    description: "Os 8 cards da Central Global (aguardando aprovação, em produção, em revisão, alterações solicitadas, agendados, publicados, em andamento, clientes com pendências) levam a rotas reais existentes.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-21",
    notes: "Com cliente selecionado, cards apontam para /admin/contentos/{aprovacoes,producao,resultados} e /admin/calendario, todas rotas reais já existentes. Sem cliente selecionado ('todos'), a maioria dos cards aponta para /admin/calendario porque é a única rota hoje que aceita visão cross-cliente — aprovacoes/producao/resultados/criar exigem client e redirecionam para o seletor se ausente (confirmado lendo o código dessas páginas). Ampliar essas páginas para aceitar todos os clientes fica fora do escopo desta sprint.",
  },
  {
    id: "rec_os_global_client_filter",
    name: "REC OS — Filtro global de cliente",
    category: "operacional",
    description: "Seletor de cliente no topo da Central Global usa a URL (?client=<uuid>) como única fonte de verdade; client inválido é tratado como 'todos os clientes' e nunca usado em consulta.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-21",
    notes: "Validação do client feita no servidor contra a lista de clientes visíveis (mesmo padrão de /admin/calendario). Seletor usa <select> nativo com navegação via window.location.href no onChange, mesmo padrão já usado em selecionar-cliente/_client-content.tsx — sem estado paralelo de cliente ativo.",
  },
  {
    id: "rec_os_global_approvals",
    name: "REC OS — Aguardando aprovação (visão global)",
    category: "operacional",
    description: "Card 'Aguardando aprovação' na Central Global conta content_items.status = enviado_aprovacao em todos os clientes visíveis (ou só no cliente selecionado).",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-21",
    notes: "Contagem por src/lib/rec-os-hub.ts (bucketContentStatus). Não substitui nem altera /admin/contentos/aprovacoes.",
  },
  {
    id: "rec_os_global_production",
    name: "REC OS — Em produção (visão global)",
    category: "operacional",
    description: "Card 'Em produção' na Central Global conta content_items.status em {producao, em_producao, edicao} em todos os clientes visíveis (ou só no cliente selecionado).",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-21",
    notes: "Contagem por src/lib/rec-os-hub.ts (bucketContentStatus). 'em_producao' é alias legado de 'producao' observado em produção/resultados/page.tsx — mantido como sinônimo para não subcontar. Não substitui nem altera /admin/contentos/producao.",
  },

  // ── Motor LOKAT / Meu Negócio (branch feat/motor-lokat-preview-v1) ────────
  // Estas entradas descrevem código que existe SOMENTE na branch de preview.
  // Não foi mergeado em main, não está em produção.
  {
    id: "business_os_preview",
    name: "Meu Negócio — preview (Motor LOKAT)",
    category: "admin",
    description: "Rota /admin/meu-negocio: vertical slice funcional em modo demonstração (sem Supabase, sem persistência), conectando visão geral financeira, precificação, fluxo de caixa, campanhas, fontes e glossário.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-20",
    notes: "Implementado somente na branch feat/motor-lokat-preview-v1 — não mergeado em main, não está em produção. Funciona 100% sem Supabase; todos os valores são exemplos editáveis em memória, nada é persistido.",
  },
  {
    id: "financial_intelligence_engine",
    name: "Motor LOKAT — motor financeiro determinístico",
    category: "billing",
    description: "src/lib/motor-lokat/financial-engine.ts, pricing-engine.ts, cash-flow-engine.ts: funções puras (faturamento, receita líquida, custo direto, margem de contribuição, resultado operacional, ponto de equilíbrio, capital de giro, precificação, fluxo de caixa), com fonte e confiança por métrica.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-20",
    notes: "Somente na branch feat/motor-lokat-preview-v1. Valores monetários em centavos inteiros. Verificado via script ad-hoc (7 cenários do prompt + divisão por zero/dados ausentes) — zero NaN/Infinity. Sem framework de teste instalado.",
  },
  {
    id: "campaign_profitability_simulator",
    name: "Motor LOKAT — simulador de rentabilidade de campanhas",
    category: "billing",
    description: "src/lib/motor-lokat/campaign-engine.ts: desconto financiado pela empresa, margem por pedido, ponto de equilíbrio da campanha, CAC, LTV de receita/contribuição, LTV/CAC, payback, classificação de status com objetivos de marca tratados à parte.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-20",
    notes: "Somente na branch feat/motor-lokat-preview-v1. Inclui contexto estruturado para o REC OS (botão aponta para /admin/contentos/criar?step=brief, rota real auditada antes de implementar) — nesta versão o contexto é só exibido, não enviado/preenchido automaticamente.",
  },
  {
    id: "financial_glossary",
    name: "Motor LOKAT — glossário vivo",
    category: "admin",
    description: "src/lib/motor-lokat/glossary.ts + aba Glossário: termos com nome simples, nome técnico, fórmula, exemplo, erros comuns e termos relacionados, abertos pela aba, por clique em métrica ou ícone de ajuda.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-20",
    notes: "Somente na branch feat/motor-lokat-preview-v1.",
  },
  {
    id: "financial_data_quality",
    name: "Motor LOKAT — qualidade e confiança dos dados",
    category: "admin",
    description: "Cada métrica carrega origem (importado/manual/estimado/ausente), nível de confiança (alta/média/baixa/insuficiente) e comparação com meta configurável — nenhuma métrica aparece como definitiva quando depende de estimativa.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-20",
    notes: "Somente na branch feat/motor-lokat-preview-v1.",
  },
  {
    id: "campaign_rec_os_bridge",
    name: "Motor LOKAT — ponte de campanha para o REC OS",
    category: "admin",
    description: "Geração de contexto estruturado da campanha (objetivo, oferta, orçamento, margem mínima, riscos) e botão para abrir a criação no REC OS.",
    phase: "v2",
    readiness: "planned",
    qa: { status: "not_started" },
    last_updated: "2026-07-20",
    notes: "Somente na branch feat/motor-lokat-preview-v1. Nesta versão o contexto é só exibido — preenchimento automático do formulário do REC OS é a próxima fatia, não implementada.",
  },
  {
    id: "aipede_csv_import",
    name: "Motor LOKAT — importação AiPede / CSV",
    category: "integracao",
    description: "Aba Fontes mapeia campos candidatos de AiPede (pedidos, vendas, ganhos, clientes, pagamentos, repasses) e prevê importação futura via CSV/Excel.",
    phase: "v2",
    readiness: "planned",
    qa: { status: "not_started" },
    last_updated: "2026-07-20",
    notes: "Somente na branch feat/motor-lokat-preview-v1. Nenhuma integração real — nenhum dado de print/tela do AiPede foi tratado como dado real.",
  },
  {
    id: "inventory_and_losses",
    name: "Motor LOKAT — perdas e estoque",
    category: "operacional",
    description: "Categorização de perdas por segmento (desperdício, quebra, roubo, cancelamento, churn, etc.) na Visão Geral — sem controle de estoque completo nesta fase.",
    phase: "v2",
    readiness: "planned",
    qa: { status: "not_started" },
    last_updated: "2026-07-20",
    notes: "Somente na branch feat/motor-lokat-preview-v1. Controle de estoque registrado como próxima capacidade.",
  },

  // ── Motor LOKAT 1.1 / DNA do Negócio e Engenharia de Produtos (branch feat/product-engineering-preview-v1) ──
  // Estas entradas descrevem código que existe SOMENTE nesta branch, criada a
  // partir de feat/motor-lokat-preview-v1 (que por sua vez não está em main).
  // Nada foi mergeado, nada está em produção.
  {
    id: "business_dna",
    name: "Motor LOKAT — DNA do Negócio",
    category: "admin",
    description: "Aba Empresa > DNA do Negócio: 19 campos estratégicos (modelo de negócio, proposta de valor, públicos, canais, concorrentes, posicionamento etc.), cada um com origem própria (diagnóstico/manual/importado/estimado/ausente).",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-20",
    notes: "Somente na branch feat/product-engineering-preview-v1. Nenhum campo é declarado como vindo do diagnóstico a menos que o usuário selecione essa origem explicitamente.",
  },
  {
    id: "business_manual",
    name: "Motor LOKAT — Manual do Negócio",
    category: "admin",
    description: "Visualização consolidada (resumo executivo, Modelo de negócio, 4 Ps, SWOT, metas, canais, restrições) derivada ao vivo do DNA do Negócio — não é uma cópia separada dos dados.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-22",
    notes: "Somente na branch fix/product-engineering-usability-v1 (base feat/product-engineering-preview-v1). Sem geração de PDF nesta sprint. Hotfix 1.1.1: seção 'Modelo de negócio' adicionada explicitamente (antes só aparecia implícito na descrição).",
    next_actions: ["QA reconfirmar que 'Modelo de negócio' aparece no Manual e reflete o DNA imediatamente"],
  },
  {
    id: "business_four_ps",
    name: "Motor LOKAT — 4 Ps do Negócio",
    category: "admin",
    description: "Produto, Preço, Praça e Promoção, cada um com descrição, evidências e observações editáveis.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-20",
    notes: "Somente na branch feat/product-engineering-preview-v1.",
  },
  {
    id: "business_swot",
    name: "Motor LOKAT — Matriz SWOT/FOFA",
    category: "admin",
    description: "Forças/Fraquezas agrupadas sob 'Ambiente interno' e Oportunidades/Ameaças sob 'Ambiente externo', cada agrupamento com explicação curta; cada item com origem, evidência, impacto, prioridade e confirmação. Exemplos por segmento claramente marcados como exemplo, nunca como fato confirmado.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-22",
    notes: "Somente na branch fix/product-engineering-usability-v1 (base feat/product-engineering-preview-v1). Nenhuma LLM conectada, nenhum preenchimento automático como fato. Hotfix 1.1.1: os 4 quadrantes passaram a ser agrupados visualmente sob dois títulos explícitos (Ambiente interno / Ambiente externo) com explicação — estrutura dos itens em si não foi alterada.",
    next_actions: ["QA reconfirmar que Ambiente interno/externo estão explícitos e que nenhum item SWOT existente foi perdido no reagrupamento"],
  },
  {
    id: "sales_goals",
    name: "Motor LOKAT — Metas de Vendas",
    category: "admin",
    description: "Metas editáveis (unidades, faturamento, clientes novos, recompra, margem de contribuição, ticket médio) comparadas com valor real, diferença e percentual atingido.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-20",
    notes: "Somente na branch feat/product-engineering-preview-v1. Dados de demonstração editáveis — nenhum pedido real declarado como importado.",
  },
  {
    id: "product_portfolio",
    name: "Motor LOKAT — Portfólio de Produtos e Serviços",
    category: "admin",
    description: "Cadastro em memória de produtos/serviços (nome, categoria, público, preço, canal, situação: ideia/teste/ativo/sazonal/descontinuado) com campos específicos por segmento (delivery, varejo, clínica, serviços/agência, SaaS). Criação exige escolha explícita entre Produto e Serviço; edição detalhada acontece em um workspace com abas (Geral/Custos/Operação/Posicionamento/Testes) aberto por um botão 'Editar produto/serviço' visível em cada card.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-22",
    notes: "Somente na branch fix/product-engineering-usability-v1 (base feat/product-engineering-preview-v1). Nenhuma persistência — tudo em memória durante a sessão. Hotfix 1.1.1 (P1 do QA): a edição detalhada (composição, custos, operação, posicionamento, campos por segmento) não estava evidente/acessível após criar um item — corrigido com um workspace dedicado por item e um botão de edição explícito. Serviço nunca exige estoque/ingredientes/embalagem/validade (novo campo ProductServiceItem.kind filtra esses campos do segmento).",
    next_actions: ["QA reconfirmar que criar produto e criar serviço abrem fluxos com campos diferentes", "QA reconfirmar que o botão 'Editar produto/serviço' abre o workspace e 'Voltar ao Portfólio' retorna sem perder dados"],
  },
  {
    id: "product_cost_engineering",
    name: "Motor LOKAT — Engenharia de Custo por Produto",
    category: "billing",
    description: "src/lib/motor-lokat/product-cost-engine.ts: custo direto, CMV/CSV, margem de contribuição unitária, reaproveitando classifyCostVsGoal/classifyMarginVsGoal do motor financeiro (Sprint 1.0) — nenhuma fórmula duplicada. Rótulos e o texto da fórmula visível se adaptam ao tipo do item (produto vs. serviço): serviço mostra 'CSV' com a explicação 'Custo do Serviço Vendido' e uma fórmula em linguagem de serviço (mão de obra, materiais, ferramentas, deslocamento, terceirização, retrabalho esperado) — a fórmula matemática e o motor não mudam, calculateProductCost recebe kind só para escolher o texto exibido.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-22",
    notes: "Somente na branch fix/product-engineering-usability-v1 (base feat/product-engineering-preview-v1). Hotfix 1.1.2 (P2 do QA em dpl_3NXNQLZZ2SGbbWueErf1zNyVtmVt): o texto auxiliar da fórmula ainda dizia 'componentes + embalagem + entrega + perda esperada' mesmo para serviços (consultoria, clínica, agência, SaaS). Corrigido: calculateProductCost agora recebe um 4º parâmetro opcional 'kind' que só escolhe entre dois textos fixos (PRODUCT_FORMULA / SERVICE_FORMULA) — verificado via script ad-hoc que o resultado numérico (directCost, margem, status) é idêntico para os dois kinds com o mesmo input; só o texto muda. Ícone de glossário do custo direto agora abre 'csv' para serviço e 'cmv' para produto (antes sempre abria 'margem_contribuicao').",
    next_actions: ["QA reconfirmar que o texto de custo de serviços (consultoria, clínica, agência, SaaS) não menciona mais embalagem/CMV/estoque/ingredientes/validade"],
  },
  {
    id: "product_operations",
    name: "Motor LOKAT — Operação e Capacidade",
    category: "operacional",
    description: "src/lib/motor-lokat/product-operations-engine.ts: capacidade projetada, utilização, vendas possíveis, gargalo principal e risco operacional — nunca inventa uma demanda, só compara capacidade informada contra capacidade máxima informada.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-20",
    notes: "Somente na branch feat/product-engineering-preview-v1. Não promete controle de estoque completo.",
  },
  {
    id: "product_positioning",
    name: "Motor LOKAT — Público e Posicionamento do Produto",
    category: "admin",
    description: "Público principal, faixa de preço, ocasião de consumo, concorrentes, diferencial, praça e promoção por produto — conectado aos 4 Ps da empresa, com exceções próprias por produto quando necessário. Agora acessível em sua própria aba dentro do workspace do item, com um marcador explícito de herança do DNA.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-22",
    notes: "Somente na branch fix/product-engineering-usability-v1 (base feat/product-engineering-preview-v1). Hotfix 1.1.1: seção movida do painel único para a aba 'Posicionamento' do workspace do item; adicionado checkbox 'Herdar do DNA do Negócio' — exceções por produto continuam editáveis independentemente do estado desse checkbox.",
  },
  {
    id: "product_laboratory",
    name: "Motor LOKAT — Laboratório de Produtos",
    category: "admin",
    description: "Fluxo Ideia → Planejamento → Teste → Resultado → Decisão, reaproveitando CampaignInput/calculateCampaignProjection (Sprint 1.0) para o teste — nenhum segundo simulador financeiro. Decisão sugerida por regras determinísticas (lab-decision-rules.ts), nunca executada automaticamente. Também acessível por item via a aba 'Testes e resultados' e o botão 'Testar no Laboratório' dentro do workspace do produto/serviço.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-22",
    notes: "Somente na branch fix/product-engineering-usability-v1 (base feat/product-engineering-preview-v1). Hotfix 1.1.1: testes de um item agora também aparecem embutidos na aba 'Testes e resultados' do seu próprio workspace (mesmos dados, mesmo componente — nenhuma duplicação de estado ou de lógica).",
  },
  {
    id: "product_performance_matrix",
    name: "Motor LOKAT — Matriz de Desempenho",
    category: "operacional",
    description: "Classificação de produtos em 4 quadrantes (venda × margem) contra meta configurada ou mediana da categoria — critério sempre exibido, nunca um limite escondido. Recomendações determinísticas por quadrante (performance-matrix.ts).",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-20",
    notes: "Somente na branch feat/product-engineering-preview-v1. Aviso exibido quando categorias diferentes são comparadas sem meta configurada.",
  },
  {
    id: "product_rec_os_bridge",
    name: "Motor LOKAT — Ponte de Produto para o REC OS",
    category: "admin",
    description: "Botões 'Testar em campanha' (prepara CampaignInput para a aba Campanhas) e 'Criar campanha no REC OS' (link real para /admin/contentos/criar?step=brief, rota auditada antes de usar).",
    phase: "v2",
    readiness: "planned",
    qa: { status: "not_started" },
    last_updated: "2026-07-20",
    notes: "Somente na branch feat/product-engineering-preview-v1. Contexto só exibido — preenchimento automático é próxima integração, não implementado.",
  },
  {
    id: "aipede_product_connector",
    name: "Motor LOKAT — Conector conceitual AiPede (produtos)",
    category: "integracao",
    description: "Contrato conceitual de campos (estabelecimento, produto, pedido, cupom, taxa, comissão, repasse, estoque etc.) para uma futura integração — sem chamada de API, sem descoberta de endpoint, sem dado real.",
    phase: "v2",
    readiness: "blocked",
    blockers: ["Documentação oficial e autorização da API do AiPede pendentes"],
    qa: { status: "not_started" },
    last_updated: "2026-07-20",
    notes: "Somente na branch feat/product-engineering-preview-v1. Bloqueado por decisão — não deve ser contornado.",
  },
  {
    id: "motor_lokat_ai_assistant",
    name: "Motor LOKAT — Assistente LOKAT (chat com IA)",
    category: "admin",
    description: "Painel persistente (lateral no desktop, bottom sheet no mobile) com chat em streaming real via OpenAI Responses API (src/lib/motor-lokat/ai/, rota /api/motor-lokat/assistant). A IA nunca recalcula margem/CMV/CSV — todo número vem dos motores determinísticos já existentes e é passado como contexto somente-leitura.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-23",
    notes: "Somente na branch feat/motor-lokat-ai-experience-v1. Sem OPENAI_API_KEY configurada neste ambiente local — arquitetura completa implementada e verificada por script ad-hoc, mas a chamada real ao modelo não pôde ser exercitada de ponta a ponta aqui. Painel mostra 'Assistente temporariamente indisponível' e o restante do módulo continua funcionando normalmente (fallback verificado via /api/ai/status).",
  },
  {
    id: "motor_lokat_report_interpreter",
    name: "Motor LOKAT — Interpretação de relatórios anexados",
    category: "admin",
    description: "Upload de PDF/PNG/JPG/CSV/TXT (até 8 MB) com validação de tipo/tamanho/extensão/arquivo vazio (report-parser.ts) e interpretação estruturada (período, fonte, métricas, classificação, confiança, dados ausentes, alertas, perguntas) via schema estrito. Nunca aplica dados automaticamente.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-23",
    notes: "Somente na branch feat/motor-lokat-ai-experience-v1. Validação de arquivo testada localmente (arquivo vazio, oversized, extensão inválida, mime incompatível — todos rejeitados corretamente). Interpretação real de conteúdo depende da chave OpenAI, não configurada neste ambiente.",
  },
  {
    id: "motor_lokat_assisted_fill",
    name: "Motor LOKAT — Preenchimento assistido com confirmação",
    category: "admin",
    description: "Painel 'Informações encontradas' (proposed-updates-panel.tsx): cada proposta mostra campo, valor atual, valor proposto, origem e confiança; usuário escolhe Aplicar selecionados/Revisar/Ignorar/Cancelar. Aplicação só afeta o estado em memória do shell (whitelist de caminhos dna.*/profile.* em _client-content.tsx) — nunca persistida, nunca automática.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-23",
    notes: "Somente na branch feat/motor-lokat-ai-experience-v1. O aplicador de propostas usa uma lista branca de caminhos conhecidos (não um escritor de caminho genérico) — qualquer proposta fora dela é ignorada com segurança.",
  },
  {
    id: "motor_lokat_voice_input",
    name: "Motor LOKAT — Microfone push-to-talk",
    category: "admin",
    description: "Botão 'Segurar para falar' (MediaRecorder + getUserMedia) grava até 60s, envia para /api/motor-lokat/assistant/transcribe (multipart, sem persistência do áudio) e mostra o texto transcrito, editável, antes de interpretar. Sem conversa contínua Realtime nesta sprint — contrato pronto para evoluir.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-23",
    notes: "Somente na branch feat/motor-lokat-ai-experience-v1. Estados de permissão negada/sem microfone/áudio vazio/timeout tratados no código; não testável de ponta a ponta neste ambiente (sem navegador e sem chave OpenAI configurada).",
  },
  {
    id: "motor_lokat_ai_campaign_planner",
    name: "Motor LOKAT — Planejar campanha comigo (fluxo guiado)",
    category: "admin",
    description: "10 perguntas progressivas (objetivo, produto/serviço, público, período, orçamento, oferta, quem paga o desconto, capacidade, meta, canais) com recálculo ao vivo via calculateCampaignProjection (Sprint 1.0) — nenhuma estimativa livre da IA. Mostra orçamento/margem/ponto de equilíbrio/CAC/risco/dados ausentes antes do botão 'Gerar briefing no REC OS'.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-23",
    notes: "Somente na branch feat/motor-lokat-ai-experience-v1. Reaproveita defaultCampaignInput/calculateCampaignProjection já existentes — nenhum segundo motor de campanha.",
  },
  {
    id: "motor_lokat_light_experience",
    name: "Motor LOKAT — Nova identidade visual (creme/vermelho)",
    category: "admin",
    description: "Tokens CSS (--business-bg/--business-surface/--business-accent etc., em globals.css, escopados a .lokat-business-theme) aplicados ao cabeçalho, abas, Assistente LOKAT, resumo da Visão Geral e assistente de campanha. Animações via framer-motion (já instalado) para abertura do painel/bottom sheet/detalhe, respeitando prefers-reduced-motion.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-23",
    notes: "Somente na branch feat/motor-lokat-ai-experience-v1. Cobertura parcial por decisão de escopo: chrome do shell e as novas superfícies de IA/progressive disclosure usam a paleta nova; seções profundas já existentes (Custos, Operação, DNA, etc. dentro de Empresa/Produtos e Serviços) mantêm a paleta índigo/roxa da Sprint 1.0/1.1 — não foi feito um re-skin completo de todos os formulários nesta sprint.",
  },
  {
    id: "motor_lokat_progressive_disclosure",
    name: "Motor LOKAT — Progressive disclosure na Visão Geral",
    category: "admin",
    description: "Resumo inicial com 3 números-chave (faturamento, custo de entrega, quanto sobrou), situação, principal alerta e principal ação. 'Entender este número'/'Ver cálculo completo' abrem um segundo nível (painel lateral no desktop, bottom sheet no mobile) com fórmula, confiança, origem e dados ausentes. Os indicadores, inputs e gráfico completos da Sprint 1.0 continuam disponíveis atrás de um alternador 'Ver detalhes completos'.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-23",
    notes: "Somente na branch feat/motor-lokat-ai-experience-v1. Nenhum dado ou cálculo da Visão Geral original foi removido — apenas reorganizado em dois níveis de detalhe.",
  },
];

// ── Histórico de eventos versionado ─────────────────────────
export interface HistoryEntry {
  date: string;
  event: string;
  commit?: string;
  deployment?: string;
}

export const V1_HISTORY: HistoryEntry[] = [
  {
    date: "2026-07-19",
    event: "Sprint 3.0 encerrada — QA final Codex Web aprovado (zero P0, zero P1). Criar, Persistência, Produção, Aprovação, CopyIdButton e EditorOS (bridge) validados.",
    commit: "7135030", deployment: "dpl_BXYjpnSfhkMbyQy7WMYCrzZ8pBG1",
  },
  {
    date: "2026-07-13",
    event: "5 commits publicados em produção — deployment READY.",
    commit: "3d4eb5b", deployment: "dpl_6TWxhJHpk3QGh896c7kJEvzwAB8E",
  },
  {
    date: "2026-07-13",
    event: "SQL 85 criado como proposta corretiva para falhas de SQL 82 (is_internal) e SQL 84 (profile_id). Não executado.",
    commit: "3d4eb5b",
  },
  {
    date: "2026-07-13",
    event: "Blog público e Contato validados como rotas públicas pelo Codex Web.",
  },
  {
    date: "2026-07-13",
    event: "Navegação admin validada: Dashboard como home do super_admin; /admin/plataforma redireciona corretamente.",
    commit: "831b3ea",
  },
  {
    date: "2026-07-13",
    event: "Diagnóstico rápido com modal de identificação aprovado pelo Codex Web.",
    commit: "4d8357a",
  },
  {
    date: "2026-07-13",
    event: "Pré-acesso com perfis 4-way e campo Instagram aprovado pelo Codex Web.",
    commit: "4d8357a",
  },
  {
    date: "2026-07-13",
    event: "Hero visual aprovado pelo Codex Web: gota (vai-e-vem), órbitas, efeito de átomo, glow orgânico.",
    commit: "d06b5c1",
  },
  {
    date: "2026-07-13",
    event: "Cards de perfil interativos aprovados: grid 2 colunas, ícones, hover com ArrowRight.",
    commit: "d06b5c1",
  },
  {
    date: "2026-07-13",
    event: "Headline do hero atualizada: 'Do planejamento ao resultado, tudo trabalha junto.'",
    commit: "4d8357a",
  },
  {
    date: "2026-07-13",
    event: "Sprint V2.1: auditoria de motores open source (LidoJS, CE.SDK, Chatwoot, Postiz), fundação de providers TypeScript, feature flags, vertical slice EditorOS, propostas SQL 86-89.",
    commit: "sprint-v2.1",
  },
];

// ── Bloqueadores de banco ─────────────────────────────────────
export interface SQLBlocker {
  number: number;
  label: string;
  file: string;
  status: "executed" | "failed" | "pending" | "created" | "partial_unknown" | "not_executed";
  errorCode?: string;
  errorMessage?: string;
  affectedAreas: string[];
  fix?: string;
  fixFile?: string;
  fixStatus?: "created" | "pending_execution";
  rootCause?: string;
  bankAltered: boolean;
}

export const SQL_BLOCKERS: SQLBlocker[] = [
  {
    number: 82,
    label: "Especialidades e comentários de tarefas",
    file: "docs/supabase/82-team-specialties-and-task-comments.sql",
    status: "failed",
    errorCode: "42703",
    errorMessage: "column \"is_internal\" does not exist",
    affectedAreas: ["task_comments"],
    fix: "SQL 85 — BLOCO 1",
    fixFile: "docs/supabase/85-fix-team-comments-and-work-sessions.sql",
    fixStatus: "created",
    rootCause: "operational_task_comments pré-existia sem a coluna is_internal. CREATE TABLE IF NOT EXISTS pulou a recriação.",
    bankAltered: false,
  },
  {
    number: 84,
    label: "Time tracking e previsão de entrega",
    file: "docs/supabase/84-project-effort-and-sessions.sql",
    status: "failed",
    errorCode: "42703",
    errorMessage: "column \"profile_id\" does not exist",
    affectedAreas: ["project_time_tracking"],
    fix: "SQL 85 — BLOCO 2",
    fixFile: "docs/supabase/85-fix-team-comments-and-work-sessions.sql",
    fixStatus: "created",
    rootCause: "work_sessions pré-existia sem a coluna profile_id. Índice ws_profile_idx e políticas RLS falharam.",
    bankAltered: false,
  },
  {
    number: 85,
    label: "Correção: is_internal + profile_id e recriação de políticas RLS",
    file: "docs/supabase/85-fix-team-comments-and-work-sessions.sql",
    status: "not_executed",
    affectedAreas: ["task_comments", "project_time_tracking"],
    fixStatus: "created",
    rootCause: "Criado como patch idempotente: ADD COLUMN IF NOT EXISTS + DROP/CREATE de policies.",
    bankAltered: false,
  },
  {
    number: 86,
    label: "Foundation de integrações genéricas",
    file: "docs/supabase/86-integration-foundations.sql",
    status: "partial_unknown",
    affectedAreas: ["integration_connections", "provider_user_links"],
    rootCause: "Historico indica tentativa parcial; catalogo live nao foi auditado nesta rodada.",
    bankAltered: false,
  },
  {
    number: 87,
    label: "Foundation de design/editor",
    file: "docs/supabase/87-design-provider-foundations.sql",
    status: "partial_unknown",
    affectedAreas: ["editor_os", "design_projects", "design_versions"],
    fix: "SQL 90 tentado como reconciliacao — falhou. Nao re-executar.",
    fixFile: "docs/supabase/90-reconcile-partial-foundations.sql",
    fixStatus: "pending_execution",
    rootCause: "Arquivo local contem constraints inconsistentes NOT NULL + ON DELETE SET NULL e unique ausente em design_versions.",
    bankAltered: false,
  },
  {
    number: 88,
    label: "Foundation de conversas externas",
    file: "docs/supabase/88-conversation-links.sql",
    status: "partial_unknown",
    affectedAreas: ["crm_inbox", "conversation_links"],
    rootCause: "Historico indica tentativa parcial; catalogo live nao foi auditado nesta rodada.",
    bankAltered: false,
  },
  {
    number: 89,
    label: "Foundation de publicações sociais",
    file: "docs/supabase/89-scheduled-publications.sql",
    status: "partial_unknown",
    affectedAreas: ["social_scheduler", "scheduled_publications"],
    rootCause: "Historico indica tentativa parcial; catalogo live nao foi auditado nesta rodada.",
    bankAltered: false,
  },
  {
    number: 90,
    label: "Reconciliação de foundations parciais (87-89)",
    file: "docs/supabase/90-reconcile-partial-foundations.sql",
    status: "failed",
    affectedAreas: ["editor_os", "crm_inbox", "social_scheduler"],
    rootCause: "Tentado/executado e falhou. Arquivo contém rollback final. Não re-executar.",
    bankAltered: false,
  },
];

// ── Estimativa de esforço restante (cotação) ──────────────────
export const EFFORT_ESTIMATE = {
  scopeRemaining: [
    "Meta QA completo e possíveis correções",
    "Asaas Sandbox — setup, homologação e QA",
    "SQL 85 — execução e validação de RLS",
    "Task assignment UI",
    "Comentários operacionais (task_comments após SQL 85)",
    "REC OS — board de referências",
    "CRM — modal de detalhes do lead",
    "UTMs — tracking melhorado",
    "QA final de todas as áreas V1",
  ],
  hoursMin: 32,
  hoursLikely: 48,
  hoursMax: 70,
  qaHoursMin: 8,
  qaHoursMax: 14,
  confidence: "média" as const,
  recalcTriggers: [
    "Após execução do SQL 85",
    "Quando Asaas Sandbox estiver disponível",
    "Após QA completo da Meta multiconexão",
    "Se novas funcionalidades entrarem no escopo V1",
  ],
} as const;

// ── Helpers ───────────────────────────────────────────────────
export function getAreasByPhase(phase: AreaPhase): ProjectAreaStatus[] {
  return PROJECT_AREAS.filter((a) => a.phase === phase);
}

export function getBlockedAreas(): ProjectAreaStatus[] {
  return PROJECT_AREAS.filter((a) => a.readiness === "blocked" && a.phase === "v1");
}

export function getQaPendingAreas(): ProjectAreaStatus[] {
  return PROJECT_AREAS.filter((a) => a.readiness === "qa_pending" && a.phase === "v1");
}

export function getValidatedAreas(): ProjectAreaStatus[] {
  return PROJECT_AREAS.filter((a) => a.readiness === "validated" && a.phase === "v1");
}
