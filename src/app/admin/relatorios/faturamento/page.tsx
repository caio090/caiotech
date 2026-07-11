"use client";
import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import {
  ShoppingCart, RefreshCw, Loader2, AlertCircle, CheckCircle2,
  TrendingUp, DollarSign, Clock, Building2, CalendarDays,
  Link2, ChevronDown, ChevronRight, Info, BarChart3, FileText,
} from "lucide-react";
import Link from "next/link";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

// ── Tipos ──────────────────────────────────────────────────────────────────────

type PeriodKey = "hoje" | "7dias" | "15dias" | "30dias" | "mes_atual" | "personalizado";
const PERIODS: { value: PeriodKey; label: string }[] = [
  { value: "hoje",         label: "Hoje"              },
  { value: "7dias",        label: "Últimos 7 dias"    },
  { value: "15dias",       label: "Últimos 15 dias"   },
  { value: "30dias",       label: "Últimos 30 dias"   },
  { value: "mes_atual",    label: "Mês atual"         },
  { value: "personalizado", label: "Personalizado…"   },
];

interface ClientOption { id: string; company_name: string }

interface DigitalMenuStatus {
  ok: boolean;
  connected?: boolean;
  reason?: string;
  message?: string;
  connection?: {
    id: string; provider?: string | null; connection_name?: string | null;
    token_last_four?: string | null; last_sync_at?: string | null;
    client_id?: string | null; has_api_base_url?: boolean;
  } | null;
}

type ProviderTotalScope = "filtered_period" | "account_history" | "current_page" | "monetary" | "unknown";

interface PaginationInfo {
  used: boolean;
  paginationMode: "envelope" | "page_size_fallback" | "single_page" | "operational_only";
  conventionUsed:    string;
  conventionVerified: false;
  pagesFetched: number; totalReturned: number;
  providerReportedTotalRaw: number | null;
  providerTotalScope:       ProviderTotalScope | null;
  limitDetected: number | null; hasMore: boolean;
  dedup: { rawCount: number; uniqueCount: number; duplicateCount: number; missingIdCount: number };
  returnedOrdersWithinRequestedRange: boolean | null;
  dateFilterCompletenessConfirmed:    false;
  lastRequestedPage?:   number;
  providerCurrentPage?: number | null;
}

interface DebugShape {
  topLevelType: string; topLevelKeys: string[]; listKeyUsed: string;
  totalReturned: number; firstOrderKeys: string[]; firstItemKeys: string[];
  paginationKeys: string[]; hasPagination: boolean;
  detectedLimit: number | null; hasNextPage: boolean | null;
}

type OrderFetchCompleteness = "complete" | "partial" | "operational_only" | "unknown" | "error";
type SnapshotPersistence   = "saved" | "not_configured" | "skipped" | "skipped_incomplete" | "error";

interface WindowFetchDiagnostics {
  totalWindows:             number;
  resolvedWindows:          number;
  partialWindows:           number;
  failedWindows:            number;
  datetimeFiltersSupported: boolean | null;
  dailyFallbackUsed:        boolean;
  requestsMade:             number;
  targetTotal:              number | null;
  rawCount:                 number;
  uniqueCount:              number;
  duplicateCount:           number;
  missingIdCount:           number;
  rateLimitStopped:         boolean;
  executionMs:              number;
  paginationFallbackReason: "repeated_page" | "requested_page_ignored" | "none";
  authMode:                 "bearer" | "x_api_key";
}

interface OrdersResult {
  ok: boolean;
  reason?: string; code?: string; message?: string;
  connectionFound?: boolean; provider?: string;
  baseUrlResolved?: boolean; endpoint?: string;
  httpStatus?: number | null; providerErrorMessage?: string | null;
  snapshotPersistence?: SnapshotPersistence;
  completeness?: OrderFetchCompleteness;
  pagination?: PaginationInfo;
  debugShape?: DebugShape;
  windowDiag?: WindowFetchDiagnostics | null;
  cacheHit?: boolean;
  data?: {
    faturamento_total:      number | null;
    total_pedidos:          number | null;
    ticket_medio:           number | null;
    pedidos_por_status:     Record<string, number> | null;
    produtos_mais_vendidos: { name: string; qty: number }[] | null;
    topItemsUnavailable:    boolean;
    topItemsReason:         string | null;
    melhores_dias:          { date: string; revenue: number; orders: number }[] | null;
    pedidos_recentes:       { id: string; date: string | null; status: string; total: number }[];
    heatmap?:               { weekday: number; hour: number; orders: number; revenue: number }[];
    pedidosPorServiceType?: Record<string, number>;
    pedidosPorSource?:      Record<string, number>;
    totalDescontos?:        number;
    totalTaxasEntrega?:     number;
    totalGorjetas?:         number;
    faturamentoPorDiaSemana?: Record<string, number>;
    pedidosPorDiaSemana?:   Record<string, number>;
  };
}

interface ReportData {
  faturamento_total:      number;
  total_pedidos:          number;
  ticket_medio:           number | null;
  pedidos_por_status:     Record<string, number> | null;
  produtos_mais_vendidos: { name: string; qty: number }[] | null;
  topItemsUnavailable:    boolean;
  topItemsReason:         string | null;
  melhores_dias:          { date: string; revenue: number; orders: number }[] | null;
  pedidos_recentes:       { id: string; date: string | null; status: string; total: number }[];
  pagination?:            PaginationInfo;
  debugShape?:            DebugShape;
  snapshotPersistence?:   SnapshotPersistence;
  completeness?:          OrderFetchCompleteness;
  windowDiag?:            WindowFetchDiagnostics | null;
  cacheHit?:              boolean;
  heatmap?:               { weekday: number; hour: number; orders: number; revenue: number }[];
  pedidosPorServiceType?: Record<string, number>;
  pedidosPorSource?:      Record<string, number>;
  totalDescontos?:        number;
  totalTaxasEntrega?:     number;
  totalGorjetas?:         number;
  faturamentoPorDiaSemana?: Record<string, number>;
  pedidosPorDiaSemana?:   Record<string, number>;
}

// ── Formatters ─────────────────────────────────────────────────────────────────

