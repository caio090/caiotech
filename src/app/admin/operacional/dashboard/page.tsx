import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { PageHeader } from "@/components/page-header";
import {
  ClipboardList, AlertCircle, Clock3, CheckCircle2,
  KanbanSquare, Users, AlertTriangle,
} from "lucide-react";
import Link from "next/link";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  due_date: string | null;
  client_id: string | null;
  clients?: { company_name: string | null }[] | null;
}

function isOverdue(d: string | null): boolean {
  if (!d) return false;
  return new Date(d) < new Date(new Date().toDateString());
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

const STATUS_LABEL: Record<string, string> = {
  backlog: "Backlog", briefing: "Briefing", em_producao: "Em Produção",
  revisao_interna: "Revisão Interna", ajuste: "Ajustes",
  aguardando_cliente: "Aguardando Cliente", aprovado: "Aprovado",
  agendado: "Agendado", publicado: "Publicado", concluido: "Concluído",
};

const PRIORITY_COLOR: Record<string, string> = {
  urgente: "bg-red-100 text-red-700",
  alta:    "bg-orange-100 text-orange-700",
  media:   "bg-blue-100 text-blue-700",
  baixa:   "bg-gray-100 text-gray-600",
};

export default async function AdminOperacionalDashboardPage() {
  let tasks: Task[] = [];
  let tableExists = false;

  if (isSupabaseConfigured) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("operational_tasks")
        .select("id, title, status, priority, due_date, client_id, clients(company_name)")
        .not("status", "in", '("concluido","cancelado","publicado")')
        .order("due_date", { ascending: true })
        .limit(50);
      if (!error) {
        tasks = (data ?? []) as Task[];
        tableExists = true;
      }
    } catch {}
  }

  const inBacklog  = tasks.filter(t => t.status === "backlog").length;
  const inProd     = tasks.filter(t => t.status === "em_producao").length;
  const inReview   = tasks.filter(t => t.status === "revisao_interna").length;
  const awaitClient= tasks.filter(t => t.status === "aguardando_cliente").length;
  const overdueTasks= tasks.filter(t => isOverdue(t.due_date));
  const urgentes   = tasks.filter(t => t.priority === "urgente").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Operacional"
        description="Visão geral da produção em andamento"
      />

      {!tableExists && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-800">Tabela operacional ainda não criada</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Execute o arquivo <code className="bg-amber-100 px-1 rounded">docs/supabase/06-operacional-v1.sql</code> no Supabase para ativar a área operacional.
            </p>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Backlog",            value: inBacklog,   icon: ClipboardList,  color: "text-gray-500",    bg: "bg-gray-50" },
          { label: "Em Produção",        value: inProd,      icon: KanbanSquare,   color: "text-indigo-500",  bg: "bg-indigo-50" },
          { label: "Em Revisão",         value: inReview,    icon: CheckCircle2,   color: "text-amber-500",   bg: "bg-amber-50" },
          { label: "Aguard. Cliente",    value: awaitClient, icon: Users,          color: "text-purple-500",  bg: "bg-purple-50" },
          { label: "Atrasadas",          value: overdueTasks.length, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
          { label: "Urgentes",           value: urgentes,    icon: AlertCircle,    color: "text-orange-500",  bg: "bg-orange-50" },
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

      {/* Overdue + all tasks */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Overdue */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h2 className="text-sm font-bold text-gray-800">Tarefas Atrasadas</h2>
          </div>
          {overdueTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-300">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
              <p className="text-xs">Nenhuma tarefa atrasada.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {overdueTasks.slice(0, 8).map(t => (
                <div key={t.id} className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{t.title}</p>
                    <p className="text-[10px] text-gray-400">{t.clients?.[0]?.company_name ?? "—"} · {STATUS_LABEL[t.status] ?? t.status}</p>
                  </div>
                  <span className="text-[10px] text-red-600 font-medium flex-shrink-0 flex items-center gap-0.5">
                    <Clock3 className="w-2.5 h-2.5" />
                    {fmtDate(t.due_date)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All active tasks */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm font-bold text-gray-800">Tarefas Ativas</h2>
            </div>
            <Link href="/admin/operacional/kanban" className="text-xs text-indigo-500 hover:underline">
              Ver kanban →
            </Link>
          </div>
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-300">
              <ClipboardList className="w-8 h-8 mx-auto mb-2" />
              <p className="text-xs">Nenhuma tarefa operacional no momento.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.slice(0, 8).map(t => (
                <div key={t.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{t.title}</p>
                    <p className="text-[10px] text-gray-400">{t.clients?.[0]?.company_name ?? "—"}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {t.priority && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${PRIORITY_COLOR[t.priority] ?? PRIORITY_COLOR.media}`}>
                        {t.priority}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400">{STATUS_LABEL[t.status] ?? t.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
