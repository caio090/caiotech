import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { redirect } from "next/navigation";
import { CalendarDays, ExternalLink } from "lucide-react";

interface Meeting {
  id: string;
  title: string;
  scheduled_at: string;
  duration_min: number | null;
  status: string;
  meet_link: string | null;
  notes: string | null;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    agendada:    { label: "Agendada",    cls: "bg-violet-100 text-violet-700" },
    realizada:   { label: "Realizada",   cls: "bg-emerald-100 text-emerald-700" },
    cancelada:   { label: "Cancelada",   cls: "bg-red-100 text-red-700" },
    reagendada:  { label: "Reagendada",  cls: "bg-amber-100 text-amber-700" },
  };
  const cfg = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>;
}

export default async function ReunioesPage() {
  let meetings: Meeting[] = [];

  if (isSupabaseConfigured) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const role = profile?.role ?? "";

    let q = supabase
      .from("commercial_meetings")
      .select("id, title, scheduled_at, duration_min, status, meet_link, notes")
      .order("scheduled_at", { ascending: false })
      .limit(30);

    if (role !== "admin") {
      q = q.or(`responsible_id.eq.${user.id},created_by.eq.${user.id}`);
    }

    const { data } = await q;
    meetings = (data as Meeting[]) ?? [];
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-violet-600" />
          Reuniões
        </h1>
        <p className="text-sm text-gray-500 mt-1">{meetings.length} reunião(ões) encontrada(s)</p>
      </div>

      {meetings.length === 0 ? (
        <div className="text-center py-16">
          <CalendarDays className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-sm font-medium text-gray-600 mb-1">Nenhuma reunião agendada ainda.</p>
          <p className="text-xs text-gray-400">Reuniões comerciais aparecerão aqui conforme forem criadas.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {meetings.map((m) => {
              const dt = new Date(m.scheduled_at);
              return (
                <div key={m.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="text-center w-12 flex-shrink-0 bg-violet-50 rounded-xl px-2 py-2">
                    <p className="text-base font-black text-violet-700 leading-none">{dt.getDate()}</p>
                    <p className="text-[10px] text-violet-500">{dt.toLocaleDateString("pt-BR", { month: "short" })}</p>
                    <p className="text-[10px] text-violet-400 mt-0.5">{dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-gray-900 truncate">{m.title}</p>
                      <StatusBadge status={m.status} />
                    </div>
                    {m.duration_min && <p className="text-xs text-gray-400">{m.duration_min} min</p>}
                    {m.notes && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{m.notes}</p>}
                    {m.meet_link && (
                      <a href={m.meet_link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block">
                        <ExternalLink className="w-3.5 h-3.5 inline mr-1" strokeWidth={1.5} />Link da reunião
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
