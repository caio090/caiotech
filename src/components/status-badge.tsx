import { cn } from "@/lib/utils";

type Variant =
  | "healthy" | "attention" | "risk"
  | "active" | "paused" | "churned" | "cancelled"
  | "todo" | "in_progress" | "review" | "done"
  | "pending" | "paid" | "overdue"
  | "draft" | "in_review" | "approved" | "published" | "rejected"
  | "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost"
  | "scheduled" | "completed"
  | "referral" | "inbound" | "social";

const variantMap: Record<Variant, { label: string; className: string }> = {
  healthy:     { label: "Saudável",     className: "bg-emerald-100 text-emerald-700" },
  attention:   { label: "Atenção",      className: "bg-amber-100 text-amber-700" },
  risk:        { label: "Risco",        className: "bg-red-100 text-red-700" },
  active:      { label: "Ativo",        className: "bg-emerald-100 text-emerald-700" },
  paused:      { label: "Pausado",      className: "bg-amber-100 text-amber-700" },
  churned:     { label: "Cancelado",    className: "bg-gray-100 text-gray-600" },
  cancelled:   { label: "Cancelado",    className: "bg-gray-100 text-gray-600" },
  todo:        { label: "A fazer",      className: "bg-gray-100 text-gray-600" },
  in_progress: { label: "Em andamento", className: "bg-blue-100 text-blue-700" },
  review:      { label: "Em revisão",   className: "bg-amber-100 text-amber-700" },
  done:        { label: "Concluído",    className: "bg-emerald-100 text-emerald-700" },
  completed:   { label: "Concluído",    className: "bg-emerald-100 text-emerald-700" },
  pending:     { label: "Pendente",     className: "bg-amber-100 text-amber-700" },
  paid:        { label: "Pago",         className: "bg-emerald-100 text-emerald-700" },
  overdue:     { label: "Atrasado",     className: "bg-red-100 text-red-700" },
  draft:       { label: "Rascunho",     className: "bg-gray-100 text-gray-600" },
  in_review:   { label: "Em revisão",   className: "bg-blue-100 text-blue-700" },
  approved:    { label: "Aprovado",     className: "bg-emerald-100 text-emerald-700" },
  published:   { label: "Publicado",    className: "bg-purple-100 text-purple-700" },
  rejected:    { label: "Reprovado",    className: "bg-red-100 text-red-700" },
  scheduled:   { label: "Agendado",     className: "bg-blue-100 text-blue-700" },
  new:         { label: "Novo",         className: "bg-gray-100 text-gray-600" },
  contacted:   { label: "Contatado",    className: "bg-blue-100 text-blue-700" },
  qualified:   { label: "Qualificado",  className: "bg-indigo-100 text-indigo-700" },
  proposal:    { label: "Proposta",     className: "bg-purple-100 text-purple-700" },
  negotiation: { label: "Negociação",   className: "bg-amber-100 text-amber-700" },
  won:         { label: "Ganho",        className: "bg-emerald-100 text-emerald-700" },
  lost:        { label: "Perdido",      className: "bg-red-100 text-red-700" },
  referral:    { label: "Indicação",    className: "bg-violet-100 text-violet-700" },
  inbound:     { label: "Inbound",      className: "bg-sky-100 text-sky-700" },
  social:      { label: "Social",       className: "bg-pink-100 text-pink-700" },
};

export function StatusBadge({ status, className }: { status: Variant; className?: string }) {
  const config = variantMap[status] ?? { label: status, className: "bg-gray-100 text-gray-600" };
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", config.className, className)}>
      {config.label}
    </span>
  );
}
