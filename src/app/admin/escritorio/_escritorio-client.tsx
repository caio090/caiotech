"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays, ClipboardList, CheckSquare, FileText, AlertTriangle,
  Sparkles, PenLine, ArrowRight, Info, ChevronDown, ChevronUp,
  FolderKanban, Clock, MessageCircle, Mic,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import {
  type BusinessOfficeFeedItem, classifyBusinessOfficeItems, itemsForMonthPrefix, nextMonthKey,
  isBusinessOfficeItemOverdue, splitMonthClosureAndPlanning,
} from "@/lib/business-office/types";
import { buildOfficeSourceStatuses, officeCalendarHealth, type SourceHealthStatus } from "@/lib/business-office/source-health";
import { isActiveProject } from "@/lib/project-projection/adapters";
import type { ProjectProjection } from "@/lib/project-projection/types";
import { openJarvis } from "@/lib/jarvis/open-jarvis";

type ViewId = "hoje" | "semana" | "mes";

const VIEWS: { id: ViewId; label: string }[] = [
  { id: "hoje", label: "Hoje" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mês" },
];

const TYPE_ICON: Record<string, React.ElementType> = {
  content: Sparkles, task: ClipboardList, approval: CheckSquare, follow_up: AlertTriangle,
};

const SOURCE_STATUS_STYLE: Record<SourceHealthStatus, string> = {
  connected: "bg-emerald-50 text-emerald-700 border-emerald-100",
  degraded: "bg-amber-50 text-amber-700 border-amber-100",
  unavailable: "bg-red-50 text-red-700 border-red-100",
  not_connected: "bg-gray-50 text-gray-400 border-gray-100",
};

const SOURCE_STATUS_LABEL: Record<SourceHealthStatus, string> = {
  connected: "Conectado",
  degraded: "Degradado",
  unavailable: "Indisponível",
  not_connected: "Ainda não integrado",
};

function fmtDate(iso: string | null, timezone: string): string {
  if (!iso) return "Sem prazo definido";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: timezone });
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function FeedItemRow({ item, timezone, nowIso }: { item: BusinessOfficeFeedItem; timezone: string; nowIso: string }) {
  const Icon = TYPE_ICON[item.type] ?? FileText;
  const overdue = isBusinessOfficeItemOverdue(item, nowIso);
  return (
    <Link href={item.href} data-testid="office-feed-item" className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3 hover:border-indigo-200 transition-colors">
      <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-indigo-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
        <p className="text-[11px] text-gray-400">
          {item.sourceModule} · {item.responsible ?? "Sem responsável"} · {item.status}
        </p>
      </div>
      <span className={overdue ? "text-[11px] font-bold text-red-600 flex-shrink-0" : "text-[11px] text-gray-400 flex-shrink-0"}>
        {fmtDate(item.dueAt, timezone)}
      </span>
      <ArrowRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
    </Link>
  );
}

