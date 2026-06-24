"use client";
import Link from "next/link";
import { TrendingUp, Users, CalendarDays, Clock, ArrowRight, Target } from "lucide-react";

interface Lead {
  id: string;
  company_name: string;
  contact_name: string | null;
  pipeline_stage: string;
  next_action_at: string | null;
  responsible_id: string | null;
}

interface Meeting {
  id: string;
  title: string;
  scheduled_at: string;
  lead_id: string | null;
}

interface Props {
  leads: Lead[];
  meetings: Meeting[];
  isDemo?: boolean;
}

const STAGE_LABELS: Record<string, string> = {
  novo_lead:              "Novo lead",
  pre_qualificacao:       "Pré-qualificação",
  contato_feito:          "Contato feito",
  reuniao_agendada:       "Reunião agendada",
  diagnostico_realizado:  "Diagnóstico realizado",
  proposta_enviada:       "Proposta enviada",
  negociacao:             "Negociação",
  fechado:                "Fechado",
  perdido:                "Perdido",
  onboarding:             "Onboarding",
};

const STAGE_COLORS: Record<string, string> = {
  novo_lead:             "bg-gray-100 text-gray-600",
  pre_qualificacao:      "bg-sky-100 text-sky-700",
  contato_feito:         "bg-blue-100 text-blue-700",
  reuniao_agendada:      "bg-violet-100 text-violet-700",
  diagnostico_realizado: "bg-indigo-100 text-indigo-700",
  proposta_enviada:      "bg-amber-100 text-amber-700",
  negociacao:            "bg-orange-100 text-orange-700",
  fechado:               "bg-emerald-100 text-emerald-700",
  perdido:               "bg-red-100 text-red-700",
  onboarding:            "bg-purple-100 text-purple-700",
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function isOverdue(iso: string | null) {
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now();
}

export function ComercialDashboardContent({ leads, meetings, isDemo }: Props) {
  const overdueFollowUps = leads.filter(
    (l) => l.next_action_at && isOverdue(l.next_action_at)
  );

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          ComercialOS
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Painel de vendas e pipeline
          {isDemo && <span className="ml-2 text-amber-600 text-xs">· modo demonstração</span>}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <KpiCard icon={Users}       label="Leads ativos"       value={leads.length}           color="text-blue-600"    bg="bg-blue-50" />
        <KpiCard icon={CalendarDays} label="Reuniões hoje"     value={meetings.length}         color="text-violet-600"  bg="bg-violet-50" />
        <KpiCard icon={Clock}       label="Follow-ups atrasados" value={overdueFollowUps.length} color="text-red-600"  bg="bg-red-50" alert={overdueFollowUps.length > 0} />
        <KpiCard icon={Target}      label="Propostas abertas"  value={0}                       color="text-amber-600"   bg="bg-amber-50" />
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Leads ativos */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-bold text-gray-800">Meus leads ativos</span>
            </div>
            <Link href="/operacional/comercial/leads" className="text-xs text-blue-600 hover:underline font-medium">
              Ver todos
            </Link>
          </div>

          {leads.length === 0 ? (
            <div className="py-10 text-center px-4">
              <p className="text-sm text-gray-400 mb-2">Nenhum lead atribuído a você ainda.</p>
              <Link href="/operacional/comercial/pipeline" className="text-xs text-blue-600 font-medium hover:underline">
                Abrir pipeline →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {leads.slice(0, 5).map((lead) => (
                <Link
                  key={lead.id}
                  href="/operacional/comercial/pipeline"
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
                    {(lead.company_name[0] ?? "?").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{lead.company_name}</p>
                    {lead.contact_name && <p className="text-[10px] text-gray-400 truncate">{lead.contact_name}</p>}
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${STAGE_COLORS[lead.pipeline_stage] ?? "bg-gray-100 text-gray-600"}`}>
                    {STAGE_LABELS[lead.pipeline_stage] ?? lead.pipeline_stage}
                  </span>
                </Link>
              ))}
              {leads.length > 5 && (
                <Link href="/operacional/comercial/leads" className="block px-5 py-3 text-center text-xs text-blue-600 hover:bg-blue-50 transition-colors">
                  +{leads.length - 5} leads <ArrowRight className="w-3 h-3 inline" />
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Reuniões de hoje */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-violet-600" />
              <span className="text-sm font-bold text-gray-800">Reuniões de hoje</span>
            </div>
            <Link href="/operacional/comercial/reunioes" className="text-xs text-blue-600 hover:underline font-medium">
              Ver agenda
            </Link>
          </div>

          {meetings.length === 0 ? (
            <div className="py-10 text-center px-4">
              <p className="text-sm text-gray-400 mb-2">Nenhuma reunião agendada para hoje.</p>
              <Link href="/operacional/comercial/reunioes" className="text-xs text-blue-600 font-medium hover:underline">
                Ver agenda →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {meetings.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="text-center w-10 flex-shrink-0">
                    <p className="text-xs font-black text-violet-600">{fmtTime(m.scheduled_at)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{m.title}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Follow-ups atrasados */}
      {overdueFollowUps.length > 0 && (
        <div className="mt-6 bg-red-50 border border-red-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-red-600" />
            <span className="text-sm font-bold text-red-800">Follow-ups atrasados ({overdueFollowUps.length})</span>
          </div>
          <div className="space-y-2">
            {overdueFollowUps.slice(0, 3).map((l) => (
              <div key={l.id} className="flex items-center gap-2 text-xs text-red-700">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                <span className="font-medium">{l.company_name}</span>
                {l.next_action_at && (
                  <span className="text-red-400">
                    · previsto {new Date(l.next_action_at).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
            ))}
          </div>
          <Link href="/operacional/comercial/follow-ups" className="mt-3 block text-xs text-red-700 font-medium hover:underline">
            Ver todos os follow-ups →
          </Link>
        </div>
      )}

      {/* Quick links */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: "/operacional/comercial/leads",      label: "Novo Lead",    color: "bg-blue-600" },
          { href: "/operacional/comercial/pipeline",   label: "Pipeline",     color: "bg-violet-600" },
          { href: "/operacional/comercial/reunioes",   label: "Reuniões",     color: "bg-indigo-600" },
          { href: "/operacional/comercial/propostas",  label: "Propostas",    color: "bg-amber-600" },
        ].map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className={`${q.color} text-white rounded-2xl px-4 py-3 text-xs font-bold text-center hover:opacity-90 transition-opacity`}
          >
            {q.label} →
          </Link>
        ))}
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color, bg, alert }: {
  icon: React.ElementType; label: string; value: number;
  color: string; bg: string; alert?: boolean;
}) {
  return (
    <div className={`rounded-2xl px-4 py-4 border ${alert && value > 0 ? "border-red-100 bg-red-50" : `bg-white border-gray-100`}`}>
      <div className={`w-7 h-7 ${bg} rounded-lg flex items-center justify-center mb-2`}>
        <Icon className={`w-3.5 h-3.5 ${color}`} />
      </div>
      <div className={`text-2xl font-black ${alert && value > 0 ? "text-red-600" : color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}