function fmtBRL(v: number | null) {
  if (v === null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtCount(v: number | null) {
  if (v === null) return "—";
  return String(v);
}
function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
}
function fmtDay(ymd: string) {
  try {
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch { return ymd; }
}

// ── Badge de qualidade dos dados ───────────────────────────────────────────────

function DataQualityBadge({ completeness }: { completeness?: OrderFetchCompleteness }) {
  if (completeness === "complete") {
    return (
      <div className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
        <CheckCircle2 className="w-3 h-3" />
        Dados completos
      </div>
    );
  }
  if (completeness === "partial") {
    return (
      <div className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
        <Info className="w-3 h-3" />
        Dados parciais
      </div>
    );
  }
  if (completeness === "operational_only") {
    return (
      <div className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-100">
        <Info className="w-3 h-3" />
        Modo operacional
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gray-50 text-gray-500 border border-gray-100">
      <Info className="w-3 h-3" />
      Completude não confirmada
    </div>
  );
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color = "bg-indigo-50 text-indigo-600" }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-xl font-black text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-gray-400" />
        <p className="text-sm font-bold text-gray-900">{title}</p>
      </div>
      {children}
    </div>
  );
}

function StatusBadge({ label }: { label: string }) {
  const colors: Record<string, string> = {
    PREPARING:   "bg-amber-50  text-amber-700  border-amber-100",
    READY:       "bg-blue-50   text-blue-700   border-blue-100",
    DELIVERING:  "bg-indigo-50 text-indigo-700 border-indigo-100",
    DELIVERED:   "bg-emerald-50 text-emerald-700 border-emerald-100",
    CANCELLED:   "bg-red-50    text-red-700    border-red-100",
    CANCELED:    "bg-red-50    text-red-700    border-red-100",
  };
  const cls = colors[label.toUpperCase()] ?? "bg-gray-50 text-gray-600 border-gray-100";
  return (
    <span className={`inline-block text-[10px] font-semibold border px-1.5 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function FaturamentoPage() {
  const [clients,       setClients]       = useState<ClientOption[]>([]);
  const [clientId,      setClientId]      = useState("");
  const [period,        setPeriod]        = useState<PeriodKey>("7dias");
  const [customStart,   setCustomStart]   = useState("");
  const [customEnd,     setCustomEnd]     = useState("");
  const [customError,   setCustomError]   = useState<string | null>(null);
  const [status,        setStatus]        = useState<DigitalMenuStatus | null>(null);
  const [report,        setReport]        = useState<ReportData | null>(null);
  const [loading,       setLoading]       = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [apiDiag,       setApiDiag]       = useState<{ provider?: string; endpoint?: string; httpStatus?: number | null; providerErrorMessage?: string | null; period?: string } | null>(null);
  const [missingBaseUrl,setMissingBaseUrl]= useState(false);
  const [lastSync,      setLastSync]      = useState<string | null>(null);
  const [showDiag,      setShowDiag]      = useState(false);
  const [prevReport,    setPrevReport]    = useState<ReportData | null>(null);

  // Carrega lista de clientes
  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/admin/clients");
        if (!r.ok) return;
        const d = await r.json() as { clients?: ClientOption[] };
        setClients(d.clients ?? []);
        if (d.clients && d.clients.length > 0) setClientId(d.clients[0].id);
      } catch { /* silent */ }
    })();
  }, []);

  // Carrega status da conexão
  const loadStatus = useCallback(async (cid: string) => {
    if (!cid) return;
    setLoadingStatus(true);
    setStatus(null);
    try {
      const r = await fetch(`/api/olaclick/status?client_id=${cid}`);
      const d = await r.json() as DigitalMenuStatus;
      setStatus(d);
    } catch {
      setStatus({ ok: false, reason: "error", message: "Não foi possível verificar o status da conexão." });
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    if (clientId) void loadStatus(clientId);
  }, [clientId, loadStatus]);

  // Carrega relatório
  const loadReport = useCallback(async () => {
    if (!clientId) return;

    // Valida período personalizado antes de disparar a requisição
    if (period === "personalizado") {
      if (!customStart || !customEnd) {
        setCustomError("Informe as duas datas para o período personalizado.");
        return;
      }
      if (customStart > customEnd) {
        setCustomError("A data inicial deve ser menor ou igual à data final.");
        return;
      }
    }
    setCustomError(null);

    setLoading(true);
    setError(null);
    setReport(null);
    setMissingBaseUrl(false);
    setApiDiag(null);

    try {
      const url = period === "personalizado"
        ? `/api/olaclick/orders?client_id=${clientId}&start_date=${customStart}&end_date=${customEnd}`
        : `/api/olaclick/orders?client_id=${clientId}&period=${period}`;
      const r = await fetch(url);
      const d = await r.json() as OrdersResult;

      if (!d.ok) {
        const diag = { provider: d.provider, endpoint: d.endpoint, httpStatus: d.httpStatus, providerErrorMessage: d.providerErrorMessage, period };
        if (d.reason === "sql_pending") {
          setError("SQL 39 pendente. Rode docs/supabase/39-olaclick-connections.sql no Supabase.");
        } else if (d.reason === "base_url_missing" || d.code === "missing_provider_base_url") {
          setMissingBaseUrl(true);
        } else if (d.reason === "not_connected" || d.code === "no_digital_menu_connection") {
          setError("Cliente sem conexão Cardápio Digital ativa. Conecte em Conexões → Cardápio Digital.");
        } else if (d.reason === "token_invalid" || d.code === "provider_unauthorized") {
          setError("A API recusou a chave do provider. Verifique o token/API Key da conexão em Gerenciar."); setApiDiag(diag);
        } else if (d.reason === "forbidden" || d.code === "provider_forbidden") {
          setError("A API respondeu sem permissão para consultar pedidos."); setApiDiag(diag);
        } else if (d.reason === "endpoint_not_found" || d.code === "provider_endpoint_not_found") {
          setError("Endpoint de pedidos não encontrado. Verifique o adapter OlaClick."); setApiDiag(diag);
        } else if (d.reason === "token_has_invalid_characters" || d.code === "invalid_header_value") {
          setError("A chave do provider contém caracteres inválidos. Atualize o token em Gerenciar → Cardápio Digital."); setApiDiag(diag);
        } else if (d.reason === "bad_params" || d.code === "provider_bad_request") {
          setError(d.message ?? "A API recusou os filtros do período. Tente novamente."); setApiDiag(diag);
        } else if (d.reason === "network_error" || d.code === "provider_network_error") {
          setError("Não foi possível conectar à API OlaClick a partir do servidor."); setApiDiag(diag);
        } else if (d.reason === "unexpected_response" || d.code === "provider_unexpected_response") {
          setError("A API respondeu, mas em formato diferente do esperado."); setApiDiag(diag);
        } else {
          setError(d.message ?? "Não foi possível buscar dados do Cardápio Digital.");
          if (d.provider || d.endpoint || d.httpStatus != null) setApiDiag(diag);
        }
        return;
      }
      setMissingBaseUrl(false);

      const parsed = d.data;
      setReport({
        faturamento_total:      parsed?.faturamento_total      ?? 0,
        total_pedidos:          parsed?.total_pedidos          ?? 0,
        ticket_medio:           parsed?.ticket_medio           ?? null,
        pedidos_por_status:     parsed?.pedidos_por_status     ?? null,
        produtos_mais_vendidos: parsed?.produtos_mais_vendidos ?? null,
        topItemsUnavailable:    parsed?.topItemsUnavailable    ?? false,
        topItemsReason:         parsed?.topItemsReason         ?? null,
        melhores_dias:          parsed?.melhores_dias          ?? null,
        pedidos_recentes:       parsed?.pedidos_recentes       ?? [],
        pagination:             d.pagination,
        debugShape:             d.debugShape,
        snapshotPersistence:    d.snapshotPersistence,
        completeness:           d.completeness,
        windowDiag:             d.windowDiag ?? null,
        cacheHit:               d.cacheHit ?? false,
        heatmap:                parsed?.heatmap,
        pedidosPorServiceType:  parsed?.pedidosPorServiceType,
        pedidosPorSource:       parsed?.pedidosPorSource,
        totalDescontos:         parsed?.totalDescontos,
        totalTaxasEntrega:      parsed?.totalTaxasEntrega,
        totalGorjetas:          parsed?.totalGorjetas,
        faturamentoPorDiaSemana: parsed?.faturamentoPorDiaSemana,
        pedidosPorDiaSemana:    parsed?.pedidosPorDiaSemana,
      });
      setLastSync(new Date().toISOString());
    } catch {
      setError("Erro de rede ao buscar faturamento. Verifique conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [clientId, period, customStart, customEnd]);

  const selectedClient = clients.find((c) => c.id === clientId);
  const isConnected    = status?.ok && status?.connection;

  // Busca período anterior para comparação
  const loadPrevReport = useCallback(async () => {
    if (!clientId || period === "personalizado") { setPrevReport(null); return; }
    const now = new Date();
    const toYMD = (d: Date) => d.toISOString().split("T")[0];
    let days = 7;
    if (period === "7dias")    days = 7;
    else if (period === "15dias")  days = 15;
    else if (period === "30dias")  days = 30;
    else if (period === "mes_atual") {
      const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
      days = Math.ceil((now.getTime() - mStart.getTime()) / 86400000) || 1;
    } else if (period === "hoje") days = 1;
    const prevEnd   = new Date(now); prevEnd.setDate(prevEnd.getDate() - days);
    const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - days + 1);
    try {
      const r = await fetch(`/api/olaclick/orders?client_id=${clientId}&start_date=${toYMD(prevStart)}&end_date=${toYMD(prevEnd)}`);
      const d = await r.json() as OrdersResult;
      if (d.ok && d.data) {
        setPrevReport({
          faturamento_total:      d.data.faturamento_total ?? 0,
          total_pedidos:          d.data.total_pedidos ?? 0,
          ticket_medio:           d.data.ticket_medio ?? null,
          pedidos_por_status:     d.data.pedidos_por_status ?? null,
          produtos_mais_vendidos: d.data.produtos_mais_vendidos ?? null,
          topItemsUnavailable:    d.data.topItemsUnavailable ?? false,
          topItemsReason:         d.data.topItemsReason ?? null,
          melhores_dias:          d.data.melhores_dias ?? null,
          pedidos_recentes:       d.data.pedidos_recentes ?? [],
        });
      } else {
        setPrevReport(null);
      }
    } catch { setPrevReport(null); }
  }, [clientId, period]);

  // Dispara comparação sempre que o relatório principal muda
  useEffect(() => {
    if (report) void loadPrevReport();
  }, [report, loadPrevReport]);

  // Auto-refresh a cada 5 minutos
  const { refresh: autoRefreshNow } = useAutoRefresh({
    enabled: !!clientId && !!isConnected,
    intervalMs: 300_000,
    onRefresh: loadReport,
    refreshOnMount: false,
  });
  void autoRefreshNow; // referência para evitar lint

  // Aviso de dados parciais — paginação não detectada com count suspeito, ou completeness explícita
  const samePeriodsWarning = report
    && report.total_pedidos > 0
    && (
      report.completeness === "partial"
      || report.completeness === "unknown"
      || report.completeness === "operational_only"
      || (
        report.pagination
        && !report.pagination.used
        && report.pagination.limitDetected !== null
        && report.total_pedidos === report.pagination.limitDetected
      )
    );

  // Labels condicionais baseados na completude dos dados
  const isComplete = report?.completeness === "complete";
  const labelFaturamento = isComplete ? "Faturamento total" : "Faturamento dos pedidos carregados";
  const labelPedidos     = isComplete ? "Total de pedidos"  : "Pedidos retornados";
  const labelTicket      = isComplete ? "Ticket médio"      : "Ticket médio dos pedidos carregados";

  return (
    <div>
      <PageHeader title="Faturamento" description="Relatório de faturamento — Cardápio Digital">
        <button
          onClick={() => void loadReport()}
          disabled={loading || !isConnected}
          className="flex items-center gap-2 text-sm font-medium text-white bg-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Sincronizar
        </button>
      </PageHeader>

      {/* Seletores */}
      <div className="mb-5 flex flex-wrap gap-3 items-start">
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <select value={clientId} onChange={(e) => setClientId(e.target.value)}
            className="pl-8 pr-8 py-2 text-sm border border-gray-200 bg-white rounded-xl outline-none focus:border-indigo-300 appearance-none">
            {clients.length === 0 && <option value="">Sem clientes</option>}
            {clients.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <select value={period} onChange={(e) => { setPeriod(e.target.value as PeriodKey); setCustomError(null); }}
            className="pl-8 pr-8 py-2 text-sm border border-gray-200 bg-white rounded-xl outline-none focus:border-indigo-300 appearance-none">
            {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>

        {/* Campos de data personalizada */}
        {period === "personalizado" && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => { setCustomStart(e.target.value); setCustomError(null); }}
              className="py-2 px-3 text-sm border border-gray-200 bg-white rounded-xl outline-none focus:border-indigo-300"
            />
            <span className="text-xs text-gray-400">até</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => { setCustomEnd(e.target.value); setCustomError(null); }}
              className="py-2 px-3 text-sm border border-gray-200 bg-white rounded-xl outline-none focus:border-indigo-300"
            />
            <button
              onClick={() => void loadReport()}
              disabled={loading || !isConnected || !customStart || !customEnd}
              className="flex items-center gap-1.5 text-sm font-medium text-white bg-indigo-600 px-3 py-2 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Aplicar período
            </button>
            {customError && (
              <span className="text-xs text-red-500">{customError}</span>
            )}
          </div>
        )}
      </div>

      {/* Label de período personalizado ativo */}
      {period === "personalizado" && customStart && customEnd && report && (
        <div className="mb-4 flex items-center gap-2 text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2">
          <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
          Período personalizado: {fmtDay(customStart)} até {fmtDay(customEnd)}
        </div>
      )}

      {/* Status da conexão */}
      <div className={`mb-5 flex items-start gap-2.5 p-3.5 rounded-xl border text-xs ${
        loadingStatus ? "bg-gray-50 border-gray-100 text-gray-500"
        : isConnected ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                      : "bg-amber-50 border-amber-100 text-amber-700"
      }`}>
        {loadingStatus ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" /> Verificando conexão Cardápio Digital…</>
        ) : isConnected ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Cardápio Digital conectado</span>
              {status.connection?.provider && <span className="ml-1 text-emerald-600 font-medium uppercase text-[10px]">· {status.connection.provider}</span>}
              {status.connection?.connection_name && <span> · {status.connection.connection_name}</span>}
              {status.connection?.token_last_four && <span className="font-mono ml-1">…{status.connection.token_last_four}</span>}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full">Token: salvo ✓</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                  {status.connection?.has_api_base_url ? "URL personalizada ✓" : "URL padrão do provider ✓"}
                </span>
                <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded-full">Fonte: Cardápio Digital</span>
              </div>
              {lastSync && <span className="text-emerald-600 text-[10px] mt-0.5 block">Última sync: {fmtDate(lastSync)}</span>}
            </div>
          </>
        ) : (
          <>
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">{selectedClient ? `${selectedClient.company_name} sem conexão Cardápio Digital.` : "Selecione um cliente."}</span>{" "}
              <Link href="/admin/conexoes" className="underline font-bold">Conectar em Conexões →</Link>
            </div>
          </>
        )}
      </div>

      {/* URL ausente */}
      {missingBaseUrl && (
        <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-500" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-800">Conexão salva — falta configurar a URL do provedor</p>
              <p className="mt-1 text-amber-600">
                Edite a conexão em{" "}
                <Link href="/admin/conexoes" className="underline font-bold">Conexões → Cardápio Digital</Link>{" "}
                e preencha o campo <strong>URL da API do provedor</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="mb-2 flex items-start gap-2 p-3.5 rounded-xl bg-red-50 border border-red-100 text-xs text-red-700">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}
      {apiDiag && (
        <div className="mb-5 p-3 rounded-xl bg-gray-50 border border-gray-200 text-[11px] text-gray-500 space-y-0.5">
          {apiDiag.provider   && <p><span className="font-semibold text-gray-600">Provider:</span> {apiDiag.provider}</p>}
          {apiDiag.endpoint   && <p><span className="font-semibold text-gray-600">Endpoint:</span> {apiDiag.endpoint}</p>}
          {apiDiag.httpStatus != null && <p><span className="font-semibold text-gray-600">HTTP Status:</span> {apiDiag.httpStatus ?? "—"}</p>}
          {apiDiag.period     && <p><span className="font-semibold text-gray-600">Período:</span> {apiDiag.period}</p>}
          {apiDiag.providerErrorMessage && <p><span className="font-semibold text-gray-600">Resposta do provider:</span> <span className="font-mono break-all">{apiDiag.providerErrorMessage}</span></p>}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && !report && isConnected && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <ShoppingCart className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-600 mb-1">Nenhum dado ainda</p>
          <p className="text-xs text-gray-400 mb-4">Clique em &quot;Sincronizar&quot; para buscar dados do período.</p>
          <button onClick={() => void loadReport()} className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800">
            <RefreshCw className="w-4 h-4" /> Sincronizar agora
          </button>
        </div>
      )}
      {!isConnected && !loadingStatus && !error && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <Link2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-600 mb-1">Sem conexão Cardápio Digital</p>
          <p className="text-xs text-gray-400 mb-4">Conecte o cliente ao Cardápio Digital para ver o faturamento real.</p>
          <Link href="/admin/conexoes" className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800">
            <Link2 className="w-4 h-4" /> Ir para Conexões
          </Link>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" /> Buscando dados do Cardápio Digital…
        </div>
      )}

      {/* Última atualização */}
      {lastSync && !loading && (
        <div className="mb-4 flex items-center gap-2 text-[11px] text-gray-400">
          <Clock className="w-3 h-3" />
          Última atualização: {fmtDate(lastSync)}
          <span className="text-gray-300">·</span>
          <span>Próxima em até 5 min</span>
        </div>
      )}

      {/* ── Relatório ── */}
      {report && !loading && (
        <div className="space-y-5">

          {/* Aviso lista vazia */}
          {report.total_pedidos === 0 && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
              <ShoppingCart className="w-3.5 h-3.5 flex-shrink-0" />
              Nenhum pedido encontrado no período selecionado.
            </div>
          )}

          {/* Badge de qualidade + aviso parcial */}
          <div className="flex flex-wrap items-center gap-3">
            <DataQualityBadge completeness={report.completeness} />
            {samePeriodsWarning && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 flex-1 min-w-0">
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>
                  A API retornou <strong>{report.total_pedidos}</strong> pedidos sem confirmar completude — pode ser o limite por página do provider.
                  {" "}Os KPIs abaixo refletem apenas os pedidos carregados, não necessariamente o total do período.
                </span>
              </div>
            )}
          </div>

          {/* Cards principais */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={DollarSign}   label={labelFaturamento} value={fmtBRL(report.faturamento_total)}
              sub="Fonte: Cardápio Digital" color="bg-emerald-50 text-emerald-600" />
            <StatCard icon={ShoppingCart} label={labelPedidos}     value={fmtCount(report.total_pedidos)}
              sub={
                report.windowDiag
                  ? `${report.windowDiag.uniqueCount} únicos · ${report.windowDiag.totalWindows} janelas`
                  : report.pagination?.pagesFetched && report.pagination.pagesFetched > 1
                    ? `${report.pagination.pagesFetched} páginas buscadas`
                    : undefined
              }
              color="bg-blue-50 text-blue-600" />
            <StatCard icon={TrendingUp}   label={labelTicket}      value={fmtBRL(report.ticket_medio)} color="bg-violet-50 text-violet-600" />
          </div>

          {/* Qualidade da coleta (windowing) */}
          {report.windowDiag && (
            <div className={`flex items-start gap-2 p-3 border rounded-xl text-xs ${
              report.completeness === "complete"
                ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                : report.completeness === "partial"
                ? "bg-amber-50 border-amber-100 text-amber-700"
                : "bg-orange-50 border-orange-100 text-orange-700"
            }`}>
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>
                {report.windowDiag.targetTotal !== null
                  ? `${fmtCount(report.windowDiag.uniqueCount)} pedidos coletados de ${fmtCount(report.windowDiag.targetTotal)} informados`
                  : `${fmtCount(report.windowDiag.uniqueCount)} pedidos coletados`}
                {" · "}
                {report.windowDiag.dailyFallbackUsed
                  ? `${report.windowDiag.totalWindows} dias processados`
                  : `${report.windowDiag.totalWindows} janelas processadas`}
                {report.windowDiag.rateLimitStopped && " · Coleta interrompida por limite do provider"}
                {report.completeness === "complete" && " · Dados completos"}
                {report.completeness === "partial" && !report.windowDiag.rateLimitStopped && " · Coleta parcial — alguns dias com mais de 50 pedidos"}
                {report.cacheHit && " · Resultado em cache"}
              </span>
            </div>
          )}

          {/* Comparação com período anterior */}
          {prevReport && period !== "personalizado" && report.total_pedidos > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-xs font-bold text-gray-500 mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Comparação com período anterior
              </p>
              {report.completeness !== "complete" || prevReport.completeness !== "complete" ? (
                <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>
                    Comparação indisponível enquanto a coleta completa dos dois períodos não for confirmada.
                    {report.completeness !== "complete" && <> Período atual: <strong>{report.completeness}</strong>.</>}
                    {prevReport.completeness && prevReport.completeness !== "complete" && <> Período anterior: <strong>{prevReport.completeness}</strong>.</>}
                  </span>
                </div>
              ) : (() => {
                const diffFat  = prevReport.faturamento_total > 0
                  ? ((report.faturamento_total - prevReport.faturamento_total) / prevReport.faturamento_total * 100)
                  : null;
                const diffPed  = prevReport.total_pedidos > 0
                  ? ((report.total_pedidos - prevReport.total_pedidos) / prevReport.total_pedidos * 100)
                  : null;
                const diffTick = prevReport.ticket_medio && prevReport.ticket_medio > 0 && report.ticket_medio
                  ? ((report.ticket_medio - prevReport.ticket_medio) / prevReport.ticket_medio * 100)
                  : null;
                const sign = (v: number) => v >= 0 ? "+" : "";
                const cls  = (v: number) => v >= 0 ? "text-emerald-600" : "text-red-500";
                return (
                  <div className="grid grid-cols-3 gap-3">
                    {diffFat !== null && (
                      <div className="text-center">
                        <p className={`text-base font-black ${cls(diffFat)}`}>{sign(diffFat)}{diffFat.toFixed(1)}%</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Faturamento</p>
                        <p className="text-[10px] text-gray-300">{fmtBRL(prevReport.faturamento_total)}</p>
                      </div>
                    )}
                    {diffPed !== null && (
                      <div className="text-center">
                        <p className={`text-base font-black ${cls(diffPed)}`}>{sign(diffPed)}{diffPed.toFixed(1)}%</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Pedidos</p>
                        <p className="text-[10px] text-gray-300">{fmtCount(prevReport.total_pedidos)}</p>
                      </div>
                    )}
                    {diffTick !== null && (
                      <div className="text-center">
                        <p className={`text-base font-black ${cls(diffTick)}`}>{sign(diffTick)}{diffTick.toFixed(1)}%</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Ticket médio</p>
                        <p className="text-[10px] text-gray-300">{fmtBRL(prevReport.ticket_medio)}</p>
                      </div>
                    )}
                    {diffFat === null && diffPed === null && diffTick === null && (
                      <p className="col-span-3 text-xs text-gray-400 text-center">Período anterior sem dados para comparar.</p>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Resumo executivo — linguagem condicional à completude */}
          {report.total_pedidos > 0 && (() => {
            const isComplete   = report.completeness === "complete";
            const isOperOnly   = report.completeness === "operational_only";
            const statusDominante = report.pedidos_por_status
              ? Object.entries(report.pedidos_por_status).sort((a, b) => b[1] - a[1])[0]?.[0]
              : null;
            const melhorDia = report.melhores_dias?.[0];
            const lines: string[] = [];

            if (isComplete) {
              lines.push(`O período teve ${fmtBRL(report.faturamento_total)} em faturamento com ${fmtCount(report.total_pedidos)} pedido${report.total_pedidos !== 1 ? "s" : ""}.`);
            } else {
              lines.push(`Nos ${fmtCount(report.total_pedidos)} pedidos retornados pela API, foram identificados ${fmtBRL(report.faturamento_total)} em faturamento.`);
            }
            if (report.ticket_medio) lines.push(`Ticket médio de ${fmtBRL(report.ticket_medio)}.`);
            if (statusDominante) {
              lines.push(isComplete
                ? `Status dominante do período: ${statusDominante}.`
                : `Status mais frequente entre os pedidos retornados: ${statusDominante}.`);
            }
            if (melhorDia) {
              lines.push(isComplete
                ? `Melhor dia do período: ${fmtDay(melhorDia.date)}, com ${fmtBRL(melhorDia.revenue)}.`
                : `Melhor dia entre os pedidos retornados: ${fmtDay(melhorDia.date)}, com ${fmtBRL(melhorDia.revenue)}.`);
            }
            if (report.topItemsUnavailable) {
              lines.push("Produtos mais vendidos indisponíveis: a API não retornou itens nos pedidos.");
            }

            return (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <p className="text-sm font-bold text-gray-900">Leitura do período</p>
                </div>
                {isOperOnly && (
                  <div className="mb-3 flex items-start gap-2 text-xs text-orange-700 bg-orange-50 border border-orange-100 rounded-xl p-2.5">
                    <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    A integração está exibindo os pedidos mais recentes disponíveis. Este resultado não representa necessariamente todo o período selecionado.
                  </div>
                )}
                <ul className="space-y-1.5">
                  {lines.map((l, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                      <span className="text-indigo-300 mt-0.5 flex-shrink-0">·</span>
                      {l}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}

          {/* Pedidos por status */}
          {report.pedidos_por_status && Object.keys(report.pedidos_por_status).length > 0 && (
            <SectionCard title="Pedidos por status" icon={BarChart3}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(report.pedidos_por_status).map(([s, qty]) => (
                  <div key={s} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-black text-gray-900">{qty}</p>
                    <div className="mt-1 flex justify-center"><StatusBadge label={s} /></div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Produtos mais vendidos */}
          {report.produtos_mais_vendidos && report.produtos_mais_vendidos.length > 0 ? (
            <SectionCard title="Produtos mais vendidos" icon={TrendingUp}>
              <div className="space-y-2">
                {report.produtos_mais_vendidos.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="w-5 h-5 flex-shrink-0 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-full flex items-center justify-center">{i + 1}</span>
                    <span className="text-gray-700 truncate flex-1">{p.name}</span>
                    <span className="font-bold text-gray-900 flex-shrink-0">{p.qty}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          ) : report.topItemsUnavailable ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-gray-300" />
                <p className="text-sm font-bold text-gray-400">Produtos mais vendidos</p>
              </div>
              <p className="text-xs text-gray-400">{report.topItemsReason ?? "Os itens/produtos não vieram na resposta do endpoint /v1/orders."}</p>
            </div>
          ) : null}

          {/* Melhores dias */}
          {report.melhores_dias && report.melhores_dias.length > 0 && (
            <SectionCard title="Melhores dias de venda" icon={CalendarDays}>
              <div className="space-y-2">
                {report.melhores_dias.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-sm gap-3">
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="w-5 h-5 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full flex items-center justify-center">{i + 1}</span>
                      <span className="text-gray-500 font-mono text-xs">{fmtDay(d.date)}</span>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span className="text-gray-400 text-xs">{d.orders} ped.</span>
                      <span className="font-bold text-gray-900">{fmtBRL(d.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Pedidos recentes */}
          {report.pedidos_recentes && report.pedidos_recentes.length > 0 && (
            <SectionCard title="Pedidos recentes" icon={Clock}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-50">
                      <th className="pb-2 text-left font-semibold">ID</th>
                      <th className="pb-2 text-left font-semibold">Data</th>
                      <th className="pb-2 text-left font-semibold">Status</th>
                      <th className="pb-2 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {report.pedidos_recentes.map((o, i) => (
                      <tr key={i} className="text-gray-700">
                        <td className="py-1.5 font-mono text-gray-400 truncate max-w-[80px]">{o.id ? `#${o.id.slice(-6)}` : "—"}</td>
                        <td className="py-1.5 text-gray-500">{o.date ? fmtDay(o.date) : "—"}</td>
                        <td className="py-1.5"><StatusBadge label={o.status} /></td>
                        <td className="py-1.5 text-right font-semibold">{fmtBRL(o.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {/* KPIs adicionais */}
          {(report.totalDescontos || report.totalTaxasEntrega || report.totalGorjetas ||
            report.pedidosPorServiceType || report.pedidosPorSource) && (
            <SectionCard title="Composição do faturamento" icon={DollarSign}>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {(report.totalDescontos ?? 0) > 0 && (
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400 font-medium">Descontos</p>
                    <p className="text-sm font-bold text-red-600">{fmtBRL(report.totalDescontos ?? 0)}</p>
                  </div>
                )}
                {(report.totalTaxasEntrega ?? 0) > 0 && (
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400 font-medium">Taxas de entrega</p>
                    <p className="text-sm font-bold text-gray-700">{fmtBRL(report.totalTaxasEntrega ?? 0)}</p>
                  </div>
                )}
                {(report.totalGorjetas ?? 0) > 0 && (
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400 font-medium">Gorjetas</p>
                    <p className="text-sm font-bold text-emerald-600">{fmtBRL(report.totalGorjetas ?? 0)}</p>
                  </div>
                )}
              </div>
              {report.pedidosPorServiceType && Object.keys(report.pedidosPorServiceType).length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1.5">Tipo de serviço</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(report.pedidosPorServiceType).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                      <span key={k} className="inline-flex items-center gap-1 text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full">
                        {k} <span className="font-bold">{v}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {report.pedidosPorSource && Object.keys(report.pedidosPorSource).length > 0 && (
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1.5">Canal</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(report.pedidosPorSource).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                      <span key={k} className="inline-flex items-center gap-1 text-[11px] bg-gray-50 text-gray-600 border border-gray-100 px-2 py-0.5 rounded-full">
                        {k} <span className="font-bold">{v}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </SectionCard>
          )}

          {/* Faturamento por dia da semana */}
          {report.faturamentoPorDiaSemana && Object.keys(report.faturamentoPorDiaSemana).length > 0 && (
            <SectionCard title="Faturamento por dia da semana" icon={BarChart3}>
              {(() => {
                const days = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
                const entries = days.map(d => ({ day: d, revenue: report.faturamentoPorDiaSemana?.[d] ?? 0, orders: report.pedidosPorDiaSemana?.[d] ?? 0 })).filter(e => e.revenue > 0 || e.orders > 0);
                const maxRev = Math.max(...entries.map(e => e.revenue), 1);
                return (
                  <div className="space-y-2">
                    {entries.map(({ day, revenue, orders }) => (
                      <div key={day} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-16 flex-shrink-0 font-medium">{day.slice(0, 3)}</span>
                        <div className="flex-1 bg-gray-50 rounded-full h-2 overflow-hidden">
                          <div className="h-2 bg-indigo-400 rounded-full" style={{ width: `${(revenue / maxRev) * 100}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 w-20 text-right flex-shrink-0">{fmtBRL(revenue)}</span>
                        <span className="text-[10px] text-gray-400 w-12 text-right flex-shrink-0">{orders}p</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </SectionCard>
          )}

          {/* Mapa de horários dos pedidos */}
          {report.heatmap && report.heatmap.length > 0 && (
            <SectionCard title="Mapa de horários dos pedidos" icon={Clock}>
              {(() => {
                const cells = report.heatmap;
                const maxOrders = Math.max(...cells.map(c => c.orders), 1);
                const days = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
                const hours = Array.from({ length: 24 }, (_, i) => i);
                const cellMap: Record<string, { orders: number; revenue: number }> = {};
                for (const c of cells) cellMap[`${c.weekday}:${c.hour}`] = { orders: c.orders, revenue: c.revenue };
                return (
                  <div className="overflow-x-auto">
                    <div style={{ minWidth: "600px" }}>
                      {/* Hour labels */}
                      <div className="flex mb-1">
                        <div className="w-8 flex-shrink-0" />
                        {hours.map(h => (
                          <div key={h} className="flex-1 text-center text-[9px] text-gray-400 font-mono">
                            {h % 3 === 0 ? `${h}h` : ""}
                          </div>
                        ))}
                      </div>
                      {days.map((day, wd) => (
                        <div key={wd} className="flex items-center gap-0 mb-0.5">
                          <div className="w-8 flex-shrink-0 text-[10px] text-gray-400 font-medium">{day}</div>
                          {hours.map(h => {
                            const c = cellMap[`${wd}:${h}`];
                            const intensity = c ? Math.round((c.orders / maxOrders) * 5) : 0;
                            const colors = ["bg-gray-50","bg-indigo-50","bg-indigo-100","bg-indigo-200","bg-indigo-400","bg-indigo-600"];
                            return (
                              <div
                                key={h}
                                title={c ? `${day} ${h}h — ${c.orders} pedido${c.orders !== 1 ? "s" : ""} · ${fmtBRL(c.revenue)}` : undefined}
                                className={`flex-1 aspect-square rounded-sm mx-px ${colors[intensity]} transition-colors`}
                              />
                            );
                          })}
                        </div>
                      ))}
                      <div className="flex items-center gap-2 mt-2 justify-end">
                        <span className="text-[10px] text-gray-400">Menos</span>
                        {["bg-gray-50","bg-indigo-50","bg-indigo-100","bg-indigo-200","bg-indigo-400","bg-indigo-600"].map((c, i) => (
                          <div key={i} className={`w-3 h-3 rounded-sm ${c} border border-gray-100`} />
                        ))}
                        <span className="text-[10px] text-gray-400">Mais</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </SectionCard>
          )}

          {/* Diagnóstico técnico da integração — colapsível */}
          <div className="border border-gray-100 rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowDiag((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-semibold text-gray-600">Diagnóstico técnico da integração</span>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showDiag ? "rotate-90" : ""}`} />
            </button>
            {showDiag && (
              <div className="p-5 space-y-2 text-[11px] text-gray-500 bg-white">
                <p><span className="font-semibold text-gray-700">Endpoint:</span> /v1/orders</p>
                <p><span className="font-semibold text-gray-700">Período enviado:</span> {PERIODS.find(p => p.value === period)?.label}</p>
                <p><span className="font-semibold text-gray-700">Pedidos únicos retornados:</span> {report.total_pedidos}</p>
                {report.cacheHit && <p className="text-indigo-600 font-semibold">Resultado servido do cache (TTL 5 min). Use force_refresh=1 para forçar nova coleta.</p>}

                {/* Windowing diagnostics */}
                {report.windowDiag && (
                  <>
                    <div className="pt-1 border-t border-gray-50">
                      <p className="font-semibold text-gray-700 mb-1">Coleta por janelas temporais</p>
                      <p><span className="font-semibold text-gray-700">Motivo do fallback:</span> {report.windowDiag.paginationFallbackReason === "repeated_page" ? "Página 2 repetiu a página 1" : report.windowDiag.paginationFallbackReason === "requested_page_ignored" ? "Provider ignorou page[number]" : "—"}</p>
                      <p><span className="font-semibold text-gray-700">Datetime ISO aceito:</span> {report.windowDiag.datetimeFiltersSupported === null ? "—" : report.windowDiag.datetimeFiltersSupported ? "Sim" : "Não — usando fallback diário"}</p>
                      <p><span className="font-semibold text-gray-700">Fallback diário usado:</span> {report.windowDiag.dailyFallbackUsed ? "Sim" : "Não"}</p>
                      <p><span className="font-semibold text-gray-700">Janelas:</span> {report.windowDiag.totalWindows} total · {report.windowDiag.resolvedWindows} resolvidas · {report.windowDiag.partialWindows} parciais · {report.windowDiag.failedWindows} falhas</p>
                      <p><span className="font-semibold text-gray-700">Requisições realizadas:</span> {report.windowDiag.requestsMade}</p>
                      {report.windowDiag.targetTotal !== null && <p><span className="font-semibold text-gray-700">Total informado pelo provider:</span> {report.windowDiag.targetTotal}</p>}
                      <p><span className="font-semibold text-gray-700">Dedup:</span> {report.windowDiag.uniqueCount} únicos de {report.windowDiag.rawCount} brutos · {report.windowDiag.duplicateCount} removidos{report.windowDiag.missingIdCount > 0 ? ` · ${report.windowDiag.missingIdCount} sem ID` : ""}</p>
                      {report.windowDiag.rateLimitStopped && <p className="text-amber-600 font-semibold">⚠ Coleta interrompida por rate limit do provider.</p>}
                      <p><span className="font-semibold text-gray-700">Auth mode:</span> {report.windowDiag.authMode}</p>
                      <p><span className="font-semibold text-gray-700">Tempo de coleta:</span> {report.windowDiag.executionMs}ms</p>
                    </div>
                  </>
                )}

                {report.pagination && (
                  <>
                    <div className="pt-1 border-t border-gray-50">
                      <p className="font-semibold text-gray-700 mb-1">Paginação</p>
                    </div>
                    <p><span className="font-semibold text-gray-700">Modo:</span> {report.pagination.paginationMode}</p>
                    <p>
                      <span className="font-semibold text-gray-700">Convenção usada:</span>{" "}
                      {report.pagination.conventionUsed}
                      {" · "}
                      <span className="text-amber-600">não verificada</span>
                    </p>
                    {report.pagination.pagesFetched > 0 && <p><span className="font-semibold text-gray-700">Requisições:</span> {report.pagination.pagesFetched}</p>}
                    {report.pagination.providerReportedTotalRaw !== null && (
                      <p>
                        <span className="font-semibold text-gray-700">Total reportado:</span>{" "}
                        {report.pagination.providerReportedTotalRaw}
                        {" · "}
                        <span className={`font-semibold ${report.pagination.providerTotalScope === "filtered_period" ? "text-emerald-600" : "text-amber-600"}`}>
                          escopo: {report.pagination.providerTotalScope ?? "unknown"}
                        </span>
                      </p>
                    )}
                    {report.pagination.hasMore && <p className="text-amber-600 font-semibold">⚠ Há mais pedidos além do retornado.</p>}
                    {report.pagination.dedup && (
                      <p>
                        <span className="font-semibold text-gray-700">Dedup:</span>{" "}
                        {report.pagination.dedup.uniqueCount} únicos de {report.pagination.dedup.rawCount} brutos
                        {report.pagination.dedup.duplicateCount > 0 && ` · ${report.pagination.dedup.duplicateCount} removidos`}
                        {report.pagination.dedup.missingIdCount > 0 && ` · ${report.pagination.dedup.missingIdCount} sem ID`}
                      </p>
                    )}
                  </>
                )}
                {report.debugShape && (
                  <>
                    <p><span className="font-semibold text-gray-700">Formato da resposta:</span> {report.debugShape.topLevelType} · chave: {report.debugShape.listKeyUsed}</p>
                    <p><span className="font-semibold text-gray-700">Itens/produtos disponíveis:</span> {report.topItemsUnavailable ? "Não" : "Sim"}</p>
                    {report.debugShape.firstOrderKeys.length > 0 && (
                      <p><span className="font-semibold text-gray-700">Campos do pedido:</span> {report.debugShape.firstOrderKeys.join(", ")}</p>
                    )}
                  </>
                )}
                {report.snapshotPersistence && (
                  <p className={
                    report.snapshotPersistence === "saved"             ? "text-emerald-600"
                    : report.snapshotPersistence === "error"           ? "text-red-500"
                    : report.snapshotPersistence === "skipped_incomplete" ? "text-amber-600"
                    : "text-gray-400"
                  }>
                    <span className="font-semibold">Snapshot:</span>{" "}
                    {report.snapshotPersistence === "saved"              && "Salvo com sucesso"}
                    {report.snapshotPersistence === "not_configured"     && "Tabela não configurada"}
                    {report.snapshotPersistence === "skipped"            && "Ignorado (sem dados)"}
                    {report.snapshotPersistence === "skipped_incomplete" && "Não salvo — coleta incompleta"}
                    {report.snapshotPersistence === "error"              && "Erro ao salvar snapshot"}
                  </p>
                )}

                {/* Botão copiar diagnóstico */}
                <div className="pt-2 border-t border-gray-50">
                  <button
                    onClick={() => {
                      const lines: string[] = [
                        `Diagnóstico OlaClick — ${new Date().toISOString()}`,
                        `Endpoint: /v1/orders`,
                        `Período: ${PERIODS.find(p => p.value === period)?.label ?? period}`,
                        `Pedidos únicos: ${report.total_pedidos}`,
                        `Completude: ${report.completeness ?? "—"}`,
                      ];
                      if (report.windowDiag) {
                        lines.push(`Coleta: ${report.windowDiag.uniqueCount} únicos de ${report.windowDiag.targetTotal ?? "?"} informados`);
                        lines.push(`Janelas: ${report.windowDiag.totalWindows} total, ${report.windowDiag.resolvedWindows} resolvidas, ${report.windowDiag.partialWindows} parciais`);
                        lines.push(`Fallback paginação: ${report.windowDiag.paginationFallbackReason}`);
                        lines.push(`Datetime ISO suportado: ${report.windowDiag.datetimeFiltersSupported ?? "?"}`);
                        lines.push(`Fallback diário: ${report.windowDiag.dailyFallbackUsed}`);
                        lines.push(`Requisições: ${report.windowDiag.requestsMade}`);
                        lines.push(`Dedup: ${report.windowDiag.rawCount} brutos → ${report.windowDiag.uniqueCount} únicos (${report.windowDiag.duplicateCount} removidos)`);
                        lines.push(`Rate limit parou: ${report.windowDiag.rateLimitStopped}`);
                        lines.push(`Tempo: ${report.windowDiag.executionMs}ms`);
                      }
                      if (report.pagination) {
                        lines.push(`Modo paginação: ${report.pagination.paginationMode}`);
                        lines.push(`Total provider: ${report.pagination.providerReportedTotalRaw ?? "—"} (escopo: ${report.pagination.providerTotalScope ?? "—"})`);
                      }
                      void navigator.clipboard.writeText(lines.join("\n")).then(() => {
                        alert("Diagnóstico sanitizado copiado.");
                      });
                    }}
                    className="text-[10px] text-indigo-500 hover:text-indigo-700 underline"
                  >
                    Copiar diagnóstico para suporte
                  </button>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-gray-300 pt-1">
                  <Clock className="w-3 h-3" /> Última sincronização: {fmtDate(lastSync)}
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
