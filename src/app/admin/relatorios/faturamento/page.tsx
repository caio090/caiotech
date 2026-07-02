"use client";
import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import {
  ShoppingCart, RefreshCw, Loader2, AlertCircle, CheckCircle2,
  TrendingUp, DollarSign, Clock, Building2, CalendarDays,
  Link2, ChevronDown,
} from "lucide-react";
import Link from "next/link";

type PeriodKey = "hoje" | "7dias" | "30dias" | "mes_atual";
const PERIODS: { value: PeriodKey; label: string }[] = [
  { value: "hoje",      label: "Hoje"         },
  { value: "7dias",     label: "Últimos 7 dias"},
  { value: "30dias",    label: "Últimos 30 dias"},
  { value: "mes_atual", label: "Mês atual"     },
];

interface ClientOption { id: string; company_name: string }

interface OlaClickStatus {
  ok: boolean;
  configured?: boolean;
  reason?: string;
  message?: string;
  connection?: {
    id: string;
    connection_name?: string | null;
    token_last_four?: string | null;
    last_sync_at?: string | null;
    client_id?: string | null;
  } | null;
}

interface OrdersResult {
  ok: boolean;
  configured?: boolean;
  reason?: string;
  message?: string;
  data?: unknown;
}

interface ReportData {
  faturamento_total: number | null;
  total_pedidos: number | null;
  ticket_medio: number | null;
  pedidos_por_status: Record<string, number> | null;
  produtos_mais_vendidos: { name: string; qty: number }[] | null;
}

function fmtBRL(v: number | null) {
  if (v === null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return "—"; }
}

