import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireAdminContentOSContext } from "@/lib/admin-contentos-api";
import { resolveClientContext } from "@/lib/rec-os-client-context";
import { ContentosSubNavServer } from "../_contentos-subnav-server";
import { getContentOSSuggestions } from "@/lib/ai-suggestions";
import { SmartSuggestionsPanel } from "@/components/smart-suggestions-panel";
import { MetaInsightsPanel } from "../insights/_meta-insights-panel";
import {
  BarChart3, Radar as RadarIcon, FileText, TrendingUp, Sparkles,
  Lightbulb, Download, Clock, Factory
} from "lucide-react";
import Link from "next/link";

type Tab = "desempenho" | "oportunidades" | "relatorios";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "desempenho",   label: "Desempenho",   icon: BarChart3 },
  { id: "oportunidades",label: "Oportunidades", icon: RadarIcon },
  { id: "relatorios",   label: "Relatórios",    icon: FileText  },
];

const STATUS_LABELS: Record<string, string> = {
  ideia: "Ideia", briefing: "Briefing", producao: "Produção",
  edicao: "Edição", revisao_interna: "Revisão interna",
  enviado_aprovacao: "Aguard. aprovação", aprovado: "Aprovado",
  pronto_para_agendar: "Pronto p/ agendar", agendado: "Agendado",
  publicado: "Publicado", em_producao: "Em produção",
};

const STATUS_COLOR: Record<string, string> = {
  ideia: "bg-gray-100 text-gray-600", briefing: "bg-blue-50 text-blue-700",
  em_producao: "bg-indigo-50 text-indigo-700", enviado_aprovacao: "bg-amber-50 text-amber-700",
  aprovado: "bg-emerald-50 text-emerald-700", pronto_para_agendar: "bg-teal-50 text-teal-700",
  agendado: "bg-sky-50 text-sky-700", publicado: "bg-purple-50 text-purple-700",
};

type ContentRow = {
  id: string; title: string; status: string; type: string | null;
  channel: string | null; created_at: string; scheduled_date: string | null;
  client_id?: string; client_name?: string | null;
};

