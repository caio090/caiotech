import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { validateContentOSClient } from "@/lib/admin-contentos-clients";
import { ContentosSubNav } from "../_contentos-subnav";
import { PageHeader } from "@/components/page-header";
import { Radar, TrendingUp, Zap, AlertCircle, Calendar, Image, Clock } from "lucide-react";

export default async function AdminContentosRadarPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const params   = await searchParams;
  const clientId = params.client ?? null;

  if (!clientId) redirect("/admin/contentos/selecionar-cliente");

  let companyName = "";

  if (isSupabaseConfigured) {
    const valid = await validateContentOSClient(clientId);
    if (!valid) redirect("/admin/contentos/selecionar-cliente");
    companyName = valid.company_name ?? "";
  }

  return (
    <>
      <ContentosSubNav />
      <PageHeader
        title="Radar de Tendências"
        description={`Tendências, eventos e oportunidades de conteúdo para ${companyName}`}
      />

      {/* Aviso de fase */}
      <div className="mb-6 flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
        <Radar className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
        <div>
          <p className="text-sm font-bold text-indigo-800">Radar em fase de estruturação</p>
          <p className="text-xs text-indigo-600 mt-0.5 leading-relaxed">
            Esta área mostrará tendências, atualizações de plataformas e oportunidades sazonais
            para inspirar conteúdos e campanhas. Futuramente integra Google Trends, Meta Insights e fontes editoriais.
            Os cards abaixo são modelos conceituais — não representam dados atuais.
          </p>
        </div>
      </div>

      {/* Cards de tendência — modelos conceituais */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {EXAMPLE_TRENDS.map((t) => (
          <TrendCard key={t.id} trend={t} />
        ))}
      </div>

      {/* Status futuro */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl p-5">
        <p className="text-xs font-black text-purple-400 uppercase tracking-wider mb-3">Próximas integrações previstas</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Google Trends", icon: TrendingUp, note: "Tendências de busca em tempo real" },
            { label: "Meta Insights",  icon: Zap,        note: "Formatos e temas em alta no Instagram" },
            { label: "Fontes editoriais", icon: AlertCircle, note: "Notícias e acontecimentos relevantes" },
            { label: "Datas sazonais", icon: Calendar, note: "Calendário de oportunidades da marca" },
          ].map(({ label, icon: Icon, note }) => (
            <div key={label} className="bg-white/70 rounded-xl border border-purple-100 p-3">
              <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
                <Icon className="w-3.5 h-3.5 text-purple-500" strokeWidth={1.5} />
              </div>
              <p className="text-xs font-bold text-gray-800">{label}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{note}</p>
              <span className="text-[9px] font-bold text-purple-400 bg-purple-50 px-1.5 py-0.5 rounded-full mt-1.5 inline-block">Em breve</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ── Tipos ─────────────────────────────────────────────── */

type TrendType = "trend_conteudo" | "evento_cultural" | "atualizacao_plataforma" | "oportunidade_sazonal" | "alerta_formato";
type TrendStatus = "criar_agora" | "testar" | "acompanhar" | "ignorar";
type TrendImpact = "alto" | "medio" | "baixo";

interface ExampleTrend {
  id: string;
  type: TrendType;
  title: string;
  description: string;
  impact: TrendImpact;
  urgency: string;
  recommendation: string;
  formats: string[];
  niches: string[];
  status: TrendStatus;
}

/* ── TrendCard ─────────────────────────────────────────── */

const TYPE_LABELS: Record<TrendType, { label: string; color: string }> = {
  trend_conteudo:       { label: "Trend de conteúdo",       color: "bg-pink-50 text-pink-700 border-pink-100" },
  evento_cultural:      { label: "Evento cultural",          color: "bg-amber-50 text-amber-700 border-amber-100" },
  atualizacao_plataforma: { label: "Atualização de plataforma", color: "bg-blue-50 text-blue-700 border-blue-100" },
  oportunidade_sazonal: { label: "Oportunidade sazonal",    color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  alerta_formato:       { label: "Alerta de formato",        color: "bg-red-50 text-red-700 border-red-100" },
};

const STATUS_LABELS: Record<TrendStatus, { label: string; color: string }> = {
  criar_agora: { label: "Criar agora", color: "bg-emerald-600 text-white" },
  testar:      { label: "Testar",      color: "bg-purple-100 text-purple-700" },
  acompanhar:  { label: "Acompanhar",  color: "bg-amber-100 text-amber-700" },
  ignorar:     { label: "Ignorar",     color: "bg-gray-100 text-gray-500" },
};

const IMPACT_ICONS: Record<TrendImpact, string> = {
  alto: "🔥", medio: "⚡", baixo: "💡",
};

function TrendCard({ trend }: { trend: ExampleTrend }) {
  const type   = TYPE_LABELS[trend.type];
  const status = STATUS_LABELS[trend.status];

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${type.color}`}>{type.label}</span>
          <p className="text-sm font-bold text-gray-900 mt-1.5 leading-tight">{trend.title}</p>
        </div>
        <span className="text-base flex-shrink-0 mt-0.5">{IMPACT_ICONS[trend.impact]}</span>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">{trend.description}</p>

      {/* Urgência e recomendação */}
      <div className="space-y-1.5">
        <div className="flex items-start gap-1.5">
          <Clock className="w-3 h-3 text-gray-300 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-gray-500">{trend.urgency}</p>
        </div>
        <div className="flex items-start gap-1.5">
          <Zap className="w-3 h-3 text-purple-300 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-gray-600 font-medium">{trend.recommendation}</p>
        </div>
      </div>

      {/* Formatos */}
      <div className="flex flex-wrap gap-1">
        {trend.formats.map((f) => (
          <span key={f} className="inline-flex items-center gap-0.5 text-[9px] font-medium bg-purple-50 text-purple-700 border border-purple-100 px-1.5 py-0.5 rounded-full">
            <Image className="w-2 h-2" />{f}
          </span>
        ))}
      </div>

      {/* Nichos */}
      <div className="flex flex-wrap gap-1">
        {trend.niches.map((n) => (
          <span key={n} className="text-[9px] text-gray-400 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded-full">{n}</span>
        ))}
      </div>

      {/* Status + modelo */}
      <div className="flex items-center justify-between mt-auto pt-1 border-t border-gray-50">
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
        <span className="text-[9px] text-gray-300 italic">modelo conceitual</span>
      </div>
    </div>
  );
}

/* ── Dados de exemplo ──────────────────────────────────── */

const EXAMPLE_TRENDS: ExampleTrend[] = [
  {
    id:             "t1",
    type:           "trend_conteudo",
    title:          "Trend de Reels com fundo de texto minimalista",
    description:    "Vídeos curtos com texto grande no centro e fundo limpo estão gerando alto alcance orgânico. Funciona para marcas de qualquer nicho.",
    impact:         "alto",
    urgency:        "Janela de 1 a 2 semanas antes de saturar",
    recommendation: "Criar 2 a 3 Reels curtos com essa estrutura visual adaptados para a marca",
    formats:        ["Reels", "Stories", "TikTok"],
    niches:         ["Alimentação", "Beleza", "Serviços"],
    status:         "criar_agora",
  },
  {
    id:             "t2",
    type:           "evento_cultural",
    title:          "Copa do Mundo / Grande evento esportivo",
    description:    "Eventos esportivos globais criam janelas curtas de altíssimo engajamento. Marcas que entram cedo com conteúdo relevante ganham visibilidade extra.",
    impact:         "alto",
    urgency:        "Planejar com 2 semanas de antecedência",
    recommendation: "Criar série temática de posts e reels com identidade visual da marca ligada ao evento",
    formats:        ["Reels", "Stories", "Carrossel", "Anúncio"],
    niches:         ["Varejo", "Alimentação", "Moda", "Serviços"],
    status:         "acompanhar",
  },
  {
    id:             "t3",
    type:           "atualizacao_plataforma",
    title:          "Instagram priorizando Reels com legendas automáticas",
    description:    "O algoritmo do Instagram tem favorecido Reels que usam legendas automáticas ativadas. Vídeos sem legenda perdem alcance orgânico.",
    impact:         "medio",
    urgency:        "Aplicar já nos próximos vídeos",
    recommendation: "Ativar legenda automática em todos os Reels e revisar os 5 últimos publicados",
    formats:        ["Reels"],
    niches:         ["Todos"],
    status:         "testar",
  },
  {
    id:             "t4",
    type:           "oportunidade_sazonal",
    title:          "Data sazonal local de alto potencial",
    description:    "Aniversário de cidade, festa junina, carnaval, semana do cliente e outras datas regionais costumam gerar alto engajamento local.",
    impact:         "medio",
    urgency:        "Planejar com 10 dias de antecedência",
    recommendation: "Criar conteúdo temático conectado com a identidade da marca e a data regional",
    formats:        ["Stories", "Feed", "Carrossel"],
    niches:         ["Todos"],
    status:         "acompanhar",
  },
  {
    id:             "t5",
    type:           "alerta_formato",
    title:          "Carrosséis longos perdendo alcance no Instagram",
    description:    "Carrosséis com mais de 10 slides estão recebendo menos distribuição. O formato ideal atual gira entre 4 e 7 slides por post.",
    impact:         "medio",
    urgency:        "Ajustar nos próximos carrosséis da grade",
    recommendation: "Limitar novos carrosséis a 5 a 7 slides e concentrar no gancho dos primeiros 2",
    formats:        ["Carrossel"],
    niches:         ["Todos"],
    status:         "testar",
  },
  {
    id:             "t6",
    type:           "trend_conteudo",
    title:          "GTA 6 e cultura pop gerando onda de memes e referências",
    description:    "Lançamentos culturais massivos criam janelas curtas onde marcas que se conectam ao tema ganham alto alcance com baixo custo.",
    impact:         "baixo",
    urgency:        "Aproveitar enquanto o assunto está em alta",
    recommendation: "Criar um post leve e criativo que conecte o tema ao universo da marca, sem forçar",
    formats:        ["Reels", "Stories", "Feed"],
    niches:         ["Tecnologia", "Varejo", "Moda"],
    status:         "testar",
  },
];
