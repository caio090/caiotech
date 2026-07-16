import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateContentOSClient } from "@/lib/admin-contentos-clients";
import { ContentosSubNavServer } from "../_contentos-subnav-server";
import { PageHeader } from "@/components/page-header";
import { ScrollText, Palette, Video, FileText, ArrowRight, Lightbulb } from "lucide-react";
import Link from "next/link";
import type { DbContentItem } from "@/lib/supabase/types";
import { SmartSuggestionsPanel } from "@/components/smart-suggestions-panel";
import { getContentOSSuggestions } from "@/lib/ai-suggestions";

const STATUS_LABEL: Record<string, string> = {
  briefing:          "Briefing",
  em_producao:       "Em produção",
  edicao:            "Edição",
  revisao_interna:   "Revisão interna",
  ajuste:            "Ajuste",
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

export default async function AdminContentosProducaoPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const params   = await searchParams;
  const clientId = params.client ?? null;

  if (!clientId) redirect("/admin/contentos/selecionar-cliente");

  let companyName = "";
  let inProduction: DbContentItem[] = [];
  let suggestions: Awaited<ReturnType<typeof getContentOSSuggestions>> = [];

  if (isSupabaseConfigured) {
    const valid = await validateContentOSClient(clientId);
    if (!valid) redirect("/admin/contentos/selecionar-cliente");
    companyName = valid.company_name ?? "";

    try {
      const supabase = await createServerSupabaseClient();
      const { data } = await supabase
        .from("content_items")
        .select("*")
        .eq("client_id", clientId)
        .in("status", ["briefing", "em_producao", "edicao", "revisao_interna", "ajuste"])
        .order("created_at", { ascending: false })
        .limit(30);
      inProduction = data ?? [];
      suggestions = await getContentOSSuggestions(supabase, clientId);
    } catch {}
  }

  const criarHref = `/admin/contentos/criar?client=${clientId}`;

  return (
    <>
      <ContentosSubNavServer initialClientId={clientId} />
      <PageHeader
        title="Produção"
        description={`Conteúdos em execução para ${companyName}`}
      />
      {suggestions.length > 0 && (
        <SmartSuggestionsPanel suggestions={suggestions} compact className="mb-5" />
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(STATUS_LABEL).map(([key, label]) => {
            const count = inProduction.filter(c => c.status === key).length;
            if (count === 0) return null;
            return (
              <span key={key} className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${STATUS_COLOR[key]}`}>
                {label}: {count}
              </span>
            );
          })}
        </div>
        <Link
          href={criarHref}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          Novo briefing
        </Link>
      </div>

      {inProduction.length === 0 ? (
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-10 text-center">
          <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Video className="w-6 h-6 text-purple-400" />
          </div>
          <p className="text-sm font-bold text-gray-700 mb-1">Nenhum conteúdo em produção</p>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Quando um conteúdo aprovado for enviado para produção, ele aparecerá aqui com briefing, tipo, prazo e responsável.
          </p>
          <Link
            href={criarHref}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 bg-purple-50 px-3 py-2 rounded-xl hover:bg-purple-100 transition-colors"
          >
            Criar pauta <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {inProduction.map((item) => {
            const Icon = TYPE_ICON[item.type ?? ""] ?? FileText;
            return (
              <div key={item.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4.5 h-4.5 text-purple-500" />
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

      {/* Distribuição para operacional */}
      <div className="mt-8 bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
        <p className="text-xs font-bold text-indigo-800 mb-1 flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5" /> Como funciona a produção
        </p>
        <p className="text-xs text-indigo-600">
          A REC OS cria estratégia, briefing, roteiro e direção criativa.
          Ao enviar para produção, uma tarefa é criada no Operacional para o responsável (designer, videomaker, editor ou social media).
          O resultado volta para aprovação do cliente.
        </p>
      </div>
    </>
  );
}
