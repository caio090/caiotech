"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  LayoutGrid, List, GanttChartSquare, CalendarDays, Filter, X, ChevronLeft, ChevronRight, ExternalLink, AlertTriangle,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import {
  type RecOsRoadmapItem, type RoadmapFilters, EMPTY_ROADMAP_FILTERS,
  filterRoadmapItems, isRoadmapItemOverdue, groupRoadmapItemsByKanbanColumn, KANBAN_COLUMNS,
  bucketRoadmapItemsForTimeline, type TimelineGranularity, roadmapItemsForMonth,
} from "@/lib/rec-os-roadmap";
import { buildCalendarNavigationUrl } from "@/lib/rec-os-workflow/types";

type ViewId = "quadro" | "lista" | "linha_do_tempo" | "calendario";

const VIEWS: { id: ViewId; label: string; icon: React.ElementType }[] = [
  { id: "quadro", label: "Quadro", icon: LayoutGrid },
  { id: "lista", label: "Lista", icon: List },
  { id: "linha_do_tempo", label: "Linha do tempo", icon: GanttChartSquare },
  { id: "calendario", label: "Calendário", icon: CalendarDays },
];

const TZ = "America/Fortaleza";

function todayIso(): string {
  return new Date().toISOString();
}

function fmtDate(iso: string | null): string {
  if (!iso) return "Sem data definida";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TZ });
}

function contentHref(item: RecOsRoadmapItem): string {
  if (item.approvalState === "aguardando") return `/admin/contentos/aprovacoes?client=${item.clientId}&content_id=${item.contentId}`;
  return `/admin/contentos/producao?client=${item.clientId}&content_id=${item.contentId}`;
}

