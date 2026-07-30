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
    description: "/admin/contentos é a central operacional cross-cliente (cards, atenção, resumo por cliente, ações rápidas), com navegação única (ContentosSubNav, 8 itens) e seletor de cliente pesquisável. Sprint 4.0A.1 corrigiu a divergência de contexto (faixa superior usava fallback de localStorage e podia mostrar um cliente diferente do selecionado na URL) e os destinos dos cards.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-23",
    notes: "Branch fix/rec-os-global-navigation, mergeada em main em 2026-07-23 (release canônica 1.0). tsc, build e ESLint passam limpos. Isolamento entre clientes verificado apenas em nível de código — sem QA em navegador real com os dois clientes reais (Duh Lanches, O Pedreirão) ainda. Hotfix canônico 1.0.1 (sprint local): corrigido o mismatch de hidratação (React #418) em formatDate() deste arquivo, causado por toLocaleDateString sem timeZone explícito — ver production_hydration_stability. Pendência registrada na sprint feat/meu-negocio-stock-restaurant-v1 (nenhum código REC OS tocado, apenas observação durante a auditoria visual do dashboard): (1) dois nomes 'REC OS' aparecem no dashboard, um deles deveria representar outro módulo; (2) o calendário interno da REC OS navega para o calendário global em vez de permanecer dentro da própria REC OS — os dados podem refletir no calendário global sem reutilizar a mesma rota visual. Branch futura recomendada: fix/rec-os-dashboard-calendar-routing-v1.",
    next_actions: ["QA local (Codex Web): reload repetido em /admin/contentos com e sem client, confirmar ausência de React #418 no console", "Futuro: abrir fix/rec-os-dashboard-calendar-routing-v1 para corrigir a duplicidade de nomes REC OS no dashboard e o roteamento do calendário interno"],
  },
  {
    id: "rec_os_clickable_dashboard",
    name: "REC OS — Cards clicáveis",
    category: "operacional",
    description: "Os 8 cards da Central Global (aguardando aprovação, em produção, em revisão, alterações solicitadas, agendados, publicados, em andamento, clientes com pendências) levam a rotas reais existentes.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-23",
    notes: "Sprint 4.0A.1 corrigiu o P1 relatado (card 'Aguardando aprovação' apontava para /admin/calendario em vez de Aprovações). Hotfix canônico 1.0.1 (sprint local): corrigido um P1 novo do QA autenticado de Production — sem cliente selecionado, aprovacoes/producao/resultados redirecionavam ao seletor; agora as três suportam modo global de verdade (nunca redirecionam), então todo card aponta direto para sua página real, com ou sem cliente. 'Conteúdos em andamento' foi corrigido de Resultados (só agregados) para Produção (lista de verdade) — sem filtro de status, porque o conjunto 'em andamento' é mais amplo que qualquer filtro único que Produção aceita hoje.",
    next_actions: ["QA local (Codex Web): clicar em cada card sem cliente selecionado e confirmar que abre a página real (não mais o Calendário como substituto)"],
  },
  {
    id: "rec_os_global_client_filter",
    name: "REC OS — Filtro global de cliente",
    category: "operacional",
    description: "Seletor de cliente pesquisável no topo da Central Global usa a URL (?client=<uuid>) como única fonte de verdade; client inválido é tratado como 'todos os clientes' e nunca usado em consulta.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-23",
    notes: "Sprint 4.0A.1: <select> nativo substituído por combobox pesquisável (busca, navegação por teclado, sem biblioteca nova) — necessário porque o select simples não escala para dezenas/centenas de clientes. 'Trocar cliente' na faixa superior (src/app/admin/_layout-client.tsx) agora abre esse mesmo seletor via /admin/contentos?clientPicker=open, em vez de levar para a rota separada /admin/contentos/selecionar-cliente. Corrigido também o bug de origem: a faixa superior lia um fallback de localStorage quando a URL não tinha client, o que podia mostrar um cliente de uma sessão anterior mesmo com 'todos os clientes' selecionado — a URL agora é a única fonte, sem fallback. Hotfix canônico 1.0.1: mesmo princípio (URL é a única fonte) aplicado a /admin/contentos/selecionar-cliente (já era um alias) e agora também a Criar e EditorOS, que ganharam seletor inline pesquisável próprio (src/components/inline-client-picker.tsx) em vez de redirecionar.",
  },
  {
    id: "rec_os_global_approvals",
    name: "REC OS — Aguardando aprovação (visão global)",
    category: "operacional",
    description: "Card 'Aguardando aprovação' na Central Global conta content_items.status = enviado_aprovacao em todos os clientes visíveis (ou só no cliente selecionado), e agora abre Aprovações (ou a lista de atenção do Hub, sem cliente), nunca o Calendário.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-23",
    notes: "Contagem por src/lib/rec-os-hub.ts (bucketContentStatus). Não substitui nem altera /admin/contentos/aprovacoes — só passa a preservar client e um status inicial na URL. Hotfix canônico 1.0.1: /admin/contentos/aprovacoes agora suporta modo global (sem client, mostra aprovações de todos os clientes autorizados, cada linha rotulada com o nome do cliente); o card usa a mesma rota com ou sem cliente selecionado.",
  },
  {
    id: "rec_os_global_production",
    name: "REC OS — Em produção (visão global)",
    category: "operacional",
    description: "Card 'Em produção' na Central Global conta content_items.status em {producao, em_producao, edicao} em todos os clientes visíveis (ou só no cliente selecionado).",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-23",
    notes: "Contagem por src/lib/rec-os-hub.ts (bucketContentStatus). 'em_producao' é alias legado de 'producao' observado em produção/resultados/page.tsx — mantido como sinônimo para não subcontar. Não substitui nem altera /admin/contentos/producao — só passa a aceitar `?status=` para filtrar a lista quando vem de um card do Hub. Hotfix canônico 1.0.1: /admin/contentos/producao agora suporta modo global (sem client, mostra produção de todos os clientes autorizados, cada card/linha rotulado com o nome do cliente); o card usa a mesma rota com ou sem cliente selecionado.",
  },
  {
    id: "production_route_integrity",
    name: "Integridade das rotas — Production",
    category: "conteudo",
    description: "As subrotas do REC OS (Produção, Aprovações, Resultados) não redirecionam mais ao seletor de cliente quando não há `?client=` — passam a suportar modo global ('todos os clientes'). Criar/Radar/EditorOS ganharam landing própria (seletor inline) em vez de redirect. /admin/contentos/calendario virou um alias que redireciona para o Calendário Global canônico. /admin/contentos/selecionar-cliente virou um alias para o hub com o seletor aberto.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-23",
    notes: "Hotfix canônico 1.0.1, sprint local, ainda não publicado em Production no momento deste registro. QA autenticado anterior em Production (dpl_3q5h6ZyxBSy6P5TQj1VFU7cZWg4w) reportou P1: subrotas do REC OS redirecionavam ao seletor sem cliente, e o EditorOS não abria diretamente sem parâmetros. Corrigido nesta sprint local; QA local ainda pendente antes de qualquer novo merge/push.",
    next_actions: ["QA local (Codex Web): confirmar que /admin/contentos/producao, /aprovacoes e /resultados abrem em modo global sem client, que /admin/contentos/criar e /admin/contentos/editor-os mostram o seletor inline sem redirecionar, e que /admin/contentos/calendario redireciona preservando client/source"],
  },
  {
    id: "production_hydration_stability",
    name: "Estabilidade de hidratação — Production",
    category: "conteudo",
    description: "React #418 (hydration mismatch) reportado em QA autenticado de Production. Causa real encontrada: src/app/admin/contentos/_hub-client-content.tsx formatava datas com toLocaleDateString('pt-BR') sem timeZone explícito — o dia/mês dependia do fuso do runtime (servidor em UTC, navegador local), produzindo texto diferente entre SSR e hidratação para datas próximas da meia-noite local.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-23",
    notes: "Corrigido fixando timeZone: 'America/Fortaleza' (mesmo fuso já usado em src/app/contentos/aprovacoes/_client-content.tsx para o mesmo tipo de bug). Auditoria completa das 8 rotas relatadas no QA (meu-negocio, contentos, radar, producao, aprovacoes, resultados, status, editor-os) não encontrou nenhuma outra fonte real de mismatch — os demais candidatos (Date.now()/Math.random()/localStorage) já seguiam o padrão seguro (useState inicial determinístico + useEffect, ou execução restrita a Server Components/dynamic ssr:false). QA local ainda pendente para confirmar ausência do erro em build de Production local.",
    next_actions: ["QA local: build de Production local (npm run build && npm run start), reload repetido nas 8 rotas, confirmar console sem React #418/hydration mismatch"],
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
    last_updated: "2026-07-23",
    notes: "Já em main desde a release canônica 1.0 (mergeado via fix/product-engineering-usability-v1). Nenhuma LLM conectada, nenhum preenchimento automático como fato. Hotfix 1.1.1: os 4 quadrantes passaram a ser agrupados visualmente sob dois títulos explícitos (Ambiente interno / Ambiente externo) com explicação — estrutura dos itens em si não foi alterada. Hotfix canônico 1.0.1: confirmado que o agrupamento já existia e renderiza corretamente; só o texto de 'Ambiente externo' foi ajustado para bater exatamente com a redação oficial ('do mercado e do contexto').",
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
    id: "meu_negocio_market_benchmark_pricing_v1",
    name: "Mercado, Preço e Mix de Vendas V1",
    category: "admin",
    description: "Pesquisa manual/importada revisável, benchmark configurável, comparabilidade, estratégias de preço, canais, preço realizado e efeito do mix integrados à Central de CMV.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    blockers: ["Dados reais pendentes", "Persistência pendente", "QA visual autenticado pendente"],
    next_actions: ["Executar QA visual em 390 px, tablet e desktop", "Validar fluxo local de inclusão e revisão de amostras"],
    risk: "low",
    last_updated: "2026-07-27",
    notes: "Demonstração Duh Lanches somente com dados simulados e Concorrente A/B/C. Mercado é referência, nunca ordem automática. Sem SQL, Supabase, Auth, scraping ou persistência.",
  },
  {
    id: "meu_negocio_command_center_ai_v1",
    name: "Meu Negócio — Centro de Comando e Assistente V1",
    category: "admin",
    description: "Dashboard executivo, cards clicáveis, rastreabilidade por fonte/período/fórmula, catálogo de produtos e fichas, evolução do CMV, auditoria OlaClick e Assistente Lokat server-side com saída estruturada.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    blockers: ["Dados reais e persistência pendentes", "QA visual autenticado pendente", "OpenAI depende de variáveis server-side"],
    next_actions: ["Executar QA visual em 390, 768, 1024 e 1440 px", "Validar Assistente sem e com configuração server-side"],
    risk: "low",
    last_updated: "2026-07-27",
    notes: "Somente demonstração em memória nesta branch. IA não calcula nem altera dados; store=false, sem web search. OlaClick auditada sem inventar conexão ou prova runtime. Sem SQL, Supabase, Auth, dado real ou deploy. V1_PROGRESS=81 e V2_PROGRESS=12 preservados.",
  },
  {
    id: "meu_negocio_dashboard_design_system_v1",
    name: "Meu Negócio — Navegação e design profissional do Centro de Comando V1",
    category: "admin",
    description: "Oito áreas principais, subnavegação contextual, Produtos e Fichas unificados, Estoque e Compras unificados, design tokens locais, Centro de Comando executivo e cascata de resultado gerencial.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    blockers: ["QA visual autenticado em 390, 768, 1024 e 1440 px pendente"],
    next_actions: ["Executar QA visual autenticado local", "Validar navegação por teclado, gráficos e drawers em navegador real"],
    risk: "low",
    last_updated: "2026-07-28",
    notes: "Somente reorganização e apresentação local. Fórmulas, integrações, OpenAI, Supabase, Auth e persistência não foram alterados. OlaClick permanece não testada. Nenhuma nova dependência. V1_PROGRESS=81, V2_PROGRESS=12 e global_calendar=qa_pending preservados.",
  },
  // ── Workspaces 1.0 (branch feat/workspace-panels-v1) ──────────────────────
  // Nenhum usuário, cliente ou registro real foi criado nesta sprint.
  {
    id: "workspace_role_architecture",
    name: "Workspaces — Arquitetura de superfícies e papéis",
    category: "admin",
    description: "Modelo conceitual Workspace/WorkspaceType/WorkspaceSurface/WorkspaceMembership/WorkspaceRelationship (src/lib/workspaces/types.ts), mapeado sobre as tabelas e papéis reais já existentes (profiles.role, clients, agency_workspaces, agency_clients) — não uma estrutura paralela.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-23",
    notes: "Somente na branch feat/workspace-panels-v1. Auditoria prévia encontrou três vocabulários de papel/tipo de conta não sincronizados (access-control.ts, account-permissions.ts, account-types.ts) — este módulo não os substitui, fica acima deles.",
    next_actions: ["QA local: confirmar que a resolução de contexto não quebra nenhum papel existente"],
  },
  {
    id: "workspace_capability_matrix",
    name: "Workspaces — Registro central de capacidades",
    category: "admin",
    description: "src/config/workspace-capabilities.ts substitui checagens dispersas 'role === x' por um resolver central (resolveCapabilities/hasCapability) e marca quais capacidades são mutáveis (isMutatingCapability) para o enforcement de somente leitura.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-23",
    notes: "Somente na branch feat/workspace-panels-v1. Não substitui as checagens existentes em access-control.ts/account-permissions.ts nesta sprint — novas telas passam a usar o registro central; páginas já existentes não foram retrofitadas.",
  },
  {
    id: "super_admin_view_switcher",
    name: "Workspaces — Seletor 'Visualizar como' do Super Admin",
    category: "admin",
    description: "Dois controles no header (Painel ADM / Visualizar como) visíveis somente para super_admin, ao lado do sino — src/components/workspaces/workspace-view-switcher.tsx. Nunca troca sessão, cookie de auth ou token; entra/sai de preview via POST/DELETE em /api/admin/workspaces/preview, que grava um cookie HttpOnly assinado — a URL não carrega mais nenhum parâmetro de autorização.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-24",
    notes: "Somente na branch hotfix/workspaces-isolation-mobile-v1. Usuário comum, agência e cliente da agência não veem o switcher (gate único: userRole === 'super_admin', mesmo padrão já usado pelo widget de Status V1). Hotfix 1.0.1: removido o useEffect que buscava opções de entidade. Hotfix 1.0.2 (Fase 16): falha ao entrar em preview não fecha mais o menu silenciosamente. Hotfix 1.0.4 tentou caber Painel ADM/Visualizar como na mesma linha do header via cálculo de pixel (busca w-32 + menu 'Mais' para CRM/Status V1) — o QA local em 390×844 reprovou os dois de novo. Hotfix 1.0.5: solução mais robusta (Opção C do ticket) — os dois controles ganharam uma barra dedicada, só deles, abaixo do header, visível apenas em mobile (md:hidden), sem disputar espaço com busca/sino/CRM/Status V1/avatar; o menu 'Mais' foi removido, CRM e Status V1 voltaram a ser sempre visíveis no header normal. Também corrigido nesta sprint: o dropdown do switcher (w-72) alinhado à direita da nova barra (justify-end, não center) para não estourar a borda esquerda em 390px; adicionado aria-label, Escape-para-fechar e retorno de foco ao gatilho. Mensagens do seletor agora distinguem 5 estados (carregando/lista/vazio-blueprint/vazio-real/erro) — erro HTTP nunca mais vira lista vazia silenciosa.",
    next_actions: ["QA local: confirmar ausência do switcher para papéis não super_admin", "QA visual em 390×844 (sem navegador neste ambiente — pendente para o próximo QA): confirmar a barra dedicada e o dropdown do switcher dentro da viewport"],
  },
  {
    id: "workspace_preview_security",
    name: "Workspaces — Segurança do modo de visualização",
    category: "admin",
    description: "src/lib/workspaces/context.ts resolve o preview inteiramente no servidor a cada request, a partir de um cookie HttpOnly assinado (HMAC, src/lib/workspaces/preview-session.ts) — nunca da query string. Revalida a cada leitura: usuário atual, papel super_admin, existência do workspace e relacionamento ativo. Fail-closed — qualquer combinação inválida ou expirada retorna 'invalid'/'expired'/'revoked', nunca um preview padrão.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-26",
    notes: "Somente na branch hotfix/workspaces-isolation-mobile-v1. Hotfix 1.0.1 fechou a lacuna do readOnly enviado pelo chamador. Hotfix 1.0.2 isolou a chave de assinatura. Hotfix 1.0.4 corrigiu o P0 de dados reais aparecendo como 'empresa direta' e o P1 do 'Atendido por: —'. Hotfix 1.0.5 encontrou a causa raiz de um P1 diferente do QA local seguinte: os TRÊS blueprints (Agência, Cliente, Empresa) retornavam 'Nenhum registro encontrado' — não porque a lógica de fixtures estivesse errada, mas porque /api/admin/workspaces exigia hasSupabaseServiceRoleKey() ANTES de olhar para surface/source, para toda superfície, inclusive as blueprint-only que nunca deveriam precisar de Supabase. SUPABASE_SERVICE_ROLE_KEY não está configurada neste .env.local (confirmado por grep, 0 ocorrências) — todo GET batia em 503, e o switcher convertia isso em lista vazia silenciosa. Corrigido com um contrato explícito ?source=blueprint|real (padrão: blueprint) — blueprint nunca mais depende de service role key nem consulta Supabase; real continua exigindo ambos. WorkspaceOption ganhou os campos completos (surface, source, parentWorkspaceId/Name, relationshipType, status, readOnly). Hotfix 1.0.6: um QA local confirmou Super Admin autenticado, sidebar e topbar CRM carregando normalmente em /admin/dashboard, mas 'Painel ADM'/'Visualizar como' nunca apareciam. Investigação (não apenas CSS): WorkspaceViewSwitcher e WorkspaceExitButton sempre estiveram corretamente importados e renderizados no único shell real (src/app/admin/_layout-client.tsx, usado por src/app/admin/layout.tsx — nenhum shell duplicado ou órfão existe). A causa real era a resolução de papel: _layout-client.tsx lia profiles.role sozinho, sem fallback, e retornava cedo quando o profile vinha nulo — deixando userRole preso em null para sempre. src/proxy.ts (o gate real que já deixou esse mesmo usuário chegar a /admin/dashboard) e o redirect de login já usam profile.role ?? user_metadata.role ?? app_metadata.role há tempos, exatamente porque uma conta real pode ter profiles.role nulo/desatualizado com o metadata de Auth correto. Corrigido replicando esse mesmo fallback em _layout-client.tsx. Hotfix 1.0.7 (segunda causa raiz, a mesma sintomatologia): o fallback do 1.0.6 ainda dependia de um fetch client-side (auth.getUser() + consulta a profiles) rodando dentro de um useEffect, cuja falha era engolida por um catch {} — quando esse fetch falhava ou demorava, userRole continuava null e os mesmos controles voltavam a sumir, sem nenhum erro visível. Corrigido eliminando essa dependência: src/lib/access-control.ts ganhou resolveEffectiveUserRole() — o único resolvedor puro e canônico, com a mesma precedência (profile.role → user_metadata.role → app_metadata.role → null), agora compartilhado por src/proxy.ts, o redirect de login e src/app/admin/layout.tsx. O layout do admin resolve o papel inteiramente no servidor (mesma sessão já autenticada) e passa initialUserRole como prop para AdminLayoutShell, que inicializa seu estado diretamente dele — a primeira renderização (servidor e cliente) já reflete o papel correto, sem esperar nenhum efeito. A consulta client-side remanescente busca somente nome/avatar (nunca mais papel) e seu catch agora registra um aviso sanitizado (sem e-mail, id, token ou payload) em vez de falhar em silêncio. QA Production 1.0.7 confirmou P0 = 0 (sessão Super Admin real, Painel ADM, Visualizar como, WorkspaceViewSwitcher, Status V1, os três blueprints, agência pai, Duh/Pedreirão ausentes dos seletores, sem React #418/hydration/500/503/segredo exposto) mas achou dois novos problemas: P1 — trocar de blueprint só refletia após reload manual; P2 — sair do preview podia deixar a URL em /admin/visualizar. Hotfix 1.0.8: causa raiz do P1 confirmada lendo src/app/api/admin/workspaces/preview/route.ts — as duas respostas de sucesso sempre retornam destination:\"/admin/visualizar\", o mesmo pathname fixo; como o usuário trocando de blueprint já está nessa rota, router.push(destination) virava um no-op de mesma URL no App Router, e mesmo na primeira ativação (dashboard → /admin/visualizar) o layout compartilhado (src/app/admin/layout.tsx) podia continuar servido do Router Cache do cliente, que não tem visibilidade de que o cookie de preview mudou no servidor. A saída (workspace-exit-button.tsx) tinha a mesma lacuna: o DELETE limpa o cookie no servidor, mas um router.push() puro não dava ao cliente nenhum motivo para reexecutar aquele mesmo layout compartilhado. Corrigido chamando router.refresh() logo depois de router.push() nos dois componentes (workspace-view-switcher.tsx e workspace-exit-button.tsx) — router.refresh() é o único primitivo do App Router que de fato invalida o Router Cache e força os server components da rota atual (o layout incluído) a reexecutar contra o cookie atual, independente de a URL ter mudado ou não. QA Production 1.0.8 confirmou P0 = 0 novamente (commit ecea95c publicado, sessão Super Admin, Painel ADM, Visualizar como, três blueprints, agência pai, Duh/Pedreirão ausentes, sem React #418/hydration/500/503/token exposto, troca de blueprint já funcionando sem F5) mas achou: (a) stale visual na SAÍDA — banner e painel anterior podiam permanecer visíveis até refresh; (b) um problema mais sério no próprio código: a navegação de saída rodava dentro de um bloco finally, incondicionalmente — se o DELETE falhasse, a URL ainda mudava para /admin/dashboard enquanto o cookie de preview continuava ativo no servidor, um estado inconsistente; (c) latência de 4-7s ao trocar blueprint. Hotfix 1.0.9: causa da corrida e da latência — router.push() e router.refresh() são DOIS round-trips separados do App Router (uma navegação soft, depois um refetch RSC independente da mesma árvore), empilhados sobre os próprios efeitos client-side do layout (busca de nome, busca de notificações) reexecutando de novo por cima disso — três fases de trabalho assíncrono que o usuário via como uma única pausa longa sem retorno visual. Decisão de arquitetura: troca de workspace é uma fronteira de contexto privilegiado, equivalente a troca de tenant — não uma navegação comum. router.push()/router.refresh() foram REMOVIDOS por completo (useRouter nem é mais importado) dos dois componentes (workspace-view-switcher.tsx, workspace-exit-button.tsx) e substituídos por exatamente uma navegação real de documento — window.location.assign(destination) na ativação, window.location.replace(\"/admin/dashboard\") na saída — disparada somente após validar res.ok + body.ok + (na ativação) a igualdade exata com o único destination permitido. A navegação de saída deixou de existir dentro de finally: em qualquer falha do DELETE, nada navega, o preview permanece visível, e uma mensagem sanitizada com nova tentativa aparece. Ambos os fluxos ganharam proteção contra duplo clique (if (entering/exiting) return;) e um overlay de estado (\"Trocando ambiente...\" / \"Saindo da visualização...\"). As respostas do POST e do DELETE ganharam Cache-Control: no-store; o formato do cookie (HttpOnly, assinatura, Secure em Production) não foi alterado. Guard HTTP 403 e QA mobile real continuam pendentes (mesmo roteiro sanitizado do hotfix 1.0.8, rota /api/admin/contentos/drafts reutilizada, nenhuma rota nova). Hotfix 1.0.10 — QA Production 1.0.9 confirmou P0 = 0 (READY, commit correto, domínio oficial, sessão Super Admin real, Visualizar como, os três blueprints, troca Agência→Cliente/Cliente→Empresa/Empresa→Agência sem F5, overlay 'Trocando ambiente...', banner correto, Duh/Pedreirão ausentes, sem React #418/hydration/500/503) mas achou um P1 real na SAÍDA: a URL mudava para /admin/dashboard mas o banner e o botão 'Sair da visualização' permaneciam no DOM até um refresh manual. Causa raiz real, encontrada nesta sprint: NÃO era (só) uma corrida entre o Set-Cookie do DELETE e a navegação — era que workspace-preview-banner.tsx tinha seu PRÓPRIO botão de saída ('Sair da visualização', o controle de fato clicado durante um preview ativo), com sua própria função exit() nunca tocada pelo hotfix 1.0.9: ainda chamava fetch(DELETE) dentro de um try com a navegação (router.push) incondicional dentro de finally — exatamente a classe de bug que 1.0.9 achava ter eliminado, só que em um segundo controle de saída duplicado e desalinhado (workspace-exit-button.tsx, o botão 'Painel ADM', foi o único corrigido em 1.0.9). Decisão de arquitetura: a saída deixou de ser fetch()+navegação client-side inteiramente — agora é uma transação HTTP única: um <form method=\"post\" action=\"/api/admin/workspaces/preview/exit\"> real, atendido por um endpoint dedicado (src/app/api/admin/workspaces/preview/exit/route.ts) que resolve o papel canônico no servidor (getCurrentUser + profiles.role === super_admin, nunca confia em nada do cliente), apaga o cookie de preview e retorna HTTP 303 para /admin/dashboard NA MESMA resposta (src/lib/workspaces/atomic-exit.ts) — Set-Cookie e Location saem juntos, então não existe mais uma segunda requisição para competir com a primeira. Falhas (sem sessão, papel não é mais super_admin) nunca tocam o cookie e apenas redirecionam para um destino seguro (/login ou /admin/dashboard), sem fingir que uma saída aconteceu. Ambos os controles de saída (workspace-exit-button.tsx e workspace-preview-banner.tsx) foram migrados para esse mesmo <form>, eliminando a duplicação de lógica que causou o P1. A rota antiga DELETE /api/admin/workspaces/preview permanece inalterada (ainda usada por clear-invalid-preview-cookie.tsx, um caso de uso legítimo e diferente — limpeza best-effort de cookie já inválido/expirado). Hotfix 1.0.11 — QA Production 1.0.10 pelo Claude Web executou os dois controles reais (Sair da visualização e Painel ADM); ambos navegaram para /api/admin/workspaces/preview/exit mas receberam 403 {\"error\":\"Esta ação está indisponível no modo de visualização.\",\"code\":\"WORKSPACE_PREVIEW_READ_ONLY\"} — sem 303, sem remoção de cookie, sem saída. Causa raiz: src/proxy.ts (defesa em profundidade contra mutações durante preview) mantém sua própria allowlist de exceções em runtime (MUTATION_GUARD_EXEMPT_PATHS), completamente separada da classificação usada por scripts/check-workspace-mutation-coverage.ts (só análise estática de arquivos, sem nenhum efeito em produção). O hotfix 1.0.10 classificou a nova rota /api/admin/workspaces/preview/exit apenas nesse script — nunca a adicionou à allowlist real do proxy, que a bloqueava como qualquer outra mutação de negócio sob /api/admin/, antes mesmo de a requisição alcançar o route handler. Corrigido com uma exceção exata e testável: isWorkspacePreviewControlMutation() (src/lib/workspaces/mutation-guard-runtime.ts, módulo puro sem dependência de next/server) libera SOMENTE method === \"POST\" && pathname === \"/api/admin/workspaces/preview/exit\" — nenhum prefixo, substring, trailing slash ou outro verbo nesse mesmo path. A decisão inteira do guard (shouldBlockMutationInPreview()) foi extraída de src/proxy.ts para esse mesmo módulo, que agora é a única fonte de verdade tanto para o proxy quanto para os testes — proxy.ts não mantém mais cópias locais de MUTATION_GUARD_EXEMPT_PATHS/MUTABLE_API_NAMESPACES. O endpoint de saída em si (autenticação, papel super_admin, Set-Cookie+303 na mesma resposta) não foi alterado. QA Production 1.0.11 pendente.",
    next_actions: ["QA Production 1.0.11 (Claude Web): confirmar que 'Sair da visualização' e 'Painel ADM' agora completam a saída (303 → /admin/dashboard, cookie removido, sem 403 WORKSPACE_PREVIEW_READ_ONLY)", "QA mobile real e comprovação do guard HTTP 403 em rota empresarial durante preview ativo continuam pendentes"],
  },
  {
    id: "agency_workspace_shell",
    name: "Workspaces — Shell do painel da Agência",
    category: "admin",
    description: "Painel da agência reaproveita o layout admin existente (/admin/*) com capacidades agency.* — não uma aplicação separada. Nesta sprint, renderizado dentro do preview (/admin/visualizar) com links para REC OS/Relatórios/Equipe reais; carteira de clientes ainda é um estado vazio honesto.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-25",
    notes: "Somente na branch hotfix/workspaces-isolation-mobile-v1. Não lê agency_clients para popular uma carteira real ainda — próxima ação depende do provisionamento (docs/workspace-provisioning-plan.md). Hotfix 1.0.5: corrigido o bug que fazia a Agência de Teste (Blueprint) retornar 'Nenhum registro encontrado' no seletor — causa era o endpoint do picker exigir service role key para toda superfície, mesmo a puramente demonstrativa; ver workspace_preview_security. Hotfix 1.0.6: os controles de entrada no preview (Painel ADM / Visualizar como) voltaram a aparecer para o Super Admin real neste shell — causa raiz e correção detalhadas em workspace_preview_security.",
    next_actions: ["Ler agency_clients para popular a carteira de clientes real da agência, uma vez que existam registros reais"],
  },
  {
    id: "agency_client_portal",
    name: "Workspaces — Portal do cliente da agência",
    category: "admin",
    description: "O portal do cliente da agência é o /client/* já existente (Início, Conteúdos, Aprovações, Calendário, Resultados, Financeiro, Arquivos, Solicitações, Suporte, Configurações) — não uma segunda implementação. Nesta sprint, o preview do Super Admin identifica a agência responsável e aplica as capacidades client_portal.*.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-23",
    notes: "Somente na branch hotfix/workspaces-isolation-mobile-v1. O /client/* real não foi alterado — só o preview (/admin/visualizar) aponta para lá com o client_id resolvido. Hotfix 1.0.4: corrigido o banner mostrando 'Atendido por: —' para o Cliente de Teste 02 (blueprint). Hotfix 1.0.5: corrigido o bug que fazia o picker do Cliente de Teste 02 retornar 'Nenhum registro encontrado' (mesma causa raiz do serviço role key exigido cedo demais, ver workspace_preview_security); Cliente de Teste 02 agora carrega parentWorkspaceId/Name e relationshipType corretos desde a própria resposta do picker, não só depois de entrar no preview.",
  },
  {
    id: "direct_business_workspace",
    name: "Workspaces — Shell da Empresa/Autônomo direta",
    category: "admin",
    description: "Empresa direta reaproveita o mesmo layout admin (/admin/*) com capacidades business.* — sem carteira de clientes, sem produção multicliente, sem portal de clientes. Diferenciação hoje é só de capacidade, não de rota.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-24",
    notes: "Somente na branch hotfix/workspaces-isolation-mobile-v1. Nota corrigida no hotfix 1.0.4: a versão anterior dizia 'testável via preview de um cliente real marcado como não vinculado a nenhuma agência' — essa era exatamente a inferência que causou o P0 do QA da 1.0.3. Hotfix 1.0.5: corrigido um segundo bug que impedia até o blueprint de aparecer — Empresa/Autônomo de Teste (Blueprint) retornava 'Nenhum registro encontrado' porque o picker exigia service role key mesmo para esta superfície, que nunca deveria precisar de Supabase (ver workspace_preview_security). Confirmado por teste automatizado (workspace-picker-source.test.ts) que o branco blueprint desta superfície nunca referencia hasSupabaseServiceRoleKey/adminDb.",
    next_actions: ["Não reabilitar workspace real nesta superfície sem um campo de classificação confiável aplicado ao banco"],
  },
  {
    id: "workspace_provisioning_plan",
    name: "Workspaces — Plano de provisionamento futuro",
    category: "admin",
    description: "docs/workspace-provisioning-plan.md documenta a sequência que o Codex Web executará após o QA: localizar a Duh Lanches real (nunca duplicá-la), vincular a uma agência de teste, criar o segundo cliente e a empresa direta de teste, e (se aplicável) o primeiro SupportAccessGrant real.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-23",
    notes: "Somente na branch feat/workspace-panels-v1. Nenhuma ação do plano foi executada nesta sprint — documento, não script. Hotfix 1.0.2: pré-condição reforçada — provisionamento real de SupportAccessGrant bloqueado até workspace_preview_mutation_enforcement estar validated.",
  },
  {
    id: "temporary_support_access",
    name: "Workspaces — Acesso de suporte temporário (SupportAccessGrant)",
    category: "admin",
    description: "Contrato de tipos (SupportAccessGrant, src/lib/workspaces/types.ts) e migration em rascunho (docs/supabase/DRAFT-support-access-grants.sql) para conceder acesso read_only, com expiração, a um workspace específico — em vez de acesso irrestrito implícito do Super Admin.",
    phase: "v2",
    readiness: "planned",
    qa: { status: "not_started" },
    last_updated: "2026-07-23",
    notes: "Somente na branch feat/workspace-panels-v1. Migration não aplicada, nenhum grant criado. Hotfix 1.0.1: rascunho alinhado ao vocabulário do enforcement real (created_by renomeado para granted_by_user_id, coluna updated_at adicionada) — condição explícita para liberar: nenhum SupportAccessGrant real antes de workspace_preview_mutation_enforcement estar aprovado.",
  },
  {
    id: "agency_client_real_provisioning",
    name: "Workspaces — Provisionamento real do cliente da agência (Duh Lanches)",
    category: "admin",
    description: "Vincular a Duh Lanches (registro real e existente) a uma agência de teste via agency_clients, sem duplicar o cadastro nem alterar o usuário existente.",
    phase: "v2",
    readiness: "planned",
    qa: { status: "not_started" },
    last_updated: "2026-07-23",
    notes: "Somente na branch feat/workspace-panels-v1. Nenhuma alteração feita na Duh Lanches nesta sprint — nem tenant, nem usuário, nem conexão.",
  },
  {
    id: "direct_business_real_provisioning",
    name: "Workspaces — Provisionamento real da empresa direta de teste",
    category: "admin",
    description: "Criar um registro de cliente de teste sem vínculo em agency_clients, representando uma empresa/autônomo que contratou a plataforma diretamente.",
    phase: "v2",
    readiness: "planned",
    qa: { status: "not_started" },
    last_updated: "2026-07-23",
    notes: "Somente na branch feat/workspace-panels-v1. Nenhum registro criado nesta sprint.",
  },

  // ── Workspaces 1.0.1 (mesma branch feat/workspace-panels-v1) ──────────────
  {
    id: "workspace_preview_mutation_enforcement",
    name: "Workspaces — Enforcement real de mutação em preview",
    category: "admin",
    description: "withMutationProtection/assertWorkspaceMutationAllowed (src/lib/workspaces/assert-not-preview.ts) bloqueiam mutações com 403 WORKSPACE_PREVIEW_READ_ONLY sempre que há preview ativo, derivado só do cookie assinado — nunca de um campo enviado pelo cliente. Hotfix 1.0.2: cobertura ampliada para 29 rotas reais (33 handlers) em Clientes, REC OS, Relatórios, Equipe, Integrações (OlaClick + Meta) e Financeiro (incluindo cupons e checkout de plataforma), mais uma camada de defesa em profundidade no proxy (src/proxy.ts) que bloqueia POST/PUT/PATCH/DELETE para 8 namespaces de API conhecidos sempre que o cookie de preview for válido — mesmo para uma rota futura que ainda não tenha o guard explícito.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-26",
    notes: "Somente na branch hotfix/workspaces-isolation-mobile-v1. Inventário completo em docs/workspace-mutation-inventory.md — toda rota mutável do projeto tem uma classificação, nenhuma ficou pending_protection. Nenhuma Server Action existe no projeto (grep '\"use server\"' vazio). Testes reais: 39 asserções de token + 10 E2E de proxy + 32 confirmando as 8 rotas exigidas pelo QA (403+WORKSPACE_PREVIEW_READ_ONLY+mensagem sanitizada, <1s) + 17 do hotfix 1.0.5 (workspace-picker-source.test.ts) + 12 no hotfix 1.0.6 (layout-shell.structural.test.ts) + 29 novas no hotfix 1.0.7 (access-control-role.test.ts + ampliação de layout-shell.structural.test.ts) + 18 no hotfix 1.0.8 (preview-navigation-sync.structural.test.ts, versão router.push+router.refresh) — hotfix 1.0.9 REESCREVEU esse mesmo arquivo para 25 asserções (window.location.assign/replace substituindo router.push/refresh). Hotfix 1.0.10 encontrou a causa raiz real do P1 de saída reportado pelo QA Production 1.0.9: NÃO era (só) uma corrida de cookie — era que workspace-preview-banner.tsx tinha seu próprio botão \"Sair da visualização\" com fetch(DELETE)+router.push() dentro de finally, nunca tocado pelo hotfix 1.0.9 (que só corrigiu workspace-exit-button.tsx). A saída passou a ser um <form method=\"post\"> real para um endpoint dedicado (POST /api/admin/workspaces/preview/exit, src/lib/workspaces/atomic-exit.ts) que apaga o cookie e retorna HTTP 303 na MESMA resposta — preview-navigation-sync.structural.test.ts foi reescrito de novo, agora reduzido a 14 asserções cobrindo só a ativação (window.location.assign, o exit já não usa window.location); atomic-exit.test.ts (novo, 17 asserções) executa de verdade os construtores de resposta (não apenas grep de string) e confirma status 303, Location, Cache-Control: no-store, Pragma: no-cache, e o Set-Cookie exato (Max-Age=0, Path=/, HttpOnly, SameSite=Lax) — e que o caminho de falha nunca inclui Set-Cookie; atomic-exit-ui.structural.test.ts (novo, 49 asserções) confirma que workspace-exit-button.tsx e workspace-preview-banner.tsx usam o mesmo <form>, sem fetch/DELETE/router/window.location/finally, que o banner mantém useRouter só para o handler de bfcache (pageshow), e que a rota /exit checa autenticação e papel super_admin antes de qualquer chamada ao builder atômico. Total: 219 asserções reais passando (164 anteriores − 25 da versão 1.0.9 do preview-navigation-sync + 14 da versão 1.0.10 + 17 + 49) + script de cobertura em 41 rotas/0 falhas (admin/workspaces/preview/exit/route.ts classificado como excluded_with_reason, mesma natureza da rota de preview original). atomic-exit-endpoint.e2e.test.ts foi escrito (8 asserções cobrindo os caminhos alcançáveis sem sessão real: sem sessão → 303 para /login sem Set-Cookie; cookie de preview forjado mas sem sessão Supabase → mesmo resultado; GET → 405) mas NÃO PÔDE SER EXECUTADO nesta sprint: `next dev`, `next build` e `tsc --noEmit` estouraram o heap do Node (exit 134) de forma reprodutível neste ambiente, mesmo com --max-old-space-size ajustado — uma sondagem direta (Buffer.alloc em loop) confirmou um teto de alocação de processo em torno de 700-750MB, insuficiente para compilar/typecheckar este projeto, uma restrição de ambiente nova nesta sprint (não presente nos hotfixes 1.0.7-1.0.9 da mesma sessão). ESLint restrito aos arquivos alterados (5 arquivos) rodou limpo (exit 0) — escopo pequeno o suficiente para caber no teto de memória. /api/admin/contentos/drafts continua a rota segura reutilizada para o QA Production comprovar o HTTP 403 via navegador — nenhuma rota nova de guard foi criada. O guard por rota (assertWorkspaceMutationAllowed) continua sem teste automatizado de ponta a ponta — precisa de sessão real de super_admin. Hotfix 1.0.11: QA Production 1.0.10 pelo Claude Web executou os dois controles reais de saída e ambos receberam 403 WORKSPACE_PREVIEW_READ_ONLY em vez de completar a saída — causa raiz encontrada em src/proxy.ts: sua allowlist runtime (MUTATION_GUARD_EXEMPT_PATHS) é totalmente separada da classificação estática do script de cobertura, e a nova rota /exit nunca foi adicionada a ela, então o próprio proxy bloqueava sua saída antes do handler. Extraída para src/lib/workspaces/mutation-guard-runtime.ts (módulo puro, sem next/server) uma exceção exata — isWorkspacePreviewControlMutation(): libera somente POST + pathname === \"/api/admin/workspaces/preview/exit\", nenhuma outra combinação. proxy.ts agora importa e chama shouldBlockMutationInPreview() dali em vez de manter cópias locais das listas — fonte única de verdade, testável diretamente. mutation-guard-runtime.test.ts (novo, 41 asserções) executa a lógica real de decisão do guard: matriz exaustiva de allow/deny do matcher (trailing slash, métodos errados, paths parecidos, path traversal codificado, string vazia — todos rejeitados) e os 4 cenários pedidos pelo ticket (saída permitida com preview ativo; /api/admin/contentos/drafts continua bloqueado; qualquer outra rota mutável continua bloqueada; sem preview ativo o guard não interfere), além de confirmar que proxy.ts de fato delega a essas funções em vez de duplicar a lógica. Total: 260 asserções reais passando (219 anteriores + 41). O fluxo atômico completo ponta a ponta (sessão real → guard permite → 303 → dashboard sem banner) continua não executável localmente por falta de sessão Supabase real — mesma lacuna disclosed desde 1.0.7. tsc/build/dev continuam bloqueados pelo mesmo teto de memória (~700-750MB) do hotfix 1.0.10, confirmado novamente nesta sprint (exit 134 em ambos); build real da Vercel usado como gate.",
    next_actions: [
      "QA Production 1.0.11 (Claude Web): repetir exatamente os dois cliques (Sair da visualização, Painel ADM) e confirmar 303 + cookie removido + ausência de WORKSPACE_PREVIEW_READ_ONLY",
      "QA local com sessão real de super_admin: confirmar 403 (não 500) em cada uma das 29 rotas durante preview ativo",
      "Revisar periodicamente docs/workspace-mutation-inventory.md quando novas rotas mutáveis forem adicionadas — o script de cobertura falha automaticamente se uma rota nova não estiver classificada, mas isso NÃO substitui adicionar a rota à allowlist runtime de src/proxy.ts quando ela precisar ser alcançável durante um preview ativo",
      "Reavaliar a classificação de CRM se um card CRM for adicionado a alguma superfície de preview",
      "Rodar tsc --noEmit / next build / next dev assim que o ambiente local voltar a suportar mais de ~750MB por processo Node — não foi possível localmente em 1.0.10 nem 1.0.11",
    ],
  },
  {
    id: "workspace_preview_audit_log",
    name: "Workspaces — Log de auditoria do preview",
    category: "admin",
    description: "Contrato de eventos (src/lib/workspaces/audit-log.ts): workspace_preview_started, workspace_preview_ended, workspace_preview_expired, workspace_preview_mutation_blocked. Emitido nos 4 pontos reais (POST/DELETE de /api/admin/workspaces/preview, detecção de expiração em context.ts, bloqueio em assert-not-preview.ts).",
    phase: "v2",
    readiness: "planned",
    qa: { status: "not_started" },
    last_updated: "2026-07-23",
    notes: "Somente na branch feat/workspace-panels-v1. Deliberadamente NÃO persiste em tabela — hoje só um console.info(JSON) por evento. Sem SQL criado ou executado nesta sprint; persistência real é trabalho futuro, dependente de aprovação de schema. Hotfix 1.0.2 (Fase 23): reconfirmado que nenhum dado sensível (token, cookie, payload completo, e-mail, nome de cliente) é logado — só uid, surface, workspaceId, isBlueprint e timestamp. Nenhum logger estruturado existe hoje no projeto (grep confirmou), então console.info seguiu sendo a escolha honesta.",
  },

  // ── Contas, painéis e roteamento (branch feat/accounts-panel-routing-v1) ──
  {
    id: "accounts_panel_routing_audit",
    name: "Contas — Auditoria de painéis, memberships e roteamento",
    category: "admin",
    description: "Auditoria prévia (somente leitura) do modelo real de contas/workspaces após a validação de Workspaces 1.0.11 em Production: docs/accounts-panel-routing-audit.md mapeia profiles/clients/agency_workspaces/agency_clients/client_user_access ao vivo (Supabase MCP, projeto lokat-os), a resolução de papel/cliente atual, a matriz de rotas por superfície, e desenha (sem implementar) o plano idempotente de criação de contas e os testes de isolamento entre Focus/Duh Lanches/Açaí do Gordo.",
    phase: "v2",
    readiness: "in_progress",
    qa: { status: "not_started" },
    last_updated: "2026-07-26",
    notes: "Nenhuma mutação executada — 100% leitura (código + consultas SELECT ao Supabase real). Achados principais: (1) o modelo de Workspaces (agency_workspaces/agency_clients) construído nos hotfixes 1.0–1.0.11 tem 0 linhas reais em produção — nunca foi inserido por nenhum código da aplicação, só é exercitado pelo preview do Super Admin com dados de blueprint; não existe hoje nenhum 'Gerenciar empresa' real, só o preview somente-leitura. (2) Existem quatro vocabulários de account_type/plano desalinhados entre si (docs/supabase/69, src/lib/account-permissions.ts, src/lib/account-types.ts, e o valor real observado em clients.account_type = 'lokat_client', que não existe em nenhum dos três) — já parcialmente reconhecido no próprio comentário de src/config/workspace-capabilities.ts de uma sprint anterior, mas nunca unificado. (3) O único limite de clientes por plano implementado em código (canCreateClient/getClientLimitByPlan) usa slugs de plano que nunca correspondem aos slugs reais do banco (billing_plans/plan_limits: comunidade/start/pro/agencia) — na prática sempre cai no fallback, nunca aplica o limite contratado; não há nenhuma validação server-side do limite hoje, e não existe nenhum fluxo de criação de agency_clients no código para a validação se aplicar. (4) Das entidades citadas pelo ticket, só Duh Lanches e O Pedreirão existem de fato (2 clientes reais no banco, ambos sem owner_id, sem agência vinculada, status 'onboarding'); Agência Lokat, Focus, Cliente Teste Focus 01 e Açaí do Gordo NÃO existem em nenhuma tabela — confirmado por consulta direta, não suposição. (5) Nenhum risco P0 encontrado — o modelo multi-tenant real ainda não está em uso por nenhum usuário de verdade, então não há vetor de vazamento entre empresas hoje. P1/P2 detalhados na seção 12 do documento. Meu Negócio/Precificação/Produtos são 100% demo em memória (zero Supabase) — sem risco de isolamento porque não há dado real. QA formal não se aplica (auditoria, não feature).",
    next_actions: [
      "Decidir com o usuário qual vocabulário de account_type/plano é o canônico antes de qualquer implementação nova",
      "Implementar assertAgencyCanAddClient() server-side antes de qualquer UI de criação de cliente por agência",
      "Construir findOrCreateWorkspace/findOrCreateAgencyClient em modo dry-run, validado manualmente antes de qualquer execução real",
      "Só criar Focus/Cliente Teste Focus 01/Açaí do Gordo com dados reais fornecidos explicitamente pelo usuário (nunca inventados) — nenhum dos três existe hoje",
    ],
  },

  // ── Meu Negócio — Vertical slice Restaurante (branch feat/meu-negocio-stock-restaurant-v1) ──
  {
    id: "meu_negocio_restaurant_vertical_slice",
    name: "Meu Negócio — Vertical slice Restaurante (estoque, fichas técnicas, CMV)",
    category: "operacional",
    description: "Protótipo navegável e matematicamente coerente para o arquétipo food_service dentro de /admin/meu-negocio: seleção de empresa, estoque central e cozinha com transferências e inventário, compras com ponto de reposição e cobertura, fichas técnicas (fator de correção, rendimento de cocção, CMV do produto), CMV real vs. teórico com lacuna explicada, relatórios, glossário contextual e fluxo 'Analisar e preencher'. Arquitetura adaptativa por arquétipo de negócio (BusinessArchetypeConfig) — só food_service tem a experiência completa; os demais (retail, services, agency, clinic, law_firm, generic) existem como contratos tipados.",
    phase: "v2",
    readiness: "deployed",
    qa: { status: "pending" },
    last_updated: "2026-07-30",
    notes: "100% em memória, sem persistência e sem nenhuma consulta/mutação ao Supabase — confirmado por teste estrutural (nenhum arquivo novo referencia Supabase ou fetch()). A auditoria anterior (feat/accounts-panel-routing-v1) confirmou que agency_workspaces/agency_clients têm 0 linhas reais e que não existe 'Gerenciar empresa' real — esta sprint respeita esse limite: a tela de seleção de empresa usa fixtures locais (Duh Lanches como 'active'/food_service, O Pedreirão como 'available_for_activation'/retail, sem experiência retail construída), nunca uma consulta real a clients/agency_clients. Todos os números de exemplo (Smash de Exemplo, relatório de CMV) estão marcados como simulação e batem exatamente com os valores do ticket, verificados por teste real (não apenas exibidos): custo dos ingredientes R$ 8,62, CMV do produto 34,48%, consumo real R$ 37.000/CMV real 37%, consumo teórico R$ 33.000/CMV teórico 33%, lacuna R$ 4.000/4 pontos percentuais. Fator de correção e rendimento de cocção são funções puras separadas (perda de limpeza ≠ perda de cocção), nunca misturadas. Transferência central→cozinha nunca permite saldo negativo (rejeitada, não clampada) e preserva o total consolidado entre as duas localizações. Contagem de inventário trata explicitamente saldo zero, contado zero, valores negativos e unidade incompatível — nunca divide por zero. 111 asserções reais passando (25 em stock/calculations, 21 em costing/calculations incluindo os números exatos do ticket, 65 estruturais). Um bug real de import foi encontrado e corrigido durante a validação no servidor local (buildPurchaseDrafts estava sendo importado do módulo errado) — só foi pego rodando o servidor de fato, não pelos testes ad-hoc isolados, reforçando por que o Fase de 'servidor local' do ticket não é dispensável. ESLint limpo nos arquivos alterados (incluindo a correção de um react-hooks/purity de Date.now() reutilizando o generateId() já existente em _shared.tsx). tsc --noEmit e next build continuam bloqueados pelo mesmo teto de memória (~700-750MB) dos hotfixes 1.0.10/1.0.11/exit-guard — mas, diferente dessas sprints, `next dev` funcionou desta vez (compilação sob demanda, não o programa inteiro de uma vez) e serviu /login (200) e /admin/meu-negocio (307, redirect correto sem sessão) em http://localhost:3002 — sem validação visual autenticada (sem navegador/sessão de Super Admin disponível neste ambiente, mesma lacuna disclosed desde os primeiros hotfixes de Workspaces). Pendência de REC OS (dois nomes 'REC OS' no dashboard, calendário interno navegando para o calendário global) registrada em rec_os_global_hub — nenhum código REC OS foi tocado. Release integrada (2026-07-30): feat/meu-negocio-motion-3d-refinement-v1 (HEAD e13ced9915b99f3e6b278ce5b60533e8e73953c4) mergeada em main sem squash/rebase (merge commit 7442d1d8368101a6ee183e1d7a8b486cf07e9893, dois pais: reconciliação de status divergente e o tip da feature) — traz junto, da mesma branch, o período central/personalizado (business-period), a classificação de dados (data-quality), o cardápio digital como provedor externo (digital-menu), faturamento explícito (revenue), Centro de Comando, Visão simples/Modo Gestor, refinamento de motion/GSAP/Three.js e a correção definitiva do seletor de período personalizado (validação real, reabertura correta, comparação correta, mobile 390px, suíte de testes renderizados via jsdom/@testing-library/react substituindo os testes puramente textuais anteriores). Gates na main: tsc limpo, ESLint limpo nos arquivos incorporados, 40 suítes de teste (~973 asserções) passando, build de produção OK, git diff --check limpo. npm audit: 6 vulnerabilidades altas, todas preexistentes na versão do Next.js já fixada em origin/main antes deste merge (não introduzidas por esta feature) — documentadas, sem bump de versão nesta release. (Nota: 'readiness' não tem o valor \"released_to_main\" no tipo AreaReadiness deste arquivo — mapeado para \"deployed\", que já significa exatamente isso: em produção, QA pendente.) Hotfix v1.0.1 (2026-07-30): Codex Web encontrou em Production que o período personalizado ainda aceitava intervalo invertido e que 01/07-15/07 revertia para o mês inteiro na reabertura — causa raiz comprovada por teste (não assumida): o submit confiava só no estado React, que um input nativo type=\"date\" pode deixar desatualizado em relação ao DOM (autofill, automação disparando só um dos eventos input/change). Corrigido em hotfix/meu-negocio-custom-period-production-v1 (HEAD 145d1ee0ea0c348398a5b1db57e17dfe431a530e): submit agora lê FormData do próprio formulário como barreira final, onInput adicionado ao lado de onChange, inputs ganharam name estável. Testado nos três caminhos de evento (onChange, input-only, valor de DOM alterado diretamente sem nenhum evento React antes do requestSubmit — o cenário mais próximo do bug relatado). Mergeado em main sem squash/rebase (merge commit bde33b8b8a720fc4815366a240878a60664f8f21, dois pais: a main anterior e o tip do hotfix), gates aprovados (tsc, ESLint, 52 suítes de teste, build, diff --check) e publicado em Production (deployment dpl_Hoc2forSdsyVZekSE9JZAUE5HJE4, alias www.lokat.com.br, aliasError null). Smoke test sem sessão aprovado nos dois domínios, sem HTTP 500. QA autenticado oficial do Codex Web sobre este HEAD específico ainda não foi realizado — Production não está marcada como totalmente validada só por isso.",
    next_actions: [
      "QA visual autenticado oficial (Codex Web) em https://www.lokat.com.br/admin/meu-negocio com sessão real de Super Admin, especificamente sobre o HEAD bde33b8b8a720fc4815366a240878a60664f8f21 (hotfix v1.0.1) — cobrindo período personalizado, revenue, data classification e motion",
      "Conectar o módulo a um workspace/cliente real assim que o modelo de contas (accounts_panel_routing_audit) for unificado — hoje a seleção de empresa é só fixture local",
      "Implementar a experiência completa do arquétipo retail (O Pedreirão) em uma sprint futura",
      "Abrir fix/rec-os-dashboard-calendar-routing-v1 para a pendência de REC OS registrada nesta sprint",
    ],
  },

  // -- Meu Negocio - Fluxo de Caixa, Reserva e importacao local de planilhas --
  {
    id: "meu_negocio_finance_cashflow_spreadsheet_v1",
    name: "Meu Negocio - Fluxo de Caixa, Reserva e planilhas V1",
    category: "operacional",
    description: "Experiencia financeira demonstrativa em /admin/meu-negocio com visao simples e Modo Gestor, dashboard de fluxo de caixa, capital de giro, reserva financeira, graficos, importacao local revisavel de XLSX/CSV e exportacao do modelo oficial de planilha.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    risk: "medium",
    last_updated: "2026-07-27",
    notes: "Implementacao local concluida e coberta por 209 assercoes automatizadas, TypeScript, ESLint e build de producao. Os dados financeiros exibidos continuam simulados e identificados; nao existe persistencia, consulta ao Supabase, envio de planilha ou integracao com Google Sheets nesta fase. A importacao acontece somente no navegador e exige revisao antes de aplicar. A conexao OlaClick continua separada deste fluxo. QA visual autenticado permanece pendente porque o ambiente local nao possui as variaveis Supabase necessarias para abrir /admin/meu-negocio. Dependencia xlsx 0.18.5 possui advisories conhecidos sem correcao no registro npm e deve ser substituida antes de aceitar arquivos nao confiaveis em producao.",
    blockers: [
      "Persistencia financeira por workspace/cliente ainda nao implementada",
      "QA visual autenticado pendente",
      "Substituir ou isolar xlsx antes de liberar importacao de arquivos nao confiaveis",
    ],
    next_actions: [
      "Executar QA visual autenticado em desktop, tablet e mobile",
      "Definir persistencia por workspace/cliente sem misturar dados entre empresas",
      "Avaliar biblioteca mantida para XLSX e impor limites de tamanho/complexidade",
      "Planejar Google Sheets como integracao futura com OAuth proprio, sem simular conexao",
    ],
  },

  {
    id: "meu_negocio_cmv_menu_engineering_v1",
    name: "Meu Negócio — Central de CMV e Engenharia de Cardápio V1",
    category: "operacional",
    description: "Central demonstrativa que separa Visão simples/Modo Gestor de CMV teórico/real, calcula lacuna, cobertura explicável, margem de contribuição, popularidade e quadrantes de engenharia de cardápio, com hipóteses e verificações sem acusação automática.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    risk: "medium",
    last_updated: "2026-07-27",
    notes: "Somente na branch feat/meu-negocio-cmv-menu-engineering-v1. Duh Lanches é contexto visual e todos os valores são EXEMPLOS SIMULADOS derivados de uma fixture central; nenhum dado real, Supabase, Auth, workspace ou integração OlaClick foi alterado. CMV_FINAL_REFERENCE_PENDING permanece ativo. Persistência, histórico real, dados reais OlaClick e QA visual autenticado continuam pendentes. xlsx 0.18.5 foi substituído pela distribuição oficial fixa 0.20.3 e o importador local ganhou limites de arquivo, abas, linhas, colunas, células e texto, além de rejeição de prototype keys e desativação de fórmula/HTML.",
    blockers: [
      "Referência visual final do MVP de CMV ainda não fornecida",
      "Persistência por workspace/cliente não implementada",
      "Dados reais OlaClick ainda não conectados à Central de CMV",
      "QA visual autenticado em 390/768/1024/desktop pendente",
    ],
    next_actions: [
      "Executar QA visual autenticado da Central de CMV",
      "Recalibrar o layout quando CMV_FINAL_REFERENCE_PENDING for resolvido",
      "Projetar persistência e integração OlaClick em sprint separada",
    ],
  },

  // ── Workspaces 1.0.2 (mesma branch feat/workspace-panels-v1) ──────────────
  {
    id: "workspace_mutation_inventory",
    name: "Workspaces — Inventário de mutações",
    category: "admin",
    description: "docs/workspace-mutation-inventory.md — levantamento manual de toda rota mutável do projeto (grep sistemático + checagem de link real), classificada em protected/not_reachable_from_preview/read_only_operation/demo_memory_only/excluded_with_reason. Nenhuma linha ficou sem classificação.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-23",
    notes: "Somente na branch feat/workspace-panels-v1. Documento, não código executável — a prova de que ele reflete a realidade é o script workspace_mutation_coverage_check, que falha se uma rota nova/protegida divergir do que está documentado aqui.",
    next_actions: ["Revisar este inventário a cada sprint que adicionar uma rota mutável nova em src/app/api"],
  },
  {
    id: "workspace_mutation_coverage_check",
    name: "Workspaces — Verificação automática de cobertura de mutações",
    category: "admin",
    description: "scripts/check-workspace-mutation-coverage.ts (npm run check:workspace-mutations) escaneia src/app/api em busca de rotas com método mutável, compara contra o allowlist documentado, e falha se encontrar uma mutação nova sem classificação ou uma rota 'protected' que perdeu o wrapper withMutationProtection.",
    phase: "v2",
    readiness: "qa_pending",
    qa: { status: "pending" },
    last_updated: "2026-07-23",
    notes: "Somente na branch feat/workspace-panels-v1. Roda limpo hoje: 40 rotas mutáveis encontradas, 0 falhas. É uma rede de segurança contra regressão/drift — busca textual não prova que o wrapper decora o handler certo nem que uma classificação 'not_reachable_from_preview' continua verdadeira; ambos continuam dependendo de revisão manual (ver docs/workspace-mutation-inventory.md).",
  },

  // ── Fase 10 do hotfix Workspaces 1.0.4 — roadmap registrado, nada
  // implementado nesta sprint. Todas as áreas abaixo são "planned" e
  // documentadas em docs/product-roadmap/ (Fase 11) — ver ali para o
  // detalhamento completo de campos/fluxos propostos.
  {
    id: "business_day_configuration",
    name: "Dia comercial — configuração de horário que atravessa a meia-noite",
    category: "operacional",
    description: "Permitir horário operacional que pode atravessar a meia-noite, mantendo transações da madrugada no mesmo dia comercial iniciado anteriormente.",
    phase: "future",
    readiness: "planned",
    qa: { status: "not_started" },
    last_updated: "2026-07-24",
    notes: "Registrado no hotfix 1.0.4 (Fase 10). Nada implementado — nem schema, nem UI. Ver docs/product-roadmap/cash-register-business-day.md.",
  },
  {
    id: "cash_register_opening_closing",
    name: "Caixa — abertura e fechamento",
    category: "operacional",
    description: "Abertura, movimentações, sangria, reforço, contagem, fechamento, diferença e responsável.",
    phase: "future",
    readiness: "planned",
    qa: { status: "not_started" },
    last_updated: "2026-07-24",
    notes: "Registrado no hotfix 1.0.4 (Fase 10). Depende de business_day_configuration para saber a qual dia comercial uma movimentação pertence. Ver docs/product-roadmap/cash-register-business-day.md.",
  },
  {
    id: "cash_register_reconciliation",
    name: "Caixa — conciliação (esperado vs. contado)",
    category: "operacional",
    description: "Comparar opening_balance + movimentações esperadas contra counted_balance no fechamento, registrando difference e status por responsável.",
    phase: "future",
    readiness: "planned",
    qa: { status: "not_started" },
    last_updated: "2026-07-24",
    notes: "Registrado no hotfix 1.0.4 (Fase 10). Nada implementado. Ver docs/product-roadmap/cash-register-business-day.md.",
  },
  {
    id: "overnight_business_day",
    name: "Dia comercial noturno — pedidos após a meia-noite",
    category: "operacional",
    description: "Garantir que um pedido feito de madrugada (ex.: 02h) seja corretamente atribuído ao dia comercial iniciado na tarde/noite anterior, não ao novo dia civil.",
    phase: "future",
    readiness: "planned",
    qa: { status: "not_started" },
    last_updated: "2026-07-24",
    notes: "Registrado no hotfix 1.0.4 (Fase 10). Exemplo documental obrigatório do ticket (Duh Lanches, dado fictício, não real) em docs/product-roadmap/cash-register-business-day.md.",
  },
  {
    id: "png_vidigal_creative_workspace",
    name: "PNG Vidigal — workspace criativo em três colunas",
    category: "conteudo",
    description: "Workspace em três colunas, com camadas à esquerda, canvas central, propriedades à direita e ferramentas no topo.",
    phase: "future",
    readiness: "planned",
    qa: { status: "not_started" },
    last_updated: "2026-07-24",
    notes: "Registrado no hotfix 1.0.4 (Fase 10). Nada implementado nesta sprint. Ver docs/product-roadmap/png-vidigal-creative-workspace.md.",
  },
  {
    id: "png_vidigal_briefing_flow",
    name: "PNG Vidigal — fluxo de briefing para o workspace criativo",
    category: "conteudo",
    description: "Fluxo de coleta de briefing (objetivo, referências, formato) que alimenta o workspace criativo em três colunas antes de abrir o canvas.",
    phase: "future",
    readiness: "planned",
    qa: { status: "not_started" },
    last_updated: "2026-07-24",
    notes: "Registrado no hotfix 1.0.4 (Fase 10). Nada implementado. Ver docs/product-roadmap/png-vidigal-creative-workspace.md.",
  },
  {
    id: "editor_os_creative_shell",
    name: "EditorOS — shell criativo compartilhado",
    category: "conteudo",
    description: "Shell de edição compartilhado entre EditorOS e o futuro workspace PNG Vidigal, evitando duas implementações paralelas de canvas/camadas/propriedades.",
    phase: "future",
    readiness: "planned",
    qa: { status: "not_started" },
    last_updated: "2026-07-24",
    notes: "Registrado no hotfix 1.0.4 (Fase 10). Conceitual — nenhuma decisão de arquitetura tomada ainda sobre reaproveitar o EditorOS existente ou construir separado. Ver docs/product-roadmap/png-vidigal-creative-workspace.md.",
  },
  {
    id: "billing_upgrade_modal",
    name: "Billing — modal de upgrade de plano",
    category: "billing",
    description: "Comparação de planos em modal, sem checkout funcional enquanto o billing não estiver aprovado.",
    phase: "future",
    readiness: "planned",
    qa: { status: "not_started" },
    last_updated: "2026-07-24",
    notes: "Registrado no hotfix 1.0.4 (Fase 10). Nada implementado — nem o modal, nem qualquer checkout. Ver docs/product-roadmap/billing-and-pricing.md.",
  },
  {
    id: "software_pricing_v1",
    name: "Precificação do software — proposta v1",
    category: "billing",
    description: "Planos propostos: R$ 79, R$ 130, R$ 250. Mantidos como proposta, não preço comercial validado.",
    phase: "future",
    readiness: "planned",
    qa: { status: "not_started" },
    last_updated: "2026-07-24",
    notes: "Registrado no hotfix 1.0.4 (Fase 10). Valores são proposta interna, não preço comercial aprovado nem publicado. Ver docs/product-roadmap/billing-and-pricing.md.",
  },
  {
    id: "public_landing_rebuild",
    name: "Landing pública — reconstrução",
    category: "publico",
    description: "Landing mais direta, com hero, rota do negócio, módulos, demonstração, preços, FAQ e CTA.",
    phase: "future",
    readiness: "planned",
    qa: { status: "not_started" },
    last_updated: "2026-07-24",
    notes: "Registrado no hotfix 1.0.4 (Fase 10). Nada implementado. Ver docs/product-roadmap/public-landing-rebuild.md.",
  },
  {
    id: "public_landing_pricing",
    name: "Landing pública — seção de preços",
    category: "publico",
    description: "Seção de preços da landing pública, referenciando software_pricing_v1 como proposta — não compromisso comercial.",
    phase: "future",
    readiness: "planned",
    qa: { status: "not_started" },
    last_updated: "2026-07-24",
    notes: "Registrado no hotfix 1.0.4 (Fase 10). Depende de software_pricing_v1 ser aprovado antes de virar preço público real. Ver docs/product-roadmap/public-landing-rebuild.md.",
  },
  {
    id: "public_home_canonical_route",
    name: "Rota canônica da home pública",
    category: "publico",
    description: "Definir a rota canônica única da home pública reconstruída, evitando duas versões (antiga/nova) coexistindo sem redirecionamento claro.",
    phase: "future",
    readiness: "planned",
    qa: { status: "not_started" },
    last_updated: "2026-07-24",
    notes: "Registrado no hotfix 1.0.4 (Fase 10). Nada implementado. Ver docs/product-roadmap/public-landing-rebuild.md.",
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
