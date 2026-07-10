"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Smartphone, RefreshCw, AlertTriangle, CheckCircle2,
  Users, Eye, MousePointerClick, TrendingUp, Info, Link2, ChevronDown,
} from "lucide-react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface StatusResponse {
  ok: boolean;
  hasLinkedAsset?: boolean;
  assetType?: string;
  username?: string;
  hasMetaConnection?: boolean;
  hasAccessToken?: boolean;
  canAttemptInsights?: boolean;
  missing?: string[];
  safeMessage?: string;
  tokenExpired?: boolean;
  scopes?: string[];
}

interface AdvancedMetricItem { label: string; value: number }

interface InsightsResponse {
  ok: boolean;
  assetType?: string;
  username?: string;
  metrics?: {
    reach?: number | null;
    views?: number | null;
    profile_views?: number | null;
    website_clicks?: number | null;
    followers_count?: number | null;
    page_impressions?: number | null;
    page_reach?: number | null;
  };
  availableMetrics?: string[];
  unavailableMetrics?: Array<{ metric: string; metricUnavailable: boolean; reason: string }>;
  reason?: string;
  safeMessage?: string;
  graphErrorCode?: number | null;
  graphErrorMessage?: string;
  missingPermissionsLikely?: string[];
  endpoint?: string;
  metricAttempted?: string;
  advanced?: {
    demographics?: { gender?: AdvancedMetricItem[]; age?: AdvancedMetricItem[] };
    locations?: { cities?: AdvancedMetricItem[]; countries?: AdvancedMetricItem[] };
    activity?: { onlineFollowersByHour?: AdvancedMetricItem[] };
    unavailable?: string[];
  };
}

type Period = "7d" | "15d" | "30d" | "current_month" | "custom";

const PERIOD_LABELS: Record<Period, string> = {
  "7d":            "7 dias",
  "15d":           "15 dias",
  "30d":           "30 dias",
  "current_month": "Mês atual (30d)",
  "custom":        "Personalizado",
};

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

// ── Componente ────────────────────────────────────────────────────────────────