function StatCard({ icon: Icon, label, value, color = "bg-indigo-50 text-indigo-600" }: {
  icon: React.ElementType; label: string; value: string; color?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-xl font-black text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function FaturamentoPage() {
  const [clients,       setClients]       = useState<ClientOption[]>([]);
  const [clientId,      setClientId]      = useState("");
  const [period,        setPeriod]        = useState<PeriodKey>("7dias");
  const [status,        setStatus]        = useState<OlaClickStatus | null>(null);
  const [report,        setReport]        = useState<ReportData | null>(null);
  const [loading,       setLoading]       = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [lastSync,      setLastSync]      = useState<string | null>(null);
  const [envStatus,     setEnvStatus]     = useState<{ hasBaseUrl: boolean } | null>(null);

  // Carrega env-status ao montar
  useEffect(() => {
    void fetch("/api/olaclick/env-status")
      .then((r) => r.json())
      .then((d: { ok: boolean; hasBaseUrl?: boolean }) => { if (d.ok) setEnvStatus({ hasBaseUrl: d.hasBaseUrl ?? false }); })
      .catch(() => undefined);
  }, []);

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

  // Carrega status da conexão OláClick
  const loadStatus = useCallback(async (cid: string) => {
    if (!cid) return;
    setLoadingStatus(true);
    setStatus(null);
    try {
      const r = await fetch(`/api/olaclick/status?client_id=${cid}`);
      const d = await r.json() as OlaClickStatus;
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

  // Carrega pedidos/faturamento
  const loadReport = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const r = await fetch(`/api/olaclick/orders?client_id=${clientId}&period=${period}`);
      const d = await r.json() as OrdersResult;

      if (!d.ok) {
        if (d.reason === "sql_pending") {
          setError("SQL 39 pendente. Rode docs/supabase/39-olaclick-connections.sql no Supabase.");
        } else if (d.reason === "not_connected") {
          setError("Cliente sem conexão OláClick ativa. Conecte em Conexões > Cardápio Digital.");
        } else if (d.reason === "base_url_missing" || d.reason === "env_missing" || d.configured === false) {
          setError("URL da API do provedor não configurada para este cliente. Edite a conexão em /admin/conexoes e preencha o campo 'URL da API do provedor'.");
        } else if (d.reason === "api_error") {
          setError("Não foi possível buscar dados do OláClick. Verifique token, cliente e endpoint.");
        } else {
          setError(d.message ?? "Não foi possível buscar dados do OláClick. Verifique token, cliente e endpoint.");
        }
        return;
      }

      // A API retorna dados brutos do OláClick — parsear conforme endpoint real
      // Por ora, exibe o que vier disponível
      const raw = d.data as Record<string, unknown> | null | undefined;
      setReport({
        faturamento_total:    typeof raw?.total_amount === "number" ? raw.total_amount : null,
        total_pedidos:        typeof raw?.total_orders === "number" ? raw.total_orders : null,
        ticket_medio:         (typeof raw?.total_amount === "number" && typeof raw?.total_orders === "number" && raw.total_orders > 0)
                                ? raw.total_amount / raw.total_orders : null,
        pedidos_por_status:   (raw?.orders_by_status && typeof raw.orders_by_status === "object")
                                ? raw.orders_by_status as Record<string, number> : null,
        produtos_mais_vendidos: Array.isArray(raw?.top_products)
                                ? (raw.top_products as { name: string; qty: number }[]).slice(0, 5) : null,
      });
      setLastSync(new Date().toISOString());
    } catch {
      setError("Erro de rede ao buscar faturamento. Verifique conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [clientId, period]);

  const selectedClient = clients.find((c) => c.id === clientId);
  const isConnected = status?.ok && status?.connection;

  return (
    <div>
      <PageHeader
        title="Faturamento"
        description="Relatório comercial via OláClick"
      >
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
      <div className="mb-5 flex flex-wrap gap-3">
        {/* Cliente */}
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="pl-8 pr-8 py-2 text-sm border border-gray-200 bg-white rounded-xl outline-none focus:border-indigo-300 appearance-none"
          >
            {clients.length === 0 && <option value="">Sem clientes</option>}
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.company_name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>

        {/* Período */}
        <div className="relative">
          <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodKey)}
            className="pl-8 pr-8 py-2 text-sm border border-gray-200 bg-white rounded-xl outline-none focus:border-indigo-300 appearance-none"
          >
            {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Status da conexão */}
      <div className={`mb-5 flex items-start gap-2.5 p-3.5 rounded-xl border text-xs ${
        loadingStatus ? "bg-gray-50 border-gray-100 text-gray-500" :
        isConnected   ? "bg-emerald-50 border-emerald-100 text-emerald-700" :
                        "bg-amber-50 border-amber-100 text-amber-700"
      }`}>
        {loadingStatus ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" /> Verificando conexão OláClick…</>
        ) : isConnected ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Conectado</span>
              {status.connection?.connection_name && <span> · {status.connection.connection_name}</span>}
              {status.connection?.token_last_four && <span className="font-mono ml-1">…{status.connection.token_last_four}</span>}
              {lastSync && <span className="ml-2 text-emerald-600">· Última sync: {fmtDate(lastSync)}</span>}
            </div>
          </>
        ) : (
          <>
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">
                {selectedClient ? `${selectedClient.company_name} sem conexão OláClick.` : "Selecione um cliente."}
              </span>{" "}
              <Link href="/admin/conexoes" className="underline font-bold">Conectar em Conexões →</Link>
            </div>
          </>
        )}
      </div>

      {/* Aviso de URL da API não configurada — orienta /admin/conexoes, não Vercel */}
      {isConnected && envStatus && !envStatus.hasBaseUrl && (
        <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-500" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-800">Integração conectada, mas URL da API não configurada</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded-full">Token: salvo ✓</span>
                <span className="text-[10px] bg-red-50 text-red-700 border border-red-100 px-1.5 py-0.5 rounded-full">URL da API: ausente ✗</span>
              </div>
              <p className="mt-1 text-amber-600">
                Edite a conexão em{" "}
                <Link href="/admin/conexoes" className="underline font-bold">Conexões → Cardápio Digital</Link>
                {" "}e preencha o campo <strong>URL da API do provedor</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="mb-5 flex items-start gap-2 p-3.5 rounded-xl bg-red-50 border border-red-100 text-xs text-red-700">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Empty state — sem conexão ou sem dados */}
      {!loading && !error && !report && isConnected && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <ShoppingCart className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-600 mb-1">Nenhum dado ainda</p>
          <p className="text-xs text-gray-400 mb-4">Clique em "Sincronizar" para buscar dados do período.</p>
          <button
            onClick={() => void loadReport()}
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            <RefreshCw className="w-4 h-4" /> Sincronizar agora
          </button>
        </div>
      )}

      {!isConnected && !loadingStatus && !error && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <Link2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-600 mb-1">Sem conexão OláClick</p>
          <p className="text-xs text-gray-400 mb-4">
            Conecte o cliente ao OláClick para ver o faturamento real.
          </p>
          <Link href="/admin/conexoes" className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800">
            <Link2 className="w-4 h-4" /> Ir para Conexões
          </Link>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" /> Buscando dados do OláClick…
        </div>
      )}

      {/* Report cards */}
      {report && !loading && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={DollarSign}   label="Faturamento total" value={fmtBRL(report.faturamento_total)}  color="bg-emerald-50 text-emerald-600" />
            <StatCard icon={ShoppingCart} label="Total de pedidos"  value={report.total_pedidos !== null ? String(report.total_pedidos) : "—"} color="bg-blue-50 text-blue-600" />
            <StatCard icon={TrendingUp}   label="Ticket médio"      value={fmtBRL(report.ticket_medio)}       color="bg-violet-50 text-violet-600" />
          </div>

          {report.pedidos_por_status && Object.keys(report.pedidos_por_status).length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-sm font-bold text-gray-900 mb-3">Pedidos por status</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(report.pedidos_por_status).map(([s, qty]) => (
                  <div key={s} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-black text-gray-900">{qty}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5 capitalize">{s.replace(/_/g, " ")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.produtos_mais_vendidos && report.produtos_mais_vendidos.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-sm font-bold text-gray-900 mb-3">Produtos mais vendidos</p>
              <div className="space-y-2">
                {report.produtos_mais_vendidos.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 truncate flex-1">{p.name}</span>
                    <span className="font-bold text-gray-900 ml-3 flex-shrink-0">{p.qty}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <Clock className="w-3 h-3" />
            Última sincronização: {fmtDate(lastSync)}
          </div>
        </div>
      )}
    </div>
  );
}
