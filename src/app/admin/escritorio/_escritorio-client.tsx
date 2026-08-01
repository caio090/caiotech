"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays, ClipboardList, CheckSquare, FileText, AlertTriangle,
  Sparkles, PenLine, ArrowRight, Info,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import {
  type BusinessOfficeFeedItem, classifyBusinessOfficeItems, itemsForMonthPrefix, nextMonthKey,
  isBusinessOfficeItemOverdue, splitMonthClosureAndPlanning, BUSINESS_OFFICE_NOT_INTEGRATED_MODULES,
} from "@/lib/business-office/types";

type ViewId = "hoje" | "semana" | "mes";

const VIEWS: { id: ViewId; label: string }[] = [
  { id: "hoje", label: "Hoje" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mês" },
];

const TYPE_ICON: Record<string, React.ElementType> = {
  content: Sparkles, task: ClipboardList, approval: CheckSquare, follow_up: AlertTriangle,
};

function fmtDate(iso: string | null, timezone: string): string {
  if (!iso) return "Sem prazo definido";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: timezone });
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

function NotIntegratedCard() {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4" data-testid="office-not-integrated">
      <p className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> Ainda não conectado</p>
      <div className="flex flex-wrap gap-1.5">
        {BUSINESS_OFFICE_NOT_INTEGRATED_MODULES.map((m) => (
          <span key={m.type} className="text-[10px] font-medium text-gray-400 bg-white border border-gray-100 px-2 py-1 rounded-full">
            {m.label}
          </span>
        ))}
      </div>
      <p className="text-[11px] text-gray-400 mt-2">Este módulo ainda não fornece dados para Meu Escritório.</p>
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
  items, todayKey, timezone,
}: {
  items: BusinessOfficeFeedItem[];
  todayKey: string;
  timezone: string;
}) {
  const [view, setView] = useState<ViewId>("hoje");
  const nowIso = useMemo(() => new Date().toISOString(), []);

  const { today, week, month } = useMemo(() => classifyBusinessOfficeItems(items, todayKey, timezone), [items, todayKey, timezone]);
  const nextMonth = useMemo(() => itemsForMonthPrefix(items, nextMonthKey(todayKey)), [items, todayKey]);
  const { closure, planning } = useMemo(() => splitMonthClosureAndPlanning(month, nextMonth), [month, nextMonth]);

  const overdueToday = today.filter((i) => isBusinessOfficeItemOverdue(i, nowIso));

  return (
    <div className="space-y-4" data-testid="escritorio-root">
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
          <NotIntegratedCard />
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
          <NotIntegratedCard />
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
          <NotIntegratedCard />
        </div>
      )}
    </div>
  );
}
