"use client";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import {
  generateMarketingReportInsights,
  compareMetric,
  fmtPct,
  type MetricSet,
} from "@/lib/marketing-intelligence";
import {
  ArrowLeft, RefreshCw, Loader2, AlertCircle, CheckCircle2,
  Building2, ChevronDown, TrendingUp, TrendingDown,
  Users, Eye, MousePointerClick, BarChart3, Zap,
  ArrowUp, ArrowDown, Minus, Info, ExternalLink,
  Calendar, Clock,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ClientOption { id: string; company_name: string }

type TabKey = "overview" | "content" | "audience" | "engagement" | "insights" | "diagnostics";

type Period = "7d" | "15d" | "30d" | "custom";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview",    label: "Visão geral"  },
  { key: "content",     label: "Conteúdos"    },
  { key: "audience",    label: "Público"       },
  { key: "engagement",  label: "Engajamento"   },
  { key: "insights",    label: "Insights"      },
  { key: "diagnostics", label: "Diagnóstico"   },
];

const PERIOD_LABELS: Record<Period, string> = {
  "7d":     "7 dias",
  "15d":    "15 dias",
  "30d":    "30 dias",
  "custom": "Personalizado",
};

interface AdvancedItem { label: string; value: number }

interface InsightsResponse {
  ok:               boolean;
  assetType?:       string;
  assetId?:         string;
  username?:        string;
  period?:          string;
  since?:           number;
  until?:           number;
  metrics?: {
    reach?:           number | null;
    views?:           number | null;
    profile_views?:   number | null;
    website_clicks?:  number | null;
    followers_count?: number | null;
    page_impressions?: number | null;
    page_reach?:      number | null;
  };
  availableMetrics?:   string[];
  unavailableMetrics?: Array<{ metric: string; metricUnavailable: boolean; reason: string }>;
  endpoint?:           string;
  reason?:             string;
  safeMessage?:        string;
  graphErrorCode?:     number | null;
  graphErrorMessage?:  string;
  missingPermissionsLikely?: string[];
  advanced?: {
    demographics?: { gender?: AdvancedItem[]; age?: AdvancedItem[] };
    locations?:    { cities?: AdvancedItem[]; countries?: AdvancedItem[] };
    activity?:     { onlineFollowersByHour?: AdvancedItem[] };
    unavailable?:  string[];
  };
}

interface StatusResponse {
  ok:               boolean;
  hasLinkedAsset?:  boolean;
  assetType?:       string;
  username?:        string;
  canAttemptInsights?: boolean;
  safeMessage?:     string;
  scopes?:          string[];
  connectionId?:    string;
  connectionStatus?: string;
  allAssets?:       Array<{ assetType: string; assetId: string; username: string | null }>;
}

// ── Utilities ──────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString("pt-BR");
}

function prevPeriodDates(period: Period, start: string, end: string): { start: string; end: string } {
  if (period === "custom" && start && end) {
    const s = new Date(start + "T00:00:00");
    const e = new Date(end   + "T00:00:00");
    const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
    const ps = new Date(s); ps.setDate(ps.getDate() - days);
    const pe = new Date(e); pe.setDate(pe.getDate() - days);
    return { start: ps.toISOString().slice(0, 10), end: pe.toISOString().slice(0, 10) };
  }
  const days = period === "7d" ? 7 : period === "15d" ? 15 : 30;
  const today = new Date();
  const pe = new Date(today); pe.setDate(pe.getDate() - days);
  const ps = new Date(today); ps.setDate(ps.getDate() - days * 2);
  return { start: ps.toISOString().slice(0, 10), end: pe.toISOString().slice(0, 10) };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function MetricCard({
  label, value, icon: Icon, prev, neutral,
}: {
  label: string; value: string; icon: React.ElementType;
  prev?: number | null; neutral?: boolean;
}) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--lk-border)", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Icon size={13} style={{ color: "var(--lk-muted)" }} />
        <span style={{ fontSize: 10, color: "var(--lk-muted)", fontWeight: 500 }}>{label}</span>
      </div>
      <p style={{ fontSize: 22, fontWeight: 800, color: "var(--lk-text)", letterSpacing: "-0.02em", lineHeight: 1 }}>
        {value}
      </p>
      {prev !== undefined && prev !== null && value !== "—" && (
        <p style={{ fontSize: 10, color: "var(--lk-muted)", marginTop: 4 }}>
          Anterior: {fmt(prev)}
        </p>
      )}
    </div>
  );
}

