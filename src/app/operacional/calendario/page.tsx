import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { PageHeader } from "@/components/page-header";
import { CalendarMock } from "@/components/calendar-mock";
import { CalendarDays } from "lucide-react";

export default async function OperacionalCalendarioPage() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();

  interface CalendarEvent {
    id: string; title: string; platform: string;
    type: string; status: string; date: string;
  }

  let events: CalendarEvent[] = [];

  if (isSupabaseConfigured) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
        const role = profile?.role ?? "operacional";

        const { data, error } = await supabase
          .from("operational_tasks")
          .select("id, title, task_type, channel, status, due_date")
          .or(`assigned_to.eq.${user.id},assigned_role.eq.${role}`)
          .not("due_date", "is", null)
          .order("due_date", { ascending: true });

        if (!error && data) {
          events = data
            .filter(t => t.due_date)
            .map(t => ({
              id:       t.id,
              title:    t.title,
              platform: t.channel ?? "Geral",
              type:     t.task_type ?? "outro",
              status:   t.status,
              date:     t.due_date!,
            }));
        }
      }
    } catch {}
  }

  return (
    <div>
      <PageHeader
        title="Calendário Operacional"
        description="Prazos e entregas da equipe"
      />
      <CalendarMock events={events} year={year} month={month} />

      <div className="mt-4 space-y-2">
        {events.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <CalendarDays className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p className="text-sm font-medium text-gray-500">Nenhuma entrega para este mês.</p>
            <p className="text-xs text-gray-400 mt-1">Os prazos aparecerão aqui quando houver tarefas com data de entrega.</p>
          </div>
        ) : (
          events.map(e => (
            <div key={e.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
              <div className="text-sm font-bold text-gray-600 w-14 flex-shrink-0">
                {new Date(e.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{e.title}</p>
                <p className="text-xs text-gray-400">{e.platform} · {e.type}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