export function MetaInsightsPanel({ clientId }: { clientId: string }) {
  const [period, setPeriod]       = useState<Period>("7d");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate]     = useState("");
  const [status, setStatus]       = useState<StatusResponse | null>(null);
  const [insights, setInsights]   = useState<InsightsResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [showDiag, setShowDiag] = useState(false);

  // Diagnóstico (chamado uma vez ao montar)
  useEffect(() => {
    let active = true;
    setLoadingStatus(true);
    fetch(`/api/meta/insights/status?client_id=${clientId}`)
      .then((r) => r.json())
      .then((d: StatusResponse) => { if (active) setStatus(d); })
      .catch(() => { if (active) setStatus({ ok: false, safeMessage: "Erro ao verificar status Meta." }); })
      .finally(() => { if (active) setLoadingStatus(false); });
    return () => { active = false; };
  }, [clientId]);

  // Insights (chamado quando período muda e status ok)
  const fetchInsights = useCallback(() => {
    if (!status?.canAttemptInsights) return;
    setLoadingInsights(true);
    setInsights(null);
    let url = `/api/meta/insights?client_id=${clientId}&period=${period}`;
    if (period === "custom" && startDate && endDate) {
      url += `&start_date=${startDate}&end_date=${endDate}`;
    }
    fetch(url)
      .then((r) => r.json())
      .then((d: InsightsResponse) => setInsights(d))
      .catch(() => setInsights({ ok: false, reason: "fetch_error", safeMessage: "Erro ao buscar insights." }))
      .finally(() => setLoadingInsights(false));
  }, [clientId, period, startDate, endDate, status]);

  useEffect(() => {
    if (status?.canAttemptInsights) fetchInsights();
  }, [fetchInsights, status]);

  // Auto-refresh insights a cada 5 min quando conectado
  useAutoRefresh({
    enabled: !!status?.canAttemptInsights,
    intervalMs: 300_000,
    onRefresh: fetchInsights,
    refreshOnMount: false,
  });

  // ── Loading inicial ────────────────────────────────────────────────────────
  if (loadingStatus) {
    return (
      <div className="mb-6 rounded-2xl border border-gray-100 bg-gray-50 p-4 flex items-center gap-3">
        <RefreshCw className="w-4 h-4 text-gray-300 animate-spin" />
        <span className="text-xs text-gray-400">Verificando conexão Meta…</span>
      </div>
    );
  }

  // ── Sem vínculo ────────────────────────────────────────────────────────────
  if (!status?.hasLinkedAsset) {
    return (
      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-5 h-5 text-gray-300" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-700">Meta ainda não vinculada a este cliente</p>
            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
              Vincule uma Página Facebook ou Instagram Business para liberar insights de alcance, visualizações e seguidores.
            </p>
          </div>
        </div>
        <a
          href="/admin/conexoes"
          className="inline-flex items-center gap-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors px-4 py-2 rounded-xl"
        >
          <Link2 className="w-3.5 h-3.5" />
          Ir para Conexões
        </a>
        {/* Diagnóstico colapsável */}
        <button
          onClick={() => setShowDiag((v) => !v)}
          className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ChevronDown className={`w-3 h-3 transition-transform ${showDiag ? "rotate-180" : ""}`} />
          Diagnóstico técnico
        </button>
        {showDiag && (
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-[10px] font-mono space-y-0.5 text-gray-500">
            <p><span className="text-gray-400">client_id: </span>{clientId}</p>
            <p><span className="text-gray-400">linkedAssetFound: </span>{String(!!status?.hasLinkedAsset)}</p>
            <p><span className="text-gray-400">hasMetaConnection: </span>{String(!!status?.hasMetaConnection)}</p>
            <p><span className="text-gray-400">safeMessage: </span>{status?.safeMessage ?? "—"}</p>
          </div>
        )}
      </div>
    );
  }

  // ── Vínculo encontrado mas não pode tentar insights ────────────────────────
  if (!status.canAttemptInsights) {
    return (
      <div className="mb-6 rounded-2xl border border-amber-100 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800">Meta vinculada — acesso bloqueado</p>
            {status.username && (
              <p className="text-[10px] text-amber-600 mt-0.5">
                {status.assetType === "instagram_business" ? "@" : ""}{status.username}
              </p>
            )}
            <p className="text-xs text-amber-700 mt-1.5">{status.safeMessage}</p>
            {(status.missing ?? []).length > 0 && (
              <div className="mt-2 space-y-0.5">
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Faltando:</p>
                {(status.missing ?? []).map((m) => (
                  <p key={m} className="text-[10px] font-mono text-amber-800 bg-amber-100 px-2 py-0.5 rounded inline-block mr-1">
                    {m}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Pode tentar insights ───────────────────────────────────────────────────
  return (
    <div className="mb-6 space-y-4">
      {/* Header com status */}
      <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
        <CheckCircle2 className="w-5 h-5 text-indigo-500 flex-shrink-0" strokeWidth={1.5} />
        <div className="flex-1">
          <p className="text-sm font-bold text-indigo-800">Meta conectada</p>
          {status.username && (
            <p className="text-[10px] text-indigo-600 mt-0.5">
              {status.assetType === "instagram_business" ? "@" : ""}{status.username}
            </p>
          )}
        </div>
        <button
          onClick={fetchInsights}
          disabled={loadingInsights}
          className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-900 transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-3 h-3 ${loadingInsights ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {/* Seletor de período */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all ${
              period === p
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Datas personalizadas */}
      {period === "custom" && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-gray-500 font-medium">De</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-gray-500 font-medium">Até</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>
          <button
            onClick={fetchInsights}
            disabled={!startDate || !endDate || loadingInsights}
            className="px-3 py-1.5 text-[11px] font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-40"
          >
            Aplicar
          </button>
        </div>
      )}

      {/* Loading insights */}
      {loadingInsights && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100">
          <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
          <span className="text-xs text-gray-400">Buscando insights na Meta…</span>
        </div>
      )}

      {/* Erro de permissão / API */}
      {insights && !insights.ok && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-800">
                {insights.reason === "token_expired_or_invalid"
                  ? "Token Meta expirado ou inválido"
                  : insights.reason === "permission_missing" || insights.reason === "permission_error"
                    ? "Meta conectada, mas o app ainda não tem permissão para ler esses insights"
                    : insights.reason === "rate_limit_or_throttle"
                      ? "Limite de requisições da Meta atingido"
                      : "Erro ao buscar insights da Meta"}
              </p>
              <p className="text-xs text-red-700 mt-1">{insights.safeMessage}</p>
            </div>
          </div>

          {/* Detalhes técnicos */}
          <div className="mt-2 rounded-xl bg-white border border-red-100 p-3 text-[10px] space-y-1 font-mono">
            {insights.endpoint && (
              <p><span className="text-gray-400">Endpoint: </span><span className="text-gray-700">{insights.endpoint}</span></p>
            )}
            {insights.metricAttempted && (
              <p><span className="text-gray-400">Métricas: </span><span className="text-gray-700">{insights.metricAttempted}</span></p>
            )}
            {insights.graphErrorCode != null && (
              <p><span className="text-gray-400">Código Graph: </span><span className="text-red-600">{insights.graphErrorCode}</span></p>
            )}
            {insights.graphErrorMessage && (
              <p><span className="text-gray-400">Mensagem: </span><span className="text-gray-700">{insights.graphErrorMessage}</span></p>
            )}
          </div>

          {(insights.missingPermissionsLikely ?? []).length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] font-bold text-red-700 uppercase tracking-wide mb-1">Permissões prováveis ausentes:</p>
              <div className="flex flex-wrap gap-1">
                {(insights.missingPermissionsLikely ?? []).map((p) => (
                  <span key={p} className="text-[10px] font-mono bg-red-100 text-red-800 px-2 py-0.5 rounded">{p}</span>
                ))}
              </div>
              <p className="text-[10px] text-red-600 mt-2">
                Próxima ação: acesse o Meta App Review ou reconecte a conta aceitando os escopos de insights.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Métricas reais */}
      {insights?.ok && insights.metrics && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {insights.assetType === "instagram_business" && (
              <>
                <MetricCard icon={TrendingUp}       label="Alcance"           value={fmt(insights.metrics.reach)}          color="text-pink-600 bg-pink-50" />
                <MetricCard icon={Eye}              label="Visualizações"     value={fmt(insights.metrics.views)}           color="text-indigo-600 bg-indigo-50" />
                {insights.metrics.followers_count != null && (
                  <MetricCard icon={Users} label="Seguidores" value={fmt(insights.metrics.followers_count)} color="text-emerald-600 bg-emerald-50" />
                )}
                <MetricCard icon={Eye}              label="Vis. de perfil"    value={fmt(insights.metrics.profile_views)}  color="text-sky-600 bg-sky-50" />
                <MetricCard icon={MousePointerClick} label="Cliques no site"  value={fmt(insights.metrics.website_clicks)} color="text-amber-600 bg-amber-50" />
              </>
            )}
            {insights.assetType === "facebook_page" && (
              <>
                <MetricCard icon={TrendingUp} label="Alcance"      value={fmt(insights.metrics.page_reach)}       color="text-blue-600 bg-blue-50" />
                <MetricCard icon={Eye}        label="Impressões"   value={fmt(insights.metrics.page_impressions)} color="text-indigo-600 bg-indigo-50" />
              </>
            )}
          </div>

          {/* Métricas indisponíveis */}
          {(insights.unavailableMetrics ?? []).length > 0 && (
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Métricas não disponíveis neste período</p>
                <div className="flex flex-wrap gap-1">
                  {(insights.unavailableMetrics ?? []).map(({ metric }) => (
                    <span key={metric} className="text-[10px] font-mono text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded">
                      {metric}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Meta respondeu, mas não há dados para esta métrica no período selecionado.</p>
              </div>
            </div>
          )}

          {/* Leitura do público */}
          {insights.assetType === "instagram_business" && (
            <AudienceSection advanced={insights.advanced} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Leitura do público ────────────────────────────────────────────────────────

function AudienceBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] text-gray-700">{label}</span>
        <span className="text-[11px] text-gray-400">{value.toLocaleString("pt-BR")}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function AudienceEmpty({ msg }: { msg: string }) {
  return <p className="text-[11px] text-gray-400">{msg}</p>;
}

function AudienceSection({ advanced }: { advanced?: InsightsResponse["advanced"] }) {
  const hasUnavailable = (advanced?.unavailable?.length ?? 0) > 0;

  const gender    = advanced?.demographics?.gender    ?? [];
  const age       = advanced?.demographics?.age       ?? [];
  const cities    = advanced?.locations?.cities       ?? [];
  const countries = advanced?.locations?.countries    ?? [];
  const hours     = advanced?.activity?.onlineFollowersByHour ?? [];

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <p className="text-xs font-black text-gray-700 mb-1">Leitura do público</p>

      {hasUnavailable && (
        <p className="text-[10px] text-gray-400 mb-4">
          Alguns dados avançados dependem da disponibilidade da conta e das permissões conectadas.
        </p>
      )}

      <div className="space-y-5 mt-3">
        {/* Gênero */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Gênero</p>
          {gender.length > 0 ? (
            <div className="space-y-2">
              {gender.map((item) => (
                <AudienceBar
                  key={item.label}
                  label={item.label === "F" ? "Feminino" : item.label === "M" ? "Masculino" : item.label}
                  value={item.value}
                  max={gender[0]?.value ?? 1}
                />
              ))}
            </div>
          ) : (
            <AudienceEmpty msg="Dados de gênero ainda indisponíveis para esta conta ou período." />
          )}
        </div>

        {/* Faixa etária */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Faixa etária</p>
          {age.length > 0 ? (
            <div className="space-y-2">
              {age.map((item) => (
                <AudienceBar
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  max={age[0]?.value ?? 1}
                />
              ))}
            </div>
          ) : (
            <AudienceEmpty msg="Dados de idade ainda indisponíveis para esta conta ou período." />
          )}
        </div>

        {/* Cidades */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Principais cidades</p>
          {cities.length > 0 ? (
            <div className="space-y-2">
              {cities.map((item) => (
                <AudienceBar
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  max={cities[0]?.value ?? 1}
                />
              ))}
            </div>
          ) : (
            <AudienceEmpty msg="Dados de cidades ainda indisponíveis para esta conta ou período." />
          )}
        </div>

        {/* Países */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Países</p>
          {countries.length > 0 ? (
            <div className="space-y-2">
              {countries.map((item) => (
                <AudienceBar
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  max={countries[0]?.value ?? 1}
                />
              ))}
            </div>
          ) : (
            <AudienceEmpty msg="Dados de países ainda indisponíveis para esta conta ou período." />
          )}
        </div>

        {/* Horários ativos */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Horários mais ativos</p>
          {hours.length > 0 ? (
            <div className="space-y-2">
              {hours.map((item) => (
                <AudienceBar
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  max={hours[0]?.value ?? 1}
                />
              ))}
            </div>
          ) : (
            <AudienceEmpty msg="Dados de horários ainda indisponíveis para esta conta ou período." />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Card de métrica ───────────────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <div className={`w-7 h-7 rounded-xl flex items-center justify-center mb-2 ${color.split(" ")[1]}`}>
        <Icon className={`w-3.5 h-3.5 ${color.split(" ")[0]}`} strokeWidth={1.5} />
      </div>
      <p className="text-xl font-black text-gray-900">{value}</p>
      <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}
