"use client";
import { useState, useEffect } from "react";
import { useOnboardingStore } from "@/lib/onboarding-store";
import { mockCalendarEvents } from "@/data/mock-data";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { ASSET_VARIANT_LABELS } from "@/lib/op-flow-rules";
import {
  Plus, Sparkles, ChevronLeft, ChevronRight, X,
  Camera, Music, Globe, MessageCircle, Play, Inbox,
  FileText, AlignLeft, Target, Link2, FileCheck,
} from "lucide-react";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const STATUS_CONFIG: Record<string, { dot: string; badge: string }> = {
  scheduled: { dot: "bg-blue-500",     badge: "text-blue-700 bg-blue-50" },
  draft:     { dot: "bg-gray-400",     badge: "text-gray-600 bg-gray-100" },
  in_review: { dot: "bg-amber-500",    badge: "text-amber-700 bg-amber-50" },
  approved:  { dot: "bg-emerald-500",  badge: "text-emerald-700 bg-emerald-50" },
  published: { dot: "bg-purple-500",   badge: "text-purple-700 bg-purple-50" },
  rejected:  { dot: "bg-red-500",      badge: "text-red-700 bg-red-50" },
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendado", draft: "Rascunho", in_review: "Em revisão",
  approved: "Aprovado", published: "Publicado", rejected: "Reprovado",
};

function PlatformIcon({ platform, className = "w-5 h-5" }: { platform: string; className?: string }) {
  const p = platform.toLowerCase();
  if (p.includes("instagram")) return <Camera className={className} />;
  if (p.includes("tiktok"))    return <Music   className={className} />;
  if (p.includes("linkedin"))  return <Globe    className={className} />;
  if (p.includes("facebook"))  return <Globe   className={className} />;
  if (p.includes("whatsapp"))  return <MessageCircle className={className} />;
  if (p.includes("youtube"))   return <Play    className={className} />;
  return <Globe className={className} />;
}

// Static extra events around now (relative to module load time)
const _TODAY = new Date();
const EXTRA_EVENTS = [
  { id: "e-x1", title: "Post: Dica da semana",        platform: "Instagram", status: "scheduled", date: new Date(_TODAY.getFullYear(), _TODAY.getMonth(), _TODAY.getDate() + 1).toISOString(), clientId: "client-1", clientName: "Demo" },
  { id: "e-x2", title: "Reels: Bastidores",            platform: "TikTok",   status: "draft",     date: new Date(_TODAY.getFullYear(), _TODAY.getMonth(), _TODAY.getDate() + 3).toISOString(), clientId: "client-1", clientName: "Demo" },
  { id: "e-x3", title: "Carrossel: Linha especial",    platform: "Instagram", status: "in_review", date: new Date(_TODAY.getFullYear(), _TODAY.getMonth(), _TODAY.getDate() + 5).toISOString(), clientId: "client-1", clientName: "Demo" },
  { id: "e-x4", title: "Story: Enquete de produto",    platform: "Instagram", status: "scheduled", date: new Date(_TODAY.getFullYear(), _TODAY.getMonth(), _TODAY.getDate() + 7).toISOString(), clientId: "client-1", clientName: "Demo" },
  { id: "e-x5", title: "Post: Depoimento de cliente",  platform: "Facebook",  status: "approved",  date: new Date(_TODAY.getFullYear(), _TODAY.getMonth(), _TODAY.getDate() + 10).toISOString(), clientId: "client-1", clientName: "Demo" },
  { id: "e-x6", title: "Reels: Produto do mês",        platform: "TikTok",   status: "draft",     date: new Date(_TODAY.getFullYear(), _TODAY.getMonth(), _TODAY.getDate() + 14).toISOString(), clientId: "client-1", clientName: "Demo" },
  { id: "e-x7", title: "Post: Semana comemorativa",    platform: "Instagram", status: "scheduled", date: new Date(_TODAY.getFullYear(), _TODAY.getMonth(), _TODAY.getDate() - 2).toISOString(), clientId: "client-1", clientName: "Demo" },
];

export interface CalendarEvent {
  id: string;
  title: string;
  platform: string;
  status: string;
  date: string;
  clientId?: string;
  clientName?: string;
  type?: string;
  caption?: string;
  copy?: string;
  objective?: string;
}

interface Props {
  serverEvents?: CalendarEvent[];
}

interface DeliveryAttachment {
  attachment_url: string;
  attachment_name: string | null;
  asset_variant: string | null;
  page_number: number | null;
  is_final_file: boolean;
}

