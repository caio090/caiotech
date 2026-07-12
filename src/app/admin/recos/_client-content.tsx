"use client";
import { useState } from "react";
import Link from "next/link";
import { Video, Plus, Film, Clock, MapPin, Calendar, ChevronRight, Clapperboard, Trash2, Loader2, X, Library } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DbRecProject } from "@/lib/supabase/types";

const PROJECT_TYPE_LABELS: Record<string, string> = {
  comercial: "Comercial",
  institucional: "Institucional",
  aftermovie: "Aftermovie",
  casamento: "Casamento",
  evento: "Evento",
  documentario: "Documentário",
  video_marca: "Vídeo de Marca",
  campanha: "Campanha Audiovisual",
  clipe: "Clipe",
  depoimento: "Depoimento",
  reels: "Reels Cinematográfico",
  outro: "Outro",
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  em_andamento:  { label: "Em andamento",  color: "bg-blue-100 text-blue-700" },
  em_producao:   { label: "Em produção",   color: "bg-indigo-100 text-indigo-700" },
  gravado:       { label: "Gravado",       color: "bg-amber-100 text-amber-700" },
  em_edicao:     { label: "Em edição",     color: "bg-orange-100 text-orange-700" },
  concluido:     { label: "Concluído",     color: "bg-emerald-100 text-emerald-700" },
  pausado:       { label: "Pausado",       color: "bg-gray-100 text-gray-600" },
  cancelado:     { label: "Cancelado",     color: "bg-red-100 text-red-700" },
};

const STATUS_FILTERS = [
  { value: "todos", label: "Todos" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "em_producao", label: "Em produção" },
  { value: "gravado", label: "Gravado" },
  { value: "concluido", label: "Concluídos" },
];

// ── Modal de exclusão ──────────────────────────────────────────
function DeleteProjectModal({
  project, onConfirm, onCancel, loading,
}: { project: DbRecProject; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  const [typed, setTyped] = useState("");
  const name = project.title ?? "";
  const matches = typed.trim().toLowerCase() === name.trim().toLowerCase();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Excluir projeto</p>
            <p className="text-xs text-gray-400">Esta ação não pode ser desfeita</p>
          </div>
          <button onClick={onCancel} className="ml-auto text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl p-3 mb-4 leading-relaxed">
          Ao excluir <strong>{name}</strong>, todos os dados do projeto (roteiro, storyboard, cenas e arquivos vinculados) serão removidos permanentemente.
        </p>
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Digite o nome do projeto para confirmar:</label>
          <input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={name}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-red-400" />
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} disabled={loading} className="flex-1 py-2.5 border border-gray-200 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">Cancelar</button>
          <button onClick={onConfirm} disabled={!matches || loading} className="flex-1 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Excluir projeto
          </button>
        </div>
      </div>
    </div>
  );
}

interface Props {
  projects: DbRecProject[];
}

