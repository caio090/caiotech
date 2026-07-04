import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// ── Types ────────────────────────────────────────────────────────────────────

interface SearchCard {
  title: string;
  desc: string;
  href: string;
  color?: string;
}

interface SearchResult {
  answer: string;
  intent: string;
  confidence: number;
  cards: SearchCard[];
  suggestedRoute?: string;
}

// ── Keyword map for fallback ──────────────────────────────────────────────────

const KEYWORD_MAP: Array<{
  keywords: string[];
  result: SearchResult;
}> = [
  {
    keywords: ["conteúdo", "conteudo", "post", "publicação", "publicacao", "briefing", "calendário", "calendario", "agendamento"],
    result: {
      answer: "O ContentOS gerencia todo o fluxo de conteúdo: do briefing à aprovação do cliente.",
      intent: "content",
      confidence: 0.85,
      suggestedRoute: "/admin/contentos",
      cards: [
        { title: "Criar conteúdo", desc: "Novo briefing ou post", href: "/admin/contentos", color: "#a855f7" },
        { title: "Calendário editorial", desc: "Visualizar agenda de publicações", href: "/admin/contentos/calendario", color: "#a855f7" },
        { title: "Aprovações pendentes", desc: "Conteúdos aguardando revisão", href: "/admin/contentos/aprovacoes", color: "#f59e0b" },
      ],
    },
  },
  {
    keywords: ["faturamento", "pedido", "vendas", "receita", "financeiro", "cardápio", "cardapio", "olaclick"],
    result: {
      answer: "Os relatórios de faturamento mostram pedidos, receita e ticket médio do cardápio digital.",
      intent: "revenue",
      confidence: 0.85,
      suggestedRoute: "/admin/relatorios/faturamento",
      cards: [
        { title: "Relatório de faturamento", desc: "Receita, pedidos e ticket médio", href: "/admin/relatorios/faturamento", color: "#10b981" },
        { title: "Fontes de dados", desc: "Status das integrações", href: "/admin/fontes-dados", color: "#3b82f6" },
      ],
    },
  },
  {
    keywords: ["meta", "instagram", "insights", "alcance", "impressões", "seguidores", "ig"],
    result: {
      answer: "Os insights de Meta/Instagram mostram alcance, impressões e seguidores do período selecionado.",
      intent: "meta_insights",
      confidence: 0.85,
      suggestedRoute: "/admin/contentos/insights",
      cards: [
        { title: "Insights Meta", desc: "Alcance, impressões e seguidores", href: "/admin/contentos/insights", color: "#7b6ef6" },
        { title: "Conexões", desc: "Gerenciar vinculação Meta/Instagram", href: "/admin/conexoes", color: "#6366f1" },
      ],
    },
  },
  {
    keywords: ["aprovação", "aprovacao", "aprovar", "cliente", "revisar", "revisão", "revisao"],
    result: {
      answer: "Aprovações pendentes ficam na seção de conteúdos do cliente selecionado.",
      intent: "approvals",
      confidence: 0.8,
      suggestedRoute: "/admin/contentos/aprovacoes",
      cards: [
        { title: "Ver aprovações", desc: "Conteúdos aguardando aprovação", href: "/admin/contentos/aprovacoes", color: "#f59e0b" },
        { title: "Selecionar cliente", desc: "Mudar cliente ativo", href: "/admin/contentos/selecionar-cliente", color: "#7b6ef6" },
      ],
    },
  },
  {
    keywords: ["relatório", "relatorio", "report", "resultado", "análise", "analise"],
    result: {
      answer: "Os relatórios consolidam faturamento, conteúdos e dados do cliente em um único painel.",
      intent: "reports",
      confidence: 0.8,
      suggestedRoute: "/admin/relatorios",
      cards: [
        { title: "Faturamento", desc: "Receita e pedidos do cardápio digital", href: "/admin/relatorios/faturamento", color: "#10b981" },
      ],
    },
  },
  {
    keywords: ["tarefa", "operacional", "kanban", "projeto", "prazo", "entrega"],
    result: {
      answer: "O painel operacional organiza tarefas, projetos e prazos da equipe.",
      intent: "tasks",
      confidence: 0.8,
      suggestedRoute: "/admin/operacional",
      cards: [
        { title: "Operacional", desc: "Tarefas, kanban e prazos", href: "/admin/operacional", color: "#3b82f6" },
      ],
    },
  },
  {
    keywords: ["lead", "proposta", "venda", "pipeline", "comercial", "crm"],
    result: {
      answer: "O GrowthOS gerencia leads, propostas e pipeline comercial — em breve disponível.",
      intent: "crm",
      confidence: 0.75,
      cards: [
        { title: "Dashboard", desc: "Visão geral do painel", href: "/admin/inicio", color: "#7b6ef6" },
      ],
    },
  },
  {
    keywords: ["equipe", "acesso", "membro", "solicitação", "solicitacao", "permissão", "permissao"],
    result: {
      answer: "A seção de equipe gerencia membros, permissões e solicitações de acesso.",
      intent: "team",
      confidence: 0.85,
      suggestedRoute: "/admin/equipe",
      cards: [
        { title: "Equipe", desc: "Gerenciar membros e acessos", href: "/admin/equipe", color: "#7b6ef6" },
      ],
    },
  },
  {
    keywords: ["status", "sistema", "integração", "integracao", "saúde", "saude", "configuração", "configuracao"],
    result: {
      answer: "O painel de status mostra a saúde de todas as integrações e módulos do sistema.",
      intent: "system_status",
      confidence: 0.85,
      suggestedRoute: "/admin/status",
      cards: [
        { title: "Status do sistema", desc: "Saúde das integrações", href: "/admin/status", color: "#10b981" },
        { title: "Fontes de dados", desc: "Cardápio digital e Meta", href: "/admin/fontes-dados", color: "#3b82f6" },
      ],
    },
  },
];

