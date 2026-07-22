"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Building2, CheckSquare, Factory, Eye, RotateCcw, CalendarCheck,
  Rocket, ListTodo, Users, ArrowRight, Plus, Wand2, Cable, Search, Check,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import type { HubCardId, HubCounts, ClientSummaryRow, AttentionItem } from "@/lib/rec-os-hub";
import { HUB_CARDS, buildCardHref, buildClientFilterHref } from "@/lib/rec-os-hub";

interface ClientOption { id: string; name: string }

interface Props {
  clientOptions: ClientOption[];
  activeClientId: string | null;
  counts: HubCounts;
  clientsWithPendencies: number;
  clientSummaries: ClientSummaryRow[];
  attentionItems: AttentionItem[];
  sourceErrors: string[];
  openClientPicker: boolean;
}

const CARD_ICON: Record<HubCardId, React.ElementType> = {
  aguardando_aprovacao: CheckSquare,
  em_producao: Factory,
  em_revisao: Eye,
  alteracoes_solicitadas: RotateCcw,
  agendados: CalendarCheck,
  publicados: Rocket,
  em_andamento: ListTodo,
  clientes_com_pendencias: Users,
};

const REASON_LABEL: Record<AttentionItem["reason"], string> = {
  aguardando_aprovacao: "Aguardando aprovação",
  alteracao_solicitada: "Alteração solicitada",
  revisao_interna: "Em revisão interna",
};

