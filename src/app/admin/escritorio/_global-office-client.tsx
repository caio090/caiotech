"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList, CheckSquare, Sparkles, AlertTriangle, FileText, Building2, ChevronDown } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { classifyBusinessOfficeItems, isBusinessOfficeItemOverdue, type BusinessOfficeFeedItem } from "@/lib/business-office/types";
import type { AuthorizedCompany } from "@/lib/office-global/authorized-companies";

/**
 * Sprint Final Closure (Parte E, Fase 31-33) — "Todas as empresas": modo
 * global de Meu Escritório, para quando nenhuma Company está selecionada.
 * MVP deliberadamente mais simples que o cockpit Company-scoped
 * (_escritorio-client.tsx) -- Hoje/Semana/Mês com o rótulo da Company em
 * cada item (Fase 32), e um filtro para focar numa Company sem perder o
 * modo global (Fase 33). Sem source health/projetos por aba aqui -- isso
 * continua no modo Company-scoped, que é o cockpit completo.
 */
type ViewId = "hoje" | "semana" | "mes";
const VIEWS: { id: ViewId; label: string }[] = [
  { id: "hoje", label: "Hoje" }, { id: "semana", label: "Semana" }, { id: "mes", label: "Mês" },
];

const TYPE_ICON: Record<string, React.ElementType> = {
  content: Sparkles, task: ClipboardList, approval: CheckSquare,
};

function fmtDate(iso: string | null, timezone: string): string {
  if (!iso) return "Sem prazo definido";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: timezone });
}

export function GlobalOfficeClient({
  items, todayKey, timezone, companies, activeProjectsCount,
}: {
  items: BusinessOfficeFeedItem[];
  todayKey: string;
  timezone: string;
  companies: AuthorizedCompany[];
  activeProjectsCount: number;
}) {
  const [view, setView] = useState<ViewId>("hoje");
  const [companyFilter, setCompanyFilter] = useState<string>("all");

  const companyNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of companies) map.set(c.id, c.companyName ?? "Empresa");
    return map;
  }, [companies]);

  const filteredItems = useMemo(
    () => (companyFilter === "all" ? items : items.filter((i) => i.workspaceId === companyFilter)),
    [items, companyFilter],
  );

  const nowIso = new Date().toISOString();
  const classified = classifyBusinessOfficeItems(filteredItems, todayKey, timezone);
  const active = classified[view === "hoje" ? "today" : view === "semana" ? "week" : "month"];
  const overdueCount = filteredItems.filter((i) => isBusinessOfficeItemOverdue(i, nowIso)).length;

  return (
    <div data-testid="global-office-view">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-xs text-gray-500">
          <span className="font-bold text-gray-800">{companies.length}</span> empresa(s) autorizada(s)
          {activeProjectsCount > 0 && <> · <span className="font-bold text-gray-800">{activeProjectsCount}</span> projeto(s) ativo(s)</>}
          {overdueCount > 0 && <> · <span className="font-bold text-red-600">{overdueCount} atrasado(s)</span></>}
        </p>
        <div className="relative">
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            data-testid="global-office-company-filter"
            className="appearance-none text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl pl-3 pr-8 py-2"
          >
            <option value="all">Todas as empresas</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.companyName ?? "Empresa"}</option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      <div className="flex gap-1.5 bg-gray-100 rounded-xl p-1 mb-4 w-fit">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`text-xs font-bold px-3.5 py-1.5 rounded-lg transition-colors ${view === v.id ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500"}`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {active.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Nada por aqui neste período." />
      ) : (
        <div className="space-y-2">
          {active.map((item) => {
            const Icon = TYPE_ICON[item.type] ?? FileText;
            const overdue = isBusinessOfficeItemOverdue(item, nowIso);
            return (
              <Link
                key={item.id}
                href={item.href}
                data-testid="global-office-item"
                className="flex items-center gap-3 border border-gray-100 rounded-xl p-3 hover:border-indigo-200 transition-colors bg-white"
              >
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
                  <p className="text-[11px] text-gray-400 flex items-center gap-1 truncate">
                    <Building2 className="w-3 h-3 flex-shrink-0" />
                    {companyNameById.get(item.workspaceId) ?? "Empresa"} · {fmtDate(item.dueAt ?? item.startsAt, timezone)}
                  </p>
                </div>
                {overdue && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
              </Link>
            );
          })}
        </div>
      )}

      {companies.length === 0 && (
        <div className="mt-4 bg-gray-50 border border-gray-100 rounded-2xl p-4 text-xs text-gray-500">
          Nenhuma empresa autorizada ainda.{" "}
          <Link href="/admin/clientes" className="font-bold text-indigo-600">Ver Clientes</Link>
        </div>
      )}
    </div>
  );
}
