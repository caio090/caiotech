import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateContentOSClient } from "@/lib/admin-contentos-clients";
import { ContentosSubNav } from "../_contentos-subnav";
import { PageHeader } from "@/components/page-header";
import { SmartSuggestionsPanel } from "@/components/smart-suggestions-panel";
import { getContentOSSuggestions } from "@/lib/ai-suggestions";
import { BarChart3 as BarChart3Icon, Factory, Sparkles, Smartphone, Link2 } from "lucide-react";

type ContentRow = { id: string; title: string; status: string; type: string | null; channel: string | null; created_at: string; scheduled_date: string | null };

const STATUS_LABELS: Record<string, string> = {
  ideia:               "Ideia",
  briefing:            "Briefing",
  producao:            "Produção",
  edicao:              "Edição",
  revisao_interna:     "Revisão interna",
  enviado_aprovacao:   "Aguardando aprovação",
  aprovado:            "Aprovado",
  pronto_para_agendar: "Pronto p/ agendar",
  agendado:            "Agendado",
  publicado:           "Publicado",
  em_producao:         "Em produção",
};

const STATUS_COLOR: Record<string, string> = {
  ideia:               "bg-gray-100 text-gray-600",
  briefing:            "bg-blue-50 text-blue-700",
  em_producao:         "bg-indigo-50 text-indigo-700",
  enviado_aprovacao:   "bg-amber-50 text-amber-700",
  aprovado:            "bg-emerald-50 text-emerald-700",
  pronto_para_agendar: "bg-teal-50 text-teal-700",
  agendado:            "bg-sky-50 text-sky-700",
  publicado:           "bg-purple-50 text-purple-700",
};