export function RecosDashboardContent({ projects: initialProjects }: Props) {
  const [projects, setProjects] = useState(initialProjects);
  const [filter, setFilter] = useState("todos");
  const [deletingProject, setDeletingProject] = useState<DbRecProject | null>(null);
  const [deleteLoading,   setDeleteLoading]   = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deletingProject) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/rec-projects/${deletingProject.id}`, { method: "DELETE" });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== deletingProject.id));
        setMsg("Projeto excluído.");
      } else { setMsg("Erro ao excluir."); }
    } catch { setMsg("Erro de conexão."); }
    finally {
      setDeleteLoading(false);
      setDeletingProject(null);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  const visible = filter === "todos"
    ? projects
    : projects.filter((p) => p.status === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center">
              <Clapperboard className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-black text-gray-900">Audiovisual</h1>
          </div>
          <p className="text-sm text-gray-500">Projetos, roteiros, decupagem, gravações e entregas de vídeo.</p>
        </div>
        <Link
          href="/admin/recos/criar"
          className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700 transition-colors flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Criar projeto
        </Link>
      </div>

      {/* Module nav */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 w-fit">
        <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white text-gray-900 shadow-sm">
          <Clapperboard className="w-3.5 h-3.5" /> Projetos
        </span>
        <Link href="/admin/rec/videos"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors">
          <Library className="w-3.5 h-3.5" /> Biblioteca de vídeos
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border",
              filter === f.value
                ? "bg-rose-600 text-white border-rose-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-rose-200 hover:text-rose-600"
            )}
          >
            {f.label}
            {f.value !== "todos" && (
              <span className="ml-1.5 opacity-60">
                {projects.filter((p) => p.status === f.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Stats */}
      {projects.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: projects.length, color: "text-gray-900" },
            { label: "Em andamento", value: projects.filter((p) => p.status === "em_andamento").length, color: "text-blue-600" },
            { label: "Em produção", value: projects.filter((p) => p.status === "em_producao").length, color: "text-indigo-600" },
            { label: "Concluídos", value: projects.filter((p) => p.status === "concluido").length, color: "text-emerald-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className={cn("text-2xl font-black", s.color)}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Flash msg */}
      {msg && <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-700">{msg}</div>}

      {/* Project grid */}
      {visible.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Video className="w-8 h-8 text-rose-300" />
          </div>
          <h3 className="text-base font-bold text-gray-800 mb-1">
            {filter === "todos" ? "Nenhum projeto audiovisual ainda" : "Nenhum projeto com este filtro"}
          </h3>
          <p className="text-sm text-gray-400 mb-6">
            {filter === "todos"
              ? "Crie o primeiro projeto RecOS para organizar roteiro, storyboard e plano de gravação."
              : "Ajuste o filtro ou crie um novo projeto."}
          </p>
          {filter === "todos" && (
            <Link
              href="/admin/recos/criar"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Criar primeiro projeto
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((project) => (
            <ProjectCard key={project.id} project={project} onDelete={() => setDeletingProject(project)} />
          ))}
        </div>
      )}

      {deletingProject && (
        <DeleteProjectModal
          project={deletingProject}
          onConfirm={handleDelete}
          onCancel={() => setDeletingProject(null)}
          loading={deleteLoading}
        />
      )}
    </div>
  );
}

function ProjectCard({ project, onDelete }: { project: DbRecProject; onDelete: () => void }) {
  const clientName = project.clients?.[0]?.company_name;
  const statusCfg  = STATUS_CONFIG[project.status] ?? { label: project.status, color: "bg-gray-100 text-gray-600" };
  const typeLabel  = PROJECT_TYPE_LABELS[project.project_type] ?? project.project_type;

  const recDate = project.recording_date
    ? new Date(project.recording_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    : null;

  return (
    <Link
      href={`/admin/recos/${project.id}`}
      className="group bg-white rounded-2xl border border-gray-100 hover:border-rose-200 hover:shadow-sm transition-all overflow-hidden"
    >
      {/* Color bar */}
      <div className="h-1.5 bg-gradient-to-r from-rose-400 to-red-500" />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-gray-900 leading-snug truncate group-hover:text-rose-600 transition-colors">
              {project.title}
            </h3>
            {clientName && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">{clientName}</p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={(e) => { e.preventDefault(); onDelete(); }}
              className="p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
              title="Excluir projeto"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-rose-400 transition-colors" />
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-rose-50 text-rose-600">
            {typeLabel}
          </span>
          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-lg", statusCfg.color)}>
            {statusCfg.label}
          </span>
        </div>

        {/* Meta */}
        <div className="space-y-1.5">
          {project.style && (
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <Film className="w-3 h-3 flex-shrink-0" />
              <span className="truncate capitalize">{project.style}</span>
            </div>
          )}
          {project.duration_estimate && (
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <Clock className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{project.duration_estimate}</span>
            </div>
          )}
          {project.location && (
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{project.location}</span>
            </div>
          )}
          {recDate && (
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <Calendar className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">Gravação: {recDate}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
