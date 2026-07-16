import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateContentOSClient } from "@/lib/admin-contentos-clients";
import { ContentosCalendarioContent } from "@/app/contentos/calendario/_client-content";
import type { CalendarEvent } from "@/app/contentos/calendario/_client-content";
import { ContentosSubNavServer } from "../_contentos-subnav-server";
import { dbStatusToUi } from "@/lib/supabase/types";
import Link from "next/link";
import { CalendarDays, Clock, CheckCircle2, Calendar, Send } from "lucide-react";

type StatusTab = "todos" | "planejado" | "em_producao" | "em_aprovacao" | "aprovado" | "agendado" | "publicado";

const STATUS_TABS: { id: StatusTab; label: string; icon: React.ElementType; statuses?: string[] }[] = [
  { id: "todos",        label: "Todos",           icon: CalendarDays },
  { id: "planejado",    label: "Planejado",        icon: Calendar,     statuses: ["ideia", "briefing"] },
  { id: "em_producao",  label: "Em produção",      icon: Clock,        statuses: ["briefing", "em_producao", "edicao", "revisao_interna", "producao"] },
  { id: "em_aprovacao", label: "Em aprovação",     icon: Send,         statuses: ["enviado_aprovacao"] },
  { id: "aprovado",     label: "Aprovado",         icon: CheckCircle2, statuses: ["aprovado", "pronto_para_agendar"] },
  { id: "agendado",     label: "Agendado",         icon: Clock,        statuses: ["agendado"] },
  { id: "publicado",    label: "Publicado",        icon: CheckCircle2, statuses: ["publicado"] },
];

export default async function AdminContentosCalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; tab?: string }>;
}) {
  const params         = await searchParams;
  const activeClientId = params.client ?? null;
  const tab            = (params.tab ?? "todos") as StatusTab;

  if (!activeClientId) {
    redirect("/admin/contentos/selecionar-cliente");
  }

  let serverEvents: CalendarEvent[] | undefined = undefined;
  let companyName = "";

  if (isSupabaseConfigured) {
    const validClient = await validateContentOSClient(activeClientId);
    if (!validClient) {
      redirect("/admin/contentos/selecionar-cliente");
    }
    companyName = validClient.company_name ?? "";

    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const activeTab = STATUS_TABS.find(t => t.id === tab);
        const filterStatuses = activeTab?.statuses ?? null;

        let query = supabase
          .from("content_items")
          .select("id, title, type, channel, status, scheduled_date")
          .eq("client_id", activeClientId)
          .not("scheduled_date", "is", null)
          .order("scheduled_date", { ascending: true });

        if (filterStatuses) {
          query = query.in("status", filterStatuses);
        }

        const { data } = await query;

        if (data) {
          serverEvents = data.map((c) => ({
            id:       c.id,
            title:    c.title,
            platform: c.channel?.split(",")[0]?.trim() ?? "Instagram",
            status:   dbStatusToUi(c.status),
            date:     c.scheduled_date!,
            type:     c.type ?? undefined,
          }));
        }
      }
    } catch (e) {
      console.error("[admin/contentos/calendario] Supabase fetch error:", e);
    }
  }

  function tabHref(t: StatusTab) {
    return `/admin/contentos/calendario?tab=${t}&client=${activeClientId}`;
  }

  return (
    <>
      <ContentosSubNavServer initialClientId={activeClientId} />

      <div className="mb-4">
        <h1 className="text-lg font-bold text-gray-900">Calendário</h1>
        <p className="text-xs text-gray-400 mt-0.5">{companyName}</p>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-5 overflow-x-auto pb-1 scrollbar-none">
        {STATUS_TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <Link
              key={id}
              href={tabHref(id)}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                active
                  ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                  : "text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-3 h-3" />
              {label}
            </Link>
          );
        })}
      </div>

      <ContentosCalendarioContent serverEvents={serverEvents} />

      {/* Scheduling note */}
      <div className="mt-6 bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
        <p className="text-xs font-bold text-indigo-800 mb-1">Publicação manual ativa</p>
        <p className="text-xs text-indigo-600">
          Defina data, horário e canal para cada conteúdo. A publicação manual segue o calendário planejado aqui.
          Publicação automática estará disponível quando o Social Scheduler estiver configurado.
        </p>
      </div>
    </>
  );
}
