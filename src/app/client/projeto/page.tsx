import { PageHeader } from "@/components/page-header";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { FolderOpen, CheckCircle2, Clock, Circle, ArrowRight } from "lucide-react";

interface Task {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  progress: number;
  start_date: string | null;
  due_date: string | null;
}

function taskIcon(status: string) {
  if (status === "done")       return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />;
  if (status === "in_progress") return <ArrowRight  className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />;
  if (status === "review")     return <Clock        className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />;
  return                              <Circle       className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />;
}

function taskStatusLabel(status: string) {
  const map: Record<string, string> = {
    todo: "A fazer", in_progress: "Em andamento",
    review: "Revisão", done: "Concluída", archived: "Arquivada",
  };
  return map[status] ?? status;
}

export default async function ClientProjetoPage() {
  let projects: Project[]              = [];
  let tasksByProject: Record<string, Task[]> = {};
  let clientName: string | null        = null;

  if (isSupabaseConfigured) {
    try {
      const supabase  = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("client_id, name")
          .eq("id", user.id)
          .maybeSingle();

        const clientId = (profile as { client_id?: string | null } | null)?.client_id;

        if (clientId) {
          // Busca nome via clients
          const { data: clientRow } = await supabase
            .from("clients").select("company_name").eq("id", clientId).maybeSingle();
          clientName = (clientRow as { company_name?: string | null } | null)?.company_name ?? null;

          // Busca projetos visíveis ao cliente
          const { data: pData } = await supabase
            .from("client_projects")
            .select("id, title, description, status, progress, start_date, due_date")
            .eq("client_id", clientId)
            .eq("visible_to_client", true)
            .neq("status", "archived")
            .order("created_at", { ascending: false });

          projects = (pData ?? []) as Project[];

          if (projects.length > 0) {
            const projectIds = projects.map((p) => p.id);
            const { data: tData } = await supabase
              .from("client_project_tasks")
              .select("id, title, status, due_date, project_id")
              .in("project_id", projectIds)
              .eq("visible_to_client", true)
              .neq("status", "archived")
              .order("position");

            for (const t of (tData ?? []) as (Task & { project_id: string })[]) {
              if (!tasksByProject[t.project_id]) tasksByProject[t.project_id] = [];
              tasksByProject[t.project_id].push(t);
            }
          }
        } else {
          // fallback: tenta owner_id direto
          const { data: clientRow } = await supabase
            .from("clients").select("id, company_name").eq("owner_id", user.id).maybeSingle();
          clientName = (clientRow as { company_name?: string | null } | null)?.company_name ?? null;
        }
      }
    } catch {
      // Se client_projects ainda não existe no banco, mostra empty state
    }
  }

  if (projects.length === 0) {
    return (
      <div>
        <PageHeader
          title="Projeto"
          description={clientName ? `Acompanhe a evolução de ${clientName}` : "Acompanhe a evolução do seu projeto"}
        />
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
            <FolderOpen className="w-6 h-6 text-indigo-400" />
          </div>
          <p className="text-sm font-bold text-gray-700 mb-1">Nenhum projeto ativo ainda</p>
          <p className="text-xs text-gray-400 text-center max-w-xs">
            Quando a equipe configurar seu projeto, ele aparecerá aqui com tarefas, prazos e progresso.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Projeto"
        description={clientName ? `Acompanhe a evolução de ${clientName}` : "Acompanhe a evolução do seu projeto"}
      />

      <div className="space-y-6">
        {projects.map((project) => {
          const tasks = tasksByProject[project.id] ?? [];
          const done  = tasks.filter((t) => t.status === "done").length;

          return (
            <div key={project.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {/* Header */}
              <div className="p-5 border-b border-gray-50">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">{project.title}</h2>
                    {project.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{project.description}</p>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    project.status === "active"    ? "bg-emerald-100 text-emerald-700" :
                    project.status === "paused"    ? "bg-amber-100 text-amber-700" :
                    project.status === "completed" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-500"
                  }`}>
                    {project.status === "active" ? "Em andamento" :
                     project.status === "paused" ? "Pausado" :
                     project.status === "completed" ? "Concluído" : project.status}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-500 w-8 text-right">{project.progress}%</span>
                </div>

                <div className="flex items-center gap-4 mt-2 text-[11px] text-gray-400">
                  {project.start_date && (
                    <span>Início: {new Date(project.start_date).toLocaleDateString("pt-BR")}</span>
                  )}
                  {project.due_date && (
                    <span>Prazo: {new Date(project.due_date).toLocaleDateString("pt-BR")}</span>
                  )}
                  {tasks.length > 0 && (
                    <span>{done}/{tasks.length} tarefas</span>
                  )}
                </div>
              </div>

              {/* Tasks */}
              {tasks.length > 0 && (
                <div className="divide-y divide-gray-50">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 px-5 py-3">
                      {taskIcon(task.status)}
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${
                          task.status === "done" ? "line-through text-gray-400" : "text-gray-800"
                        }`}>{task.title}</p>
                        <p className="text-[10px] text-gray-400">{taskStatusLabel(task.status)}</p>
                      </div>
                      {task.due_date && (
                        <span className="text-[10px] text-gray-400 flex-shrink-0">
                          {new Date(task.due_date).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {tasks.length === 0 && (
                <div className="px-5 py-4 text-xs text-gray-400">Nenhuma tarefa adicionada ainda.</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
