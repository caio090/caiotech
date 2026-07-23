"use client";

/**
 * The new adaptive Relatórios Comerciais section: connector-fed KPIs,
 * payments/time/channel breakdowns, guided reconciliation entry (Visão
 * Essencial/Analítica), universal import, and export actions. Sits below
 * the existing 4-report overview on /admin/relatorios (Fase "Reutilizar o
 * shell da página atual" — this is additive, not a page rewrite).
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Printer, FileJson, Table2, Package, Users, Clock,
  CreditCard, TrendingUp, UploadCloud, Calculator, AlertTriangle,
} from "lucide-react";
import type {
  ReportSummary, ReportPaymentMethod, ReportTimeBucket, ReportChannel, ReportInsight,
} from "@/lib/reports/types";
import type { ReportViewMode, ReconciliationInput } from "@/lib/reports/reconciliation-types";
import { reconcile } from "@/lib/reports/reconciliation-types";
import { createOlaClickConnector } from "@/lib/reports/connectors/olaclick-connector";
import { formatCents, formatPercent } from "@/lib/motor-lokat/money";
import { sumGroup } from "@/lib/reports/payment-methods";
import {
  insightBestHour, insightWorstHour, insightPaymentConcentration, insightMissingData,
} from "@/lib/reports/insights";
import { insightGrossToNetGap, insightSettlementGap, insightUnexplainedDifference } from "@/lib/reports/reconciliation-insights";
import { ReportDataImporter } from "@/components/reports/report-data-importer";
import { ReconciliationEntryForm, emptyReconciliationInput } from "@/components/reports/reconciliation-entry-form";
import { exportTableAsCsv, exportAsJson } from "@/lib/reports/export/export-data";
import { PrintableLokatReport } from "@/components/reports/printable-lokat-report";
import { RECONCILIATION_ASSISTANT_NOTE } from "@/lib/reports/reconciliation-assistant-contract";

interface ClientOption { id: string; company_name: string }

type SectionKey = "geral" | "pedidos" | "produtos" | "horarios" | "canais" | "pagamentos" | "clientes" | "custos" | "importacoes";

const SECTIONS: { key: SectionKey; label: string; icon: React.ElementType }[] = [
  { key: "geral", label: "Visão geral", icon: TrendingUp },
  { key: "pedidos", label: "Pedidos", icon: Package },
  { key: "produtos", label: "Produtos", icon: Package },
  { key: "horarios", label: "Horários e dias", icon: Clock },
  { key: "canais", label: "Canais de venda", icon: TrendingUp },
  { key: "pagamentos", label: "Formas de pagamento", icon: CreditCard },
  { key: "clientes", label: "Clientes", icon: Users },
  { key: "custos", label: "Custos e margem", icon: Calculator },
  { key: "importacoes", label: "Importações", icon: UploadCloud },
];

function AvailabilityNote({ reason }: { reason?: string }) {
  if (!reason) return null;
  return (
    <div className="flex items-start gap-2 bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs text-gray-500">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-400" />
      <span>{reason}</span>
    </div>
  );
}

function InsightCard({ insight }: { insight: ReportInsight }) {
  const color = insight.severity === "attention" ? "border-amber-100 bg-amber-50" : insight.severity === "opportunity" ? "border-emerald-100 bg-emerald-50" : "border-blue-100 bg-blue-50";
  return (
    <div className={`rounded-xl border p-3.5 ${color}`}>
      <p className="text-xs font-bold text-gray-800 mb-1">{insight.whatHappened}</p>
      <p className="text-[11px] text-gray-600 mb-1">{insight.whyItMatters}</p>
      {insight.estimatedImpact && <p className="text-[11px] text-gray-500 mb-1">Impacto: {insight.estimatedImpact}</p>}
      <p className="text-[11px] font-semibold text-gray-700">Próxima ação: {insight.nextAction}</p>
    </div>
  );
}

export function AdaptiveReportsSection() {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientId, setClientId] = useState<string>("");
  const [section, setSection] = useState<SectionKey>("geral");
  const [viewMode, setViewMode] = useState<ReportViewMode>("essencial");
  const [periodStart, setPeriodStart] = useState(() => new Date(Date.now() - 29 * 86_400_000).toISOString().slice(0, 10));
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));

  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [summaryReason, setSummaryReason] = useState<string | undefined>();
  const [payments, setPayments] = useState<ReportPaymentMethod[] | null>(null);
  const [paymentsReason, setPaymentsReason] = useState<string | undefined>();
  const [timeBuckets, setTimeBuckets] = useState<ReportTimeBucket[] | null>(null);
  const [timeReason, setTimeReason] = useState<string | undefined>();
  const [channels, setChannels] = useState<ReportChannel[] | null>(null);
  const [channelsReason, setChannelsReason] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const [reconciliation, setReconciliation] = useState<ReconciliationInput>(emptyReconciliationInput);
  const [showPrintable, setShowPrintable] = useState(false);

  useEffect(() => {
    fetch("/api/admin/clients")
      .then((r) => r.json())
      .then((b: { clients?: ClientOption[] }) => {
        const list = b.clients ?? [];
        setClients(list);
        if (list.length > 0) setClientId((prev) => prev || list[0].id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    setLoading(true);
    const connector = createOlaClickConnector(clientId, clients.find((c) => c.id === clientId)?.company_name ?? clientId);

    Promise.all([
      connector.fetchSummary(periodStart, periodEnd),
      connector.fetchPayments(periodStart, periodEnd),
      connector.fetchTimeDistribution(periodStart, periodEnd),
      connector.fetchChannels(periodStart, periodEnd),
    ]).then(([summaryRes, paymentsRes, timeRes, channelsRes]) => {
      if (cancelled) return;
      setSummary(summaryRes.data);
      setSummaryReason(summaryRes.availability.reason);
      setPayments(paymentsRes.data);
      setPaymentsReason(paymentsRes.availability.reason);
      setTimeBuckets(timeRes.data);
      setTimeReason(timeRes.availability.reason);
      setChannels(channelsRes.data);
      setChannelsReason(channelsRes.availability.reason);
      setLoading(false);
    }).catch(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [clientId, periodStart, periodEnd, clients]);

  const reconciliationResult = useMemo(() => reconcile(reconciliation), [reconciliation]);

  const insights = useMemo(() => {
    const list: ReportInsight[] = [];
    if (timeBuckets) {
      const best = insightBestHour(timeBuckets); if (best) list.push(best);
      const worst = insightWorstHour(timeBuckets); if (worst) list.push(worst);
    }
    if (payments) {
      const concentration = insightPaymentConcentration(payments); if (concentration) list.push(concentration);
    }
    const missingLabels: string[] = [];
    if (!summary) missingLabels.push("resumo financeiro");
    if (!payments) missingLabels.push("formas de pagamento");
    const missing = insightMissingData(missingLabels); if (missing) list.push(missing);
    const gap = insightGrossToNetGap(reconciliationResult); if (gap) list.push(gap);
    const settlementGap = insightSettlementGap(reconciliationResult); if (settlementGap) list.push(settlementGap);
    const unexplained = insightUnexplainedDifference(reconciliationResult); if (unexplained) list.push(unexplained);
    return list;
  }, [timeBuckets, payments, summary, reconciliationResult]);

  const cardKeys: Array<"orders" | "grossRevenueCents" | "averageTicketCents" | "discountsCents"> = ["orders", "grossRevenueCents", "averageTicketCents", "discountsCents"];
  const clientName = clients.find((c) => c.id === clientId)?.company_name ?? "";

  function exportCurrentViewCsv() {
    if (section === "pagamentos" && payments) {
      exportTableAsCsv(`relatorio-${clientId}`, {
        name: "pagamentos",
        headers: ["Forma", "Pedidos", "Faturamento (R$)", "Participação"],
        rows: payments.map((p) => [p.label, String(p.orders), (p.totalCents / 100).toFixed(2), p.shareOfTotal !== null ? `${(p.shareOfTotal * 100).toFixed(1)}%` : "—"]),
      });
    } else if (section === "horarios" && timeBuckets) {
      exportTableAsCsv(`relatorio-${clientId}`, {
        name: "horarios",
        headers: ["Hora inicial", "Pedidos", "Faturamento (R$)"],
        rows: timeBuckets.map((b) => [String(b.hourStart), String(b.orders), (b.totalCents / 100).toFixed(2)]),
      });
    } else if (section === "canais" && channels) {
      exportTableAsCsv(`relatorio-${clientId}`, {
        name: "canais",
        headers: ["Canal", "Pedidos", "Participação"],
        rows: channels.map((c) => [c.label, String(c.orders), c.shareOfTotal !== null ? `${(c.shareOfTotal * 100).toFixed(1)}%` : "—"]),
      });
    }
  }

  function exportJsonTechnical() {
    exportAsJson(`relatorio-${clientId}-tecnico`, { clientId, periodStart, periodEnd, summary, payments, timeBuckets, channels, reconciliation: reconciliationResult });
  }

  return (
    <div className="mt-8 space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-sm font-black text-gray-900">Relatório Comercial Adaptativo</h2>
        <div className="flex items-center gap-2 bg-gray-100 rounded-full p-0.5">
          {(["essencial", "analitica"] as ReportViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${viewMode === mode ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}
            >
              {mode === "essencial" ? "Visão Essencial" : "Visão Analítica"}
            </button>
          ))}
        </div>
      </div>

      {/* Seletor de cliente e período */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white" aria-label="Cliente">
          {clients.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
        </select>
        <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-2" aria-label="Início do período" />
        <span className="text-xs text-gray-400">até</span>
        <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-2" aria-label="Fim do período" />
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setShowPrintable(true)} className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 px-3 py-2 rounded-xl hover:bg-indigo-700">
            <Printer className="w-3.5 h-3.5" /> Baixar Relatório LOKAT
          </button>
          <button onClick={exportCurrentViewCsv} className="flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-gray-100 px-3 py-2 rounded-xl hover:bg-gray-200">
            <Table2 className="w-3.5 h-3.5" /> CSV
          </button>
          <button onClick={exportJsonTechnical} className="flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-gray-100 px-3 py-2 rounded-xl hover:bg-gray-200">
            <FileJson className="w-3.5 h-3.5" /> JSON técnico
          </button>
        </div>
      </div>

      {/* Subnav */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {SECTIONS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSection(key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${section === key ? "bg-purple-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {loading && <p className="text-xs text-gray-400">Carregando…</p>}

      {section === "geral" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {cardKeys.map((key) => {
              const indicator = summary?.[key];
              const isCurrency = indicator?.unit === "currency_cents";
              return (
                <div key={key} className="rounded-2xl border border-gray-100 bg-white p-4">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{indicator?.label ?? key}</p>
                  {indicator && indicator.availability.status === "available" && indicator.value !== null ? (
                    <p className="text-xl font-black text-gray-900">{isCurrency ? formatCents(indicator.value) : indicator.value}</p>
                  ) : (
                    <p className="text-sm font-bold text-gray-300">Indisponível</p>
                  )}
                  <p className="text-[9px] text-gray-400 mt-1">{periodStart} a {periodEnd} · {indicator?.source === "connector" ? "OlaClick" : "—"}</p>
                </div>
              );
            })}
          </div>
          <AvailabilityNote reason={summaryReason} />
          <div className="grid sm:grid-cols-2 gap-3">
            {insights.slice(0, 4).map((i) => <InsightCard key={i.id} insight={i} />)}
          </div>
        </div>
      )}

      {section === "pedidos" && (
        <div className="space-y-3">
          <Link href={`/admin/relatorios/faturamento?client=${clientId}`} className="text-xs font-bold text-purple-600 underline">
            Ver lista completa de pedidos no Relatório de Faturamento →
          </Link>
          <AvailabilityNote reason="Este painel mostra apenas indicadores agregados; a lista detalhada de pedidos já existe no Relatório de Faturamento, sem duplicação de lógica." />
        </div>
      )}

      {section === "produtos" && (
        <AvailabilityNote reason="Produtos vendidos: dado real existe em /api/olaclick/products-sold, mas o conector desta seção ainda não o mapeia (ver Fontes de dados). Use o Relatório de Faturamento, aba Produtos, enquanto isso." />
      )}

      {section === "horarios" && (
        <div className="space-y-3">
          {timeBuckets && timeBuckets.length > 0 ? (
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
              {timeBuckets.map((b) => (
                <div key={b.hourStart} className="text-center">
                  <div className="h-16 flex items-end justify-center">
                    <div className="w-full bg-purple-200 rounded-t" style={{ height: `${Math.min(100, (b.orders / Math.max(...timeBuckets.map((x) => x.orders), 1)) * 100)}%` }} />
                  </div>
                  <p className="text-[9px] text-gray-400 mt-1">{b.hourStart}h</p>
                </div>
              ))}
            </div>
          ) : <AvailabilityNote reason={timeReason ?? "Sem dados de horário disponíveis."} />}
          <div className="grid sm:grid-cols-2 gap-3">
            {timeBuckets && insightBestHour(timeBuckets) && <InsightCard insight={insightBestHour(timeBuckets)!} />}
            {timeBuckets && insightWorstHour(timeBuckets) && <InsightCard insight={insightWorstHour(timeBuckets)!} />}
          </div>
        </div>
      )}

      {section === "canais" && (
        <div className="space-y-2">
          {channels && channels.length > 0 ? channels.map((c) => (
            <div key={c.key} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl p-3">
              <span className="text-xs font-bold text-gray-700">{c.label}</span>
              <span className="text-xs text-gray-500">{c.orders} pedidos {c.shareOfTotal !== null ? `· ${formatPercent(c.shareOfTotal)}` : ""}</span>
            </div>
          )) : <AvailabilityNote reason={channelsReason ?? "Sem dados de canal disponíveis."} />}
        </div>
      )}

      {section === "pagamentos" && (
        <div className="space-y-5">
          <div>
            <h3 className="text-xs font-black text-gray-700 mb-2 flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Formas de pagamento</h3>
            {payments && payments.length > 0 ? (
              <div className="space-y-1.5">
                {payments.map((p) => (
                  <div key={p.key} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl p-3">
                    <div>
                      <span className="text-xs font-bold text-gray-700">{p.label}</span>
                      {p.groupKey && <span className="text-[9px] text-gray-400 ml-1.5">({p.groupKey === "cartao" ? "Cartões" : p.groupKey})</span>}
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-800">{formatCents(p.totalCents)}</p>
                      <p className="text-[10px] text-gray-400">{p.orders} pedidos {p.shareOfTotal !== null ? `· ${formatPercent(p.shareOfTotal)}` : ""} {p.averageTicketCents !== null ? `· ticket ${formatCents(p.averageTicketCents)}` : ""}</p>
                    </div>
                  </div>
                ))}
                {(() => {
                  const cardGroup = sumGroup(payments, "cartao");
                  return cardGroup.orders > 0 ? (
                    <div className="flex items-center justify-between bg-purple-50 border border-purple-100 rounded-xl p-3">
                      <span className="text-xs font-bold text-purple-700">Total Cartões (agrupado)</span>
                      <span className="text-xs font-bold text-purple-700">{formatCents(cardGroup.totalCents)} · {cardGroup.orders} pedidos</span>
                    </div>
                  ) : null;
                })()}
              </div>
            ) : <AvailabilityNote reason={paymentsReason ?? "Sem dados de forma de pagamento disponíveis."} />}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-xs font-black text-gray-700 mb-1 flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5" /> Conciliação (entrada guiada)</h3>
            <p className="text-[10px] text-gray-400 mb-3">{RECONCILIATION_ASSISTANT_NOTE}</p>
            <ReconciliationEntryForm viewMode={viewMode} value={reconciliation} onChange={setReconciliation} />
            <div className="mt-3 grid sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-[10px] text-gray-400">Líquido esperado</p>
                <p className="text-sm font-bold text-gray-800">{reconciliationResult.expectedNetAmount.value !== null ? formatCents(reconciliationResult.expectedNetAmount.value) : "—"}</p>
                <p className="text-[9px] text-gray-400">{reconciliationResult.expectedNetAmount.confidence}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-[10px] text-gray-400">Divergência</p>
                <p className="text-sm font-bold text-gray-800">{reconciliationResult.reconciliationDifference.value !== null ? formatCents(reconciliationResult.reconciliationDifference.value) : "—"}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-[10px] text-gray-400">Taxa efetiva</p>
                <p className="text-sm font-bold text-gray-800">{reconciliationResult.effectiveFeePercentage !== null ? formatPercent(reconciliationResult.effectiveFeePercentage) : "—"}</p>
              </div>
            </div>
            {viewMode === "analitica" && insightUnexplainedDifference(reconciliationResult) && (
              <div className="mt-3"><InsightCard insight={insightUnexplainedDifference(reconciliationResult)!} /></div>
            )}
          </div>
        </div>
      )}

      {section === "clientes" && (
        <AvailabilityNote reason="OlaClick (Cardápio Digital) não expõe dados de cliente identificável nesta integração — dado ausente, não zero." />
      )}

      {section === "custos" && (
        <AvailabilityNote reason="Custo e margem por produto dependem da Ficha Técnica e Estoque (Meu Negócio > Produtos e Serviços) — quando disponíveis, alimentam este painel automaticamente, sem duplicar o motor financeiro." />
      )}

      {section === "importacoes" && clientId && (
        <ReportDataImporter clientId={clientId} sourceId="manual" />
      )}

      {showPrintable && (
        <PrintableLokatReport
          clientName={clientName}
          periodStart={periodStart}
          periodEnd={periodEnd}
          summary={summary}
          payments={payments}
          insights={insights}
          onClose={() => setShowPrintable(false)}
        />
      )}
    </div>
  );
}
