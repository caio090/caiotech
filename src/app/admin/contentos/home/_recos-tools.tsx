import Link from "next/link";
import { Layers, CalendarClock, FlaskConical, AlertCircle } from "lucide-react";

interface RecOSToolsProps {
  clientId: string;
  role: string;
}

export function RecOSTools({ clientId, role }: RecOSToolsProps) {
  const isAdmin      = role === "admin" || role === "super_admin";
  const isSuperAdmin = role === "super_admin";

  if (!isAdmin) return null;

  return (
    <section className="mb-6">
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
        Ferramentas do REC OS
      </h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {/* Agendamento — admin + super_admin */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
            <CalendarClock className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-semibold text-zinc-200">Agendamento</p>
              <span className="flex items-center gap-1 text-[10px] bg-zinc-800 text-zinc-500 border border-zinc-700 rounded px-1.5 py-px">
                <AlertCircle className="w-2.5 h-2.5" />
                Não configurado
              </span>
            </div>
            <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
              Prepare conteúdos aprovados para programação e publicação.
            </p>
            <Link
              href={`/admin/contentos/agendamento?client=${clientId}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors border border-zinc-700 hover:border-zinc-500 rounded-lg px-3 py-1.5"
            >
              Ver fluxo de agendamento
            </Link>
          </div>
        </div>

        {/* EditorOS — super_admin only */}
        {isSuperAdmin && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-950/60 border border-indigo-800/50 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-semibold text-zinc-200">EditorOS</p>
                <span className="flex items-center gap-1 text-[10px] bg-amber-950/40 text-amber-400 border border-amber-800/40 rounded px-1.5 py-px">
                  <FlaskConical className="w-2.5 h-2.5" />
                  Em avaliação
                </span>
              </div>
              <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
                Crie peças e prepare projetos visuais usando o contexto da marca.
              </p>
              <Link
                href={`/admin/contentos/editor-os?client=${clientId}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors border border-indigo-800/50 hover:border-indigo-600 rounded-lg px-3 py-1.5"
              >
                Abrir EditorOS
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
