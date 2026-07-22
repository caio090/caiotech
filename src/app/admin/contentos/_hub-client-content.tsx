"use client";

import Link from "next/link";
import {
  Building2, CheckSquare, Factory, Eye, RotateCcw, CalendarCheck,
  Rocket, ListTodo, Users, ArrowRight, Plus, ScrollText, CalendarDays,
  Wand2, BarChart3, Cable, Radar as RadarIcon,
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

export function RecOSHubContent({
  clientOptions,
  activeClientId,
  counts,
  clientsWithPendencies,
  clientSummaries,
  attentionItems,
  sourceErrors,
}: Props) {
  const activeClientName =
    clientOptions.find((c) => c.id === activeClientId)?.name ?? null;

  const quickAccess = [
    { label: "Criar conteúdo", icon: Plus,        href: activeClientId ? `/admin/contentos/criar?client=${activeClientId}` : "/admin/contentos/selecionar-cliente" },
    { label: "Produção",       icon: ScrollText,  href: activeClientId ? `/admin/contentos/producao?client=${activeClientId}` : "/admin/contentos/selecionar-cliente" },
    { label: "Aprovações",     icon: CheckSquare, href: activeClientId ? `/admin/contentos/aprovacoes?client=${activeClientId}` : "/admin/contentos/selecionar-cliente" },
    { label: "Calendário",     icon: CalendarDays,href: activeClientId ? `/admin/calendario?client=${activeClientId}` : "/admin/calendario" },
    { label: "EditorOS",       icon: Wand2,       href: activeClientId ? `/admin/contentos/editor-os?client=${activeClientId}` : "/admin/contentos/editor-os" },
    { label: "Resultados",     icon: BarChart3,   href: activeClientId ? `/admin/contentos/resultados?client=${activeClientId}` : "/admin/contentos/selecionar-cliente" },
    { label: "Conexões",       icon: Cable,       href: "/admin/conexoes" },
    // Radar existe hoje como redirect para Resultados > Oportunidades — não é
    // uma tela própria, então o atalho aponta direto para o destino real.
    { label: "Radar",          icon: RadarIcon,   href: activeClientId ? `/admin/contentos/resultados?tab=oportunidades&client=${activeClientId}` : "/admin/contentos/selecionar-cliente" },
  ];

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
      {/* RecOSGlobalHeader */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">REC OS</h1>
          <p className="text-sm text-gray-500">
            {activeClientName ? `Operação de ${activeClientName}` : "Central global de todos os clientes"}
          </p>
        </div>

        {/* RecOSClientFilter — a URL é a única fonte de verdade; sem estado paralelo. */}
        <div className="flex items-center gap-2">
          <label htmlFor="rec-os-client-filter" className="text-sm text-gray-500">Cliente:</label>
          <select
            id="rec-os-client-filter"
            defaultValue={activeClientId ?? ""}
            onChange={(e) => { window.location.href = buildClientFilterHref(e.target.value || null); }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 min-w-[220px]"
          >
            <option value="">Todos os clientes</option>
            {clientOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
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
                <div className="text-sm font-medium text-gray-700 mt-1">{card.title}</div>
                <div className="text-xs text-gray-400 mt-0.5">{card.hint}</div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* RecOSAttentionList */}
      <section>
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
        <h2 className="text-sm font-bold text-gray-900 mb-3">Acessos rápidos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