export default async function ResultadosPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; tab?: string }>;
}) {
  const params   = await searchParams;
  const clientId = params.client ?? null;
  const tab      = (params.tab ?? "desempenho") as Tab;

  let companyName = "";
  let contents: ContentRow[] = [];
  const suggestions: Awaited<ReturnType<typeof getContentOSSuggestions>> = [];
  let clientStatus: "absent" | "valid" | "invalid" = "absent";

  if (isSupabaseConfigured) {
    const ctx = await requireAdminContentOSContext();
    if (!(ctx instanceof Response)) {
      const { adminDb } = ctx;
      const clientContext = await resolveClientContext(adminDb, clientId);
      clientStatus = clientContext.status;

      if (clientContext.status === "valid") {
        companyName = clientContext.companyName;

        const { data } = await adminDb
          .from("content_items")
          .select("id, title, status, type, channel, created_at, scheduled_date")
          .eq("client_id", clientContext.clientId)
          .order("created_at", { ascending: false })
          .limit(100);
        contents = (data ?? []) as ContentRow[];
        // getContentOSSuggestions expects a real Supabase client (RLS
        // helpers it calls directly) — kept on the per-client path only,
        // same as before this hotfix.
      } else if (clientContext.status === "absent") {
        // Fase 6 do hotfix canônico 1.0.1 — modo global: sem client na URL,
        // agrega entre clientes visíveis (nunca redireciona ao seletor).
        // Suggestions (getContentOSSuggestions) são por cliente por design —
        // não fazem sentido agregadas, então ficam vazias neste modo.
        const { data: contentData } = await adminDb
          .from("content_items")
          .select("id, title, status, type, channel, created_at, scheduled_date, client_id, clients(company_name)")
          .order("created_at", { ascending: false })
          .limit(200);
        contents = ((contentData ?? []) as Array<ContentRow & { clients?: { company_name?: string | null } | null }>).map((c) => ({
          ...c,
          client_name: c.clients?.company_name ?? null,
        }));
      }
    }
  }

  const total     = contents.length;
  const published = contents.filter(c => c.status === "publicado").length;
  const pending   = contents.filter(c => c.status === "enviado_aprovacao").length;
  const ready     = contents.filter(c => c.status === "pronto_para_agendar").length;
  const inProd    = contents.filter(c =>
    ["briefing", "em_producao", "edicao", "revisao_interna"].includes(c.status)
  ).length;

  const byType: Record<string, number> = {};
  contents.forEach(c => { if (c.type) byType[c.type] = (byType[c.type] ?? 0) + 1; });
  const topTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const byChannel: Record<string, number> = {};
  contents.forEach(c => {
    const ch = c.channel?.split(",")[0]?.trim();
    if (ch) byChannel[ch] = (byChannel[ch] ?? 0) + 1;
  });
  const topChannels = Object.entries(byChannel).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const byStatus: Record<string, number> = {};
  contents.forEach(c => { byStatus[c.status] = (byStatus[c.status] ?? 0) + 1; });

  function tabHref(t: Tab) {
    return clientId
      ? `/admin/contentos/resultados?tab=${t}&client=${clientId}`
      : `/admin/contentos/resultados?tab=${t}`;
  }

  return (
    <>
      <ContentosSubNavServer initialClientId={clientId ?? undefined} />

      {/* Section header */}
      <div className="mb-5">
        <h1 className="text-lg font-bold text-gray-900">Resultados</h1>
        <p className="text-xs text-gray-400 mt-0.5">{clientId && clientStatus === "valid" ? companyName : "Todos os clientes"}</p>
      </div>

      {clientStatus === "invalid" && (
        <div className="mb-5 bg-red-50 border border-red-100 rounded-2xl p-4 text-xs text-red-700">
          Cliente não encontrado ou sem acesso para o ID informado na URL. Selecione outro cliente ou remova o filtro para ver todos.
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-100 pb-0">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <Link
              key={id}
              href={tabHref(id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-colors ${
                active
                  ? "border-purple-600 text-purple-700 bg-purple-50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          );
        })}
      </div>

      {suggestions.length > 0 && (
        <SmartSuggestionsPanel suggestions={suggestions} compact className="mb-5" />
      )}

      {/* ── DESEMPENHO ──────────────────────────────────────────────────────── */}
      {tab === "desempenho" && (
        <>
          {clientId && clientStatus === "valid" ? (
            <MetaInsightsPanel clientId={clientId} />
          ) : (
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-5 text-xs text-gray-500">
              Selecione um cliente para ver os Meta Insights (Instagram/Facebook) — essa integração é por conta conectada, não agrega entre clientes.
            </div>
          )}

          {total === 0 ? (
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-10 text-center">
              <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="w-6 h-6 text-purple-400" />
              </div>
              <p className="text-sm font-bold text-gray-700 mb-1">Nenhum dado disponível ainda</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Os dados de desempenho aparecerão conforme conteúdos forem criados e publicados.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Total de conteúdos",    value: total,     color: "bg-gray-50 border-gray-100" },
                  { label: "Publicados",             value: published, color: "bg-purple-50 border-purple-100" },
                  { label: "Aguardando aprovação",   value: pending,   color: "bg-amber-50 border-amber-100" },
                  { label: "Prontos p/ agendar",     value: ready,     color: "bg-emerald-50 border-emerald-100" },
                ].map(({ label, value, color }) => (
                  <div key={label} className={`rounded-2xl border p-4 ${color}`}>
                    <p className="text-2xl font-black text-gray-900">{value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              <div className="grid lg:grid-cols-3 gap-5 mb-6">
                <div className="bg-white border border-gray-100 rounded-2xl p-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-3">Distribuição por status</p>
                  <div className="space-y-2">
                    {Object.entries(byStatus)
                      .sort((a, b) => b[1] - a[1])
                      .map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[status] ?? "bg-gray-50 text-gray-600"}`}>
                            {STATUS_LABELS[status] ?? status}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-purple-400 rounded-full" style={{ width: `${(count / total) * 100}%` }} />
                            </div>
                            <span className="text-xs font-bold text-gray-700 w-5 text-right">{count}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl p-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-3">Tipos de conteúdo</p>
                  {topTypes.length === 0 ? (
                    <p className="text-xs text-gray-300">Nenhum tipo registrado</p>
                  ) : (
                    <div className="space-y-2">
                      {topTypes.map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <span className="text-xs text-gray-600 capitalize">{type}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${(count / total) * 100}%` }} />
                            </div>
                            <span className="text-xs font-bold text-gray-700 w-5 text-right">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl p-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-3">Canais</p>
                  {topChannels.length === 0 ? (
                    <p className="text-xs text-gray-300">Nenhum canal registrado</p>
                  ) : (
                    <div className="space-y-2">
                      {topChannels.map(([channel, count]) => (
                        <div key={channel} className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">{channel}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-pink-400 rounded-full" style={{ width: `${(count / total) * 100}%` }} />
                            </div>
                            <span className="text-xs font-bold text-gray-700 w-5 text-right">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {inProd > 0 && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-5">
                  <p className="text-xs font-bold text-indigo-800 flex items-center gap-1.5">
                    <Factory className="w-3.5 h-3.5" />
                    {inProd} conteúdo{inProd !== 1 ? "s" : ""} em pipeline de produção agora
                  </p>
                </div>
              )}

              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl p-4">
                <p className="text-xs font-bold text-purple-800 mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Insights avançados · Fase futura
                </p>
                <p className="text-xs text-purple-600">
                  Integração com Instagram Insights, Meta Ads e Google Analytics trará dados de alcance, engajamento,
                  conversão, custo por resultado e recomendações automáticas para o próximo ciclo.
                </p>
              </div>
            </>
          )}
        </>
      )}

      {/* ── OPORTUNIDADES ────────────────────────────────────────────────────── */}
      {tab === "oportunidades" && (
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
            <p className="text-xs font-bold text-indigo-800 mb-1 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> O que é o Radar?
            </p>
            <p className="text-xs text-indigo-600">
              O Radar identifica tendências de mercado, momentos de atenção do público e lacunas de conteúdo
              detectadas pela IA — permitindo que a agência posicione o cliente na frente da concorrência.
            </p>
          </div>

          {[
            { label: "Tendências do segmento",     desc: "Tópicos em alta para o público do cliente",           status: "Em breve" },
            { label: "Gaps de conteúdo",           desc: "Formatos e canais com baixa exploração",              status: "Em breve" },
            { label: "Datas estratégicas",         desc: "Efemérides e sazonalidades para explorar",           status: "Em breve" },
            { label: "Benchmark de concorrentes",  desc: "Visão comparativa de frequência e engajamento",       status: "Em breve" },
            { label: "Alertas de oportunidade",    desc: "Notificações quando um tema ganhar tração rápida",    status: "Em breve" },
          ].map(({ label, desc, status }) => (
            <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-gray-800">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
              <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full whitespace-nowrap">{status}</span>
            </div>
          ))}

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
            <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-800">Radar alimentado por IA</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Quando conectado ao módulo de tendências, o Radar analisa volume de busca, engajamento em redes sociais
                e padrões de sazonalidade para sugerir pautas no momento certo.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── RELATÓRIOS ───────────────────────────────────────────────────────── */}
      {tab === "relatorios" && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: "Relatório mensal",     desc: "Resumo de produção, publicação e performance do mês",   icon: FileText },
              { label: "Relatório de campanha",desc: "Resultado consolidado por ciclo estratégico",            icon: BarChart3 },
              { label: "Relatório de período", desc: "Compare dois períodos e visualize evolução",             icon: Clock },
            ].map(({ label, desc, icon: Icon }) => (
              <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4">
                <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4 text-purple-500" />
                </div>
                <p className="text-xs font-bold text-gray-800">{label}</p>
                <p className="text-[11px] text-gray-400 mt-1">{desc}</p>
                <span className="inline-block mt-3 text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Em breve</span>
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-800">Exportação de dados</p>
              <p className="text-xs text-gray-400 mt-0.5">Exportar conteúdos, status e calendário em CSV ou PDF</p>
            </div>
            <button disabled className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl cursor-not-allowed opacity-60">
              <Download className="w-3.5 h-3.5" /> Exportar
            </button>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl p-4">
            <p className="text-xs font-bold text-purple-800 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Relatórios automáticos · Fase futura
            </p>
            <p className="text-xs text-purple-600">
              Relatórios gerados automaticamente por IA com análise de performance, recomendações e comparações
              com benchmarks do segmento. Compartilhamento direto com o cliente via link.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
