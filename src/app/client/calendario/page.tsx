import { PageHeader } from "@/components/page-header";
import { CalendarMock } from "@/components/calendar-mock";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { dbStatusToUi } from "@/lib/supabase/types";
import { Calendar } from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  platform: string;
  type: string;
  status: string;
  date: string;
}

function safeDate(raw: string): string | null {
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default async function ClientCalendarioPage() {
  let realEvents: CalendarEvent[] | null = null;
  let isDemo = true;

  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();

  if (isSupabaseConfigured) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: clientData } = await supabase
          .from("clients")
          .select("id")
          .eq("owner_id", user.id)
          .maybeSingle();
        if (clientData) {
          const { data } = await supabase
            .from("content_items")
            .select("id, title, type, channel, status, scheduled_date")
            .eq("client_id", clientData.id)
            .not("scheduled_date", "is", null)
            .order("scheduled_date", { ascending: true });
          if (data) {
            realEvents = data.map((c) => ({
              id:       c.id,
              title:    c.title ?? "Sem título",
              platform: c.channel?.split(",")[0]?.trim() ?? "Instagram",
              type:     c.type ?? "post",
              status:   dbStatusToUi(c.status),
              date:     c.scheduled_date!,
            }));
            isDemo = false;
          }
        }
      }
    } catch (e) {
      console.error("[client/calendario] Supabase fetch error:", e);
    }
  }

  const displayEvents = realEvents ?? [];

  return (
    <div>
      <PageHeader
        title="Calendário de Publicações"
        description="Veja tudo que está planejado para o mês"
      />

      {isDemo && (
        <div className="mb-4 flex items-center gap-2 text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
          Modo demonstração — nenhum conteúdo agendado
        </div>
      )}

      <CalendarMock events={displayEvents} year={year} month={month} />

      <div className="mt-4 space-y-2">
        {displayEvents.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p className="text-sm font-medium text-gray-500">Nenhuma publicação agendada.</p>
            <p className="text-xs text-gray-400 mt-1">
              Os conteúdos agendados pela equipe aparecerão aqui.
            </p>
          </div>
        ) : (
          displayEvents.map((e) => {
            const dateLabel = safeDate(e.date) ?? "Sem data definida";
            return (
              <div key={e.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
                <div className="text-sm font-bold text-gray-600 w-14 flex-shrink-0">{dateLabel}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{e.title}</p>
                  <p className="text-xs text-gray-400">{e.platform} · {e.type}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                  e.status === "published"  ? "bg-emerald-100 text-emerald-700" :
                  e.status === "scheduled"  ? "bg-blue-100 text-blue-700"      :
                  "bg-gray-100 text-gray-600"
                }`}>
                  {e.status === "published" ? "Publicado" : e.status === "scheduled" ? "Agendado" : "Rascunho"}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
