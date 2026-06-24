import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getOpUserCtx, fetchOpTasks, isTaskOverdue, fmtTaskDate, STATUS_LABELS } from "@/lib/operational-tasks";
import { PageHeader } from "@/components/page-header";
import { ClipboardList, AlertTriangle, CheckCircle2, Clock3, KanbanSquare } from "lucide-react";
import Link from "next/link";
import type { DbOperationalTask } from "@/lib/supabase/types";
import { SmartSuggestionsPanel } from "@/components/smart-suggestions-panel";
import { getOperationalSuggestions } from "@/lib/ai-suggestions";
import { CurrentUserCard } from "@/components/current-user-card";

export default async function OperacionalDashboardPage() {
  let tasks: DbOperationalTask[] = [];
  let roleDisplay = "Operacional";
  let suggestions: Awaited<ReturnType<typeof getOperationalSuggestions>> = [];
  let userName: string | null = null;
  let userRole: string | null = null;
  let userAvatarUrl: string | null = null;

  if (isSupabaseConfigured) {
    try {
      const supabase = await createServerSupabaseClient();
      const ctx      = await getOpUserCtx(supabase);

      if (ctx) {
        roleDisplay = ctx.roleDisplay;
        userRole    = ctx.primaryRole;
        tasks = await fetchOpTasks(supabase, ctx, { limit: 50 });
        suggestions = await getOperationalSuggestions(supabase, ctx.userId, ctx.allRoles);

        const { data: prof } = await supabase
          .from("profiles")
          .select("name, avatar_url")
          .eq("id", ctx.userId)
          .maybeSingle();
        userName      = prof?.name ?? null;
        userAvatarUrl = prof?.avatar_url ?? null;
      }
    } catch {}
  }

  const overdue = tasks.filter((t) => isTaskOverdue(t.due_date));
  const urgent  = tasks.filter((t) => t.priority === "urgente" || t.priority === "alta");
  const inProd  = tasks.filter((t) => t.status === "em_producao");

  return (
    <div className="space-y-6">
      <CurrentUserCard
        name={userName}
        role={userRole}
        avatarUrl={userAvatarUrl}
      />
      <PageHeader
        title="Dashboard"
        description={`${roleDisplay} · ${tasks.length} tarefa${tasks.length !== 1 ? "s" : ""} ativa${tasks.length !== 1 ? "s" : ""}`}
      />
      {suggestions.length > 0 && (
        <SmartSuggestionsPanel suggestions={suggestions} className="mb-2" />
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total ativo",  value: tasks.length,   icon: ClipboardList, color: "text-indigo-500", bg: "bg-indigo-50" },
          { label: "Em Produção",  value: inProd.length,  icon: KanbanSquare,  color: "text-purple-500", bg: "bg-purple-50" },
          { label: "Atrasadas",    value: overdue.length, icon: AlertTriangle, color: "text-red-500",    bg: "bg-red-50" },
          { label: "Urgentes",     value: urgent.length,  icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4">
            <div className={`w-8 h-8 ${bg} rounded-xl flex items-center justify-center mb-2`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-2xl font-black text-gray-900">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Task list */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-gray-800">Minhas tarefas</h2>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/operacional/minhas-tarefas" className="text-xs text-slate-500 hover:underline">
              Ver lista →
            </Link>
            <Link href="/operacional/kanban" className="text-xs text-indigo-500 hover:underline">
              Ver kanban →
            </Link>
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-10">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-gray-200" />
            <p className="text-sm text-gray-400">Nenhuma tarefa atribuída no momento.</p>
            <p className="text-xs text-gray-300 mt-1">Novas tarefas aparecerão aqui quando forem criadas pela ContentOS.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.slice(0, 10).map((t) => {
              const over    = isTaskOverdue(t.due_date);
              const dateStr = fmtTaskDate(t.due_date);
              return (
                <Link
                  key={t.id}
                  href="/operacional/minhas-tarefas"
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-colors hover:bg-gray-50/80 ${
                    over ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{t.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {t.clients?.[0]?.company_name
                        ? `${t.clients[0].company_name} · `
                        : ""}
                      {STATUS_LABELS[t.status] ?? t.status}
                    </p>
                  </div>
                  {t.due_date && (
                    <span className={`text-[10px] flex items-center gap-0.5 flex-shrink-0 ${over ? "text-red-600 font-medium" : "text-gray-400"}`}>
                      <Clock3 className="w-2.5 h-2.5" />
                      {dateStr}
                    </span>
                  )}
                  {(t.priority === "urgente" || t.priority === "alta") && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      t.priority === "urgente" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                    }`}>
                      {t.priority === "urgente" ? "Urgente" : "Alta"}
                    </span>
                  )}
                </Link>
              );
            })}
            {tasks.length > 10 && (
              <p className="text-center text-xs text-gray-400 pt-1">
                +{tasks.length - 10} tarefas —{" "}
                <Link href="/operacional/minhas-tarefas" className="text-indigo-500 hover:underline">ver todas</Link>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { href: "/operacional/briefings",    label: "Briefings",    desc: "Demandas recebidas",    color: "text-slate-600",  bg: "bg-slate-50" },
          { href: "/operacional/kanban",        label: "Kanban",       desc: "Visão de colunas",      color: "text-indigo-600", bg: "bg-indigo-50" },
          { href: "/operacional/calendario",    label: "Calendário",   desc: "Prazos e datas",        color: "text-purple-600", bg: "bg-purple-50" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${item.bg} border border-transparent hover:border-gray-200 rounded-2xl p-4 transition-all group`}
          >
            <p className={`text-sm font-bold ${item.color} mb-0.5`}>{item.label}</p>
            <p className="text-xs text-gray-400">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
