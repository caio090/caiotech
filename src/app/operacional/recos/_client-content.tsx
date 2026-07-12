"use client";
import Link from "next/link";
import { Clapperboard, Video, Calendar, MapPin, ChevronRight, Film, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DbRecProject } from "@/lib/supabase/types";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  em_andamento: { label: "Em andamento",  color: "bg-blue-100 text-blue-700" },
  em_producao:  { label: "Em produção",   color: "bg-indigo-100 text-indigo-700" },
  gravado:      { label: "Gravado",       color: "bg-amber-100 text-amber-700" },
  em_edicao:    { label: "Em edição",     color: "bg-orange-100 text-orange-700" },
  concluido:    { label: "Concluído",     color: "bg-emerald-100 text-emerald-700" },
  pausado:      { label: "Pausado",       color: "bg-gray-100 text-gray-600" },
};

const PROJECT_TYPE_LABELS: Record<string, string> = {
  comercial: "Comercial", institucional: "Institucional", aftermovie: "Aftermovie",
  casamento: "Casamento", evento: "Evento", documentario: "Documentário",
  video_marca: "Vídeo de Marca", campanha: "Campanha", clipe: "Clipe",
  depoimento: "Depoimento", reels: "Reels", outro: "Outro",
};

interface Props {
  projects: DbRecProject[];
}

export function OperacionalRecosContent({ projects }: Props) {
  const active    = projects.filter((p) => !["concluido", "cancelado"].includes(p.status));
  const concluded = projects.filter((p) => p.status === "concluido");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center">
          <Clapperboard className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-black text-gray-900">Audiovisual</h1>
          <p className="text-xs text-gray-400">Produção audiovisual — {projects.length} projeto{projects.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Video className="w-8 h-8 text-rose-300" />
          </div>
          <h3 className="text-base font-bold text-gray-800 mb-1">Nenhum projeto audiovisual</h3>
          <p className="text-sm text-gray-400">
            Os projetos audiovisuais criados pela administração aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active projects */}
          {active.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">
                Em andamento ({active.length})
              </h2>
              <div className="space-y-2">
                {active.map((project) => (
                  <OperacionalProjectCard key={project.id} project={project} />
                ))}
              </div>
            </div>
          )}

          {/* Concluded projects */}
          {concluded.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">
                Concluídos ({concluded.length})
              </h2>
              <div className="space-y-2">
                {concluded.map((project) => (
                  <OperacionalProjectCard key={project.id} project={project} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OperacionalProjectCard({ project }: { project: DbRecProject }) {
  const clientName = project.clients?.[0]?.company_name;
  const statusCfg  = STATUS_CONFIG[project.status] ?? { label: project.status, color: "bg-gray-100 text-gray-600" };
  const typeLabel  = PROJECT_TYPE_LABELS[project.project_type] ?? project.project_type;

  const recDate = project.recording_date
    ? new Date(project.recording_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    : null;

  return (
    <Link
      href={`/admin/recos/${project.id}`}
      className="group bg-white rounded-2xl border border-gray-100 hover:border-rose-200 hover:shadow-sm transition-all p-4 flex items-center gap-4"
    >
      {/* Icon */}
      <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0 group-hover:bg-rose-100 transition-colors">
        <Film className="w-5 h-5 text-rose-500" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-gray-900 truncate group-hover:text-rose-600 transition-colors">
            {project.title}
          </p>
          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-lg flex-shrink-0", statusCfg.color)}>
            {statusCfg.label}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {clientName && (
            <span className="text-xs text-gray-400">{clientName}</span>
          )}
          <span className="text-xs text-gray-400 capitalize">{typeLabel}</span>
          {project.style && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />{project.style}
            </span>
          )}
          {project.location && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <MapPin className="w-3 h-3" />{project.location}
            </span>
          )}
          {recDate && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Calendar className="w-3 h-3" />Gravação: {recDate}
            </span>
          )}
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-rose-400 transition-colors flex-shrink-0" />
    </Link>
  );
}