function countFor(id: HubCardId, counts: HubCounts, clientsWithPendencies: number): number {
  if (id === "clientes_com_pendencias") return clientsWithPendencies;
  return counts[id];
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/** Sprint 4.0A.1 — searchable client picker, scales past the handful the
 * plain <select> was fine for. No new dependency: plain input + list,
 * keyboard nav (ArrowUp/Down, Enter, Escape), click-outside to close. */
function ClientPicker({
  clientOptions,
  activeClientId,
  activeClientName,
  autoOpen,
}: {
  clientOptions: ClientOption[];
  activeClientId: string | null;
  activeClientName: string | null;
  autoOpen: boolean;
}) {
  const [open, setOpen] = useState(autoOpen);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const options = q
      ? clientOptions.filter((c) => c.name.toLowerCase().includes(q))
      : clientOptions;
    const showAll = !q || "todos os clientes".includes(q);
    return { showAll, options };
  }, [clientOptions, query]);

  const flatCount = (filtered.showAll ? 1 : 0) + filtered.options.length;

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function select(clientId: string | null) {
    setOpen(false);
    window.location.href = buildClientFilterHref(clientId);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { setOpen(false); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, flatCount - 1)); return; }
    if (e.key === "ArrowUp")   { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0)); return; }
    if (e.key === "Enter") {
      e.preventDefault();
      if (filtered.showAll && highlighted === 0) { select(null); return; }
      const idx = highlighted - (filtered.showAll ? 1 : 0);
      const opt = filtered.options[idx];
      if (opt) select(opt.id);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setHighlighted(0); }}
        className="flex items-center gap-2 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 min-w-[220px] justify-between hover:border-purple-200"
      >
        <span className="truncate">{activeClientName ?? "Todos os clientes"}</span>
        <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-1 w-72 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-50">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setHighlighted(0); }}
              onKeyDown={handleKeyDown}
              placeholder="Buscar cliente..."
              className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-gray-100 outline-none focus:border-purple-300"
            />
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {flatCount === 0 ? (
              <div className="px-3 py-4 text-xs text-gray-400 text-center">Nenhum cliente encontrado</div>
            ) : (
              <>
                {filtered.showAll && (
                  <button
                    type="button"
                    onClick={() => select(null)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left ${
                      highlighted === 0 ? "bg-purple-50 text-purple-700" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Todos os clientes
                    {!activeClientId && <Check className="w-3.5 h-3.5 text-purple-500" />}
                  </button>
                )}
                {filtered.options.map((c, i) => {
                  const idx = i + (filtered.showAll ? 1 : 0);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => select(c.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left truncate ${
                        highlighted === idx ? "bg-purple-50 text-purple-700" : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span className="truncate">{c.name}</span>
                      {activeClientId === c.id && <Check className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function RecOSHubContent({
  clientOptions,
  activeClientId,
  counts,
  clientsWithPendencies,
  clientSummaries,
  attentionItems,
  sourceErrors,
  openClientPicker,
}: Props) {
  const activeClientName =
    clientOptions.find((c) => c.id === activeClientId)?.name ?? null;

  // Radar, Produção, Aprovações, Calendário, Resultados e Conexões já estão
  // na navegação principal (ContentosSubNav) — Acessos rápidos não repete
  // esses itens (Fase 11), só ações que não têm lugar fixo na nav.
  const quickAccess = [
    { label: "Criar conteúdo", icon: Plus,   href: activeClientId ? `/admin/contentos/criar?client=${activeClientId}` : "/admin/contentos/criar" },
    { label: "Abrir EditorOS", icon: Wand2,  href: activeClientId ? `/admin/contentos/editor-os?client=${activeClientId}` : "/admin/contentos/editor-os" },
    { label: "Conectar canal", icon: Cable,  href: "/admin/conexoes" },
  ];

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
      {/* RecOSGlobalHeader */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">REC OS</h1>
          <p className="text-sm text-gray-500">
            {activeClientName ? `Operação de ${activeClientName}` : "Central global da operação de conteúdo"}
          </p>
        </div>

        {/* RecOSClientFilter — a URL é a única fonte de verdade; sem estado paralelo. */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Cliente:</span>
          <ClientPicker
            clientOptions={clientOptions}
            activeClientId={activeClientId}
            activeClientName={activeClientName}
            autoOpen={openClientPicker}
          />
        </div>
      </header>

      {sourceErrors.length > 0 && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          Não foi possível carregar: {sourceErrors.join(", ")}. Os números abaixo podem estar incompletos.
        </div>
      )}

      {/* RecOSMetricCard grid */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {HUB_CARDS.map((card) => {
            const Icon = CARD_ICON[card.id];
            const value = countFor(card.id, counts, clientsWithPendencies);
            const title = card.id === "clientes_com_pendencias" && activeClientId
              ? "Pendências deste cliente"
              : card.title;
            return (
              <Link
                key={card.id}
                href={buildCardHref(card.id, activeClientId)}
                className="block bg-white border border-gray-100 rounded-2xl p-5 hover:border-purple-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-purple-500" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300" />
                </div>
                <div className="text-2xl font-black text-gray-900">{value}</div>
                <div className="text-sm font-medium text-gray-700 mt-1">{title}</div>
                <div className="text-xs text-gray-400 mt-0.5">{card.hint}</div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* RecOSAttentionList */}
      <section id="precisa-da-sua-atencao">
        <h2 className="text-sm font-bold text-gray-900 mb-3">Precisa da sua atenção</h2>
        <div className="bg-white border border-gray-100 rounded-2xl divide-y divide-gray-50">
          {attentionItems.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title="Nada pendente agora"
              description="Quando algo precisar de aprovação, revisão ou ajuste, vai aparecer aqui."
            />
          ) : (
            attentionItems.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{item.title}</div>
                  <div className="text-xs text-gray-400 flex items-center gap-1.5 flex-wrap">
                    <span>{item.client_name ?? "Cliente"}</span>
                    <span>·</span>
                    <span>{REASON_LABEL[item.reason]}</span>
                    {formatDate(item.relevant_date) && (
                      <>
                        <span>·</span>
                        <span>{formatDate(item.relevant_date)}</span>
                      </>
                    )}
                  </div>
                </div>
                <Link
                  href={item.href}
                  className="shrink-0 text-xs font-semibold text-purple-600 hover:text-purple-700 px-3 py-1.5 rounded-lg border border-purple-100"
                >
                  Abrir
                </Link>
              </div>
            ))
          )}
        </div>
      </section>

      {/* RecOSClientSummary — só na visão Todos os clientes */}
      {!activeClientId && (
        <section id="resumo-por-cliente">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Resumo por cliente</h2>
          {clientSummaries.length === 0 ? (
            <EmptyState icon={Building2} title="Nenhum cliente com atividade ainda" />
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-50">
                    <th className="px-4 py-2 font-medium">Cliente</th>
                    <th className="px-4 py-2 font-medium">Aguard. aprovação</th>
                    <th className="px-4 py-2 font-medium">Em produção</th>
                    <th className="px-4 py-2 font-medium">Alterações</th>
                    <th className="px-4 py-2 font-medium">Agendados</th>
                    <th className="px-4 py-2 font-medium">Em andamento</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {clientSummaries.map((row) => (
                    <tr key={row.client_id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-2.5 font-medium text-gray-800">{row.client_name}</td>
                      <td className="px-4 py-2.5 text-gray-600">{row.aguardando_aprovacao}</td>
                      <td className="px-4 py-2.5 text-gray-600">{row.em_producao}</td>
                      <td className="px-4 py-2.5 text-gray-600">{row.alteracoes_solicitadas}</td>
                      <td className="px-4 py-2.5 text-gray-600">{row.agendados}</td>
                      <td className="px-4 py-2.5 text-gray-600">{row.em_andamento}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Link
                          href={buildClientFilterHref(row.client_id)}
                          className="text-xs font-semibold text-purple-600 hover:text-purple-700"
                        >
                          Ver cliente
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* RecOSQuickActions */}
      <section>
        <h2 className="text-sm font-bold text-gray-900 mb-3">Ações rápidas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {quickAccess.map((qa) => (
            <Link
              key={qa.label}
              href={qa.href}
              className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2.5 text-sm text-gray-700 hover:border-purple-200"
            >
              <qa.icon className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="truncate">{qa.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
