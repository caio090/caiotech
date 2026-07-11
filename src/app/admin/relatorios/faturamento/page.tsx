"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, RefreshCw, Loader2, AlertCircle, CheckCircle2,
  TrendingUp, DollarSign, Clock, Building2, CalendarDays,
  Link2, ChevronDown, ChevronRight, Info, BarChart3, FileText,
  Zap, ArrowUpRight, ArrowDownRight, Tag, Truck, Users, Award,
  XCircle, RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

// ── Types ────────────────────────────────────────────────────────────────────

type PeriodKey = "hoje" | "7dias" | "15dias" | "30dias" | "mes_atual" | "personalizado";
type TabKey = "overview" | "schedule" | "orders" | "products" | "diagnostics";

const PERIODS: { value: PeriodKey; label: string }[] = [
  { value: "hoje",          label: "Hoje"             },
  { value: "7dias",         label: "Últimos 7 dias"   },
  { value: "15dias",        label: "Últimos 15 dias"  },
  { value: "30dias",        label: "Últimos 30 dias"  },
  { value: "mes_atual",     label: "Mês atual"        },
  { value: "personalizado", label: "Personalizado…"   },
];

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview",    label: "Visão geral" },
  { key: "schedule",    label: "Horários"    },
  { key: "orders",      label: "Pedidos"     },
  { key: "products",    label: "Produtos"    },
  { key: "diagnostics", label: "Diagnóstico" },
];

interface ClientOption { id: string; company_name: string }

interface DigitalMenuStatus {
  ok: boolean; connected?: boolean; reason?: string; message?: string;
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
  conventionUsed: string; conventionVerified: false;
  pagesFetched: number; totalReturned: number;
  providerReportedTotalRaw: number | null; providerTotalScope: ProviderTotalScope | null;
  limitDetected: number | null; hasMore: boolean;
  dedup: { rawCount: number; uniqueCount: number; duplicateCount: number; missingIdCount: number };
  returnedOrdersWithinRequestedRange: boolean | null; dateFilterCompletenessConfirmed: false;
  lastRequestedPage?: number; providerCurrentPage?: number | null;
}

interface DebugShape {
  topLevelType: string; topLevelKeys: string[]; listKeyUsed: string;
  totalReturned: number; firstOrderKeys: string[]; firstItemKeys: string[];
  paginationKeys: string[]; hasPagination: boolean;
  detectedLimit: number | null; hasNextPage: boolean | null;
}

type OrderFetchCompleteness = "complete" | "partial" | "operational_only" | "unknown" | "error";
type SnapshotPersistence   = "saved" | "not_configured" | "skipped" | "skipped_incomplete" | "error";

interface DailyCollectionResult {
  date: string; providerTotal: number | null;
  expectedPages: number; pagesFetched: number;
  uniqueOrders: number; duplicateOrders: number; failedPages: number;
  repeatedPageDetected: boolean; endedNaturally: boolean; complete: boolean;
}

interface WindowFetchDiagnostics {
  totalWindows: number; resolvedWindows: number; partialWindows: number; failedWindows: number;
  datetimeFiltersSupported: boolean | null; dailyFallbackUsed: boolean;
  requestsMade: number; targetTotal: number | null;
  rawCount: number; uniqueCount: number; duplicateCount: number; missingIdCount: number;
  rateLimitStopped: boolean; executionMs: number;
  paginationFallbackReason: "repeated_page" | "requested_page_ignored" | "none";
  authMode: "bearer" | "x_api_key";
  dailyDiagnostics?: DailyCollectionResult[];
  completeDays?: number; partialDays?: number;
}

interface OrdersResult {
  ok: boolean; reason?: string; code?: string; message?: string;
  connectionFound?: boolean; provider?: string; baseUrlResolved?: boolean; endpoint?: string;
  httpStatus?: number | null; providerErrorMessage?: string | null;
  snapshotPersistence?: SnapshotPersistence; completeness?: OrderFetchCompleteness;
  pagination?: PaginationInfo; debugShape?: DebugShape;
  windowDiag?: WindowFetchDiagnostics | null; cacheHit?: boolean;
  data?: {
    faturamento_total: number | null; total_pedidos: number | null; ticket_medio: number | null;
    pedidos_por_status: Record<string, number> | null;
    produtos_mais_vendidos: { name: string; qty: number }[] | null;
    topItemsUnavailable: boolean; topItemsReason: string | null;
    melhores_dias: { date: string; revenue: number; orders: number }[] | null;
    pedidos_recentes: { id: string; date: string | null; status: string; total: number }[];
    heatmap?: { weekday: number; hour: number; orders: number; revenue: number }[];
    pedidosPorServiceType?: Record<string, number>; pedidosPorSource?: Record<string, number>;
    totalDescontos?: number; totalTaxasEntrega?: number; totalGorjetas?: number;
    faturamentoPorDiaSemana?: Record<string, number>; pedidosPorDiaSemana?: Record<string, number>;
    pedidosPorHora?: Record<string, number>; faturamentoPorHora?: Record<string, number>;
    concentracaoPorFaixa?: Record<string, { orders: number; revenue: number }>;
  };
}

interface ReportData {
  faturamento_total: number; total_pedidos: number; ticket_medio: number | null;
  pedidos_por_status: Record<string, number> | null;
  produtos_mais_vendidos: { name: string; qty: number }[] | null;
  topItemsUnavailable: boolean; topItemsReason: string | null;
  melhores_dias: { date: string; revenue: number; orders: number }[] | null;
  pedidos_recentes: { id: string; date: string | null; status: string; total: number }[];
  pagination?: PaginationInfo; debugShape?: DebugShape;
  snapshotPersistence?: SnapshotPersistence; completeness?: OrderFetchCompleteness;
  windowDiag?: WindowFetchDiagnostics | null; cacheHit?: boolean;
  heatmap?: { weekday: number; hour: number; orders: number; revenue: number }[];
  pedidosPorServiceType?: Record<string, number>; pedidosPorSource?: Record<string, number>;
  totalDescontos?: number; totalTaxasEntrega?: number; totalGorjetas?: number;
  faturamentoPorDiaSemana?: Record<string, number>; pedidosPorDiaSemana?: Record<string, number>;
  pedidosPorHora?: Record<string, number>; faturamentoPorHora?: Record<string, number>;
  concentracaoPorFaixa?: Record<string, { orders: number; revenue: number }>;
}

// ── Formatters ───────────────────────────────────────────────────────────────

function fmtBRL(v: number | null | undefined) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtCount(v: number | null | undefined) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR");
}
function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return "—"; }
}
function fmtDay(ymd: string) {
  try {
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch { return ymd; }
}

function translateStatus(s: string): string {
  const MAP: Record<string, string> = {
    DELIVERED: "Entregue", DELIVERING: "Em entrega", PREPARING: "Preparando",
    READY: "Pronto", CANCELLED: "Cancelado", CANCELED: "Cancelado",
    PENDING: "Pendente", CONFIRMED: "Confirmado",
  };
  return MAP[s.toUpperCase()] ?? s;
}
function translateServiceType(s: string): string {
  const MAP: Record<string, string> = {
    delivery: "Entrega", pickup: "Retirada", dine_in: "Mesa",
    DELIVERY: "Entrega", PICKUP: "Retirada", DINE_IN: "Mesa",
  };
  return MAP[s] ?? s;
}
function translateSource(s: string): string {
  const MAP: Record<string, string> = {
    whatsapp: "WhatsApp", web: "Web", app: "App", pdv: "PDV",
    ifood: "iFood", totem: "Totem",
  };
  return MAP[s.toLowerCase()] ?? s;
}

const STATUS_COLORS: Record<string, string> = {
  DELIVERED: "#34d399", DELIVERING: "#818cf8", PREPARING: "#fbbf24",
  READY: "#60a5fa", CANCELLED: "#f87171", CANCELED: "#f87171", PENDING: "#94a3b8",
};
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const WEEKDAYS_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const FAIXAS = [
  { key: "madrugada", label: "Madrugada", range: "00h–05h", hours: [0,1,2,3,4,5] },
  { key: "manha",     label: "Manhã",     range: "06h–11h", hours: [6,7,8,9,10,11] },
  { key: "tarde",     label: "Tarde",     range: "12h–17h", hours: [12,13,14,15,16,17] },
  { key: "noite",     label: "Noite",     range: "18h–23h", hours: [18,19,20,21,22,23] },
];

// ── Motion variants ───────────────────────────────────────────────────────────

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -6 },
};
const stagger = { animate: { transition: { staggerChildren: 0.06 } } };
const tabVariants = {
  initial: { opacity: 0, x: 8 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.18 } },
  exit:    { opacity: 0, x: -8, transition: { duration: 0.12 } },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, accent = false, delta,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string;
  accent?: boolean; delta?: { pct: number; prev: string } | null;
}) {
  const iconBg = accent ? "rgba(123,110,246,0.15)" : "rgba(255,255,255,0.05)";
  const iconColor = accent ? "var(--lk-accent)" : "var(--lk-muted)";
  return (
    <motion.div
      variants={fadeUp}
      style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 16, padding: "20px 22px" }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={17} style={{ color: iconColor }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, color: "var(--lk-muted)", fontWeight: 500, marginBottom: 2 }}>{label}</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: "var(--lk-text)", lineHeight: 1.1, letterSpacing: "-0.02em" }}>{value}</p>
          {sub && <p style={{ fontSize: 10, color: "var(--lk-muted)", marginTop: 3 }}>{sub}</p>}
          {delta !== null && delta !== undefined && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 5 }}>
              {delta.pct >= 0
                ? <ArrowUpRight size={12} style={{ color: "#34d399" }} />
                : <ArrowDownRight size={12} style={{ color: "#f87171" }} />
              }
              <span style={{ fontSize: 11, fontWeight: 700, color: delta.pct >= 0 ? "#34d399" : "#f87171" }}>
                {delta.pct >= 0 ? "+" : ""}{delta.pct.toFixed(1)}%
              </span>
              <span style={{ fontSize: 10, color: "var(--lk-muted)" }}>vs {delta.prev}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function CompletenessChip({ completeness }: { completeness?: OrderFetchCompleteness }) {
  if (completeness === "complete")
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 999, background: "rgba(52,211,153,0.12)", color: "#34d399", border: "1px solid rgba(52,211,153,0.25)" }}><CheckCircle2 size={10} /> Dados completos</span>;
  if (completeness === "partial")
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 999, background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" }}><Info size={10} /> Dados parciais</span>;
  if (completeness === "operational_only")
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 999, background: "rgba(251,146,60,0.12)", color: "#fb923c", border: "1px solid rgba(251,146,60,0.25)" }}><Info size={10} /> Modo operacional</span>;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 999, background: "rgba(85,85,102,0.2)", color: "var(--lk-muted)", border: "1px solid var(--lk-border)" }}><Info size={10} /> Completude indefinida</span>;
}