function RoadmapCard({ item, showClient }: { item: RecOsRoadmapItem; showClient: boolean }) {
  return (
    <Link
      href={contentHref(item)}
      data-testid="roadmap-item-card"
      className="block bg-white border border-gray-100 rounded-xl p-3 hover:border-purple-200 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold text-gray-900 truncate">{item.title}</p>
        {item.blocked && <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
      </div>
      {showClient && <p className="text-[10px] text-purple-600 font-semibold mt-0.5 truncate">{item.clientName ?? "Cliente"}</p>}
      <p className="text-[10px] text-gray-400 mt-1">{item.format ?? "Formato não definido"} · {item.channel ?? "Canal não definido"}</p>
      <div className="flex items-center justify-between mt-2 text-[10px]">
        <span className="text-gray-500">{item.responsibleName ?? "Sem responsável"}</span>
        <span className={isRoadmapItemOverdue(item, todayIso()) ? "font-bold text-red-600" : "text-gray-400"}>{fmtDate(item.dueAt)}</span>
      </div>
      <p className="text-[10px] text-indigo-600 font-medium mt-1.5 truncate">{item.nextAction}</p>
    </Link>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button type="button" onClick={onRemove} className="flex items-center gap-1 text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100 px-2 py-1 rounded-full">
      {label} <X className="w-2.5 h-2.5" />
    </button>
  );
}

export function RoadmapClient({
  items, clientId, showClientColumn,
}: {
  items: RecOsRoadmapItem[];
  clientId: string | null;
  showClientColumn: boolean;
}) {
  const [view, setView] = useState<ViewId>("quadro");
  const [filters, setFilters] = useState<RoadmapFilters>(EMPTY_ROADMAP_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [granularity, setGranularity] = useState<TimelineGranularity>("semana");
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const now = useMemo(() => todayIso(), []);
  const filtered = useMemo(() => filterRoadmapItems(items, filters, now), [items, filters, now]);

  const statusOptions = useMemo(() => [...new Set(items.map((i) => i.canonicalStatus))], [items]);
  const formatOptions = useMemo(() => [...new Set(items.map((i) => i.format).filter((f): f is string => !!f))], [items]);
  const channelOptions = useMemo(() => [...new Set(items.map((i) => i.channel).filter((c): c is string => !!c))], [items]);
  const responsibleOptions = useMemo(
    () => [...new Set(items.map((i) => i.responsibleId).filter((r): r is string => !!r))]
      .map((id) => ({ id, name: items.find((i) => i.responsibleId === id)?.responsibleName ?? id })),
    [items],
  );

  function toggleArrayFilter(key: "status" | "format" | "channel" | "responsibleId" | "approvalState", value: string) {
    setFilters((prev) => {
      const current = prev[key];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [key]: next };
    });
  }

  const activeChips: { key: string; label: string; onRemove: () => void }[] = [
    ...filters.status.map((s) => ({ key: `status:${s}`, label: `Status: ${s}`, onRemove: () => toggleArrayFilter("status", s) })),
    ...filters.format.map((f) => ({ key: `format:${f}`, label: `Formato: ${f}`, onRemove: () => toggleArrayFilter("format", f) })),
    ...filters.channel.map((c) => ({ key: `channel:${c}`, label: `Canal: ${c}`, onRemove: () => toggleArrayFilter("channel", c) })),
    ...filters.responsibleId.map((r) => ({
      key: `resp:${r}`,
      label: `Resp.: ${responsibleOptions.find((o) => o.id === r)?.name ?? r}`,
      onRemove: () => toggleArrayFilter("responsibleId", r),
    })),
    ...filters.approvalState.map((a) => ({ key: `appr:${a}`, label: `Aprovação: ${a}`, onRemove: () => toggleArrayFilter("approvalState", a) })),
    ...(filters.month ? [{ key: "month", label: `Mês: ${filters.month}`, onRemove: () => setFilters((p) => ({ ...p, month: null })) }] : []),
    ...(filters.overdueOnly ? [{ key: "overdue", label: "Somente atrasados", onRemove: () => setFilters((p) => ({ ...p, overdueOnly: false })) }] : []),
  ];

  const calendarNavUrl = buildCalendarNavigationUrl("/admin/calendario", {
    workspaceId: clientId ?? "global",
    clientId,
    campaignId: null,
    contentId: null,
    month,
    filters: {},
    returnRoute: typeof window !== "undefined" ? window.location.pathname + window.location.search : "/admin/contentos/roadmap",
  });

  return (
    <div className="space-y-4" data-testid="roadmap-root">
      {/* View switcher */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1" data-testid="roadmap-view-switcher">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              data-testid={`roadmap-view-${v.id}`}
              onClick={() => setView(v.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                view === v.id ? "bg-white text-purple-700 shadow-sm" : "text-gray-500"
              }`}
            >
              <v.icon className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          data-testid="roadmap-filters-trigger"
          onClick={() => setShowFilters(true)}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 px-3 py-2 rounded-xl hover:border-purple-200"
        >
          <Filter className="w-3.5 h-3.5" /> Filtros {activeChips.length > 0 && `(${activeChips.length})`}
        </button>
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5" data-testid="roadmap-active-filters">
          {activeChips.map((c) => <FilterChip key={c.key} label={c.label} onRemove={c.onRemove} />)}
          <button type="button" onClick={() => setFilters(EMPTY_ROADMAP_FILTERS)} className="text-[10px] font-bold text-gray-400 underline px-1">
            Limpar tudo
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title={items.length === 0 ? "Nenhum conteúdo no roadmap ainda" : "Nenhum item para estes filtros"}
          description={items.length === 0 ? "Quando um conteúdo for criado no REC OS, ele aparece aqui automaticamente." : "Ajuste ou limpe os filtros para ver os itens."}
        />
      ) : (
        <>
          {view === "quadro" && <KanbanView items={filtered} showClient={showClientColumn} />}
          {view === "lista" && <ListView items={filtered} showClient={showClientColumn} search={search} onSearch={setSearch} />}
          {view === "linha_do_tempo" && <TimelineView items={filtered} granularity={granularity} onGranularityChange={setGranularity} showClient={showClientColumn} />}
          {view === "calendario" && (
            <CalendarView items={filtered} month={month} onMonthChange={setMonth} calendarNavUrl={calendarNavUrl} showClient={showClientColumn} />
          )}
        </>
      )}

      {showFilters && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-label="Filtros do Roadmap" data-testid="roadmap-filter-sheet">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowFilters(false)} />
          <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.25rem)" }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-gray-900">Filtros</p>
              <button type="button" onClick={() => setShowFilters(false)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>

            <FilterGroup title="Status">
              {statusOptions.map((s) => (
                <FilterCheckbox key={s} label={s} checked={filters.status.includes(s)} onChange={() => toggleArrayFilter("status", s)} />
              ))}
            </FilterGroup>
            <FilterGroup title="Formato">
              {formatOptions.length === 0
                ? <p className="text-[11px] text-gray-400">Nenhum formato registrado ainda.</p>
                : formatOptions.map((f) => (
                  <FilterCheckbox key={f} label={f} checked={filters.format.includes(f)} onChange={() => toggleArrayFilter("format", f)} />
                ))}
            </FilterGroup>
            <FilterGroup title="Canal">
              {channelOptions.length === 0
                ? <p className="text-[11px] text-gray-400">Nenhum canal registrado ainda.</p>
                : channelOptions.map((c) => (
                  <FilterCheckbox key={c} label={c} checked={filters.channel.includes(c)} onChange={() => toggleArrayFilter("channel", c)} />
                ))}
            </FilterGroup>
            <FilterGroup title="Responsável">
              {responsibleOptions.length === 0
                ? <p className="text-[11px] text-gray-400">Nenhum responsável atribuído ainda.</p>
                : responsibleOptions.map((r) => (
                  <FilterCheckbox key={r.id} label={r.name} checked={filters.responsibleId.includes(r.id)} onChange={() => toggleArrayFilter("responsibleId", r.id)} />
                ))}
            </FilterGroup>
            <FilterGroup title="Aprovação">
              {["aguardando", "aprovado", "alteracao_solicitada", "reprovado"].map((a) => (
                <FilterCheckbox key={a} label={a} checked={filters.approvalState.includes(a)} onChange={() => toggleArrayFilter("approvalState", a)} />
              ))}
            </FilterGroup>
            <FilterGroup title="Atraso">
              <FilterCheckbox label="Somente atrasados" checked={filters.overdueOnly} onChange={() => setFilters((p) => ({ ...p, overdueOnly: !p.overdueOnly }))} />
            </FilterGroup>
            <FilterGroup title="Ainda não disponível">
              <p className="text-[11px] text-gray-400">
                Campanha, setor e prioridade ainda não são campos reais em content_items — nenhum filtro falso é mostrado para eles (ver docs/rec-os/production-roadmap.md).
              </p>
            </FilterGroup>

            <div className="flex gap-2 mt-5">
              <button type="button" onClick={() => setFilters(EMPTY_ROADMAP_FILTERS)} className="flex-1 text-xs font-bold text-gray-600 bg-gray-100 rounded-xl py-2.5">Limpar</button>
              <button type="button" onClick={() => setShowFilters(false)} className="flex-1 text-xs font-bold text-white bg-purple-600 rounded-xl py-2.5">Aplicar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="text-[10px] font-black uppercase text-gray-400 mb-1.5">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function FilterCheckbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2 text-xs text-gray-700">
      <input type="checkbox" checked={checked} onChange={onChange} className="rounded border-gray-300" />
      {label}
    </label>
  );
}

function KanbanView({ items, showClient }: { items: RecOsRoadmapItem[]; showClient: boolean }) {
  const grouped = useMemo(() => groupRoadmapItemsByKanbanColumn(items), [items]);
  return (
    <div className="flex gap-3 overflow-x-auto pb-2" data-testid="roadmap-kanban">
      {KANBAN_COLUMNS.map((col) => (
        <div key={col.id} className="flex-shrink-0 w-64 bg-gray-50 rounded-2xl p-3" data-testid={`roadmap-kanban-column-${col.id}`}>
          <p className="text-xs font-black text-gray-600 mb-2 flex items-center justify-between">
            {col.label} <span className="text-gray-400">{grouped[col.id].length}</span>
          </p>
          <div className="space-y-2">
            {grouped[col.id].length === 0
              ? <p className="text-[10px] text-gray-400 px-1">Vazio</p>
              : grouped[col.id].map((item) => <RoadmapCard key={item.id} item={item} showClient={showClient} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function ListView({
  items, showClient, search, onSearch,
}: { items: RecOsRoadmapItem[]; showClient: boolean; search: string; onSearch: (v: string) => void }) {
  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.title.toLowerCase().includes(q) || (i.clientName ?? "").toLowerCase().includes(q));
  }, [items, search]);

  return (
    <div data-testid="roadmap-list">
      <input
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Buscar por título ou cliente..."
        className="w-full sm:w-80 mb-3 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-300"
        data-testid="roadmap-list-search"
      />

      {/* Desktop: tabela. Mobile: cards (Fase 7 — nunca forçar tabela horizontal). */}
      <div className="hidden md:block bg-white border border-gray-100 rounded-2xl overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] text-gray-400 border-b border-gray-50 uppercase">
              {showClient && <th className="px-4 py-2 font-medium">Cliente</th>}
              <th className="px-4 py-2 font-medium">Título</th>
              <th className="px-4 py-2 font-medium">Formato</th>
              <th className="px-4 py-2 font-medium">Responsável</th>
              <th className="px-4 py-2 font-medium">Prazo</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Próxima ação</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {searched.map((item) => (
              <tr key={item.id} className="border-b border-gray-50 last:border-0">
                {showClient && <td className="px-4 py-2.5 font-medium text-gray-700">{item.clientName ?? "—"}</td>}
                <td className="px-4 py-2.5 font-medium text-gray-800">{item.title}</td>
                <td className="px-4 py-2.5 text-gray-500">{item.format ?? "—"}</td>
                <td className="px-4 py-2.5 text-gray-500">{item.responsibleName ?? "Sem responsável"}</td>
                <td className={isRoadmapItemOverdue(item, todayIso()) ? "px-4 py-2.5 font-bold text-red-600" : "px-4 py-2.5 text-gray-500"}>{fmtDate(item.dueAt)}</td>
                <td className="px-4 py-2.5 text-gray-500">{item.canonicalStatus}</td>
                <td className="px-4 py-2.5 text-indigo-600">{item.nextAction}</td>
                <td className="px-4 py-2.5 text-right">
                  <Link href={contentHref(item)} className="text-purple-600"><ExternalLink className="w-3.5 h-3.5 inline" /></Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="md:hidden space-y-2">
        {searched.map((item) => <RoadmapCard key={item.id} item={item} showClient={showClient} />)}
      </div>
    </div>
  );
}

function TimelineView({
  items, granularity, onGranularityChange, showClient,
}: { items: RecOsRoadmapItem[]; granularity: TimelineGranularity; onGranularityChange: (g: TimelineGranularity) => void; showClient: boolean }) {
  const buckets = useMemo(() => bucketRoadmapItemsForTimeline(items, granularity), [items, granularity]);
  return (
    <div data-testid="roadmap-timeline">
      <div className="flex gap-1 mb-3">
        {(["dia", "semana", "mes"] as TimelineGranularity[]).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => onGranularityChange(g)}
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${granularity === g ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-200"}`}
          >
            {g === "dia" ? "Dia" : g === "semana" ? "Semana" : "Mês"}
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {buckets.map((bucket) => (
          <div key={bucket.key} data-testid="roadmap-timeline-bucket">
            <p className="text-xs font-black text-gray-600 mb-2">{bucket.label} <span className="text-gray-400 font-normal">({bucket.items.length})</span></p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {bucket.items.map((item) => <RoadmapCard key={item.id} item={item} showClient={showClient} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarView({
  items, month, onMonthChange, calendarNavUrl, showClient,
}: { items: RecOsRoadmapItem[]; month: string; onMonthChange: (m: string) => void; calendarNavUrl: string; showClient: boolean }) {
  const monthItems = useMemo(() => roadmapItemsForMonth(items, month), [items, month]);
  const [year, monthNum] = month.split("-").map(Number);
  const firstDay = new Date(Date.UTC(year, monthNum - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
  const startWeekday = firstDay.getUTCDay();
  const monthLabel = firstDay.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

  function shiftMonth(delta: number) {
    const d = new Date(Date.UTC(year, monthNum - 1 + delta, 1));
    onMonthChange(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }

  const itemsByDay = new Map<number, RecOsRoadmapItem[]>();
  for (const item of monthItems) {
    const day = new Date(item.dueAt!).getUTCDate();
    if (!itemsByDay.has(day)) itemsByDay.set(day, []);
    itemsByDay.get(day)!.push(item);
  }

  const cells: Array<{ day: number | null; items: RecOsRoadmapItem[] }> = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ day: null, items: [] });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, items: itemsByDay.get(d) ?? [] });

  return (
    <div data-testid="roadmap-calendar">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => shiftMonth(-1)}><ChevronLeft className="w-4 h-4 text-gray-500" /></button>
          <p className="text-sm font-bold text-gray-800 capitalize">{monthLabel}</p>
          <button type="button" onClick={() => shiftMonth(1)}><ChevronRight className="w-4 h-4 text-gray-500" /></button>
        </div>
        <a href={calendarNavUrl} data-testid="roadmap-open-global-calendar" className="text-xs font-bold text-purple-600 hover:underline">
          Abrir no Calendário Global →
        </a>
      </div>
      {monthItems.length === 0 && (
        <p className="text-xs text-gray-400 mb-3">Nenhum conteúdo com prazo neste mês.</p>
      )}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-gray-400 mb-1">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => (
          <div key={i} className={`min-h-[64px] rounded-lg border p-1 ${cell.day ? "bg-white border-gray-100" : "border-transparent"}`}>
            {cell.day && <p className="text-[10px] text-gray-400 mb-1">{cell.day}</p>}
            {cell.items.slice(0, 2).map((item) => (
              <Link key={item.id} href={contentHref(item)} className="block text-[9px] bg-purple-50 text-purple-700 rounded px-1 py-0.5 mb-0.5 truncate" title={showClient ? `${item.clientName ?? ""} — ${item.title}` : item.title}>
                {item.title}
              </Link>
            ))}
            {cell.items.length > 2 && <p className="text-[9px] text-gray-400">+{cell.items.length - 2}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
