import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { BarChart3, Sparkles } from "lucide-react";
type ContentRow = { id: string; title: string; status: string; type: string | null; channel: string | null; created_at: string; scheduled_date: string | null };

const STATUS_LABELS: Record<string, string> = {
  ideia:               "Ideia",
  briefing:            "Briefing",
  em_producao:         "Em produção",
  edicao:              "Edição",
  revisao_interna:     "Revisão interna",
  enviado_aprovacao:   "Aguardando aprovação",
  aprovado:            "Aprovado",
  pronto_para_agendar: "Pronto p/ agendar",
  agendado:            "Agendado",
  publicado:           "Publicado",
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

export default async function ContentosInsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const params         = await searchParams;
  const activeClientId = params.client ?? null;

  let contents: ContentRow[] = [];
  let companyName = "";

  if (isSupabaseConfigured) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        let clientId: string | null = null;
        const { data: clientRow } = await supabase
          .from("clients").select("id, company_name").eq("owner_id", user.id).maybeSingle();

        if (clientRow) {
          clientId    = clientRow.id;
          companyName = clientRow.company_name ?? "";
        } else if (activeClientId) {
          clientId = activeClientId;
          const { data: cRow } = await supabase
            .from("clients").select("company_name").eq("id", activeClientId).maybeSingle();
          companyName = cRow?.company_name ?? "";
        }

        if (clientId) {
          const { data } = await supabase
            .from("content_items")
            .select("id, title, status, type, channel, created_at, scheduled_date")
            .eq("client_id", clientId)
            .order("created_at", { ascending: false })
            .limit(100);
          contents = data ?? [];
        }
      }
    } catch {}
  }

  const total     = contents.length;
  const published = contents.filter(c => c.status === "publicado").length;
  const pending   = contents.filter(c => c.status === "enviado_aprovacao").length;
  const ready     = contents.filter(c => c.status === "pronto_para_agendar").length;

  const byStatus: Record<string, number> = {};
  contents.forEach(c => { byStatus[c.status] = (byStatus[c.status] ?? 0) + 1; });

  const byType: Record<string, number> = {};
  contents.forEach(c => { if (c.type) byType[c.type] = (byType[c.type] ?? 0) + 1; });
  const topTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <>
      <PageHeader
        title="Insights"
        description={companyName ? `Performance de conteúdo para ${companyName}` : "Performance de conteúdo"}
      />

      {total === 0 ? (
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-10 text-center">
          <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <BarChart3 className="w-6 h-6 text-purple-400" />
          </div>
          <p className="text-sm font-bold text-gray-700 mb-1">Nenhum dado disponível ainda</p>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Os insights aparecerão conforme os conteúdos forem criados e publicados.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total de conteúdos",  value: total,     color: "bg-gray-50 border-gray-100" },
              { label: "Publicados",           value: published, color: "bg-purple-50 border-purple-100" },
              { label: "Aguardando aprovação", value: pending,   color: "bg-amber-50 border-amber-100" },
              { label: "Prontos p/ agendar",   value: ready,     color: "bg-emerald-50 border-emerald-100" },
            ].map(({ label, value, color }) => (
              <div key={label} className={`rounded-2xl border p-4 ${color}`}>
                <p className="text-2xl font-black text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-5 mb-6">
            <div className="bg-white border border-gray-100 rounded-2xl p-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-3">Distribuição por status</p>
              <div className="space-y-2">
                {Object.entries(byStatus).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
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
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl p-4">
            <p className="text-xs font-bold text-purple-800 mb-1 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Insights avançados · Fase futura</p>
            <p className="text-xs text-purple-600">
              Integração com Instagram Insights e Meta Ads trará dados de alcance, engajamento e conversão em tempo real.
            </p>
          </div>
        </>
      )}
    </>
  );
}