function StatusDonut({ data }: { data: Record<string, number> }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const r = 44, sw = 11, C = 2 * Math.PI * r;
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
  let cumulative = 0;
  const segments = sorted.map(([s, v]) => {
    const frac = v / total;
    const start = cumulative;
    cumulative += frac;
    return { status: s, count: v, frac, start };
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
      <svg width={110} height={110} viewBox="0 0 110 110" style={{ flexShrink: 0 }}>
        <g transform="rotate(-90 55 55)">
          {segments.map(seg => {
            const dash = seg.frac * C;
            const offset = -(seg.start * C);
            return (
              <circle key={seg.status} cx="55" cy="55" r={r}
                fill="none"
                stroke={STATUS_COLORS[seg.status.toUpperCase()] ?? "#555566"}
                strokeWidth={sw}
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={offset}
              />
            );
          })}
        </g>
        <text x="55" y="58" textAnchor="middle" style={{ fill: "var(--lk-text)", fontSize: 17, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}>{total}</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {segments.map(seg => (
          <div key={seg.status} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: STATUS_COLORS[seg.status.toUpperCase()] ?? "#555566", flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "var(--lk-text)", fontWeight: 500 }}>{translateStatus(seg.status)}</span>
            <span style={{ fontSize: 11, color: "var(--lk-muted)", marginLeft: "auto", paddingLeft: 12 }}>{seg.count}</span>
            <span style={{ fontSize: 10, color: "var(--lk-muted)" }}>({(seg.frac * 100).toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProportionalBar({ entries, colors }: {
  entries: [string, number][]; colors: string[];
}) {
  const total = entries.reduce((a, [, v]) => a + v, 0);
  if (total === 0) return null;
  return (
    <div>
      <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", height: 6, marginBottom: 10, gap: 1 }}>
        {entries.map(([k, v], i) => (
          <div key={k} style={{ flex: v / total, background: colors[i % colors.length], minWidth: 2 }} />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px" }}>
        {entries.map(([k, v], i) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: colors[i % colors.length] }} />
            <span style={{ fontSize: 12, color: "var(--lk-text)" }}>{k}</span>
            <span style={{ fontSize: 12, color: "var(--lk-muted)", fontWeight: 600 }}>{v}</span>
            <span style={{ fontSize: 10, color: "var(--lk-muted)" }}>({(v / total * 100).toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeatmapGrid({ heatmap, metric = "orders" }: {
  heatmap: { weekday: number; hour: number; orders: number; revenue: number }[];
  metric?: "orders" | "revenue";
}) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const cellMap: Record<string, { orders: number; revenue: number }> = {};
  for (const c of heatmap) cellMap[`${c.weekday}:${c.hour}`] = { orders: c.orders, revenue: c.revenue };
  const vals = heatmap.map(c => metric === "orders" ? c.orders : c.revenue);
  const maxVal = Math.max(...vals, 1);
  const [tooltip, setTooltip] = useState<{ day: string; hour: number; orders: number; revenue: number } | null>(null);

  function intensity(val: number): number {
    return val === 0 ? 0 : Math.max(1, Math.ceil((val / maxVal) * 5));
  }
  // Warm/hot colormap: empty → vinho → vermelho → laranja → amarelo
  const LEVELS = [
    "rgba(255,255,255,0.03)",
    "rgba(140,20,30,0.40)",
    "rgba(200,50,30,0.58)",
    "rgba(230,100,20,0.72)",
    "rgba(240,165,30,0.85)",
    "rgba(255,225,55,0.95)",
  ];

  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 560 }}>
          <div style={{ display: "flex", marginBottom: 4, paddingLeft: 28 }}>
            {hours.map(h => (
              <div key={h} style={{ flex: 1, textAlign: "center", fontSize: 9, color: "var(--lk-muted)", fontFamily: "'Space Mono', monospace" }}>
                {h % 4 === 0 ? `${h}h` : ""}
              </div>
            ))}
          </div>
          {WEEKDAYS.map((day, wd) => (
            <div key={wd} style={{ display: "flex", alignItems: "center", marginBottom: 3 }}>
              <div style={{ width: 26, flexShrink: 0, fontSize: 10, color: "var(--lk-muted)", fontWeight: 500 }}>{day}</div>
              {hours.map(h => {
                const c = cellMap[`${wd}:${h}`];
                const val = c ? (metric === "orders" ? c.orders : c.revenue) : 0;
                const lv = intensity(val);
                return (
                  <div
                    key={h}
                    style={{ flex: 1, aspectRatio: "1", borderRadius: 3, background: LEVELS[lv], margin: "0 1px", cursor: c ? "pointer" : undefined, transition: "background 0.15s" }}
                    onMouseEnter={() => c && setTooltip({ day, hour: h, orders: c.orders, revenue: c.revenue })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 10, justifyContent: "flex-end" }}>
            <span style={{ fontSize: 9, color: "var(--lk-muted)" }}>Menos</span>
            {LEVELS.map((lvl, i) => (
              <div key={i} style={{ width: 11, height: 11, borderRadius: 2, background: lvl, border: "1px solid rgba(255,255,255,0.08)" }} />
            ))}
            <span style={{ fontSize: 9, color: "var(--lk-muted)" }}>Mais</span>
          </div>
        </div>
      </div>
      {tooltip && (
        <div style={{ marginTop: 8, padding: "7px 12px", background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 8, display: "inline-flex", gap: 12, fontSize: 11, color: "var(--lk-text)" }}>
          <span style={{ fontWeight: 600 }}>{tooltip.day} {tooltip.hour}h</span>
          <span>{tooltip.orders} pedido{tooltip.orders !== 1 ? "s" : ""}</span>
          <span style={{ color: "var(--lk-muted)" }}>{fmtBRL(tooltip.revenue)}</span>
        </div>
      )}
    </div>
  );
}

function HourlyBars({ data, label }: { data: Record<string, number>; label: string }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const vals = hours.map(h => data[String(h)] ?? 0);
  const maxVal = Math.max(...vals, 1);
  const peakHour = vals.indexOf(Math.max(...vals));

  return (
    <div>
      <p style={{ fontSize: 11, color: "var(--lk-muted)", marginBottom: 12, fontWeight: 500 }}>{label}</p>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 80 }}>
        {hours.map(h => {
          const val = vals[h];
          const pct = val / maxVal;
          const isPeak = h === peakHour && val > 0;
          return (
            <motion.div
              key={h}
              title={`${h}h: ${fmtCount(val)}`}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: h * 0.015, duration: 0.3, ease: "easeOut" }}
              style={{
                flex: 1, borderRadius: "3px 3px 0 0", transformOrigin: "bottom",
                height: `${Math.max(pct * 100, val > 0 ? 5 : 2)}%`,
                background: isPeak ? "var(--lk-accent)" : val > 0 ? "rgba(123,110,246,0.35)" : "rgba(255,255,255,0.04)",
                transition: "background 0.15s",
              }}
            />
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        {[0, 6, 12, 18, 23].map(h => (
          <span key={h} style={{ fontSize: 9, color: "var(--lk-muted)", fontFamily: "'Space Mono', monospace" }}>{h}h</span>
        ))}
      </div>
      {vals[peakHour] > 0 && (
        <p style={{ fontSize: 10, color: "var(--lk-muted)", marginTop: 8 }}>
          Pico: <span style={{ color: "var(--lk-accent)", fontWeight: 600 }}>{peakHour}h</span>
          {" "}com <span style={{ color: "var(--lk-text)", fontWeight: 600 }}>{fmtCount(vals[peakHour])}</span>
        </p>
      )}
    </div>
  );
}

function InsightsPanel({ report, prevReport }: { report: ReportData; prevReport: ReportData | null }) {
  const insights = useMemo(() => {
    const list: { icon: React.ElementType; text: string; accent?: boolean }[] = [];
    const isComplete = report.completeness === "complete";

    if (isComplete && prevReport?.completeness === "complete" && prevReport.faturamento_total > 0) {
      const pct = ((report.faturamento_total - prevReport.faturamento_total) / prevReport.faturamento_total) * 100;
      list.push({
        icon: pct >= 0 ? TrendingUp : ArrowDownRight,
        text: `Faturamento ${pct >= 0 ? "cresceu" : "caiu"} ${Math.abs(pct).toFixed(1)}% em relação ao período anterior (${fmtBRL(prevReport.faturamento_total)}).`,
        accent: pct >= 0,
      });
    }

    const bestDay = report.melhores_dias?.[0];
    if (bestDay) {
      list.push({ icon: Award, text: `Melhor dia: ${fmtDay(bestDay.date)} com ${fmtBRL(bestDay.revenue)} e ${bestDay.orders} pedido${bestDay.orders !== 1 ? "s" : ""}.` });
    }

    if (report.heatmap && report.heatmap.length > 0) {
      const peakCell = report.heatmap.reduce((best, c) => c.orders > best.orders ? c : best, report.heatmap[0]);
      if (peakCell.orders > 0) {
        list.push({ icon: Clock, text: `Horário de pico: ${WEEKDAYS_FULL[peakCell.weekday]} às ${peakCell.hour}h com ${peakCell.orders} pedido${peakCell.orders !== 1 ? "s" : ""}.` });
      }
    }

    if (report.pedidosPorServiceType) {
      const top = Object.entries(report.pedidosPorServiceType).sort((a, b) => b[1] - a[1])[0];
      if (top) {
        const total = Object.values(report.pedidosPorServiceType).reduce((a, b) => a + b, 0);
        const pct = total > 0 ? (top[1] / total * 100).toFixed(0) : "0";
        list.push({ icon: Truck, text: `${pct}% dos pedidos são ${translateServiceType(top[0]).toLowerCase()} (${top[1]} no total).` });
      }
    }

    if (report.totalDescontos && report.totalDescontos > 0 && report.faturamento_total > 0) {
      const pct = (report.totalDescontos / (report.faturamento_total + report.totalDescontos) * 100).toFixed(1);
      list.push({ icon: Tag, text: `${fmtBRL(report.totalDescontos)} em descontos aplicados (${pct}% do faturamento bruto).` });
    }

    return list.slice(0, 4);
  }, [report, prevReport]);

  if (insights.length === 0) return null;

  return (
    <div style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14, padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Zap size={14} style={{ color: "var(--lk-accent)" }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--lk-text)" }}>Destaques do período</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {insights.map((ins, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <ins.icon size={13} style={{ color: ins.accent ? "#34d399" : "var(--lk-muted)", marginTop: 1, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "var(--lk-text)", lineHeight: 1.5 }}>{ins.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 16, padding: "20px 22px", overflow: "hidden" }}>
      <div style={{ height: 10, width: "40%", borderRadius: 4, background: "rgba(255,255,255,0.05)", marginBottom: 10 }} />
      <div style={{ height: 22, width: "65%", borderRadius: 4, background: "rgba(255,255,255,0.07)" }} />
    </div>
  );
}

// ── sessionStorage helpers ────────────────────────────────────────────────────

const SS_VERSION = "v2";
const SS_TTL_MS  = 5 * 60 * 1000;

function ssKey(cid: string, s: string, e: string) { return `lokat:olaclick-report:${SS_VERSION}:${cid}:${s}:${e}`; }
function ssRead(cid: string, s: string, e: string): ReportData | null {
  try {
    const raw = sessionStorage.getItem(ssKey(cid, s, e));
    if (!raw) return null;
    const { savedAt, report: r } = JSON.parse(raw) as { savedAt: number; report: ReportData };
    if (Date.now() - savedAt > SS_TTL_MS) return null;
    return r as ReportData;
  } catch { return null; }
}
function ssWrite(cid: string, s: string, e: string, r: ReportData) {
  try { sessionStorage.setItem(ssKey(cid, s, e), JSON.stringify({ savedAt: Date.now(), report: r })); }
  catch { /* quota */ }
}

function buildReportFromData(d: OrdersResult): ReportData {
  const p = d.data;
  return {
    faturamento_total: p?.faturamento_total ?? 0, total_pedidos: p?.total_pedidos ?? 0,
    ticket_medio: p?.ticket_medio ?? null, pedidos_por_status: p?.pedidos_por_status ?? null,
    produtos_mais_vendidos: p?.produtos_mais_vendidos ?? null,
    topItemsUnavailable: p?.topItemsUnavailable ?? false, topItemsReason: p?.topItemsReason ?? null,
    melhores_dias: p?.melhores_dias ?? null, pedidos_recentes: p?.pedidos_recentes ?? [],
    pagination: d.pagination, debugShape: d.debugShape, snapshotPersistence: d.snapshotPersistence,
    completeness: d.completeness, windowDiag: d.windowDiag ?? null, cacheHit: d.cacheHit ?? false,
    heatmap: p?.heatmap, pedidosPorServiceType: p?.pedidosPorServiceType,
    pedidosPorSource: p?.pedidosPorSource, totalDescontos: p?.totalDescontos,
    totalTaxasEntrega: p?.totalTaxasEntrega, totalGorjetas: p?.totalGorjetas,
    faturamentoPorDiaSemana: p?.faturamentoPorDiaSemana, pedidosPorDiaSemana: p?.pedidosPorDiaSemana,
    pedidosPorHora: p?.pedidosPorHora, faturamentoPorHora: p?.faturamentoPorHora,
    concentracaoPorFaixa: p?.concentracaoPorFaixa,
  };
}

function periodDates(period: PeriodKey, customStart: string, customEnd: string): { start: string; end: string } | null {
  const now = new Date();
  const toYMD = (d: Date) => d.toISOString().split("T")[0];
  if (period === "personalizado") {
    return customStart && customEnd ? { start: customStart, end: customEnd } : null;
  }
  if (period === "hoje") return { start: toYMD(now), end: toYMD(now) };
  if (period === "7dias")  { const s = new Date(now); s.setDate(s.getDate() - 6);  return { start: toYMD(s), end: toYMD(now) }; }
  if (period === "15dias") { const s = new Date(now); s.setDate(s.getDate() - 14); return { start: toYMD(s), end: toYMD(now) }; }
  if (period === "30dias") { const s = new Date(now); s.setDate(s.getDate() - 29); return { start: toYMD(s), end: toYMD(now) }; }
  if (period === "mes_atual") { return { start: toYMD(new Date(now.getFullYear(), now.getMonth(), 1)), end: toYMD(now) }; }
  return null;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function FaturamentoPage() {
  const [clients,          setClients]          = useState<ClientOption[]>([]);
  const [clientId,         setClientId]         = useState("");
  const [period,           setPeriod]           = useState<PeriodKey>("7dias");
  const [customStart,      setCustomStart]      = useState("");
  const [customEnd,        setCustomEnd]        = useState("");
  const [customError,      setCustomError]      = useState<string | null>(null);
  const [status,           setStatus]           = useState<DigitalMenuStatus | null>(null);
  const [report,           setReport]           = useState<ReportData | null>(null);
  const [loading,          setLoading]          = useState(false);
  const [loadingStatus,    setLoadingStatus]    = useState(false);
  const [loadingPrev,      setLoadingPrev]      = useState(false);
  const [error,            setError]            = useState<string | null>(null);
  const [apiDiag,          setApiDiag]          = useState<{ provider?: string; endpoint?: string; httpStatus?: number | null; providerErrorMessage?: string | null; period?: string } | null>(null);
  const [missingBaseUrl,   setMissingBaseUrl]   = useState(false);
  const [lastSync,         setLastSync]         = useState<string | null>(null);
  const [prevReport,       setPrevReport]       = useState<ReportData | null>(null);
  const [syncPhase,        setSyncPhase]        = useState<string | null>(null);
  const [cacheLabel,       setCacheLabel]       = useState<string | null>(null);
  const [activeTab,        setActiveTab]        = useState<TabKey>("overview");
  const [heatmapMetric,    setHeatmapMetric]    = useState<"orders" | "revenue">("orders");
  const [showOrdersAll,    setShowOrdersAll]    = useState(false);
  const [showDiag,         setShowDiag]         = useState(false);
  const [clientsLoading,   setClientsLoading]   = useState(false);
  const [clientsError,     setClientsError]     = useState<string | null>(null);
  const [clientsLoaded,    setClientsLoaded]    = useState(false);
  const activeControllerRef = useRef<AbortController | null>(null);
  const requestIdRef        = useRef(0);

  // ── Load clients (with proper error handling) ──────────────────────────────
  const loadClients = useCallback(async () => {
    setClientsLoading(true);
    setClientsError(null);
    try {
      const r = await fetch("/api/admin/clients");
      let body: Record<string, unknown> = {};
      try { body = await r.json() as Record<string, unknown>; } catch { /* ignore */ }
      if (!r.ok) {
        if      (r.status === 401) setClientsError("Sessão não reconhecida. Faça login novamente.");
        else if (r.status === 403) setClientsError("Sem permissão para acessar clientes.");
        else if (r.status === 404) setClientsError("Perfil administrativo não encontrado.");
        else setClientsError((body.message as string | null) ?? "Não foi possível carregar os clientes.");
        return;
      }
      const list = (body.clients as ClientOption[] | undefined) ?? [];
      setClients(list);
      setClientsLoaded(true);
      if (list.length > 0) setClientId(list[0].id);
      else setClientsError("Nenhum cliente cadastrado encontrado.");
    } catch { setClientsError("Erro de rede ao carregar clientes."); }
    finally { setClientsLoading(false); }
  }, []);

  useEffect(() => { void loadClients(); }, [loadClients]);

  // ── Connection status ──────────────────────────────────────────────────────
  const loadStatus = useCallback(async (cid: string) => {
    if (!cid) return;
    setLoadingStatus(true); setStatus(null);
    try {
      const r = await fetch(`/api/olaclick/status?client_id=${cid}`);
      setStatus(await r.json() as DigitalMenuStatus);
    } catch { setStatus({ ok: false, reason: "error", message: "Não foi possível verificar o status da conexão." }); }
    finally { setLoadingStatus(false); }
  }, []);

  useEffect(() => { if (clientId) void loadStatus(clientId); }, [clientId, loadStatus]);

  // ── Load report ────────────────────────────────────────────────────────────
  const loadReport = useCallback(async (forceRefresh = false) => {
    if (!clientId) return;
    if (period === "personalizado") {
      if (!customStart || !customEnd) { setCustomError("Informe as duas datas."); return; }
      if (customStart > customEnd) { setCustomError("Data inicial deve ser menor ou igual à data final."); return; }
    }
    setCustomError(null);

    if (activeControllerRef.current) activeControllerRef.current.abort();
    const controller = new AbortController();
    activeControllerRef.current = controller;
    const thisRequestId = ++requestIdRef.current;

    if (!forceRefresh) {
      const dates = periodDates(period, customStart, customEnd);
      if (dates) {
        const cached = ssRead(clientId, dates.start, dates.end);
        if (cached) {
          if (requestIdRef.current !== thisRequestId) return;
          setReport(cached); setLastSync(new Date().toISOString());
          setCacheLabel("Resultado armazenado localmente");
          return;
        }
      }
    }

    setCacheLabel(null); setLoading(true); setError(null);
    setReport(null); setPrevReport(null); setMissingBaseUrl(false); setApiDiag(null);
    setSyncPhase("Preparando sincronização");

    try {
      const base = period === "personalizado"
        ? `/api/olaclick/orders?client_id=${clientId}&start_date=${customStart}&end_date=${customEnd}`
        : `/api/olaclick/orders?client_id=${clientId}&period=${period}`;
      const url = forceRefresh ? `${base}&force_refresh=1` : base;
      setSyncPhase("Consultando pedidos");
      const r = await fetch(url, { signal: controller.signal });
      setSyncPhase("Consolidando indicadores");
      const d = await r.json() as OrdersResult;
      setSyncPhase("Finalizando relatório");
      if (requestIdRef.current !== thisRequestId) return;

      if (!d.ok) {
        const diag = { provider: d.provider, endpoint: d.endpoint, httpStatus: d.httpStatus, providerErrorMessage: d.providerErrorMessage, period };
        if (d.reason === "sql_pending") setError("SQL 39 pendente. Rode docs/supabase/39-olaclick-connections.sql.");
        else if (d.reason === "base_url_missing" || d.code === "missing_provider_base_url") setMissingBaseUrl(true);
        else if (d.reason === "not_connected" || d.code === "no_digital_menu_connection") setError("Cliente sem conexão Cardápio Digital. Conecte em Conexões → Cardápio Digital.");
        else if (d.reason === "token_invalid" || d.code === "provider_unauthorized") { setError("API recusou a chave do provider. Verifique o token em Gerenciar."); setApiDiag(diag); }
        else if (d.reason === "forbidden" || d.code === "provider_forbidden") { setError("API respondeu sem permissão para consultar pedidos."); setApiDiag(diag); }
        else if (d.reason === "endpoint_not_found" || d.code === "provider_endpoint_not_found") { setError("Endpoint de pedidos não encontrado."); setApiDiag(diag); }
        else if (d.reason === "token_has_invalid_characters" || d.code === "invalid_header_value") { setError("Chave do provider com caracteres inválidos. Atualize o token."); setApiDiag(diag); }
        else if (d.reason === "bad_params" || d.code === "provider_bad_request") { setError(d.message ?? "API recusou os filtros do período."); setApiDiag(diag); }
        else if (d.reason === "network_error" || d.code === "provider_network_error") { setError("Não foi possível conectar à API OlaClick."); setApiDiag(diag); }
        else if (d.reason === "unexpected_response" || d.code === "provider_unexpected_response") { setError("API respondeu em formato inesperado."); setApiDiag(diag); }
        else { setError(d.message ?? "Não foi possível buscar dados do Cardápio Digital."); if (d.provider || d.endpoint || d.httpStatus != null) setApiDiag(diag); }
        return;
      }

      setMissingBaseUrl(false);
      const built = buildReportFromData(d);
      setReport(built); setLastSync(new Date().toISOString());
      if (built.total_pedidos > 0) {
        const dates = periodDates(period, customStart, customEnd);
        if (dates) ssWrite(clientId, dates.start, dates.end, built);
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      if (requestIdRef.current !== thisRequestId) return;
      setError("Erro de rede ao buscar faturamento. Verifique conexão e tente novamente.");
    } finally {
      if (requestIdRef.current === thisRequestId) { setLoading(false); setSyncPhase(null); }
    }
  }, [clientId, period, customStart, customEnd]);

  // ── Load previous period (manual only) ────────────────────────────────────
  const loadPrevReport = useCallback(async () => {
    if (!clientId || period === "personalizado" || report?.completeness !== "complete") return;
    setLoadingPrev(true);
    const now = new Date();
    const toYMD = (d: Date) => d.toISOString().split("T")[0];
    let days = 7;
    if (period === "7dias") days = 7; else if (period === "15dias") days = 15;
    else if (period === "30dias") days = 30;
    else if (period === "mes_atual") {
      const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
      days = Math.ceil((now.getTime() - mStart.getTime()) / 86400000) || 1;
    } else if (period === "hoje") days = 1;
    const prevEnd   = new Date(now); prevEnd.setDate(prevEnd.getDate() - days);
    const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - days + 1);
    try {
      const r = await fetch(`/api/olaclick/orders?client_id=${clientId}&start_date=${toYMD(prevStart)}&end_date=${toYMD(prevEnd)}`);
      const d = await r.json() as OrdersResult;
      setPrevReport(d.ok && d.data ? buildReportFromData(d) : null);
    } catch { setPrevReport(null); }
    finally { setLoadingPrev(false); }
  }, [clientId, period, report?.completeness]);

  // ── Auto-refresh ────────────────────────────────────────────────────────────
  const { refresh: autoRefreshNow } = useAutoRefresh({
    enabled: !!clientId && !!(status?.ok && status?.connection),
    intervalMs: 300_000, onRefresh: loadReport, refreshOnMount: false,
  });
  void autoRefreshNow;

  const isConnected = status?.ok && status?.connection;
  const selectedClient = clients.find(c => c.id === clientId);
  const isComplete = report?.completeness === "complete";

  const samePeriodsWarning = report && report.total_pedidos > 0 && (
    report.completeness === "partial" || report.completeness === "unknown" ||
    report.completeness === "operational_only" ||
    (report.pagination && !report.pagination.used && report.pagination.limitDetected !== null && report.total_pedidos === report.pagination.limitDetected)
  );

  // Derive deltas
  const deltaFat = (isComplete && prevReport?.completeness === "complete" && prevReport.faturamento_total > 0)
    ? { pct: (report!.faturamento_total - prevReport.faturamento_total) / prevReport.faturamento_total * 100, prev: fmtBRL(prevReport.faturamento_total) }
    : null;
  const deltaPed = (isComplete && prevReport?.completeness === "complete" && prevReport.total_pedidos > 0)
    ? { pct: (report!.total_pedidos - prevReport.total_pedidos) / prevReport.total_pedidos * 100, prev: String(prevReport.total_pedidos) }
    : null;
  const deltaTick = (isComplete && prevReport?.completeness === "complete" && prevReport.ticket_medio && report?.ticket_medio)
    ? { pct: (report!.ticket_medio! - prevReport.ticket_medio) / prevReport.ticket_medio * 100, prev: fmtBRL(prevReport.ticket_medio) }
    : null;

  const serviceEntries = report?.pedidosPorServiceType
    ? Object.entries(report.pedidosPorServiceType).sort((a, b) => b[1] - a[1]).map(([k, v]) => [translateServiceType(k), v] as [string, number])
    : [];
  const sourceEntries = report?.pedidosPorSource
    ? Object.entries(report.pedidosPorSource).sort((a, b) => b[1] - a[1]).map(([k, v]) => [translateSource(k), v] as [string, number])
    : [];

  const SERVICE_COLORS = ["#7b6ef6", "#e0635a", "#34d399", "#60a5fa", "#fbbf24"];
  const SOURCE_COLORS  = ["#818cf8", "#f472b6", "#34d399", "#fbbf24", "#94a3b8"];

  // Faixa data — from concentracaoPorFaixa or computed from heatmap
  const faixaData = useMemo(() => {
    if (report?.concentracaoPorFaixa) return report.concentracaoPorFaixa;
    if (!report?.heatmap || report.heatmap.length === 0) return null;
    const result: Record<string, { orders: number; revenue: number }> = {};
    for (const f of FAIXAS) {
      const cells = report.heatmap.filter(c => f.hours.includes(c.hour));
      result[f.key] = { orders: cells.reduce((a, c) => a + c.orders, 0), revenue: cells.reduce((a, c) => a + c.revenue, 0) };
    }
    return result;
  }, [report]);

  const faixaTotal = faixaData ? Object.values(faixaData).reduce((a, v) => a + v.orders, 0) : 0;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 1600, width: "100%" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--lk-text)", letterSpacing: "-0.02em", marginBottom: 2 }}>
              Relatório de vendas
            </h1>
            <p style={{ fontSize: 12, color: "var(--lk-muted)" }}>Cardápio Digital · OlaClick</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {cacheLabel && (
              <span style={{ fontSize: 10, color: "var(--lk-muted)", padding: "4px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 6, border: "1px solid var(--lk-border)" }}>
                {cacheLabel}
              </span>
            )}
            {cacheLabel && (
              <button
                onClick={() => void loadReport(true)}
                style={{ fontSize: 11, color: "var(--lk-accent)", background: "transparent", border: "none", cursor: "pointer", padding: "4px 8px" }}
              >
                Forçar atualização
              </button>
            )}
            <button
              onClick={() => void loadReport()}
              disabled={loading || !isConnected}
              style={{
                display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600,
                color: "#fff", background: "var(--lk-accent)",
                border: "none", borderRadius: 10, padding: "9px 18px", cursor: loading || !isConnected ? "not-allowed" : "pointer",
                opacity: loading || !isConnected ? 0.5 : 1, transition: "opacity 0.15s",
              }}
            >
              {loading ? <Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} /> : <RefreshCw size={14} />}
              Sincronizar
            </button>
          </div>
        </div>

        {/* Selectors */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16, alignItems: "flex-start" }}>
          <div style={{ position: "relative" }}>
            <Building2 size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--lk-muted)", pointerEvents: "none" }} />
            <select
              value={clientId} onChange={e => setClientId(e.target.value)}
              style={{ paddingLeft: 28, paddingRight: 28, paddingTop: 8, paddingBottom: 8, fontSize: 13, background: "var(--lk-card)", color: "var(--lk-text)", border: "1px solid var(--lk-border)", borderRadius: 10, outline: "none", appearance: "none" }}
              disabled={clientsLoading}
            >
              {clients.length === 0 && !clientsLoading && <option value="">Sem clientes</option>}
              {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
            <ChevronDown size={13} style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", color: "var(--lk-muted)", pointerEvents: "none" }} />
          </div>

          <div style={{ position: "relative" }}>
            <CalendarDays size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--lk-muted)", pointerEvents: "none" }} />
            <select
              value={period} onChange={e => { setPeriod(e.target.value as PeriodKey); setCustomError(null); }}
              style={{ paddingLeft: 28, paddingRight: 28, paddingTop: 8, paddingBottom: 8, fontSize: 13, background: "var(--lk-card)", color: "var(--lk-text)", border: "1px solid var(--lk-border)", borderRadius: 10, outline: "none", appearance: "none" }}
            >
              {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <ChevronDown size={13} style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", color: "var(--lk-muted)", pointerEvents: "none" }} />
          </div>

          {period === "personalizado" && (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
              <input type="date" value={customStart} onChange={e => { setCustomStart(e.target.value); setCustomError(null); }}
                style={{ padding: "8px 10px", fontSize: 13, background: "var(--lk-card)", color: "var(--lk-text)", border: "1px solid var(--lk-border)", borderRadius: 10, outline: "none" }} />
              <span style={{ fontSize: 11, color: "var(--lk-muted)" }}>até</span>
              <input type="date" value={customEnd} onChange={e => { setCustomEnd(e.target.value); setCustomError(null); }}
                style={{ padding: "8px 10px", fontSize: 13, background: "var(--lk-card)", color: "var(--lk-text)", border: "1px solid var(--lk-border)", borderRadius: 10, outline: "none" }} />
              <button
                onClick={() => void loadReport()} disabled={loading || !isConnected || !customStart || !customEnd}
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#fff", background: "var(--lk-accent)", border: "none", borderRadius: 9, padding: "8px 14px", cursor: "pointer", opacity: loading || !isConnected || !customStart || !customEnd ? 0.5 : 1 }}
              >
                {loading ? <Loader2 size={12} style={{ animation: "spin 0.8s linear infinite" }} /> : <RefreshCw size={12} />}
                Aplicar
              </button>
              {customError && <span style={{ fontSize: 11, color: "#f87171" }}>{customError}</span>}
            </div>
          )}
        </div>
      </div>

      {/* ── Clients error ──────────────────────────────────────────────────── */}
      {clientsError && !clientsLoaded && (
        <motion.div {...fadeUp} style={{ marginBottom: 16, padding: "14px 16px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 12, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <AlertCircle size={14} style={{ color: "#f87171", flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 12, color: "#f87171" }}>{clientsError}</span>
          </div>
          <button onClick={() => void loadClients()} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: "var(--lk-accent)", background: "transparent", border: "none", cursor: "pointer", flexShrink: 0 }}>
            <RotateCcw size={11} /> Tentar de novo
          </button>
        </motion.div>
      )}

      {/* ── Connection status ───────────────────────────────────────────────── */}
      <div style={{
        marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px",
        borderRadius: 12, fontSize: 12,
        background: loadingStatus ? "rgba(255,255,255,0.03)" : isConnected ? "rgba(52,211,153,0.08)" : "rgba(251,191,36,0.08)",
        border: `1px solid ${loadingStatus ? "var(--lk-border)" : isConnected ? "rgba(52,211,153,0.2)" : "rgba(251,191,36,0.2)"}`,
        color: loadingStatus ? "var(--lk-muted)" : isConnected ? "#34d399" : "#fbbf24",
      }}>
        {loadingStatus ? (
          <><Loader2 size={13} style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }} /><span>Verificando conexão…</span></>
        ) : isConnected ? (
          <><CheckCircle2 size={13} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 600 }}>Cardápio Digital conectado</span>
              {status?.connection?.provider && <span style={{ marginLeft: 6, fontSize: 10, textTransform: "uppercase", fontWeight: 700 }}>· {status.connection.provider}</span>}
              {status?.connection?.connection_name && <span style={{ marginLeft: 4 }}>· {status.connection.connection_name}</span>}
              {status?.connection?.token_last_four && <span style={{ fontFamily: "'Space Mono', monospace", marginLeft: 4 }}>…{status.connection.token_last_four}</span>}
              {lastSync && <span style={{ display: "block", fontSize: 10, color: "rgba(52,211,153,0.7)", marginTop: 2 }}>Última sync: {fmtDate(lastSync)}</span>}
            </div>
          </>
        ) : (
          <><AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <span style={{ fontWeight: 600 }}>{selectedClient ? `${selectedClient.company_name} sem conexão Cardápio Digital.` : "Selecione um cliente."}</span>{" "}
              <Link href="/admin/conexoes" style={{ textDecoration: "underline", fontWeight: 700, color: "#fbbf24" }}>Conectar →</Link>
            </div>
          </>
        )}
      </div>

      {/* ── Missing base URL ───────────────────────────────────────────────── */}
      {missingBaseUrl && (
        <div style={{ marginBottom: 16, padding: "12px 14px", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 12, fontSize: 12, color: "#fbbf24", display: "flex", alignItems: "flex-start", gap: 10 }}>
          <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>Falta configurar a URL do provedor. <Link href="/admin/conexoes" style={{ textDecoration: "underline", fontWeight: 700 }}>Editar conexão →</Link></span>
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <motion.div {...fadeUp} style={{ marginBottom: 16, padding: "12px 14px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 12, display: "flex", alignItems: "flex-start", gap: 10 }}>
          <AlertCircle size={13} style={{ color: "#f87171", flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12, color: "#f87171", flex: 1 }}>{error}</span>
          {apiDiag && (
            <details style={{ fontSize: 10, color: "var(--lk-muted)" }}>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>Detalhes</summary>
              <div style={{ marginTop: 4, fontFamily: "'Space Mono', monospace", lineHeight: 1.6 }}>
                {apiDiag.provider && <p>Provider: {apiDiag.provider}</p>}
                {apiDiag.endpoint && <p>Endpoint: {apiDiag.endpoint}</p>}
                {apiDiag.httpStatus != null && <p>HTTP: {apiDiag.httpStatus}</p>}
                {apiDiag.providerErrorMessage && <p>Resposta: {apiDiag.providerErrorMessage}</p>}
              </div>
            </details>
          )}
        </motion.div>
      )}

      {/* ── Loading state ──────────────────────────────────────────────────── */}
      {loading && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: "10px 14px", background: "rgba(123,110,246,0.08)", border: "1px solid rgba(123,110,246,0.2)", borderRadius: 12 }}>
            <Loader2 size={13} style={{ color: "var(--lk-accent)", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "var(--lk-accent)", fontWeight: 500 }}>{syncPhase ?? "Sincronizando…"}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────────────────────── */}
      {!loading && !error && !report && isConnected && (
        <motion.div {...fadeUp} style={{ padding: "56px 24px", textAlign: "center", background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 18 }}>
          <ShoppingCart size={36} style={{ color: "var(--lk-border)", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--lk-text)", marginBottom: 6 }}>Nenhum dado carregado</p>
          <p style={{ fontSize: 12, color: "var(--lk-muted)", marginBottom: 20 }}>Clique em &quot;Sincronizar&quot; para buscar os dados do período.</p>
          <button onClick={() => void loadReport()} style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "var(--lk-accent)", background: "rgba(123,110,246,0.1)", border: "1px solid rgba(123,110,246,0.2)", borderRadius: 10, padding: "9px 18px", cursor: "pointer" }}>
            <RefreshCw size={13} /> Sincronizar agora
          </button>
        </motion.div>
      )}

      {!isConnected && !loadingStatus && !error && !loading && (
        <motion.div {...fadeUp} style={{ padding: "56px 24px", textAlign: "center", background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 18 }}>
          <Link2 size={36} style={{ color: "var(--lk-border)", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--lk-text)", marginBottom: 6 }}>Sem conexão Cardápio Digital</p>
          <p style={{ fontSize: 12, color: "var(--lk-muted)", marginBottom: 20 }}>Conecte o cliente para visualizar o faturamento real.</p>
          <Link href="/admin/conexoes" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "var(--lk-accent)", background: "rgba(123,110,246,0.1)", border: "1px solid rgba(123,110,246,0.2)", borderRadius: 10, padding: "9px 18px" }}>
            <Link2 size={13} /> Ir para Conexões
          </Link>
        </motion.div>
      )}

      {/* ── Report ─────────────────────────────────────────────────────────── */}
      {report && !loading && (
        <motion.div initial="initial" animate="animate" variants={stagger}>

          {/* Quality + partial warning */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <CompletenessChip completeness={report.completeness} />
            {samePeriodsWarning && (
              <span style={{ fontSize: 11, color: "#fbbf24", display: "flex", alignItems: "center", gap: 5 }}>
                <Info size={11} />
                Os KPIs refletem apenas os {fmtCount(report.total_pedidos)} pedidos retornados, não necessariamente o total do período.
              </span>
            )}
            {report.cacheHit && (
              <span style={{ fontSize: 10, color: "var(--lk-muted)", padding: "2px 8px", background: "rgba(255,255,255,0.04)", borderRadius: 5, border: "1px solid var(--lk-border)" }}>
                Resultado do cache do servidor (5 min)
              </span>
            )}
          </div>

          {/* ── Tabs ─────────────────────────────────────────────────────── */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--lk-border)", marginBottom: 24, gap: 2 }}>
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 400,
                  color: activeTab === tab.key ? "var(--lk-accent)" : "var(--lk-muted)",
                  background: "transparent", border: "none", cursor: "pointer",
                  padding: "10px 14px", borderBottom: activeTab === tab.key ? `2px solid var(--lk-accent)` : "2px solid transparent",
                  marginBottom: -1, transition: "color 0.15s",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={activeTab} {...tabVariants}>

              {/* ══ TAB: Visão geral ═══════════════════════════════════════ */}
              {activeTab === "overview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                  {/* KPI cards */}
                  <motion.div
                    initial="initial" animate="animate" variants={stagger}
                    style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}
                  >
                    <KpiCard
                      icon={DollarSign}
                      label={isComplete ? "Faturamento total" : "Faturamento dos pedidos carregados"}
                      value={fmtBRL(report.faturamento_total)}
                      sub="Fonte: Cardápio Digital"
                      accent delta={deltaFat}
                    />
                    <KpiCard
                      icon={ShoppingCart}
                      label={isComplete ? "Total de pedidos" : "Pedidos retornados"}
                      value={fmtCount(report.total_pedidos)}
                      sub={report.windowDiag ? `${fmtCount(report.windowDiag.uniqueCount)} únicos · ${report.windowDiag.totalWindows} janelas` : undefined}
                      delta={deltaPed}
                    />
                    <KpiCard
                      icon={TrendingUp}
                      label={isComplete ? "Ticket médio" : "Ticket médio dos pedidos carregados"}
                      value={fmtBRL(report.ticket_medio)}
                      delta={deltaTick}
                    />
                  </motion.div>

                  {/* Collection quality banner */}
                  {report.windowDiag && (
                    <motion.div variants={fadeUp} style={{ padding: "10px 14px", borderRadius: 12, fontSize: 12, display: "flex", alignItems: "flex-start", gap: 8,
                      background: isComplete ? "rgba(52,211,153,0.07)" : "rgba(251,191,36,0.07)",
                      border: `1px solid ${isComplete ? "rgba(52,211,153,0.2)" : "rgba(251,191,36,0.2)"}`,
                      color: isComplete ? "#34d399" : "#fbbf24",
                    }}>
                      <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>
                        {report.windowDiag.targetTotal !== null
                          ? `${fmtCount(report.windowDiag.uniqueCount)} pedidos de ${fmtCount(report.windowDiag.targetTotal)} informados`
                          : `${fmtCount(report.windowDiag.uniqueCount)} pedidos coletados`
                        }
                        {" · "}
                        {report.windowDiag.dailyFallbackUsed
                          ? `${report.windowDiag.totalWindows} dias processados`
                          : `${report.windowDiag.totalWindows} janelas`
                        }
                        {report.windowDiag.rateLimitStopped && " · Coleta interrompida por rate limit"}
                      </span>
                    </motion.div>
                  )}

                  {/* Zero orders */}
                  {report.total_pedidos === 0 && (
                    <motion.div variants={fadeUp} style={{ padding: "14px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--lk-border)", borderRadius: 12, display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "var(--lk-muted)" }}>
                      <ShoppingCart size={14} style={{ flexShrink: 0 }} />
                      Nenhum pedido encontrado no período selecionado.
                    </motion.div>
                  )}

                  {/* Comparison button */}
                  {report.total_pedidos > 0 && isComplete && period !== "personalizado" && !prevReport && (
                    <motion.div variants={fadeUp}>
                      <button
                        onClick={() => void loadPrevReport()}
                        disabled={loadingPrev}
                        style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 500, color: "var(--lk-muted)", background: "transparent", border: "1px dashed var(--lk-border)", borderRadius: 10, padding: "9px 16px", cursor: "pointer", transition: "border-color 0.15s, color 0.15s" }}
                      >
                        {loadingPrev ? <Loader2 size={12} style={{ animation: "spin 0.8s linear infinite" }} /> : <TrendingUp size={12} />}
                        Carregar comparação com período anterior
                      </button>
                    </motion.div>
                  )}

                  {/* Insights */}
                  {report.total_pedidos > 0 && (
                    <motion.div variants={fadeUp}>
                      <InsightsPanel report={report} prevReport={prevReport} />
                    </motion.div>
                  )}

                  {/* Status donut */}
                  {report.pedidos_por_status && Object.keys(report.pedidos_por_status).length > 0 && report.total_pedidos > 0 && (
                    <motion.div variants={fadeUp} style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14, padding: "18px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                        <BarChart3 size={14} style={{ color: "var(--lk-muted)" }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--lk-text)" }}>Status dos pedidos</span>
                      </div>
                      <StatusDonut data={report.pedidos_por_status} />
                    </motion.div>
                  )}

                  {/* Service type + source */}
                  {(serviceEntries.length > 0 || sourceEntries.length > 0) && (
                    <motion.div variants={fadeUp} style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <Users size={14} style={{ color: "var(--lk-muted)" }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--lk-text)" }}>Canal e tipo de serviço</span>
                      </div>
                      {serviceEntries.length > 0 && (
                        <div>
                          <p style={{ fontSize: 11, color: "var(--lk-muted)", marginBottom: 10, fontWeight: 500 }}>Tipo de serviço</p>
                          <ProportionalBar entries={serviceEntries} colors={SERVICE_COLORS} />
                        </div>
                      )}
                      {sourceEntries.length > 0 && (
                        <div>
                          <p style={{ fontSize: 11, color: "var(--lk-muted)", marginBottom: 10, fontWeight: 500 }}>Canal de origem</p>
                          <ProportionalBar entries={sourceEntries} colors={SOURCE_COLORS} />
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Best days */}
                  {report.melhores_dias && report.melhores_dias.length > 0 && (
                    <motion.div variants={fadeUp} style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14, padding: "18px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                        <Award size={14} style={{ color: "var(--lk-muted)" }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--lk-text)" }}>Melhores dias</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {report.melhores_dias.map((d, i) => {
                          const maxRev = report.melhores_dias![0].revenue || 1;
                          const medals = ["🥇", "🥈", "🥉"];
                          return (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ width: 20, fontSize: 14, flexShrink: 0 }}>{medals[i] ?? `${i + 1}.`}</span>
                              <span style={{ fontSize: 12, color: "var(--lk-muted)", fontFamily: "'Space Mono', monospace", flexShrink: 0, width: 50 }}>{fmtDay(d.date)}</span>
                              <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${(d.revenue / maxRev) * 100}%`, background: "var(--lk-accent)", borderRadius: 2 }} />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--lk-text)", flexShrink: 0, minWidth: 80, textAlign: "right" }}>{fmtBRL(d.revenue)}</span>
                              <span style={{ fontSize: 10, color: "var(--lk-muted)", flexShrink: 0, minWidth: 44, textAlign: "right" }}>{d.orders}p</span>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* Descontos / taxas / gorjetas */}
                  {((report.totalDescontos ?? 0) > 0 || (report.totalTaxasEntrega ?? 0) > 0 || (report.totalGorjetas ?? 0) > 0) && (
                    <motion.div variants={fadeUp} style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14, padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <Tag size={14} style={{ color: "var(--lk-muted)" }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--lk-text)" }}>Valores complementares</span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                        {(report.totalDescontos ?? 0) > 0 && (
                          <div>
                            <p style={{ fontSize: 10, color: "var(--lk-muted)", fontWeight: 500 }}>Descontos</p>
                            <p style={{ fontSize: 16, fontWeight: 800, color: "#f87171" }}>{fmtBRL(report.totalDescontos)}</p>
                          </div>
                        )}
                        {(report.totalTaxasEntrega ?? 0) > 0 && (
                          <div>
                            <p style={{ fontSize: 10, color: "var(--lk-muted)", fontWeight: 500 }}>Taxas de entrega</p>
                            <p style={{ fontSize: 16, fontWeight: 800, color: "var(--lk-text)" }}>{fmtBRL(report.totalTaxasEntrega)}</p>
                          </div>
                        )}
                        {(report.totalGorjetas ?? 0) > 0 && (
                          <div>
                            <p style={{ fontSize: 10, color: "var(--lk-muted)", fontWeight: 500 }}>Gorjetas</p>
                            <p style={{ fontSize: 16, fontWeight: 800, color: "#34d399" }}>{fmtBRL(report.totalGorjetas)}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Weekday bars */}
                  {report.faturamentoPorDiaSemana && Object.keys(report.faturamentoPorDiaSemana).length > 0 && (
                    <motion.div variants={fadeUp} style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14, padding: "18px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                        <CalendarDays size={14} style={{ color: "var(--lk-muted)" }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--lk-text)" }}>Faturamento por dia da semana</span>
                      </div>
                      {(() => {
                        const entries = WEEKDAYS_FULL.map(day => ({
                          day, revenue: report.faturamentoPorDiaSemana?.[day] ?? 0,
                          orders: report.pedidosPorDiaSemana?.[day] ?? 0,
                        })).filter(e => e.revenue > 0 || e.orders > 0);
                        const maxRev = Math.max(...entries.map(e => e.revenue), 1);
                        return (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {entries.map(({ day, revenue, orders }) => (
                              <div key={day} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ fontSize: 11, color: "var(--lk-muted)", fontWeight: 500, width: 36, flexShrink: 0 }}>{day.slice(0, 3)}</span>
                                <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.04)", borderRadius: 2, overflow: "hidden" }}>
                                  <motion.div
                                    initial={{ width: 0 }} animate={{ width: `${(revenue / maxRev) * 100}%` }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                    style={{ height: "100%", background: "var(--lk-accent)", borderRadius: 2 }}
                                  />
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--lk-text)", flexShrink: 0, minWidth: 80, textAlign: "right" }}>{fmtBRL(revenue)}</span>
                                <span style={{ fontSize: 10, color: "var(--lk-muted)", flexShrink: 0, minWidth: 32, textAlign: "right" }}>{orders}p</span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </motion.div>
                  )}
                </div>
              )}

              {/* ══ TAB: Horários ══════════════════════════════════════════ */}
              {activeTab === "schedule" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                  {/* Faixa grid */}
                  {faixaData && faixaTotal > 0 && (
                    <motion.div variants={fadeUp} style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14, padding: "18px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                        <Clock size={14} style={{ color: "var(--lk-muted)" }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--lk-text)" }}>Concentração por faixa de horário</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                        {FAIXAS.map(f => {
                          const d = faixaData[f.key];
                          if (!d) return null;
                          const pct = faixaTotal > 0 ? (d.orders / faixaTotal * 100) : 0;
                          return (
                            <div key={f.key} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--lk-border)", borderRadius: 10, padding: "14px 16px" }}>
                              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--lk-text)", marginBottom: 2 }}>{f.label}</p>
                              <p style={{ fontSize: 10, color: "var(--lk-muted)", marginBottom: 10 }}>{f.range}</p>
                              <p style={{ fontSize: 20, fontWeight: 800, color: "var(--lk-accent)", lineHeight: 1 }}>{pct.toFixed(0)}%</p>
                              <p style={{ fontSize: 10, color: "var(--lk-muted)", marginTop: 4 }}>{fmtCount(d.orders)} pedidos</p>
                              <p style={{ fontSize: 11, color: "var(--lk-text)", fontWeight: 600, marginTop: 2 }}>{fmtBRL(d.revenue)}</p>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* Heatmap */}
                  {report.heatmap && report.heatmap.length > 0 && (
                    <motion.div variants={fadeUp} style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14, padding: "18px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <BarChart3 size={14} style={{ color: "var(--lk-muted)" }} />
                          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--lk-text)" }}>Mapa de calor — horários</span>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          {(["orders", "revenue"] as const).map(m => (
                            <button key={m} onClick={() => setHeatmapMetric(m)}
                              style={{ fontSize: 11, fontWeight: 500, padding: "5px 12px", borderRadius: 8, cursor: "pointer", transition: "all 0.15s",
                                background: heatmapMetric === m ? "var(--lk-accent)" : "rgba(255,255,255,0.04)",
                                color: heatmapMetric === m ? "#fff" : "var(--lk-muted)",
                                border: `1px solid ${heatmapMetric === m ? "var(--lk-accent)" : "var(--lk-border)"}`,
                              }}>
                              {m === "orders" ? "Pedidos" : "Faturamento"}
                            </button>
                          ))}
                        </div>
                      </div>
                      <HeatmapGrid heatmap={report.heatmap} metric={heatmapMetric} />
                    </motion.div>
                  )}

                  {/* Hourly bars */}
                  {report.pedidosPorHora && Object.keys(report.pedidosPorHora).length > 0 && (
                    <motion.div variants={fadeUp} style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14, padding: "18px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                        <Clock size={14} style={{ color: "var(--lk-muted)" }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--lk-text)" }}>Distribuição horária</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        <HourlyBars data={report.pedidosPorHora} label="Pedidos por hora" />
                        {report.faturamentoPorHora && Object.keys(report.faturamentoPorHora).length > 0 && (
                          <HourlyBars data={report.faturamentoPorHora} label="Faturamento por hora (R$)" />
                        )}
                      </div>
                    </motion.div>
                  )}

                  {!report.heatmap && (!report.pedidosPorHora) && (
                    <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--lk-muted)", fontSize: 12 }}>
                      Dados de horário não disponíveis para este período.
                    </div>
                  )}
                </div>
              )}

              {/* ══ TAB: Pedidos ═══════════════════════════════════════════ */}
              {activeTab === "orders" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {report.pedidos_recentes && report.pedidos_recentes.length > 0 ? (
                    <motion.div variants={fadeUp} style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14, padding: "18px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <FileText size={14} style={{ color: "var(--lk-muted)" }} />
                          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--lk-text)" }}>Pedidos recentes</span>
                        </div>
                        <span style={{ fontSize: 11, color: "var(--lk-muted)" }}>{report.pedidos_recentes.length} pedidos</span>
                      </div>
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid var(--lk-border)" }}>
                              {["ID", "Data", "Status", "Total"].map(h => (
                                <th key={h} style={{ padding: "6px 8px", textAlign: h === "Total" ? "right" : "left", fontSize: 10, fontWeight: 600, color: "var(--lk-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'Space Mono', monospace" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(showOrdersAll ? report.pedidos_recentes : report.pedidos_recentes.slice(0, 5)).map((o, i) => {
                              const sc = STATUS_COLORS[o.status.toUpperCase()] ?? "#555566";
                              return (
                                <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                                  <td style={{ padding: "9px 8px", fontFamily: "'Space Mono', monospace", fontSize: 11, color: "var(--lk-muted)" }}>{o.id ? `#${o.id.slice(-6)}` : "—"}</td>
                                  <td style={{ padding: "9px 8px", color: "var(--lk-muted)" }}>{o.date ? fmtDay(o.date) : "—"}</td>
                                  <td style={{ padding: "9px 8px" }}>
                                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: `${sc}18`, color: sc, border: `1px solid ${sc}30` }}>
                                      {translateStatus(o.status)}
                                    </span>
                                  </td>
                                  <td style={{ padding: "9px 8px", textAlign: "right", fontWeight: 700, color: "var(--lk-text)" }}>{fmtBRL(o.total)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {report.pedidos_recentes.length > 5 && (
                        <button onClick={() => setShowOrdersAll(v => !v)}
                          style={{ marginTop: 12, fontSize: 12, color: "var(--lk-accent)", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                          <ChevronRight size={12} style={{ transform: showOrdersAll ? "rotate(90deg)" : "rotate(0)", transition: "transform 0.15s" }} />
                          {showOrdersAll ? "Mostrar menos" : `Ver todos (${report.pedidos_recentes.length})`}
                        </button>
                      )}
                    </motion.div>
                  ) : (
                    <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--lk-muted)", fontSize: 12 }}>
                      Nenhum pedido recente disponível.
                    </div>
                  )}
                </div>
              )}

              {/* ══ TAB: Produtos ══════════════════════════════════════════ */}
              {activeTab === "products" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {report.produtos_mais_vendidos && report.produtos_mais_vendidos.length > 0 ? (
                    <motion.div variants={fadeUp} style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14, padding: "18px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                        <TrendingUp size={14} style={{ color: "var(--lk-muted)" }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--lk-text)" }}>Produtos mais vendidos</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {report.produtos_mais_vendidos.slice(0, 10).map((p, i) => {
                          const maxQty = report.produtos_mais_vendidos![0].qty || 1;
                          return (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ width: 20, height: 20, borderRadius: 6, background: "rgba(123,110,246,0.15)", color: "var(--lk-accent)", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                              <span style={{ flex: 1, fontSize: 13, color: "var(--lk-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                              <div style={{ width: 80, height: 4, background: "rgba(255,255,255,0.04)", borderRadius: 2, overflow: "hidden", flexShrink: 0 }}>
                                <div style={{ height: "100%", width: `${(p.qty / maxQty) * 100}%`, background: "var(--lk-accent)", borderRadius: 2 }} />
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--lk-text)", flexShrink: 0, minWidth: 30, textAlign: "right" }}>{p.qty}</span>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div variants={fadeUp} style={{ padding: "40px 20px", textAlign: "center", background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14 }}>
                      <TrendingUp size={32} style={{ color: "var(--lk-border)", margin: "0 auto 12px" }} />
                      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--lk-text)", marginBottom: 6 }}>Produtos não disponíveis</p>
                      <p style={{ fontSize: 12, color: "var(--lk-muted)", maxWidth: 320, margin: "0 auto" }}>
                        {report.topItemsReason ?? "Os itens não vieram na resposta do endpoint /v1/orders."}
                      </p>
                    </motion.div>
                  )}
                </div>
              )}

              {/* ══ TAB: Diagnóstico ═══════════════════════════════════════ */}
              {activeTab === "diagnostics" && (
                <motion.div variants={fadeUp} style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14, padding: "18px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <Info size={14} style={{ color: "var(--lk-muted)" }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--lk-text)" }}>Diagnóstico técnico da integração</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 11, fontFamily: "'Space Mono', monospace", color: "var(--lk-muted)", lineHeight: 1.7 }}>
                    <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Endpoint:</span> /v1/orders</p>
                    <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Período:</span> {PERIODS.find(p => p.value === period)?.label ?? period}</p>
                    <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Pedidos únicos:</span> {report.total_pedidos}</p>
                    <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Completude:</span> {report.completeness ?? "—"}</p>
                    {report.cacheHit && <p style={{ color: "var(--lk-accent)" }}>Cache do servidor (TTL 5 min). Use force_refresh=1 para forçar nova coleta.</p>}

                    {report.windowDiag && (
                      <>
                        <hr style={{ border: "none", borderTop: "1px solid var(--lk-border)", margin: "4px 0" }} />
                        <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Motivo do windowing:</span> {report.windowDiag.paginationFallbackReason === "repeated_page" ? "Página 2 repetiu página 1" : report.windowDiag.paginationFallbackReason === "requested_page_ignored" ? "Provider ignorou page[number]" : "—"}</p>
                        <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Datetime ISO aceito:</span> {report.windowDiag.datetimeFiltersSupported === null ? "—" : report.windowDiag.datetimeFiltersSupported ? "Sim" : "Não — fallback diário"}</p>
                        <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Fallback diário:</span> {report.windowDiag.dailyFallbackUsed ? "Sim" : "Não"}</p>
                        <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Janelas:</span> {report.windowDiag.totalWindows} total · {report.windowDiag.resolvedWindows} resolvidas · {report.windowDiag.partialWindows} parciais · {report.windowDiag.failedWindows} falhas</p>
                        <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Requisições:</span> {report.windowDiag.requestsMade}</p>
                        {report.windowDiag.targetTotal !== null && <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Total do provider:</span> {report.windowDiag.targetTotal}</p>}
                        <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Dedup:</span> {report.windowDiag.uniqueCount} únicos de {report.windowDiag.rawCount} brutos · {report.windowDiag.duplicateCount} removidos{report.windowDiag.missingIdCount > 0 ? ` · ${report.windowDiag.missingIdCount} sem ID` : ""}</p>
                        {report.windowDiag.rateLimitStopped && <p style={{ color: "#fbbf24", fontWeight: 700 }}>⚠ Coleta interrompida por rate limit.</p>}
                        <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Auth mode:</span> {report.windowDiag.authMode}</p>
                        <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Tempo de coleta:</span> {report.windowDiag.executionMs}ms</p>
                        {report.windowDiag.completeDays !== undefined && <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Dias completos:</span> {report.windowDiag.completeDays} · parciais: {report.windowDiag.partialDays ?? 0}</p>}

                        {/* Per-day diagnostics table */}
                        {report.windowDiag.dailyDiagnostics && report.windowDiag.dailyDiagnostics.length > 0 && (
                          <>
                            <details style={{ marginTop: 8 }}>
                              <summary style={{ cursor: "pointer", color: "var(--lk-accent)", fontWeight: 600 }}>Detalhes por dia ({report.windowDiag.dailyDiagnostics.length})</summary>
                              <div style={{ marginTop: 8, overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                                  <thead>
                                    <tr style={{ borderBottom: "1px solid var(--lk-border)" }}>
                                      {["Data","Total","Páginas","Únicos","Dupl","Status"].map(h => (
                                        <th key={h} style={{ padding: "4px 6px", textAlign: "left", color: "var(--lk-muted)" }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {report.windowDiag.dailyDiagnostics.map(day => (
                                      <tr key={day.date} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                                        <td style={{ padding: "4px 6px" }}>{day.date}</td>
                                        <td style={{ padding: "4px 6px" }}>{day.providerTotal ?? "—"}</td>
                                        <td style={{ padding: "4px 6px" }}>{day.pagesFetched}/{day.expectedPages}</td>
                                        <td style={{ padding: "4px 6px" }}>{day.uniqueOrders}</td>
                                        <td style={{ padding: "4px 6px" }}>{day.duplicateOrders}</td>
                                        <td style={{ padding: "4px 6px", color: day.complete ? "#34d399" : day.repeatedPageDetected ? "#fbbf24" : "#f87171" }}>
                                          {day.complete ? "✓" : day.repeatedPageDetected ? "repetida" : "parcial"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </details>
                          </>
                        )}
                      </>
                    )}

                    {report.pagination && (
                      <>
                        <hr style={{ border: "none", borderTop: "1px solid var(--lk-border)", margin: "4px 0" }} />
                        <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Paginação:</span> {report.pagination.paginationMode}</p>
                        <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Convenção:</span> {report.pagination.conventionUsed}</p>
                        {report.pagination.pagesFetched > 0 && <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Requisições:</span> {report.pagination.pagesFetched}</p>}
                        {report.pagination.providerReportedTotalRaw !== null && <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Total provider:</span> {report.pagination.providerReportedTotalRaw} (escopo: {report.pagination.providerTotalScope ?? "?"})</p>}
                        {report.pagination.hasMore && <p style={{ color: "#fbbf24", fontWeight: 700 }}>⚠ Há mais pedidos além do retornado.</p>}
                        {report.pagination.dedup && <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Dedup:</span> {report.pagination.dedup.uniqueCount} únicos de {report.pagination.dedup.rawCount} brutos{report.pagination.dedup.duplicateCount > 0 ? ` · ${report.pagination.dedup.duplicateCount} removidos` : ""}</p>}
                      </>
                    )}

                    {report.debugShape && (
                      <>
                        <hr style={{ border: "none", borderTop: "1px solid var(--lk-border)", margin: "4px 0" }} />
                        <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Formato:</span> {report.debugShape.topLevelType} · chave: {report.debugShape.listKeyUsed}</p>
                        {report.debugShape.firstOrderKeys.length > 0 && <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Campos do pedido:</span> {report.debugShape.firstOrderKeys.join(", ")}</p>}
                      </>
                    )}

                    {report.snapshotPersistence && (
                      <p style={{ color: report.snapshotPersistence === "saved" ? "#34d399" : report.snapshotPersistence === "error" ? "#f87171" : report.snapshotPersistence === "skipped_incomplete" ? "#fbbf24" : "var(--lk-muted)" }}>
                        <span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Snapshot:</span>{" "}
                        {{saved:"Salvo com sucesso", not_configured:"Tabela não configurada", skipped:"Ignorado (sem dados)", skipped_incomplete:"Não salvo — coleta incompleta", error:"Erro ao salvar snapshot"}[report.snapshotPersistence]}
                      </p>
                    )}

                    <div style={{ marginTop: 8, paddingTop: 10, borderTop: "1px solid var(--lk-border)" }}>
                      <button
                        onClick={() => {
                          const lines = [
                            `Diagnóstico OlaClick — ${new Date().toISOString()}`,
                            `Endpoint: /v1/orders`, `Período: ${PERIODS.find(p => p.value === period)?.label ?? period}`,
                            `Pedidos únicos: ${report.total_pedidos}`, `Completude: ${report.completeness ?? "—"}`,
                          ];
                          if (report.windowDiag) {
                            lines.push(`Coleta: ${report.windowDiag.uniqueCount} de ${report.windowDiag.targetTotal ?? "?"} informados`);
                            lines.push(`Janelas: ${report.windowDiag.totalWindows} total, ${report.windowDiag.resolvedWindows} resolvidas`);
                            lines.push(`Fallback: ${report.windowDiag.paginationFallbackReason}`);
                            lines.push(`Datetime ISO: ${report.windowDiag.datetimeFiltersSupported ?? "?"}`);
                            lines.push(`Requisições: ${report.windowDiag.requestsMade}`);
                            lines.push(`Dedup: ${report.windowDiag.rawCount} brutos → ${report.windowDiag.uniqueCount} únicos (${report.windowDiag.duplicateCount} removidos)`);
                            lines.push(`Tempo: ${report.windowDiag.executionMs}ms`);
                          }
                          void navigator.clipboard.writeText(lines.join("\n")).then(() => alert("Diagnóstico copiado."));
                        }}
                        style={{ fontSize: 11, color: "var(--lk-accent)", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}
                      >
                        Copiar diagnóstico para suporte
                      </button>
                      <p style={{ marginTop: 6, color: "var(--lk-muted)", fontSize: 10 }}>Última sincronização: {fmtDate(lastSync)}</p>
                    </div>
                  </div>
                </motion.div>
              )}

            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}

      {/* CSS keyframes for spin */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
