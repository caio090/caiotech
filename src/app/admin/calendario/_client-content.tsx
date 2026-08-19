"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays, ChevronLeft, ChevronRight, X, ArrowRight, ArrowLeft,
  Sparkles, ClipboardList, Send, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildMonthWindow,
  buildGlobalCalendarHref,
  shiftMonth,
  groupEventsByDateKey,
  type GlobalCalendarEvent,
  type CalendarEventSource,
} from "@/lib/global-calendar";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const SOURCES: CalendarEventSource[] = ["content_item", "operational_task", "approval"];

const SOURCE_LABEL: Record<CalendarEventSource, string> = {
  content_item: "Conteúdo",
  operational_task: "Produção",
  approval: "Aprovação",
};

const SOURCE_LABEL_PLURAL: Record<CalendarEventSource, string> = {
  content_item: "Conteúdos",
  operational_task: "Produção",
  approval: "Aprovações",
};

const SOURCE_EMPTY_LABEL: Record<CalendarEventSource, string> = {
  content_item: "Nenhum conteúdo agendado neste período.",
  operational_task: "Nenhuma tarefa com prazo neste período.",
  approval: "Nenhuma aprovação neste período.",
};

const SOURCE_ERROR_LABEL: Record<CalendarEventSource, string> = {
  content_item: "Conteúdos não puderam ser carregados.",
  operational_task: "Produção não pôde ser carregada.",
  approval: "Aprovações não puderam ser carregadas.",
};

const SOURCE_ICON: Record<CalendarEventSource, React.ElementType> = {
  content_item: Sparkles,
  operational_task: ClipboardList,
  approval: Send,
};

const SOURCE_DOT: Record<CalendarEventSource, string> = {
  content_item: "bg-purple-500",
  operational_task: "bg-indigo-500",
  approval: "bg-amber-500",
};

const SOURCE_BADGE: Record<CalendarEventSource, string> = {
  content_item: "text-purple-700 bg-purple-50 border-purple-100",
  operational_task: "text-indigo-700 bg-indigo-50 border-indigo-100",
  approval: "text-amber-700 bg-amber-50 border-amber-100",
};

function formatEventDate(event: GlobalCalendarEvent, timezone: string): string {
  if (event.all_day) {
    const [y, m, d] = event.date_key.split("-").map(Number);
    return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
  }
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone, day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(event.start_at));
}

