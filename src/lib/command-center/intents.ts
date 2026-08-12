/**
 * Sprint Command Center + Jarvis Context V1 — resolvedor de intenção do
 * Command Center de /admin/inicio. Deliberadamente pequeno e baseado em
 * regras (não é um segundo Jarvis, não chama LLM). Casa uma frase curta
 * contra um catálogo fixo de ações REAIS e devolve um "flow" tipado:
 *   - "navigate": ação simples, CTA direto para uma rota real
 *     (Company-scoped ou não).
 *   - "create_client": abre o wizard inline de criação de cliente
 *     (nome → preview → confirmação → POST /api/admin/clients real).
 *   - "create_project": resolve Company (se preciso) e oferece só os
 *     tipos com autoridade real de criação hoje (audiovisual, campanha)
 *     -- nunca inventa um tipo sem backend.
 * "Criar" e "abrir/consultar" são intenções DIFERENTES mesmo quando a
 * palavra-chave se sobrepõe (ex.: "projeto") -- resolvidas com prioridade
 * de padrões de criação antes dos de consulta.
 */

export type CommandIntentId =
  | "create_campaign"
  | "create_client"
  | "create_project"
  | "open_calendar"
  | "view_approvals"
  | "view_clients"
  | "open_projects"
  | "today_work"
  | "open_rec_os";

export interface CommandNavigateFlow {
  kind: "navigate";
  intentId: CommandIntentId;
  title: string;
  summary: string;
  requiresCompany: boolean;
  /** Rota final (sem ?client=) — o caller decide se anexa contexto. */
  href: string;
  primaryLabel: string;
}

export interface CommandCreateClientFlow {
  kind: "create_client";
  intentId: "create_client";
}

export interface CommandCreateProjectFlow {
  kind: "create_project";
  intentId: "create_project";
}

export type CommandFlow = CommandNavigateFlow | CommandCreateClientFlow | CommandCreateProjectFlow;

/** @deprecated mantido só para os call sites antigos que ainda esperam o shape "navigate" -- ver CommandNavigateFlow. */
export type CommandActionResult = CommandNavigateFlow;

interface NavigateIntentDef {
  kind: "navigate";
  id: CommandIntentId;
  keywords: string[];
  requiresCompany: boolean;
  href: string;
  title: string;
  summary: string;
  primaryLabel: string;
}

interface SpecialIntentDef {
  kind: "create_client" | "create_project";
  id: CommandIntentId;
  keywords: string[];
}

type IntentDef = NavigateIntentDef | SpecialIntentDef;