export default async function AdminContentosInsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const params   = await searchParams;
  const clientId = params.client ?? null;

  if (!clientId) redirect("/admin/contentos/selecionar-cliente");

  let companyName = "";
  let contents: ContentRow[] = [];
  let suggestions: Awaited<ReturnType<typeof getContentOSSuggestions>> = [];
  let metaStatus: { connected: boolean; page_name: string | null; instagram_username: string | null; reason?: string } = {
    connected: false, page_name: null, instagram_username: null,
  };

  if (isSupabaseConfigured) {
    const valid = await validateContentOSClient(clientId);
    if (!valid) redirect("/admin/contentos/selecionar-cliente");
    companyName = valid.company_name ?? "";

    try {
      const supabase = await createServerSupabaseClient();
      const [contentsRes, assetsRes] = await Promise.all([
        supabase
          .from("content_items")
          .select("id, title, status, type, channel, created_at, scheduled_date")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("client_meta_assets")
          .select("asset_type, asset_name, username")
          .eq("client_id", clientId),
      ]);
      contents = contentsRes.data ?? [];
      suggestions = await getContentOSSuggestions(supabase, clientId);

      if (!assetsRes.error && assetsRes.data && assetsRes.data.length > 0) {
        const rows = assetsRes.data as Array<{ asset_type: string; asset_name: string | null; username: string | null }>;
        const page = rows.find((r) => r.asset_type === "facebook_page");
        const ig   = rows.find((r) => r.asset_type === "instagram_business");
        metaStatus = { connected: true, page_name: page?.asset_name ?? null, instagram_username: ig?.username ?? null };
      } else if (assetsRes.error?.code !== "42P01") {
        metaStatus = { connected: false, page_name: null, instagram_username: null, reason: "not_linked" };
      }
    } catch {}
  }

  const total     = contents.length;
  const published = contents.filter(c => c.status === "publicado").length;
  const pending   = contents.filter(c => c.status === "enviado_aprovacao").length;
  const ready     = contents.filter(c => c.status === "pronto_para_agendar").length;
  const inProd    = contents.filter(c => ["briefing", "em_producao", "edicao", "revisao_interna"].includes(c.status)).length;

  // Count by type
  const byType: Record<string, number> = {};
  contents.forEach(c => { if (c.type) byType[c.type] = (byType[c.type] ?? 0) + 1; });
  const topTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Count by channel
  const byChannel: Record<string, number> = {};
  contents.forEach(c => {
    const ch = c.channel?.split(",")[0]?.trim();
    if (ch) byChannel[ch] = (byChannel[ch] ?? 0) + 1;
  });
  const topChannels = Object.entries(byChannel).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Status distribution
  const byStatus: Record<string, number> = {};
  contents.forEach(c => { byStatus[c.status] = (byStatus[c.status] ?? 0) + 1; });

  return (
    <>
      <ContentosSubNav />
      <PageHeader
        title="Insights"
        description={`Visão de performance de conteúdo para ${companyName}`}
      />
      {suggestions.length > 0 && (
        <SmartSuggestionsPanel suggestions={suggestions} compact className="mb-5" />
      )}

      {/* Bloco Meta / Instagram */}
      <div className={`mb-6 flex items-start gap-3 rounded-2xl border p-4 ${metaStatus.connected ? "bg-indigo-50 border-indigo-100" : "bg-gray-50 border-gray-100"}`}>
        <Smartphone className={`w-5 h-5 flex-shrink-0 mt-0.5 ${metaStatus.connected ? "text-indigo-500" : "text-gray-300"}`} strokeWidth={1.5} />
        <div className="flex-1">
          {metaStatus.connected ? (
            <>
              <p className="text-sm font-bold text-indigo-800">Meta conectada a este cliente</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {metaStatus.page_name && (
                  <span className="text-[10px] font-medium bg-white text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full">
                    📄 {metaStatus.page_name}
                  </span>
                )}
                {metaStatus.instagram_username && (
                  <span className="text-[10px] font-medium bg-white text-pink-700 border border-pink-100 px-2 py-0.5 rounded-full">
                    @{metaStatus.instagram_username}
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-600 mt-1.5">
                Insights em tempo real (alcance, engajamento, seguidores) estarão disponíveis em breve, após integração com a API de insights da Meta.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-gray-600">Meta não vinculada a este cliente</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Vincule uma Página Facebook ou Instagram Business para habilitar insights de alcance, engajamento e seguidores.
              </p>
              <a
                href="/admin/conexoes"
                className="inline-flex items-center gap-1.5 mt-2 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <Link2 className="w-3 h-3" />Ir para Conexões →
              </a>
            </>
          )}
        </div>
      </div>

      {total === 0 ? (
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-10 text-center">
          <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <BarChart3Icon className="w-6 h-6 text-purple-400" />
          </div>
          <p className="text-sm font-bold text-gray-700 mb-1">Nenhum dado disponível ainda</p>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Os insights aparecerão conforme os conteúdos forem criados, produzidos e publicados para este cliente.
          </p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total de conteúdos", value: total,     color: "bg-gray-50 border-gray-100" },
              { label: "Publicados",          value: published, color: "bg-purple-50 border-purple-100" },
              { label: "Aguardando aprovação",value: pending,   color: "bg-amber-50 border-amber-100" },
              { label: "Prontos p/ agendar",  value: ready,     color: "bg-emerald-50 border-emerald-100" },
            ].map(({ label, value, color }) => (
              <div key={label} className={`rounded-2xl border p-4 ${color}`}>
                <p className="text-2xl font-black text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-5 mb-6">
            {/* Status distribution */}
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

            {/* By type */}
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

            {/* By channel */}
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

          {/* Pipeline e em produção */}
          {inProd > 0 && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-5">
              <p className="text-xs font-bold text-indigo-800 flex items-center gap-1.5">
                <Factory className="w-3.5 h-3.5" />
                {inProd} conteúdo{inProd !== 1 ? "s" : ""} em pipeline de produção agora
              </p>
              <p className="text-[10px] text-indigo-600 mt-0.5">
                Conteúdos em estágio de briefing, produção, edição ou revisão interna.
              </p>
            </div>
          )}

          {/* Visão futura */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl p-4">
            <p className="text-xs font-bold text-purple-800 mb-1 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Insights avançados · Fase futura</p>
            <p className="text-xs text-purple-600">
              Integração com Instagram Insights, Meta Ads e Google Analytics trará dados de alcance, engajamento,
              conversão, custo por resultado e recomendações automáticas para o próximo ciclo.
            </p>
          </div>
        </>
      )}
    </>
  );
}