function EventDetailPanel({
  event, onClose, timezone,
}: { event: GlobalCalendarEvent; onClose: () => void; timezone: string }) {
  const Icon = SOURCE_ICON[event.source];
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-gray-900 leading-snug">{event.title}</p>
              {event.client_name && <p className="text-xs text-gray-400 mt-0.5">{event.client_name}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0 ml-2">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-gray-400 mb-0.5">Fonte</p>
              <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border", SOURCE_BADGE[event.source])}>
                <span className={cn("w-1.5 h-1.5 rounded-full", SOURCE_DOT[event.source])} />
                {SOURCE_LABEL[event.source]}
              </span>
            </div>
            <div className="bg-gray-50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-gray-400 mb-0.5">Data</p>
              <p className="text-xs font-semibold text-gray-800">{formatEventDate(event, timezone)}</p>
            </div>
            {event.event_type && (
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-gray-400 mb-0.5">Tipo</p>
                <p className="text-xs font-semibold text-gray-800">{event.event_type}</p>
              </div>
            )}
            <div className="bg-gray-50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-gray-400 mb-0.5">Status</p>
              <p className="text-xs font-semibold text-gray-800">{event.status}</p>
            </div>
            {event.responsible_name && (
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-gray-400 mb-0.5">Responsável</p>
                <p className="text-xs font-semibold text-gray-800">{event.responsible_name}</p>
              </div>
            )}
          </div>

          {event.description && (
            <div className="bg-blue-50 rounded-xl px-3 py-2.5">
              <p className="text-xs text-blue-900 leading-relaxed whitespace-pre-line line-clamp-6">{event.description}</p>
            </div>
          )}

          {event.group_key && (
            <p className="text-[10px] text-gray-400">
              Faz parte do mesmo fluxo de conteúdo (etapa: {SOURCE_LABEL[event.source].toLowerCase()}).
            </p>
          )}
        </div>

        <div className="px-5 pb-5">
          <Link
            href={event.origin_href}
            className="flex items-center justify-center gap-1.5 w-full text-xs font-bold py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-colors"
          >
            Abrir origem <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

interface ClientOption { id: string; name: string }

interface Props {
  initialEvents: GlobalCalendarEvent[];
  initialYear: number;
  initialMonth: number; // 1-12
  initialSelectedDay: string; // YYYY-MM-DD, resolved server-side for this exact month
  initialFilterClient: string; // client id or "all" — already validated server-side
  initialFilterSource: CalendarEventSource | "all";
  clients: ClientOption[];
  sourceErrors: CalendarEventSource[];
  serverToday: string; // YYYY-MM-DD in America/Fortaleza
  timezone: string;
  /** Fase 13 — presente quando a navegação veio de um botão contextual do REC OS (buildCalendarNavigationUrl). */
  returnTo?: string | null;
  /**
   * REC OS Context Foundation V1 — quando esta MESMA visão é renderizada
   * dentro de uma projeção contextual (ex.: /admin/contentos/calendario),
   * mês anterior/próximo/hoje e os selects de cliente/fonte devem continuar
   * navegando dentro daquela rota, nunca pular para /admin/calendario.
   * Default preserva o comportamento existente do Calendário Global.
   */
  basePath?: string;
  headerTitle?: string;
  headerDescription?: string;
}

export function GlobalCalendarContent({
  initialEvents, initialYear, initialMonth, initialSelectedDay, initialFilterClient, initialFilterSource,
  clients, sourceErrors, serverToday, timezone, returnTo,
  basePath, headerTitle, headerDescription,
}: Props) {
  // Purely operational — never holds year/month/client/source, only whether a
  // full-page navigation was just kicked off, so the selects can disable
  // themselves immediately and ignore further input.
  const [isNavigating, setIsNavigating] = useState(false);

  // URL is the single source of truth for year/month/client/source: page.tsx
  // validates them server-side and remounts this component (via `key`)
  // whenever any of them change, so reading the props directly — instead of
  // mirroring them into local useState — means the header, the filters and
  // the agenda can never drift out of sync with each other or with the URL.
  const filterClient = initialFilterClient;
  const filterSource = initialFilterSource;

  // selectedDay stays as local state: it's a genuine in-page interaction
  // (clicking a day in the grid) that doesn't need its own URL param, and it
  // is correctly reset by the same `key`-driven remount whenever the month,
  // client or source changes.
  const [selectedDay,   setSelectedDay]   = useState<string>(initialSelectedDay);
  const [selectedEvent, setSelectedEvent] = useState<GlobalCalendarEvent | null>(null);

  const window_ = useMemo(() => buildMonthWindow(initialYear, initialMonth), [initialYear, initialMonth]);

  const clientLabel = filterClient === "all" ? null : (clients.find((c) => c.id === filterClient)?.name ?? null);

  const countsBySource = useMemo(() => {
    const counts: Record<CalendarEventSource, number> = { content_item: 0, operational_task: 0, approval: 0 };
    for (const e of initialEvents) {
      if (filterClient !== "all" && e.client_id !== filterClient) continue;
      counts[e.source]++;
    }
    return counts;
  }, [initialEvents, filterClient]);

  const filteredEvents = useMemo(() => {
    return initialEvents.filter((e) => {
      if (filterClient !== "all" && e.client_id !== filterClient) return false;
      if (filterSource !== "all" && e.source !== filterSource) return false;
      return true;
    });
  }, [initialEvents, filterClient, filterSource]);

  const eventsByDay = useMemo(() => groupEventsByDateKey(filteredEvents), [filteredEvents]);

  const selectedEvents = eventsByDay.get(selectedDay) ?? [];

  // Deterministic hrefs — always derived from the current props, never from
  // a stale closure or an onClick handler that might read old state.
  const previous = shiftMonth(initialYear, initialMonth, -1);
  const next = shiftMonth(initialYear, initialMonth, 1);
  const [todayYear, todayMonth] = serverToday.split("-").map(Number);
  const isCurrentMonth = initialYear === todayYear && initialMonth === todayMonth;

  const previousMonthHref = buildGlobalCalendarHref({ year: previous.year, month: previous.month, client: filterClient, source: filterSource, basePath });
  const nextMonthHref = buildGlobalCalendarHref({ year: next.year, month: next.month, client: filterClient, source: filterSource, basePath });
  const todayHref = buildGlobalCalendarHref({ year: todayYear, month: todayMonth, client: filterClient, source: filterSource, basePath });
  const currentHref = buildGlobalCalendarHref({ year: initialYear, month: initialMonth, client: filterClient, source: filterSource, basePath });

  // A single, exclusive navigation path for the two <select> controls (they
  // can't be plain <a> links). Native full-page navigation — no router.push,
  // no client-side route cache involved — so it can't replay a stale RSC
  // payload from an earlier visit to the same URL.
  function navigateToCalendarHref(href: string) {
    if (href === currentHref || isNavigating) return;
    setIsNavigating(true);
    window.location.assign(href);
  }

  function onClientChange(value: string) {
    navigateToCalendarHref(buildGlobalCalendarHref({ year: initialYear, month: initialMonth, client: value, source: filterSource, basePath }));
  }

  function onSourceChange(value: string) {
    navigateToCalendarHref(buildGlobalCalendarHref({ year: initialYear, month: initialMonth, client: filterClient, source: value as "all" | CalendarEventSource, basePath }));
  }

  const totalCount = countsBySource.content_item + countsBySource.operational_task + countsBySource.approval;

  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
          <CalendarDays className="w-4.5 h-4.5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">{headerTitle ?? "Calendário Global"}</h1>
          <p className="text-xs text-gray-400">{headerDescription ?? "Conteúdos, produção e aprovações de todos os clientes — somente leitura"}</p>
        </div>
      </div>

      {returnTo && (
        <div className="mb-4 flex items-center justify-between gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 text-xs text-indigo-700" data-testid="calendar-context-banner">
          <span>Aberto a partir do REC OS.</span>
          <Link href={returnTo} data-testid="calendar-return-link" className="flex items-center gap-1 font-bold hover:underline">
            <ArrowLeft className="w-3 h-3" /> Voltar
          </Link>
        </div>
      )}

      {sourceErrors.length > 0 && (
        <div className="mb-4 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-xs text-amber-700">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{sourceErrors.map((s) => SOURCE_ERROR_LABEL[s]).join(" ")}</span>
        </div>
      )}

      {/* Toolbar — Anterior/Próximo/Hoje are plain native <a> links: a full
          document navigation, not intercepted client-side, so there is no
          SPA router cache that can replay a stale month/filter combination. */}
      <div
        className={cn("flex flex-wrap items-center gap-2 mb-3", isNavigating && "opacity-60")}
        aria-busy={isNavigating}
      >
        <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-xl px-1 py-1">
          <a
            href={previousMonthHref}
            aria-label="Mês anterior"
            data-testid="calendar-previous-month"
            onClick={() => setIsNavigating(true)}
            className="p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
            <span className="sr-only">Mês anterior</span>
          </a>
          <span className="text-sm font-bold text-gray-800 px-2 min-w-[140px] text-center">
            {MONTHS[initialMonth - 1]} {initialYear}
          </span>
          <a
            href={nextMonthHref}
            aria-label="Próximo mês"
            data-testid="calendar-next-month"
            onClick={() => setIsNavigating(true)}
            className="p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-500" />
            <span className="sr-only">Próximo mês</span>
          </a>
        </div>
        <a
          href={todayHref}
          aria-label="Ir para hoje"
          aria-current={isCurrentMonth ? "date" : undefined}
          data-testid="calendar-today"
          onClick={() => setIsNavigating(true)}
          className={cn(
            "text-xs font-bold px-3 py-2 rounded-xl border transition-colors",
            isCurrentMonth
              ? "border-indigo-200 bg-indigo-50 text-indigo-700"
              : "border-gray-200 text-gray-600 hover:bg-gray-50"
          )}
        >
          Hoje
        </a>

        <select
          value={filterClient}
          onChange={(e) => onClientChange(e.target.value)}
          disabled={isNavigating}
          data-testid="calendar-client-filter"
          className="text-xs border border-gray-200 rounded-xl px-2.5 py-2 outline-none focus:border-indigo-400 bg-white text-gray-600 ml-auto"
        >
          <option value="all">Todos os clientes</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select
          value={filterSource}
          onChange={(e) => onSourceChange(e.target.value)}
          disabled={isNavigating}
          data-testid="calendar-source-filter"
          className="text-xs border border-gray-200 rounded-xl px-2.5 py-2 outline-none focus:border-indigo-400 bg-white text-gray-600"
        >
          <option value="all">Todas as fontes ({totalCount})</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>{SOURCE_LABEL_PLURAL[s]} ({countsBySource[s]})</option>
          ))}
        </select>
      </div>

      {/* Source summary badges */}
      <div className="flex flex-wrap gap-2 mb-5">
        {SOURCES.map((s) => (
          <span key={s} className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border", SOURCE_BADGE[s])}>
            <span className={cn("w-1.5 h-1.5 rounded-full", SOURCE_DOT[s])} />
            {SOURCE_LABEL_PLURAL[s]}: {countsBySource[s]}
            {sourceErrors.includes(s) && <AlertTriangle className="w-3 h-3 ml-0.5" />}
          </span>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Grid */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 overflow-x-auto">
            <div className="grid grid-cols-7 mb-2 min-w-[560px]">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5 min-w-[560px]">
              {window_.weeks.flat().map((dateKey) => {
                const dayEvents = eventsByDay.get(dateKey) ?? [];
                const inMonth = dateKey.startsWith(`${initialYear}-${String(initialMonth).padStart(2, "0")}`);
                const isToday = dateKey === serverToday;
                const isSelected = dateKey === selectedDay;
                const dayNumber = Number(dateKey.slice(8, 10));
                return (
                  <button
                    key={dateKey}
                    onClick={() => setSelectedDay(dateKey)}
                    className={cn(
                      "relative min-h-[64px] p-1 rounded-xl text-left transition-all border-2",
                      !inMonth && "opacity-40",
                      isSelected ? "border-indigo-400 bg-indigo-50" :
                      isToday ? "border-indigo-200 bg-indigo-50/50" :
                                "border-transparent hover:border-gray-100 hover:bg-gray-50"
                    )}
                  >
                    <span className={cn(
                      "text-xs font-bold block mb-0.5",
                      isSelected ? "text-indigo-700" : isToday ? "text-indigo-600" : "text-gray-700"
                    )}>
                      {dayNumber}
                    </span>
                    <div className="flex flex-wrap gap-0.5">
                      {dayEvents.slice(0, 3).map((e) => (
                        <div key={e.id} className={cn("w-2 h-2 rounded-full", SOURCE_DOT[e.source])} title={e.title} />
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[8px] text-gray-400 font-bold">+{dayEvents.length - 3}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-gray-50">
              {SOURCES.map((s) => (
                <div key={s} className="flex items-center gap-1">
                  <div className={cn("w-2 h-2 rounded-full", SOURCE_DOT[s])} />
                  <span className="text-[10px] text-gray-400">{SOURCE_LABEL[s]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Agenda do dia */}
        <div>
          <h2 className="text-sm font-bold text-gray-800 mb-3">
            {Number(selectedDay.slice(8, 10))} de {MONTHS[Number(selectedDay.slice(5, 7)) - 1]}
          </h2>

          {selectedEvents.length === 0 && (
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 text-center">
              <CalendarDays className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-xs text-gray-500">Nenhum evento neste dia.</p>
            </div>
          )}

          <div className="space-y-2">
            {selectedEvents.map((e) => {
              const Icon = SOURCE_ICON[e.source];
              return (
                <button
                  key={e.id}
                  onClick={() => setSelectedEvent(e)}
                  className="w-full text-left bg-white rounded-xl border border-gray-100 p-3.5 hover:shadow-sm hover:border-indigo-200 transition-all"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <div className="w-7 h-7 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800 leading-tight truncate">{e.title}</p>
                      <p className="text-[10px] text-gray-400 truncate">{e.client_name ?? "Cliente"}</p>
                    </div>
                  </div>
                  <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border", SOURCE_BADGE[e.source])}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", SOURCE_DOT[e.source])} />
                    {SOURCE_LABEL[e.source]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Contextual period-level empty states (Fase 8) */}
          {totalCount === 0 && sourceErrors.length === 0 && (
            <div className="mt-4 bg-gray-50 rounded-2xl border border-gray-100 p-6 text-center">
              <p className="text-xs text-gray-500">
                {clientLabel
                  ? `Nenhum evento para ${clientLabel} neste período.`
                  : "Nenhum evento neste período."}
              </p>
            </div>
          )}
          {filterSource !== "all" && countsBySource[filterSource] === 0 && !sourceErrors.includes(filterSource) && (
            <div className="mt-4 bg-gray-50 rounded-2xl border border-gray-100 p-6 text-center">
              <p className="text-xs text-gray-500">{SOURCE_EMPTY_LABEL[filterSource]}</p>
            </div>
          )}
        </div>
      </div>

      {selectedEvent && (
        <EventDetailPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} timezone={timezone} />
      )}
    </div>
  );
}