function EventDetailModal({ event, onClose }: { event: CalendarEvent; onClose: () => void }) {
  const cfg = STATUS_CONFIG[event.status];
  const [deliveries, setDeliveries] = useState<DeliveryAttachment[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("operational_attachments")
          .select("attachment_url, attachment_name, asset_variant, page_number, is_final_file")
          .eq("content_item_id", event.id)
          .eq("is_final_file", true)
          .order("asset_variant", { ascending: true })
          .order("page_number", { ascending: true });
        if (!cancelled && data) setDeliveries(data as DeliveryAttachment[]);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [event.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
              <PlatformIcon platform={event.platform} className="w-5 h-5 text-purple-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-gray-900 leading-snug">{event.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{event.platform}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-gray-400 mb-0.5">Status</p>
              <div className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border", cfg?.badge)}>
                <span className={cn("w-1.5 h-1.5 rounded-full", cfg?.dot)} />
                {STATUS_LABELS[event.status] ?? event.status}
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-gray-400 mb-0.5">Data</p>
              <p className="text-xs font-semibold text-gray-800">
                {new Date(event.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            </div>
            {event.type && (
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-gray-400 mb-0.5">Tipo</p>
                <p className="text-xs font-semibold text-gray-800">{event.type}</p>
              </div>
            )}
            {event.clientName && (
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-gray-400 mb-0.5">Cliente</p>
                <p className="text-xs font-semibold text-gray-800">{event.clientName}</p>
              </div>
            )}
          </div>

          {/* Content preview: objective, caption, copy */}
          {event.objective && (
            <div className="bg-blue-50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-blue-500 font-semibold mb-1 flex items-center gap-1">
                <Target className="w-3 h-3" /> Objetivo
              </p>
              <p className="text-xs text-blue-900 leading-relaxed">{event.objective}</p>
            </div>
          )}
          {event.caption && (
            <div className="bg-purple-50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-purple-500 font-semibold mb-1 flex items-center gap-1">
                <AlignLeft className="w-3 h-3" /> Legenda
              </p>
              <p className="text-xs text-purple-900 leading-relaxed whitespace-pre-line line-clamp-6">{event.caption}</p>
            </div>
          )}
          {event.copy && (
            <div className="bg-indigo-50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-indigo-500 font-semibold mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3" /> Roteiro / Copy
              </p>
              <p className="text-xs text-indigo-900 leading-relaxed whitespace-pre-line line-clamp-6">{event.copy}</p>
            </div>
          )}

          {/* Deliveries from operational team */}
          {deliveries.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <FileCheck className="w-3 h-3" /> Entregas da demanda
              </p>
              <div className="space-y-1.5">
                {deliveries.map((d, i) => {
                  const label = d.asset_variant
                    ? (ASSET_VARIANT_LABELS[d.asset_variant] ?? d.asset_variant)
                    : (d.attachment_name ?? "Arquivo");
                  const name = d.page_number != null ? `${label} — Pág. ${d.page_number}` : label;
                  return (
                    <a
                      key={i}
                      href={d.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 text-xs text-emerald-800 hover:bg-emerald-100 transition-colors"
                    >
                      <Link2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                      <span className="font-medium flex-1 truncate">{name}</span>
                      <span className="text-[10px] text-emerald-500 flex-shrink-0">Abrir</span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full text-xs font-bold py-3 border border-gray-200 rounded-2xl text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

export function ContentosCalendarioContent({ serverEvents }: Props) {
  const data = useOnboardingStore();
  const brandName = data.marca?.nome || "";

  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [filterStatus,   setFilterStatus]   = useState<string>("all");
  const [filterChannel,  setFilterChannel]  = useState<string>("all");
  const [selectedDay,    setSelectedDay]    = useState<number | null>(now.getDate());
  const [selectedEvent,  setSelectedEvent]  = useState<CalendarEvent | null>(null);

  // Real data only when connected; demo mode shows sample events
  const allEvents = serverEvents ?? [...mockCalendarEvents, ...EXTRA_EVENTS];

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else { setMonth(m => m - 1); } };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else { setMonth(m => m + 1); } };

  const firstDay  = new Date(year, month, 1).getDay();
  const daysCount = new Date(year, month + 1, 0).getDate();

  const calDays: Array<number | null> = [...Array(firstDay).fill(null), ...Array.from({ length: daysCount }, (_, i) => i + 1)];

  const filteredEvents = allEvents.filter((e) => {
    const d = new Date(e.date);
    if (d.getFullYear() !== year || d.getMonth() !== month) return false;
    if (filterStatus !== "all" && e.status !== filterStatus) return false;
    if (filterChannel !== "all" && e.platform !== filterChannel) return false;
    return true;
  });

  const eventsByDay: Record<number, typeof filteredEvents> = {};
  filteredEvents.forEach((e) => {
    const d = new Date(e.date).getDate();
    if (!eventsByDay[d]) eventsByDay[d] = [];
    eventsByDay[d].push(e);
  });

  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] ?? []) : [];

  const isToday = (day: number) =>
    day === now.getDate() && month === now.getMonth() && year === now.getFullYear();

  const channels = Array.from(new Set(allEvents.map(e => e.platform))).filter(Boolean);

  return (
    <div>
      <PageHeader title="Calendário Editorial" description={`Planejamento de ${brandName}`} />

      {serverEvents && (
        <div className="mb-4 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          ✓ Supabase — {serverEvents.length} conteúdo(s) real(is) no calendário
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button className="flex items-center gap-1.5 text-sm font-medium text-white bg-purple-600 px-4 py-2 rounded-xl hover:bg-purple-700 transition-colors">
          <Plus className="w-4 h-4" /> Nova pauta
        </button>
        <button className="flex items-center gap-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors">
          <Sparkles className="w-4 h-4" /> Recomendação IA
        </button>
        <div className="flex items-center gap-1 ml-auto bg-white border border-gray-100 rounded-xl px-1 py-1">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <span className="text-sm font-bold text-gray-800 px-2">{MONTHS[month]} {year}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-5">
        <div className="flex gap-1">
          {[["all", "Todos"], ["draft", "Rascunho"], ["scheduled", "Agendado"], ["in_review", "Em revisão"], ["approved", "Aprovado"]].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilterStatus(v)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-xl border transition-all",
                filterStatus === v ? "border-purple-400 bg-purple-50 text-purple-700" : "border-gray-100 bg-white text-gray-500 hover:border-gray-200"
              )}
            >
              {v !== "all" && <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-1", STATUS_CONFIG[v]?.dot)} />}
              {l}
            </button>
          ))}
        </div>
        <select
          value={filterChannel}
          onChange={(e) => setFilterChannel(e.target.value)}
          className="text-xs border border-gray-200 rounded-xl px-2.5 py-1.5 outline-none focus:border-purple-400 bg-white text-gray-600"
        >
          <option value="all">Todos os canais</option>
          {channels.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="grid grid-cols-7 mb-2">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {calDays.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} />;
                const events = eventsByDay[day] ?? [];
                const isSelected = selectedDay === day;
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "relative min-h-[52px] p-1 rounded-xl text-left transition-all border-2",
                      isSelected ? "border-purple-400 bg-purple-50" :
                      isToday(day) ? "border-indigo-300 bg-indigo-50" :
                                    "border-transparent hover:border-gray-100 hover:bg-gray-50"
                    )}
                  >
                    <span className={cn(
                      "text-xs font-bold block mb-0.5",
                      isSelected ? "text-purple-700" : isToday(day) ? "text-indigo-700" : "text-gray-700"
                    )}>
                      {day}
                    </span>
                    <div className="flex flex-wrap gap-0.5">
                      {events.slice(0, 3).map((e) => (
                        <div key={e.id} className={cn("w-2 h-2 rounded-full", STATUS_CONFIG[e.status]?.dot ?? "bg-gray-300")} title={e.title} />
                      ))}
                      {events.length > 3 && (
                        <span className="text-[8px] text-gray-400 font-bold">+{events.length - 3}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-gray-50">
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center gap-1">
                  <div className={cn("w-2 h-2 rounded-full", STATUS_CONFIG[key]?.dot ?? "bg-gray-300")} />
                  <span className="text-[10px] text-gray-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <h2 className="text-sm font-bold text-gray-800 mb-3">
            {selectedDay ? `Dia ${selectedDay} — ${MONTHS[month]}` : "Selecione um dia"}
          </h2>
          {selectedDay && selectedEvents.length === 0 && (
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 text-center">
              <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-2"><Inbox className="w-4 h-4 text-gray-400" /></div>
              <p className="text-xs text-gray-500">Nenhum conteúdo neste dia</p>
              <button className="mt-3 text-xs text-purple-600 bg-purple-50 px-3 py-1.5 rounded-xl hover:bg-purple-100 transition-colors font-medium">
                + Adicionar pauta
              </button>
            </div>
          )}
          <div className="space-y-2">
            {selectedEvents.map((e) => {
              const cfg = STATUS_CONFIG[e.status];
              return (
                <button
                  key={e.id}
                  onClick={() => setSelectedEvent(e)}
                  className="w-full text-left bg-white rounded-xl border border-gray-100 p-3.5 hover:shadow-sm hover:border-purple-200 transition-all"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <div className="w-7 h-7 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0"><PlatformIcon platform={e.platform} className="w-3.5 h-3.5 text-purple-500" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800 leading-tight truncate">{e.title}</p>
                      <p className="text-[10px] text-gray-400">{e.platform}{(e as { clientName?: string }).clientName ? ` · ${(e as { clientName?: string }).clientName}` : ""}</p>
                    </div>
                  </div>
                  <div className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border", cfg?.badge)}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", cfg?.dot)} />
                    {STATUS_LABELS[e.status] ?? e.status}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-5 bg-white rounded-2xl border border-gray-100 p-4">
            <h3 className="text-xs font-bold text-gray-700 mb-3">Resumo do mês</h3>
            <div className="space-y-2">
              {Object.entries(STATUS_LABELS).map(([key, label]) => {
                const count = filteredEvents.filter(e => e.status === key).length;
                if (count === 0) return null;
                return (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className={cn("w-2 h-2 rounded-full", STATUS_CONFIG[key]?.dot)} />
                      <span className="text-gray-600">{label}</span>
                    </div>
                    <span className="font-bold text-gray-800">{count}</span>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-gray-50 flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium">Total</span>
                <span className="font-black text-gray-900">{filteredEvents.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedEvent && (
        <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}