function DeltaBadge({ n, neutral }: { n: number | null | undefined; neutral?: boolean }) {
  if (n == null) return null;
  const isUp = n > 0;
  const isDown = n < 0;
  const Icon = isUp ? ArrowUp : isDown ? ArrowDown : Minus;
  const color = neutral ? (isUp ? "#fbbf24" : isDown ? "#fbbf24" : "var(--lk-muted)") :
    isUp ? "#34d399" : isDown ? "#f87171" : "var(--lk-muted)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 10, color, fontWeight: 700 }}>
      <Icon size={10} />
      {Math.abs(n).toFixed(1)}%
    </span>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <p style={{ fontSize: 10, color: "var(--lk-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 12 }}>
      {title}
    </p>
  );
}

function EmptyMetric({ label }: { label: string }) {
  return (
    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
      {label}
    </p>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function RelatorioConteudoPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const pathname     = usePathname();

  const [clients,     setClients]     = useState<ClientOption[]>([]);
  const [status,      setStatus]      = useState<StatusResponse | null>(null);
  const [insights,    setInsights]    = useState<InsightsResponse | null>(null);
  const [prevInsights, setPrevInsights] = useState<InsightsResponse | null>(null);
  const [loadingStatus,   setLoadingStatus]   = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [showComparison,    setShowComparison]    = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd,   setCustomEnd]   = useState("");

  const clientId  = searchParams.get("client") ?? "";
  const period    = (searchParams.get("period") as Period | null) ?? "7d";
  const activeTab = (searchParams.get("tab") as TabKey | null) ?? "overview";
  const urlStart  = searchParams.get("start") ?? "";
  const urlEnd    = searchParams.get("end")   ?? "";

  // Sync custom dates with URL
  useEffect(() => {
    if (urlStart) setCustomStart(urlStart);
    if (urlEnd)   setCustomEnd(urlEnd);
  }, [urlStart, urlEnd]);

  const abortRef = useRef<AbortController | null>(null);

  const updateParam = useCallback(
    (updates: Record<string, string | null>) => {
      const p = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") { p.delete(key); } else { p.set(key, value); }
      }
      router.replace(`${pathname}?${p.toString()}`);
    },
    [searchParams, router, pathname],
  );

  const setActiveTab = (tab: TabKey) => updateParam({ tab: tab === "overview" ? null : tab });
  const setPeriod = (p: Period) => updateParam({ period: p === "7d" ? null : p, start: null, end: null });

  // Load client list
  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/admin/clients");
        if (!r.ok) return;
        const d = await r.json() as { clients?: ClientOption[] };
        setClients(d.clients ?? []);
      } catch { /* silent */ }
    })();
  }, []);

  // Load status when client changes
  useEffect(() => {
    if (!clientId) { setStatus(null); setInsights(null); setPrevInsights(null); return; }
    let active = true;
    setLoadingStatus(true);
    setStatus(null); setInsights(null); setPrevInsights(null); setShowComparison(false);
    fetch(`/api/meta/insights/status?client_id=${clientId}`)
      .then((r) => r.json())
      .then((d: StatusResponse) => { if (active) setStatus(d); })
      .catch(() => { if (active) setStatus({ ok: false, safeMessage: "Erro ao verificar conexão Meta." }); })
      .finally(() => { if (active) setLoadingStatus(false); });
    return () => { active = false; };
  }, [clientId]);

  // Load insights when status ok + period changes
  const fetchInsights = useCallback(() => {
    if (!clientId || !status?.canAttemptInsights) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoadingInsights(true);
    setInsights(null);
    let url = `/api/meta/insights?client_id=${clientId}&period=${period}`;
    if (period === "custom" && customStart && customEnd) {
      url += `&start_date=${customStart}&end_date=${customEnd}`;
    }
    fetch(url, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: InsightsResponse) => setInsights(d))
      .catch((e) => { if ((e as Error).name !== "AbortError") setInsights({ ok: false, reason: "fetch_error", safeMessage: "Erro ao buscar insights." }); })
      .finally(() => setLoadingInsights(false));
  }, [clientId, period, customStart, customEnd, status]);

  useEffect(() => {
    if (status?.canAttemptInsights) fetchInsights();
    else { setInsights(null); }
  }, [fetchInsights, status]);

  // Load comparison (previous period) on demand
  const loadComparison = useCallback(() => {
    if (!clientId || !status?.canAttemptInsights) return;
    setLoadingComparison(true);
    setPrevInsights(null);
    const prev = prevPeriodDates(period, customStart || urlStart, customEnd || urlEnd);
    const url = `/api/meta/insights?client_id=${clientId}&period=custom&start_date=${prev.start}&end_date=${prev.end}`;
    fetch(url)
      .then((r) => r.json())
      .then((d: InsightsResponse) => setPrevInsights(d))
      .catch(() => setPrevInsights({ ok: false, reason: "fetch_error" }))
      .finally(() => setLoadingComparison(false));
  }, [clientId, period, customStart, customEnd, urlStart, urlEnd, status]);

  const handleCompare = () => {
    setShowComparison(true);
    loadComparison();
  };

  const selectedClient = clients.find((c) => c.id === clientId);
  const metrics = insights?.metrics ?? null;
  const prevMetrics = prevInsights?.metrics ?? null;

  const reach      = metrics?.reach      ?? metrics?.page_reach       ?? null;
  const views      = metrics?.views      ?? metrics?.page_impressions  ?? null;
  const clicks     = metrics?.website_clicks ?? null;
  const profViews  = metrics?.profile_views  ?? null;
  const followers  = metrics?.followers_count ?? null;

  const prevReach   = prevMetrics?.reach      ?? prevMetrics?.page_reach      ?? null;
  const prevViews   = prevMetrics?.views      ?? prevMetrics?.page_impressions ?? null;
  const prevClicks  = prevMetrics?.website_clicks ?? null;
  const prevFollow  = prevMetrics?.followers_count ?? null;

  const reachCmp   = compareMetric(reach,    prevReach);
  const viewsCmp   = compareMetric(views,    prevViews);
  const clicksCmp  = compareMetric(clicks,   prevClicks);
  const followCmp  = compareMetric(followers, prevFollow);

  // Generate deterministic insights whenever metrics change
  const marketingInsights = (insights?.ok && metrics)
    ? generateMarketingReportInsights({
        currentMetrics:  metrics,
        previousMetrics: prevInsights?.ok ? prevMetrics : null,
        period,
        clientName:      selectedClient?.company_name,
        assetType:       insights.assetType as "instagram_business" | "facebook_page" | undefined,
      })
    : null;

  const recOsHref = `/admin/contentos/insights${clientId ? `?client=${clientId}&range=${period}` : ""}`;

  return (
    <div style={{ maxWidth: 1200, width: "100%" }}>
      <style>{`
        .cr-tabs {
          display: flex; overflow-x: auto; overflow-y: hidden;
          scrollbar-width: none; -ms-overflow-style: none;
          border-bottom: 1px solid var(--lk-border); margin-bottom: 24px; gap: 2px;
        }
        .cr-tabs::-webkit-scrollbar { display: none; }
      `}</style>

      <PageHeader title="Relatório de Conteúdo" description="Performance de conteúdo e redes sociais">
        <Link
          href="/admin/relatorios"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--lk-muted)", border: "1px solid var(--lk-border)", borderRadius: 10, padding: "7px 12px", textDecoration: "none" }}
        >
          <ArrowLeft size={13} /> Relatórios
        </Link>
      </PageHeader>

      {/* ── Controls row ── */}
      <div style={{ marginBottom: 20, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
        {/* Client selector */}
        <div style={{ position: "relative" }}>
          <Building2 style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "var(--lk-muted)", pointerEvents: "none" }} />
          <select
            value={clientId}
            onChange={(e) => updateParam({ client: e.target.value || null, tab: null })}
            style={{ paddingLeft: 28, paddingRight: 28, paddingTop: 8, paddingBottom: 8, fontSize: 13, background: "var(--lk-card)", color: "var(--lk-text)", border: "1px solid var(--lk-border)", borderRadius: 10, outline: "none", appearance: "none" }}
          >
            <option value="">Selecione um cliente…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.company_name}</option>
            ))}
          </select>
          <ChevronDown style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "var(--lk-muted)", pointerEvents: "none" }} />
        </div>

        {/* Period selector */}
        {clientId && (
          <div style={{ display: "flex", gap: 4 }}>
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 8,
                  background: period === p ? "var(--lk-accent)" : "transparent",
                  color: period === p ? "#fff" : "var(--lk-muted)",
                  border: `1px solid ${period === p ? "var(--lk-accent)" : "var(--lk-border)"}`,
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        )}

        {/* Custom dates */}
        {clientId && period === "custom" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
              style={{ fontSize: 12, border: "1px solid var(--lk-border)", borderRadius: 8, padding: "4px 8px", background: "var(--lk-card)", color: "var(--lk-text)", outline: "none" }} />
            <span style={{ fontSize: 11, color: "var(--lk-muted)" }}>até</span>
            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
              style={{ fontSize: 12, border: "1px solid var(--lk-border)", borderRadius: 8, padding: "4px 8px", background: "var(--lk-card)", color: "var(--lk-text)", outline: "none" }} />
          </div>
        )}

        <div style={{ flex: 1 }} />

        {clientId && insights?.ok && (
          <button
            onClick={fetchInsights}
            disabled={loadingInsights}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--lk-accent)", background: "transparent", border: "1px solid var(--lk-border)", borderRadius: 8, padding: "5px 10px", cursor: "pointer", opacity: loadingInsights ? 0.5 : 1 }}
          >
            <RefreshCw size={11} style={{ animation: loadingInsights ? "spin 0.8s linear infinite" : "none" }} />
            Atualizar
          </button>
        )}

        {clientId && (
          <Link href={recOsHref}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--lk-muted)", border: "1px solid var(--lk-border)", borderRadius: 8, padding: "5px 10px", textDecoration: "none" }}
          >
            <ExternalLink size={11} /> Abrir no REC OS
          </Link>
        )}
      </div>

      {/* No client */}
      {!clientId && (
        <div style={{ padding: "56px 24px", textAlign: "center", background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 18 }}>
          <Building2 style={{ width: 36, height: 36, color: "var(--lk-border)", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--lk-text)", marginBottom: 6 }}>Nenhum cliente selecionado</p>
          <p style={{ fontSize: 12, color: "var(--lk-muted)" }}>Selecione um cliente acima para ver o relatório de conteúdo.</p>
        </div>
      )}

      {clientId && (
        <>
          {/* Loading status */}
          {loadingStatus && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "rgba(123,110,246,0.07)", border: "1px solid rgba(123,110,246,0.18)", borderRadius: 10, marginBottom: 16 }}>
              <Loader2 size={12} style={{ color: "var(--lk-accent)", animation: "spin 0.8s linear infinite" }} />
              <span style={{ fontSize: 11, color: "var(--lk-accent)" }}>Verificando conexão Meta…</span>
            </div>
          )}

          {/* Not connected */}
          {!loadingStatus && status && !status.hasLinkedAsset && (
            <div style={{ padding: "24px 20px", background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 14, marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 12 }}>
              <AlertCircle size={16} style={{ color: "#fbbf24", flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--lk-text)", marginBottom: 4 }}>Este cliente ainda não possui Página ou Instagram vinculado.</p>
                <p style={{ fontSize: 12, color: "var(--lk-muted)", marginBottom: 10 }}>Acesse Conexões para vincular os ativos Meta deste cliente.</p>
                <Link href="/admin/conexoes"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--lk-accent)", border: "1px solid var(--lk-accent)", borderRadius: 8, padding: "5px 12px", textDecoration: "none" }}
                >
                  Ir para Conexões
                </Link>
              </div>
            </div>
          )}

          {/* Auth error */}
          {!loadingStatus && status && status.hasLinkedAsset && !status.canAttemptInsights && (
            <div style={{ padding: "16px 20px", background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 14, marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#f87171", marginBottom: 4 }}>A Meta não liberou acesso a esta métrica</p>
              <p style={{ fontSize: 12, color: "var(--lk-muted)" }}>{status.safeMessage}</p>
            </div>
          )}

          {/* Tabs */}
          {!loadingStatus && status?.canAttemptInsights && (
            <>
              <div className="cr-tabs">
                {TABS.map((tab) => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    style={{
                      fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 400,
                      color: activeTab === tab.key ? "var(--lk-accent)" : "var(--lk-muted)",
                      background: "transparent", border: "none", cursor: "pointer",
                      padding: "10px 14px",
                      borderBottom: activeTab === tab.key ? "2px solid var(--lk-accent)" : "2px solid transparent",
                      marginBottom: -1, transition: "color 0.15s", flexShrink: 0, whiteSpace: "nowrap",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ── Loading insights ── */}
              {loadingInsights && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "rgba(123,110,246,0.07)", border: "1px solid rgba(123,110,246,0.18)", borderRadius: 10, marginBottom: 16 }}>
                  <Loader2 size={12} style={{ color: "var(--lk-accent)", animation: "spin 0.8s linear infinite" }} />
                  <span style={{ fontSize: 11, color: "var(--lk-accent)" }}>Buscando dados Meta…</span>
                </div>
              )}

              {/* ── Insights error ── */}
              {!loadingInsights && insights && !insights.ok && (
                <div style={{ padding: "16px 20px", background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 14, marginBottom: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#f87171", marginBottom: 4 }}>Não foi possível atualizar os dados agora.</p>
                  <p style={{ fontSize: 12, color: "var(--lk-muted)" }}>{insights.safeMessage ?? insights.reason}</p>
                </div>
              )}

              {/* ══ TAB: Visão geral ═══════════════════════════════════════════ */}
              {activeTab === "overview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* Status badge */}
                  {insights?.ok && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 10 }}>
                      <CheckCircle2 size={13} style={{ color: "#34d399" }} />
                      <span style={{ fontSize: 12, color: "#34d399", fontWeight: 600 }}>Meta conectada</span>
                      {insights.username && <span style={{ fontSize: 11, color: "var(--lk-muted)" }}>· @{insights.username}</span>}
                      <div style={{ flex: 1 }} />
                      {/* Compare button */}
                      {!showComparison && (
                        <button
                          onClick={handleCompare}
                          disabled={loadingComparison}
                          style={{ fontSize: 11, color: "var(--lk-accent)", background: "transparent", border: "1px solid var(--lk-border)", borderRadius: 8, padding: "4px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                        >
                          {loadingComparison ? <Loader2 size={10} style={{ animation: "spin 0.8s linear infinite" }} /> : <BarChart3 size={10} />}
                          Comparar com período anterior
                        </button>
                      )}
                      {showComparison && loadingComparison && (
                        <span style={{ fontSize: 10, color: "var(--lk-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                          <Loader2 size={10} style={{ animation: "spin 0.8s linear infinite" }} /> Carregando comparação…
                        </span>
                      )}
                    </div>
                  )}

                  {/* Metric cards */}
                  {insights?.ok && metrics && (
                    <div style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14, padding: "18px 20px" }}>
                      <SectionHeader title="Métricas do período" />
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                        {reach !== null && (
                          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--lk-border)", borderRadius: 12, padding: "14px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                              <Eye size={12} style={{ color: "var(--lk-muted)" }} />
                              <span style={{ fontSize: 10, color: "var(--lk-muted)" }}>Alcance</span>
                              {showComparison && prevInsights?.ok && <DeltaBadge n={reachCmp.pctChange} />}
                            </div>
                            <p style={{ fontSize: 22, fontWeight: 800, color: "var(--lk-text)", letterSpacing: "-0.02em" }}>{fmt(reach)}</p>
                            {showComparison && prevReach !== null && <p style={{ fontSize: 10, color: "var(--lk-muted)", marginTop: 3 }}>Anterior: {fmt(prevReach)}</p>}
                          </div>
                        )}
                        {views !== null && (
                          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--lk-border)", borderRadius: 12, padding: "14px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                              <BarChart3 size={12} style={{ color: "var(--lk-muted)" }} />
                              <span style={{ fontSize: 10, color: "var(--lk-muted)" }}>Visualizações</span>
                              {showComparison && prevInsights?.ok && <DeltaBadge n={viewsCmp.pctChange} />}
                            </div>
                            <p style={{ fontSize: 22, fontWeight: 800, color: "var(--lk-text)", letterSpacing: "-0.02em" }}>{fmt(views)}</p>
                            {showComparison && prevViews !== null && <p style={{ fontSize: 10, color: "var(--lk-muted)", marginTop: 3 }}>Anterior: {fmt(prevViews)}</p>}
                          </div>
                        )}
                        {profViews !== null && (
                          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--lk-border)", borderRadius: 12, padding: "14px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                              <Users size={12} style={{ color: "var(--lk-muted)" }} />
                              <span style={{ fontSize: 10, color: "var(--lk-muted)" }}>Visitas ao perfil</span>
                            </div>
                            <p style={{ fontSize: 22, fontWeight: 800, color: "var(--lk-text)", letterSpacing: "-0.02em" }}>{fmt(profViews)}</p>
                          </div>
                        )}
                        {clicks !== null && (
                          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--lk-border)", borderRadius: 12, padding: "14px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                              <MousePointerClick size={12} style={{ color: "var(--lk-muted)" }} />
                              <span style={{ fontSize: 10, color: "var(--lk-muted)" }}>Cliques no site</span>
                              {showComparison && prevInsights?.ok && <DeltaBadge n={clicksCmp.pctChange} />}
                            </div>
                            <p style={{ fontSize: 22, fontWeight: 800, color: "var(--lk-text)", letterSpacing: "-0.02em" }}>{fmt(clicks)}</p>
                            {showComparison && prevClicks !== null && <p style={{ fontSize: 10, color: "var(--lk-muted)", marginTop: 3 }}>Anterior: {fmt(prevClicks)}</p>}
                          </div>
                        )}
                        {followers !== null && (
                          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--lk-border)", borderRadius: 12, padding: "14px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                              <TrendingUp size={12} style={{ color: "var(--lk-muted)" }} />
                              <span style={{ fontSize: 10, color: "var(--lk-muted)" }}>Seguidores</span>
                              {showComparison && prevInsights?.ok && <DeltaBadge n={followCmp.pctChange} />}
                            </div>
                            <p style={{ fontSize: 22, fontWeight: 800, color: "var(--lk-text)", letterSpacing: "-0.02em" }}>{fmt(followers)}</p>
                            {showComparison && prevFollow !== null && <p style={{ fontSize: 10, color: "var(--lk-muted)", marginTop: 3 }}>Anterior: {fmt(prevFollow)}</p>}
                          </div>
                        )}
                        {/* Unavailable metrics */}
                        {(insights.unavailableMetrics ?? []).map((m) => (
                          <div key={m.metric} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "14px 16px", opacity: 0.5 }}>
                            <p style={{ fontSize: 10, color: "var(--lk-muted)", marginBottom: 4 }}>{m.metric}</p>
                            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>Não disponível para este perfil ou período.</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Attribution disclaimer */}
                  {insights?.ok && (
                    <div style={{ padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--lk-border)", borderRadius: 10, display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <Info size={12} style={{ color: "var(--lk-muted)", flexShrink: 0, marginTop: 1 }} />
                      <p style={{ fontSize: 11, color: "var(--lk-muted)" }}>
                        Os dados de conteúdo e vendas representam o mesmo período. Atribuição direta exige cupom, UTM ou link rastreável.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ══ TAB: Conteúdos ══════════════════════════════════════════════ */}
              {activeTab === "content" && (
                <div style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14, padding: "18px 20px" }}>
                  <SectionHeader title="Conteúdos do período" />
                  <div style={{ padding: "32px 0", textAlign: "center" }}>
                    <Clock size={28} style={{ color: "var(--lk-border)", margin: "0 auto 10px" }} />
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--lk-muted)", marginBottom: 4 }}>Dados de posts individuais não disponíveis</p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", maxWidth: 400, margin: "0 auto" }}>
                      Métricas por post (alcance, curtidas, comentários, compartilhamentos) exigem acesso ao endpoint de mídia do Instagram. Disponível em versão futura.
                    </p>
                  </div>
                  <div style={{ marginTop: 16, padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--lk-border)", borderRadius: 10 }}>
                    <p style={{ fontSize: 11, color: "var(--lk-muted)" }}>
                      <span style={{ fontWeight: 600, color: "var(--lk-text)" }}>Disponível agora:</span>{" "}
                      Alcance, visualizações, visitas ao perfil e cliques no site (conta nível) na aba Visão geral.
                    </p>
                  </div>
                </div>
              )}

              {/* ══ TAB: Público ════════════════════════════════════════════════ */}
              {activeTab === "audience" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {insights?.ok && insights.advanced ? (
                    <>
                      {/* Followers */}
                      {followers !== null && (
                        <div style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14, padding: "18px 20px" }}>
                          <SectionHeader title="Base de seguidores" />
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                            <MetricCard label="Seguidores" value={fmt(followers)} icon={Users} prev={showComparison ? prevFollow : undefined} />
                            {reach !== null && <MetricCard label="Alcance" value={fmt(reach)} icon={Eye} prev={showComparison ? prevReach : undefined} />}
                          </div>
                        </div>
                      )}

                      {/* Demographics */}
                      {(insights.advanced.demographics?.gender || insights.advanced.demographics?.age) && (
                        <div style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14, padding: "18px 20px" }}>
                          <SectionHeader title="Demograficos" />
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                            {insights.advanced.demographics.gender && (
                              <div>
                                <p style={{ fontSize: 10, color: "var(--lk-muted)", fontWeight: 600, marginBottom: 8 }}>GÊNERO</p>
                                {insights.advanced.demographics.gender.map((item) => {
                                  const total = (insights.advanced?.demographics?.gender ?? []).reduce((s, i) => s + i.value, 0);
                                  const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                                  return (
                                    <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                      <span style={{ fontSize: 11, color: "var(--lk-muted)", minWidth: 24 }}>{item.label === "F" ? "F" : item.label === "M" ? "M" : item.label}</span>
                                      <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                                        <div style={{ width: `${pct}%`, height: "100%", background: "var(--lk-accent)", borderRadius: 3 }} />
                                      </div>
                                      <span style={{ fontSize: 10, color: "var(--lk-muted)", minWidth: 28, textAlign: "right" }}>{pct}%</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {insights.advanced.demographics.age && (
                              <div>
                                <p style={{ fontSize: 10, color: "var(--lk-muted)", fontWeight: 600, marginBottom: 8 }}>FAIXA ETÁRIA</p>
                                {insights.advanced.demographics.age.slice(0, 6).map((item) => {
                                  const total = (insights.advanced?.demographics?.age ?? []).reduce((s, i) => s + i.value, 0);
                                  const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                                  return (
                                    <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                      <span style={{ fontSize: 10, color: "var(--lk-muted)", minWidth: 32 }}>{item.label}</span>
                                      <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                                        <div style={{ width: `${pct}%`, height: "100%", background: "#a78bfa", borderRadius: 3 }} />
                                      </div>
                                      <span style={{ fontSize: 10, color: "var(--lk-muted)", minWidth: 28, textAlign: "right" }}>{pct}%</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Locations */}
                      {(insights.advanced.locations?.cities || insights.advanced.locations?.countries) && (
                        <div style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14, padding: "18px 20px" }}>
                          <SectionHeader title="Localização" />
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                            {insights.advanced.locations.cities && (
                              <div>
                                <p style={{ fontSize: 10, color: "var(--lk-muted)", fontWeight: 600, marginBottom: 8 }}>CIDADES</p>
                                {insights.advanced.locations.cities.map((item) => (
                                  <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                                    <span style={{ fontSize: 11, color: "var(--lk-text)" }}>{item.label}</span>
                                    <span style={{ fontSize: 10, color: "var(--lk-muted)", fontWeight: 600 }}>{fmt(item.value)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {insights.advanced.locations.countries && (
                              <div>
                                <p style={{ fontSize: 10, color: "var(--lk-muted)", fontWeight: 600, marginBottom: 8 }}>PAÍSES</p>
                                {insights.advanced.locations.countries.map((item) => (
                                  <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                                    <span style={{ fontSize: 11, color: "var(--lk-text)" }}>{item.label}</span>
                                    <span style={{ fontSize: 10, color: "var(--lk-muted)", fontWeight: 600 }}>{fmt(item.value)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Activity */}
                      {insights.advanced.activity?.onlineFollowersByHour && (
                        <div style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14, padding: "18px 20px" }}>
                          <SectionHeader title="Horários de maior atividade" />
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {insights.advanced.activity.onlineFollowersByHour.map((item) => (
                              <div key={item.label} style={{ textAlign: "center", padding: "8px 10px", background: "rgba(123,110,246,0.1)", border: "1px solid rgba(123,110,246,0.2)", borderRadius: 8 }}>
                                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--lk-accent)" }}>{item.label}</p>
                                <p style={{ fontSize: 10, color: "var(--lk-muted)" }}>{fmt(item.value)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Unavailable advanced */}
                      {(insights.advanced.unavailable ?? []).length > 0 && (
                        <div style={{ padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--lk-border)", borderRadius: 10, display: "flex", alignItems: "flex-start", gap: 8 }}>
                          <Info size={12} style={{ color: "var(--lk-muted)", flexShrink: 0, marginTop: 1 }} />
                          <p style={{ fontSize: 11, color: "var(--lk-muted)" }}>
                            Não disponível para este perfil ou período: {insights.advanced.unavailable?.join(", ")}.
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14, padding: "32px 20px", textAlign: "center" }}>
                      <Users size={28} style={{ color: "var(--lk-border)", margin: "0 auto 10px" }} />
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--lk-muted)", marginBottom: 4 }}>
                        {!insights ? "Aguardando dados…" : "Dados de público não disponíveis para este perfil ou período."}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ══ TAB: Engajamento ════════════════════════════════════════════ */}
              {activeTab === "engagement" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14, padding: "18px 20px" }}>
                    <SectionHeader title="Métricas de engajamento" />
                    {insights?.ok && metrics ? (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 16 }}>
                          {profViews !== null && (
                            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--lk-border)", borderRadius: 12, padding: "14px 16px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                                <Users size={12} style={{ color: "var(--lk-muted)" }} />
                                <span style={{ fontSize: 10, color: "var(--lk-muted)" }}>Visitas ao perfil</span>
                              </div>
                              <p style={{ fontSize: 22, fontWeight: 800, color: "var(--lk-text)", letterSpacing: "-0.02em" }}>{fmt(profViews)}</p>
                              {reach !== null && reach > 0 && <p style={{ fontSize: 10, color: "var(--lk-muted)", marginTop: 3 }}>{((profViews / reach) * 100).toFixed(1)}% do alcance</p>}
                            </div>
                          )}
                          {clicks !== null && (
                            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--lk-border)", borderRadius: 12, padding: "14px 16px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                                <MousePointerClick size={12} style={{ color: "var(--lk-muted)" }} />
                                <span style={{ fontSize: 10, color: "var(--lk-muted)" }}>Cliques no site</span>
                                {showComparison && prevInsights?.ok && <DeltaBadge n={clicksCmp.pctChange} />}
                              </div>
                              <p style={{ fontSize: 22, fontWeight: 800, color: "var(--lk-text)", letterSpacing: "-0.02em" }}>{fmt(clicks)}</p>
                              {profViews !== null && profViews > 0 && <p style={{ fontSize: 10, color: "var(--lk-muted)", marginTop: 3 }}>{((clicks / profViews) * 100).toFixed(1)}% das visitas ao perfil</p>}
                            </div>
                          )}
                        </div>

                        <div style={{ padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--lk-border)", borderRadius: 10 }}>
                          <p style={{ fontSize: 11, color: "var(--lk-muted)" }}>
                            Métricas por post (curtidas, comentários, compartilhamentos, salvamentos) exigem acesso ao endpoint de mídia. Disponível em versão futura.
                          </p>
                        </div>
                      </>
                    ) : (
                      <EmptyMetric label="Aguardando dados ou sem métricas disponíveis para este período." />
                    )}
                  </div>

                  {/* Comparison summary */}
                  {showComparison && prevInsights?.ok && (
                    <div style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14, padding: "18px 20px" }}>
                      <SectionHeader title="Comparação com período anterior" />
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {[
                          { label: "Alcance",        cmp: reachCmp,  neutral: false },
                          { label: "Visualizações",  cmp: viewsCmp,  neutral: false },
                          { label: "Cliques no site", cmp: clicksCmp, neutral: false },
                          { label: "Seguidores",     cmp: followCmp, neutral: false },
                        ].filter(({ cmp }) => cmp.direction !== "unavailable").map(({ label, cmp, neutral }) => {
                          const Icon = cmp.direction === "up" ? ArrowUp : cmp.direction === "down" ? TrendingDown : Minus;
                          const color = neutral ? "var(--lk-muted)" : cmp.direction === "up" ? "#34d399" : cmp.direction === "down" ? "#f87171" : "var(--lk-muted)";
                          return (
                            <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--lk-border)" }}>
                              <span style={{ fontSize: 12, color: "var(--lk-muted)" }}>{label}</span>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 11, color: "var(--lk-muted)" }}>{fmt(cmp.previous)} → {fmt(cmp.current)}</span>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 11, color, fontWeight: 700 }}>
                                  <Icon size={11} />
                                  {cmp.fromZero ? "Novo" : cmp.pctChange !== null ? `${cmp.pctChange >= 0 ? "+" : ""}${cmp.pctChange.toFixed(1)}%` : "—"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ══ TAB: Insights ════════════════════════════════════════════════ */}
              {activeTab === "insights" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {marketingInsights ? (
                    <>
                      {/* Highlights */}
                      {marketingInsights.highlights.length > 0 && (
                        <div style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14, padding: "18px 20px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                            <TrendingUp size={13} style={{ color: "#34d399" }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--lk-text)" }}>Destaques</span>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {marketingInsights.highlights.map((h, i) => (
                              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px", background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.15)", borderRadius: 10 }}>
                                <CheckCircle2 size={12} style={{ color: "#34d399", flexShrink: 0, marginTop: 2 }} />
                                <p style={{ fontSize: 12, color: "var(--lk-text)", lineHeight: 1.5 }}>{h}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Warnings */}
                      {marketingInsights.warnings.length > 0 && (
                        <div style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14, padding: "18px 20px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                            <AlertCircle size={13} style={{ color: "#fbbf24" }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--lk-text)" }}>Alertas</span>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {marketingInsights.warnings.map((w, i) => (
                              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px", background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.15)", borderRadius: 10 }}>
                                <AlertCircle size={12} style={{ color: "#fbbf24", flexShrink: 0, marginTop: 2 }} />
                                <p style={{ fontSize: 12, color: "var(--lk-text)", lineHeight: 1.5 }}>{w}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Opportunities */}
                      {marketingInsights.opportunities.length > 0 && (
                        <div style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14, padding: "18px 20px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                            <Zap size={13} style={{ color: "var(--lk-accent)" }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--lk-text)" }}>Oportunidades</span>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {marketingInsights.opportunities.map((o, i) => (
                              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px", background: "rgba(123,110,246,0.05)", border: "1px solid rgba(123,110,246,0.15)", borderRadius: 10 }}>
                                <Zap size={12} style={{ color: "var(--lk-accent)", flexShrink: 0, marginTop: 2 }} />
                                <p style={{ fontSize: 12, color: "var(--lk-text)", lineHeight: 1.5 }}>{o}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Suggestions */}
                      {marketingInsights.suggestions.length > 0 && (
                        <div style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14, padding: "18px 20px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                            <BarChart3 size={13} style={{ color: "var(--lk-accent)" }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--lk-text)" }}>Sugestões inteligentes</span>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {marketingInsights.suggestions.map((s, i) => (
                              <div key={i} style={{ padding: "14px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--lk-border)", borderRadius: 12 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--lk-text)" }}>{s.title}</span>
                                  <span style={{ fontSize: 9, fontWeight: 700, color: s.confidence === "high" ? "#34d399" : s.confidence === "medium" ? "#fbbf24" : "var(--lk-muted)", background: "rgba(255,255,255,0.05)", border: "1px solid var(--lk-border)", padding: "1px 6px", borderRadius: 4 }}>
                                    {s.confidence === "high" ? "Confiança alta" : s.confidence === "medium" ? "Confiança média" : "Confiança baixa"}
                                  </span>
                                  <span style={{ fontSize: 9, color: "var(--lk-muted)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--lk-border)", padding: "1px 6px", borderRadius: 4 }}>
                                    {s.category}
                                  </span>
                                </div>
                                <p style={{ fontSize: 11, color: "var(--lk-muted)", marginBottom: 4 }}><span style={{ fontWeight: 600, color: "var(--lk-text)" }}>Motivo:</span> {s.reason}</p>
                                <p style={{ fontSize: 11, color: "var(--lk-muted)", marginBottom: 4 }}><span style={{ fontWeight: 600, color: "var(--lk-text)" }}>Ação:</span> {s.action}</p>
                                <p style={{ fontSize: 11, color: "var(--lk-muted)" }}><span style={{ fontWeight: 600, color: "var(--lk-text)" }}>Impacto esperado:</span> {s.expectedImpact}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recommended actions */}
                      {marketingInsights.recommendedActions.length > 0 && (
                        <div style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14, padding: "18px 20px" }}>
                          <SectionHeader title="Ações recomendadas" />
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {marketingInsights.recommendedActions.map((a, i) => (
                              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--lk-accent)", flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
                                <p style={{ fontSize: 12, color: "var(--lk-muted)", lineHeight: 1.5 }}>{a}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Disclaimer */}
                      <div style={{ padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--lk-border)", borderRadius: 10, display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <Info size={12} style={{ color: "var(--lk-muted)", flexShrink: 0, marginTop: 1 }} />
                        <p style={{ fontSize: 11, color: "var(--lk-muted)" }}>{marketingInsights.disclaimer}</p>
                      </div>
                    </>
                  ) : (
                    <div style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14, padding: "32px 20px", textAlign: "center" }}>
                      <Zap size={28} style={{ color: "var(--lk-border)", margin: "0 auto 10px" }} />
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--lk-muted)" }}>
                        {loadingInsights ? "Aguardando dados…" : "Selecione um período e aguarde os dados para gerar insights."}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ══ TAB: Diagnóstico ════════════════════════════════════════════ */}
              {activeTab === "diagnostics" && (
                <div style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14, padding: "18px 20px" }}>
                  <SectionHeader title="Diagnóstico técnico da integração" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11, fontFamily: "'Space Mono', monospace", color: "var(--lk-muted)", lineHeight: 1.8 }}>
                    <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Cliente:</span> {selectedClient?.company_name ?? clientId.slice(0, 8) + "…"}</p>
                    <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Período:</span> {PERIOD_LABELS[period]} ({period})</p>
                    <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Ativo Meta:</span> {status?.assetType ?? "—"} {status?.username ? `(@${status.username})` : ""}</p>
                    <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Conexão:</span> {status?.connectionStatus ?? "—"} · ID {status?.connectionId?.slice(0, 8) ?? "—"}…</p>
                    {insights?.ok && (
                      <>
                        <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Métricas disponíveis:</span> {insights.availableMetrics?.join(", ") ?? "—"}</p>
                        <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Métricas indisponíveis:</span> {insights.unavailableMetrics?.map((m) => m.metric).join(", ") || "nenhuma"}</p>
                        <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Endpoint:</span> {insights.endpoint ?? "—"}</p>
                      </>
                    )}
                    {!insights?.ok && insights?.reason && (
                      <p><span style={{ color: "#f87171", fontWeight: 600 }}>Erro:</span> {insights.reason} — {insights.safeMessage}</p>
                    )}
                    <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Fonte Meta Insights:</span> Facebook/Instagram Business via Graph API</p>
                    <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Inteligência:</span> Determinística — regras locais, sem chamadas externas de IA</p>
                    {insights?.ok && insights.graphErrorCode && (
                      <p><span style={{ color: "#f87171", fontWeight: 600 }}>Graph error code:</span> {insights.graphErrorCode}</p>
                    )}
                    {status?.scopes && status.scopes.length > 0 && (
                      <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Escopos OAuth:</span> {status.scopes.join(", ")}</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