function keywordSearch(query: string): SearchResult {
  const q = query.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  for (const entry of KEYWORD_MAP) {
    if (entry.keywords.some((kw) => q.includes(kw))) {
      return entry.result;
    }
  }
  return {
    answer: "Não encontrei uma resposta específica. Tente navegar pelo painel ou refinar sua busca.",
    intent: "unknown",
    confidence: 0.2,
    cards: [
      { title: "Início", desc: "Visão geral do painel", href: "/admin/inicio", color: "#7b6ef6" },
      { title: "Clientes", desc: "Lista de clientes", href: "/admin/clientes", color: "#a855f7" },
      { title: "Fontes de dados", desc: "Status das integrações", href: "/admin/fontes-dados", color: "#3b82f6" },
    ],
  };
}

const SYSTEM_PROMPT = `Você é o assistente de busca do Lokat OS, um sistema de gestão de marketing e conteúdo para agências e empresas.
Responda perguntas sobre a plataforma de forma direta e útil.
Retorne um JSON com os campos: answer (string, resposta direta), intent (string, intenção da busca), confidence (0-1), cards (array de {title, desc, href, color}), suggestedRoute (string opcional, rota principal sugerida).
Módulos disponíveis: ContentOS (/admin/contentos), Faturamento (/admin/relatorios/faturamento), Insights Meta (/admin/contentos/insights), Operacional (/admin/operacional), Equipe (/admin/equipe), Conexões (/admin/conexoes), Fontes de Dados (/admin/fontes-dados), Status (/admin/status).
Use cores hex: ContentOS=#a855f7, Faturamento=#10b981, Meta=#7b6ef6, Operacional=#3b82f6, Equipe=#f59e0b, default=#7b6ef6.
Responda sempre em português. Seja conciso.`;

async function openaiSearch(query: string): Promise<SearchResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: query },
        ],
        response_format: { type: "json_object" },
        max_tokens: 600,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as Partial<SearchResult>;
    if (!parsed.answer || !parsed.cards) return null;
    return {
      answer: parsed.answer,
      intent: parsed.intent ?? "unknown",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.7,
      cards: Array.isArray(parsed.cards) ? parsed.cards.slice(0, 4) : [],
      suggestedRoute: parsed.suggestedRoute,
    };
  } catch {
    return null;
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });
  }

  let query = "";
  try {
    const body = await request.json() as { query?: unknown };
    query = typeof body.query === "string" ? body.query.trim() : "";
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 });
  }

  if (!query || query.length < 2) {
    return NextResponse.json({ ok: false, reason: "query_too_short" }, { status: 400 });
  }
  if (query.length > 300) {
    return NextResponse.json({ ok: false, reason: "query_too_long" }, { status: 400 });
  }

  const aiResult = await openaiSearch(query);
  const result = aiResult ?? keywordSearch(query);

  return NextResponse.json({
    ok: true,
    source: aiResult ? "openai" : "keyword",
    query,
    ...result,
  });
}
