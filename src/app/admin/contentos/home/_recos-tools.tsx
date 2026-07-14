import Link from "next/link";
import { Plus, Flag, CalendarDays, BarChart2, AlertCircle, ListChecks } from "lucide-react";

interface RecOSToolsProps {
  clientId: string;
  role: string;
}

export function RecOSTools({ clientId, role }: RecOSToolsProps) {
  const isAdmin = role === "admin" || role === "super_admin";
  if (!isAdmin) return null;

  const actions = [
    {
      icon: Plus,
      label: "Criar conteúdo",
      desc: "Novo briefing ou peça visual",
      href: `/admin/contentos/criar?client=${clientId}`,
      color: "text-purple-400",
      bg: "bg-purple-950/40 border-purple-800/40",
    },
    {
      icon: Flag,
      label: "Abrir campanha",
      desc: "Planejar ciclo estratégico",
      href: `/admin/contentos/campanhas?client=${clientId}`,
      color: "text-indigo-400",
      bg: "bg-indigo-950/40 border-indigo-800/40",
    },
    {
      icon: CalendarDays,
      label: "Ver calendário",
      desc: "Conteúdos agendados e planejados",
      href: `/admin/contentos/calendario?client=${clientId}`,
      color: "text-sky-400",
      bg: "bg-sky-950/40 border-sky-800/40",
    },
    {
      icon: BarChart2,
      label: "Ver resultados",
      desc: "Desempenho e insights",
      href: `/admin/contentos/resultados?client=${clientId}`,
      color: "text-emerald-400",
      bg: "bg-emerald-950/40 border-emerald-800/40",
    },
    {
      icon: AlertCircle,
      label: "Pendências",
      desc: "Conteúdos aguardando aprovação",
      href: `/admin/contentos/aprovacoes?client=${clientId}`,
      color: "text-amber-400",
      bg: "bg-amber-950/40 border-amber-800/40",
    },
    {
      icon: ListChecks,
      label: "Tarefa no Operacional",
      desc: "Criar ou abrir tarefa de produção",
      href: `/operacional/tarefas`,
      color: "text-zinc-400",
      bg: "bg-zinc-800/60 border-zinc-700",
    },
  ];

  return (
    <section className="mb-6">
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
        Ações rápidas
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {actions.map(({ icon: Icon, label, desc, href, color, bg }) => (
          <Link
            key={label}
            href={href}
            className={`rounded-xl border ${bg} p-3 flex items-center gap-2.5 hover:brightness-110 transition-all group`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
              <Icon className={`w-3.5 h-3.5 ${color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-200 truncate">{label}</p>
              <p className="text-[10px] text-zinc-500 truncate">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
