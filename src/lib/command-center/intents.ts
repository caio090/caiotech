/**
 * Sprint Final Product Experience Consolidation (Parte A) — resolvedor de
 * intenção do Command Center de /admin/inicio. Deliberadamente pequeno e
 * baseado em regras (Fase 7: "não criar mini-framework gigante") — não é
 * um segundo Jarvis, não chama LLM. Casa uma frase curta contra um
 * catálogo fixo de ações REAIS (rotas confirmadas em src/app/admin), e
 * devolve um contrato de Action Result. Quando nada casa com confiança,
 * o caller decide entre a busca informacional existente
 * (/api/ai/dashboard-search) ou o handoff para o Jarvis.
 */

export type CommandIntentId =
  | "create_campaign"
  | "open_calendar"
  | "view_approvals"
  | "view_clients"
  | "open_projects"
  | "today_work"
  | "open_rec_os"
  | "new_client";

export interface CommandActionResult {
  intentId: CommandIntentId;
  title: string;
  summary: string;
  requiresCompany: boolean;
  /** Rota final (sem ?client=) — o caller decide se anexa contexto. */
  href: string;
  primaryLabel: string;
}

interface CommandIntentDef {
  id: CommandIntentId;
  keywords: string[];
  requiresCompany: boolean;
  href: string;
  title: string;
  summary: string;
  primaryLabel: string;
}

const CATALOG: CommandIntentDef[] = [
  {
    id: "create_campaign",
    keywords: ["campanha", "nova campanha", "criar campanha"],
    requiresCompany: true,
    href: "/admin/contentos/campanhas",
    title: "Criar campanha",
    summary: "Campanhas pertencem a uma empresa específica.",
    primaryLabel: "Criar campanha",
  },
  {
    id: "open_calendar",
    keywords: ["calendário", "calendario", "agenda", "agendamento"],
    requiresCompany: false,
    href: "/admin/calendario",
    title: "Calendário",
    summary: "Sua agenda de conteúdo e prazos.",
    primaryLabel: "Abrir calendário",
  },
  {
    id: "view_approvals",
    keywords: ["aprovação", "aprovacao", "aprovações", "aprovacoes", "revisar", "revisão", "revisao"],
    requiresCompany: true,
    href: "/admin/contentos/aprovacoes",
    title: "Aprovações",
    summary: "Aprovações pertencem ao conteúdo de uma empresa específica.",
    primaryLabel: "Ver aprovações",
  },
  {
    id: "view_clients",
    keywords: ["cliente", "clientes", "empresa", "empresas"],
    requiresCompany: false,
    href: "/admin/clientes",
    title: "Clientes",
    summary: "Suas empresas cadastradas.",
    primaryLabel: "Ver clientes",
  },
  {
    id: "open_projects",
    keywords: ["projeto", "projetos"],
    requiresCompany: true,
    href: "/admin/projetos",
    title: "Projetos",
    summary: "Projetos pertencem a uma empresa específica.",
    primaryLabel: "Abrir projetos",
  },
  {
    id: "today_work",
    keywords: ["hoje", "meu dia", "o que tenho", "pendências", "pendencias", "minhas tarefas"],
    requiresCompany: false,
    href: "/admin/escritorio",
    title: "Meu Escritório",
    summary: "O que precisa da sua atenção agora.",
    primaryLabel: "Ver meu dia",
  },
  {
    id: "open_rec_os",
    keywords: ["rec os", "recos", "contentos", "conteúdo", "conteudo", "roteiro", "briefing"],
    requiresCompany: false,
    href: "/admin/contentos",
    title: "REC OS",
    summary: "Central de conteúdo, campanhas e aprovações.",
    primaryLabel: "Abrir REC OS",
  },
  {
    id: "new_client",
    keywords: ["novo cliente", "cadastrar cliente", "adicionar cliente", "criar cliente"],
    requiresCompany: false,
    href: "/admin/clientes",
    title: "Novo cliente",
    summary: "Cadastro de uma nova empresa.",
    primaryLabel: "Cadastrar cliente",
  },
];

/**
 * Heurística mínima para separar "comando" de "pergunta/conversa" (Fase 9):
 * ponto de interrogação, ou verbos/conectores de raciocínio típicos de uma
 * pergunta aberta que nenhuma ação fixa resolveria de verdade.
 */
const CONVERSATIONAL_MARKERS = [
  "?", "por que", "porque", "como faço", "como eu faço", "me ajuda",
  "me ajude", "estratégia", "estrategia", "o que você acha", "o que voce acha",
  "analisa", "analise",
  // Fase 15 — planejamento de semana é explicitamente trabalho do Jarvis
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

export function resolveCommandIntent(query: string): CommandActionResult | null {
  const q = normalize(query.trim());
  if (!q) return null;
  for (const def of CATALOG) {
    if (def.keywords.some((kw) => q.includes(normalize(kw)))) {
      return {
        intentId: def.id,
        title: def.title,
        summary: def.summary,
        requiresCompany: def.requiresCompany,
        href: def.href,
        primaryLabel: def.primaryLabel,
      };
    }
  }
  return null;
}