function StatChip({
  icon: Icon, label, value, tone,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  tone?: "warning";
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3.5 h-3.5 ${tone === "warning" && value > 0 ? "text-red-500" : "text-gray-400"}`} />
        <p className="text-[10px] font-bold text-gray-400 uppercase">{label}</p>
      </div>
      <p className={`text-lg font-black ${tone === "warning" && value > 0 ? "text-red-600" : "text-gray-900"}`}>{value}</p>
    </div>
  );
}

function ProjectRow({ project, companyId }: { project: ProjectProjection; companyId: string }) {
  return (
    <Link href={`/admin/projetos/${encodeURIComponent(project.sourceEntityId)}?client=${companyId}`} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3 hover:border-indigo-200 transition-colors">
      <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
        <FolderKanban className="w-4 h-4 text-emerald-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-800 truncate">{project.title}</p>
        <p className="text-[11px] text-gray-400">{project.status}</p>
      </div>
      <ArrowRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
    </Link>
  );
}

function SourcesPanel({ sourceErrors }: { sourceErrors: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const statuses = useMemo(() => buildOfficeSourceStatuses(sourceErrors), [sourceErrors]);

  return (
    <div className="bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden" data-testid="office-sources-panel">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left"
        data-testid="office-sources-toggle"
      >
        <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> Fontes do Escritório</span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
      </button>
      {expanded && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {statuses.map((s) => (
            <span key={s.id} className={`text-[10px] font-bold px-2 py-1 rounded-full border ${SOURCE_STATUS_STYLE[s.status]}`} data-testid="office-source-badge">
              {s.label} · {SOURCE_STATUS_LABEL[s.status]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Rascunho em memória (Fase 16) — useState apenas, sem nenhum tipo de armazenamento do navegador, nunca persistido; explicitamente avisado como não salvo. */
function DraftNotesCard({ label, placeholder }: { label: string; placeholder: string }) {
  const [value, setValue] = useState("");
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4" data-testid="office-draft-notes">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5"><PenLine className="w-3.5 h-3.5" /> {label}</p>
        <span className="text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full" data-testid="office-draft-badge">
          Rascunho desta sessão
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-300"
      />
      <p className="text-[10px] text-gray-400 mt-1.5">Não salvo — este texto some ao recarregar a página. Persistência real ainda não existe (planned).</p>
    </div>
  );
}

export function EscritorioClient({
  items, todayKey, timezone, sourceErrors, companyName, companyId, activeProjects,
}: {
  items: BusinessOfficeFeedItem[];
  todayKey: string;
  timezone: string;
  sourceErrors: string[];
  companyName: string | null;
  companyId: string;
  activeProjects: ProjectProjection[];
}) {
  const [view, setView] = useState<ViewId>("hoje");
  const nowIso = useMemo(() => new Date().toISOString(), []);

  const { today, week, month } = useMemo(() => classifyBusinessOfficeItems(items, todayKey, timezone), [items, todayKey, timezone]);
  const nextMonth = useMemo(() => itemsForMonthPrefix(items, nextMonthKey(todayKey)), [items, todayKey]);
  const { closure, planning } = useMemo(() => splitMonthClosureAndPlanning(month, nextMonth), [month, nextMonth]);

  const overdueAll = items.filter((i) => isBusinessOfficeItemOverdue(i, nowIso));
  const overdueToday = today.filter((i) => isBusinessOfficeItemOverdue(i, nowIso));
  const approvalsPending = items.filter((i) => i.type === "approval" && !i.completedAt);
  const attentionCount = overdueAll.length + approvalsPending.length;
  const calendarHealth = officeCalendarHealth(sourceErrors);
  const activeProjectsFiltered = activeProjects.filter(isActiveProject).slice(0, 4);

  return (
    <div className="space-y-4" data-testid="escritorio-root">
      {/* Hero operacional com Jarvis (Fase B5/B6/C4) */}
      <div className="bg-gray-900 text-white rounded-2xl p-4 sm:p-5" data-testid="escritorio-hero">
        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">
          {companyName ?? "Empresa"} · {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
        </p>
        <h2 className="text-base sm:text-lg font-bold mb-3">
          {greeting()}. {attentionCount > 0
            ? `Você tem ${attentionCount} item${attentionCount > 1 ? "ns" : ""} pedindo atenção hoje.`
            : "Seu dia está sem pendências críticas no momento."}
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openJarvis({ voice: true })}
            data-testid="escritorio-jarvis-falar"
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 transition-colors px-3 py-2 rounded-xl"
          >
            <Mic className="w-3.5 h-3.5" /> Falar com Jarvis
          </button>
          <button
            type="button"
            onClick={() => openJarvis({ prompt: "Resumir meu dia" })}
            data-testid="escritorio-jarvis-resumir"
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 transition-colors px-3 py-2 rounded-xl"
          >
            <Sparkles className="w-3.5 h-3.5" /> Resumir meu dia
          </button>
          <button
            type="button"
            onClick={() => openJarvis({})}
            data-testid="escritorio-jarvis-perguntar"
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 transition-colors px-3 py-2 rounded-xl"
          >
            <MessageCircle className="w-3.5 h-3.5" /> Perguntar
          </button>
        </div>
      </div>

      {/* Precisa da sua atenção */}
      <div>
        <h2 className="text-xs font-black uppercase tracking-wide text-gray-500 mb-2">Precisa da sua atenção</h2>
        <div className="grid grid-cols-3 gap-2" data-testid="escritorio-attention-stats">
          <StatChip icon={AlertTriangle} label="Atrasados" value={overdueAll.length} tone="warning" />
          <StatChip icon={CheckSquare} label="Aprovações" value={approvalsPending.length} />
          <StatChip icon={Clock} label="Hoje" value={today.length} />
        </div>
      </div>

      {/* Em andamento */}
      {activeProjectsFiltered.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-black uppercase tracking-wide text-gray-500">Em andamento</h2>
            <Link href="/admin/projetos" className="text-[11px] font-bold text-indigo-600">Ver todos</Link>
          </div>
          <div className="space-y-2" data-testid="escritorio-active-projects">
            {activeProjectsFiltered.map((p) => <ProjectRow key={p.id} project={p} companyId={companyId} />)}
          </div>
        </div>
      )}

      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit" data-testid="escritorio-view-switcher">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            data-testid={`escritorio-view-${v.id}`}
            onClick={() => setView(v.id)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${view === v.id ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500"}`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {calendarHealth !== "connected" && (
        <div className={`rounded-xl p-3 text-xs flex items-center gap-2 ${calendarHealth === "unavailable" ? "bg-red-50 text-red-700 border border-red-100" : "bg-amber-50 text-amber-700 border border-amber-100"}`} data-testid="escritorio-calendar-health-warning">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          {calendarHealth === "unavailable" ? "Agenda temporariamente indisponível." : "Agenda parcialmente disponível — alguns itens podem estar faltando."}
        </div>
      )}

      {view === "hoje" && (
        <div data-testid="escritorio-hoje">
          {overdueToday.length > 0 && (
            <div className="mb-3 bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {overdueToday.length} item(ns) atrasado(s)
            </div>
          )}
          {today.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Nenhum compromisso encontrado para hoje." />
          ) : (
            <div className="space-y-2 mb-4">
              {today.map((item) => <FeedItemRow key={item.id} item={item} timezone={timezone} nowIso={nowIso} />)}
            </div>
          )}
        </div>
      )}

      {view === "semana" && (
        <div data-testid="escritorio-semana">
          {week.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Não há atividades conectadas para esta semana." />
          ) : (
            <div className="space-y-2 mb-4">
              {week.map((item) => <FeedItemRow key={item.id} item={item} timezone={timezone} nowIso={nowIso} />)}
            </div>
          )}
        </div>
      )}

      {view === "mes" && (
        <div className="space-y-5" data-testid="escritorio-mes">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wide text-gray-500 mb-2">Fechamento do mês</h2>
            {closure.length === 0 ? (
              <EmptyState icon={CheckSquare} title="Ainda não existem dados suficientes para montar o fechamento." />
            ) : (
              <div className="space-y-2">
                {closure.map((item) => <FeedItemRow key={item.id} item={item} timezone={timezone} nowIso={nowIso} />)}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-wide text-gray-500 mb-2">Planejamento do próximo mês</h2>
            {planning.length === 0 ? (
              <EmptyState icon={CalendarDays} title="Nenhum item planejado para o próximo mês ainda." />
            ) : (
              <div className="space-y-2">
                {planning.map((item) => <FeedItemRow key={item.id} item={item} timezone={timezone} nowIso={nowIso} />)}
              </div>
            )}
          </div>
          <DraftNotesCard label="Metas e decisões do mês" placeholder="Ex.: meta de faturamento, decisões tomadas, pendências para o próximo mês..." />
        </div>
      )}

      <SourcesPanel sourceErrors={sourceErrors} />
    </div>
  );
}
