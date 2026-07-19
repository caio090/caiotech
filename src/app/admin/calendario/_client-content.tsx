"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays, ChevronLeft, ChevronRight, X, ArrowRight,
  Sparkles, ClipboardList, Send, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildMonthWindow,
  groupEventsByDateKey,
  type GlobalCalendarEvent,
  type CalendarEventSource,
} from "@/lib/global-calendar";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const SOURCE_LABEL: Record<CalendarEventSource, string> = {
  content_item: "Conteúdo",
  operational_task: "Produção",
  approval: "Aprovação",
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
  clients: ClientOption[];
  sourceErrors: string[];
  serverToday: string; // YYYY-MM-DD in America/Fortaleza
  timezone: string;
}

export function GlobalCalendarContent({
  initialEvents, initialYear, initialMonth, clients, sourceErrors, serverToday, timezone,
}: Props) {
  const router = useRouter();

  const [filterClient, setFilterClient] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<"all" | CalendarEventSource>("all");
  const [selectedDay,   setSelectedDay]   = useState<string | null>(serverToday);
  const [selectedEvent, setSelectedEvent] = useState<GlobalCalendarEvent | null>(null);

  const window_ = useMemo(() => buildMonthWindow(initialYear, initialMonth), [initialYear, initialMonth]);

  const filteredEvents = useMemo(() => {
    return initialEvents.filter((e) => {
      if (filterClient !== "all" && e.client_id !== filterClient) return false;
      if (filterSource !== "all" && e.source !== filterSource) return false;
      return true;
    });
  }, [initialEvents, filterClient, filterSource]);

  const eventsByDay = useMemo(() => groupEventsByDateKey(filteredEvents), [filteredEvents]);

  const selectedEvents = selectedDay ? (eventsByDay.get(selectedDay) ?? []) : [];

  function goToMonth(year: number, month: number) {
    router.push(`/admin/calendario?year=${year}&month=${month}`);
  }

  function prevMonth() {
    const m = initialMonth === 1 ? 12 : initialMonth - 1;
    const y = initialMonth === 1 ? initialYear - 1 : initialYear;
    goToMonth(y, m);
  }

  function nextMonth() {
    const m = initialMonth === 12 ? 1 : initialMonth + 1;
    const y = initialMonth === 12 ? initialYear + 1 : initialYear;
    goToMonth(y, m);
  }

  function goToday() {
    const [y, m] = serverToday.split("-").map(Number);
    goToMonth(y, m);
  }

  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
          <CalendarDays className="w-4.5 h-4.5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Calendário Global</h1>
          <p className="text-xs text-gray-400">Conteúdos, produção e aprovações de todos os clientes — somente leitura</p>
        </div>
      </div>

      {sourceErrors.length > 0 && (
        <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-xs text-amber-700">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          Algumas fontes não puderam ser carregadas. Os dados exibidos podem estar incompletos.
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-xl px-1 py-1">
          <button onClick={prevMonth} aria-label="Mês anterior" className="p-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <span className="text-sm font-bold text-gray-800 px-2 min-w-[140px] text-center">
            {MONTHS[initialMonth - 1]} {initialYear}
          </span>
          <button onClick={nextMonth} aria-label="Próximo mês" className="p-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <button onClick={goToday} className="text-xs font-bold px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
          Hoje
        </button>

        <select
          value={filterClient}
          onChange={(e) => setFilterClient(e.target.value)}
          className="text-xs border border-gray-200 rounded-xl px-2.5 py-2 outline-none focus:border-indigo-400 bg-white text-gray-600 ml-auto"
        >
          <option value="all">Todos os clientes</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value as typeof filterSource)}
          className="text-xs border border-gray-200 rounded-xl px-2.5 py-2 outline-none focus:border-indigo-400 bg-white text-gray-600"
        >
          <option value="all">Todas as fontes</option>
          <option value="content_item">Conteúdos</option>
          <option value="operational_task">Produção</option>
          <option value="approval">Aprovações</option>
        </select>
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
              {(Object.keys(SOURCE_LABEL) as CalendarEventSource[]).map((key) => (
                <div key={key} className="flex items-center gap-1">
                  <div className={cn("w-2 h-2 rounded-full", SOURCE_DOT[key])} />
                  <span className="text-[10px] text-gray-400">{SOURCE_LABEL[key]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Agenda do dia */}
        <div>
          <h2 className="text-sm font-bold text-gray-800 mb-3">
            {selectedDay
              ? `${Number(selectedDay.slice(8, 10))} de ${MONTHS[Number(selectedDay.slice(5, 7)) - 1]}`
              : "Selecione um dia"}
          </h2>

          {selectedDay && selectedEvents.length === 0 && (
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

          {filteredEvents.length === 0 && (
            <div className="mt-4 bg-gray-50 rounded-2xl border border-gray-100 p-6 text-center">
              <p className="text-xs text-gray-500">Nenhum evento neste período.</p>
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
