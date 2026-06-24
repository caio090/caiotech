import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { mockProjects } from "@/data/mock-data";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

export default function AdminProjetosPage() {
  return (
    <div>
      <PageHeader title="Projetos" description={`${mockProjects.length} projetos`} />
      <div className="space-y-3">
        {mockProjects.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-gray-900">{p.name}</h3>
                  <StatusBadge status={p.status} />
                </div>
                <p className="text-xs text-gray-500">{p.clientName} · {p.assignee} · prazo {new Date(p.dueDate).toLocaleDateString("pt-BR")}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-lg font-black text-gray-900">{p.progress}%</div>
                <div className="text-xs text-gray-400">{p.tasks.done}/{p.tasks.total} tarefas</div>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className={cn("h-1.5 rounded-full transition-all", p.status === "active" ? "bg-indigo-500" : "bg-gray-400")}
                style={{ width: `${p.progress}%` }}
              />
            </div>
            {p.tasks.overdue > 0 && (
              <p className="text-xs text-red-500 mt-2 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.5} />{p.tasks.overdue} tarefa(s) atrasada(s)</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