// Ordem importa: "criar" precisa ser checado ANTES de "abrir/consultar"
// quando as duas famílias compartilham uma palavra (ex.: "projeto").
const CATALOG: IntentDef[] = [
  {
    kind: "create_client",
    id: "create_client",
    keywords: ["criar cliente", "novo cliente", "cadastrar cliente", "adicionar cliente"],
  },
  {
    kind: "create_project",
    id: "create_project",
    keywords: [
      "criar projeto", "criar um projeto", "novo projeto",
      "iniciar projeto", "iniciar um projeto",
      "começar projeto", "começar um projeto", "comecar projeto", "comecar um projeto",
      // Fase 2/3 -- frases reais com preenchimento ("quero iniciar UM projeto")
      // não batem em "iniciar projeto" via substring puro; cobertas explicitamente.
      "quero iniciar um projeto", "quero criar um projeto",
    ],
  },
  {
    kind: "navigate",
    id: "create_campaign",
    keywords: ["criar campanha", "nova campanha", "campanha"],
    requiresCompany: true,
    href: "/admin/contentos/campanhas",
    title: "Criar campanha",
    summary: "Campanhas pertencem a uma empresa específica.",
    primaryLabel: "Criar campanha",
  },
  {
    kind: "navigate",
    id: "open_calendar",
    keywords: ["calendário", "calendario", "agenda", "agendamento"],
    requiresCompany: false,
    href: "/admin/calendario",
    title: "Calendário",
    summary: "Sua agenda de conteúdo e prazos.",
    primaryLabel: "Abrir calendário",
  },
  {
    kind: "navigate",
    id: "view_approvals",
    keywords: ["aprovação", "aprovacao", "aprovações", "aprovacoes", "revisar", "revisão", "revisao"],
    requiresCompany: true,
    href: "/admin/contentos/aprovacoes",
    title: "Aprovações",
    summary: "Aprovações pertencem ao conteúdo de uma empresa específica.",
    primaryLabel: "Ver aprovações",
  },
  {
    kind: "navigate",
    id: "view_clients",
    keywords: ["cliente", "clientes", "empresa", "empresas"],
    requiresCompany: false,
    href: "/admin/clientes",
    title: "Clientes",
    summary: "Suas empresas cadastradas.",
    primaryLabel: "Ver clientes",
  },
  {
    kind: "navigate",
    id: "open_projects",
    keywords: ["abrir projetos", "ver projetos", "meus projetos", "listar projetos", "projetos", "projeto"],
    requiresCompany: true,
    href: "/admin/projetos",
    title: "Projetos",
    summary: "Projetos pertencem a uma empresa específica.",
    primaryLabel: "Abrir projetos",
  },
  {
    kind: "navigate",
    id: "today_work",
    keywords: ["hoje", "meu dia", "o que tenho", "pendências", "pendencias", "minhas tarefas"],
    requiresCompany: false,
    href: "/admin/escritorio",
    title: "Meu Escritório",
    summary: "O que precisa da sua atenção agora.",
    primaryLabel: "Ver meu dia",
  },
  {
    kind: "navigate",
    id: "open_rec_os",
    keywords: ["rec os", "recos", "contentos", "conteúdo", "conteudo", "roteiro", "briefing"],
    requiresCompany: false,
    href: "/admin/contentos",
    title: "REC OS",
    summary: "Central de conteúdo, campanhas e aprovações.",
    primaryLabel: "Abrir REC OS",
  },
];

/**
 * Heurística mínima para separar "comando" de "pergunta/conversa":
 * ponto de interrogação, ou verbos/conectores de raciocínio típicos de uma
 * pergunta aberta que nenhuma ação fixa resolveria de verdade.
 */
const CONVERSATIONAL_MARKERS = [
  "?", "por que", "porque", "como faço", "como eu faço", "me ajuda",
  "me ajude", "estratégia", "estrategia", "o que você acha", "o que voce acha",
  "analisa", "analise", "priorizar", "prioridade",
  // planejamento de semana é explicitamente trabalho do Jarvis
  // (raciocínio sobre HOJE/AMANHÃ/SEMANA/prioridades), não uma rota fixa.
  "planeja", "planejar", "organiza minha semana", "organizar minha semana",
];

export function looksConversational(query: string): boolean {
  const q = query.toLowerCase();
  return CONVERSATIONAL_MARKERS.some((marker) => q.includes(marker));
}

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function resolveCommandFlow(query: string): CommandFlow | null {
  const q = normalize(query.trim());
  if (!q) return null;
  for (const def of CATALOG) {
    if (!def.keywords.some((kw) => q.includes(normalize(kw)))) continue;
    if (def.kind === "create_client") return { kind: "create_client", intentId: "create_client" };
    if (def.kind === "create_project") return { kind: "create_project", intentId: "create_project" };
    if (def.kind !== "navigate") continue;
    return {
      kind: "navigate",
      intentId: def.id,
      title: def.title,
      summary: def.summary,
      requiresCompany: def.requiresCompany,
      href: def.href,
      primaryLabel: def.primaryLabel,
    };
  }
  return null;
}

/** @deprecated use resolveCommandFlow(); mantido para compatibilidade -- só resolve o subconjunto "navigate". */
export function resolveCommandIntent(query: string): CommandNavigateFlow | null {
  const flow = resolveCommandFlow(query);
  return flow?.kind === "navigate" ? flow : null;
}
