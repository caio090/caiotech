import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { mockProjects, mockTasks } from "@/data/mock-data";
import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";

const statusOrder = ["todo", "in_progress", "review", "done"] as const;

export default function ClientProjetoPage() {
  const project = mockProjects.find((p) => p.clientId === "client-1")!;
  const tasks = mockTasks.filter((t) => t.projectId === project.id);

  return (
    <div>
      <PageHeader title={project.name} description={project.description}>
        <StatusBadge status={project.status} />
      </PageHeader>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <div className="grid grid-cols-3 gap-6 mb-4 text-center">
          <div>
            <div className="text-2xl font-black text-gray-900">{project.progress}%</div>
            <div className="text-xs text-gray-400">Progresso</div>
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">{project.tasks.done}/{project.tasks.total}</div>
            <div className="text-xs text-gray-400">Tarefas</div>
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">{new Date(project.dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</div>
            <div className="text-xs text-gray-400">Prazo</div>
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${project.progress}%` }} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statusOrder.map((status) => {
          const statusTasks = tasks.filter((t) => t.status === status);
          const labels = { todo: "A fazer", in_progress: "Em andamento", review: "Em revisão", done: "Concluído" };
          const colors = { todo: "bg-gray-200", in_progress: "bg-blue-400", review: "bg-amber-400", done: "bg-emerald-400" };
          return (
            <div key={status}>
              <div className="flex items-center gap-2 mb-3">
                <div className={cn("w-2 h-2 rounded-full", colors[status])} />
                <span className="text-xs font-semibold text-gray-600">{labels[status]}</span>
                <span className="ml-auto text-xs text-gray-400">{statusTasks.length}</span>
              </div>
              <div className="space-y-2">
                {statusTasks.map((t) => (
                  <div key={t.id} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                    <p className="text-xs font-medium text-gray-800 leading-snug">{t.title}</p>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" strokeWidth={1.5} />{new Date(t.dueDate).toLocaleDateString("pt-BR")}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
