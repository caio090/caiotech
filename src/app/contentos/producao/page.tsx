import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { FileText, ScrollText, Palette, Video, Film } from "lucide-react";
import type { DbContentItem } from "@/lib/supabase/types";

const STATUS_LABEL: Record<string, string> = {
  briefing:        "Briefing",
  em_producao:     "Em produção",
  edicao:          "Edição",
  revisao_interna: "Revisão interna",
  ajuste:          "Ajuste",
};

const STATUS_COLOR: Record<string, string> = {
  briefing:        "bg-blue-50 text-blue-700 border-blue-100",
  em_producao:     "bg-indigo-50 text-indigo-700 border-indigo-100",
  edicao:          "bg-amber-50 text-amber-700 border-amber-100",
  revisao_interna: "bg-orange-50 text-orange-700 border-orange-100",
  ajuste:          "bg-red-50 text-red-700 border-red-100",
};

const TYPE_ICON: Record<string, React.ElementType> = {
  roteiro: ScrollText, arte: Palette, video: Video,
};

export default async function ContentosProducaoPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const params         = await searchParams;
  const activeClientId = params.client ?? null;

  let inProduction: DbContentItem[] = [];
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
            .select("*")
            .eq("client_id", clientId)
            .in("status", ["briefing", "em_producao", "edicao", "revisao_interna", "ajuste"])
            .order("created_at", { ascending: false })
            .limit(30);
          inProduction = data ?? [];
        }
      }
    } catch {}
  }

  return (
    <>
      <PageHeader
        title="Produção"
        description={companyName ? `Conteúdos em execução para ${companyName}` : "Conteúdos em execução"}
      />

      {inProduction.length === 0 ? (
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-10 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Film className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-bold text-gray-700 mb-1">Nenhum conteúdo em produção</p>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Conteúdos em briefing, produção, edição ou revisão interna aparecem aqui com status atualizado em tempo real.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {inProduction.map((item) => {
            const Icon = TYPE_ICON[item.type ?? ""] ?? FileText;
            return (
              <div key={item.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-purple-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{item.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {item.channel ?? "—"} · {item.type ?? "—"}
                    {item.scheduled_date ? ` · ${new Date(item.scheduled_date).toLocaleDateString("pt-BR")}` : ""}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${STATUS_COLOR[item.status] ?? "bg-gray-50 text-gray-600 border-gray-100"}`}>
                  {STATUS_LABEL[item.status] ?? item.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
