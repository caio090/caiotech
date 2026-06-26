"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import {
  CheckCircle2, XCircle, AlertCircle, Loader2, RefreshCw,
  Link2, Link2Off, AtSign, Bot, Palette, BarChart3, HardDrive,
  ChevronRight, Clock, Zap, ExternalLink, TrendingUp, MapPin,
} from "lucide-react";

// ── Tipos ──────────────────────────────────────────────────────
type MetaResponse = {
  ok: boolean;
  configured: {
    META_APP_ID: boolean;
    META_APP_SECRET: boolean;
    META_REDIRECT_URI: boolean;
    META_API_VERSION: boolean;
  };
  connected: boolean;
  canConnect: boolean;
  sqlPending: boolean;
  message: string;
} | null;

type AiResponse = { openaiConfigured: boolean; environment: string } | null;

type InsightsResponse = {
  ok: boolean;
  reason?: string;
  message?: string;
  connection?: {
    id: string;
    page_id: string | null;
    page_name: string | null;
    instagram_business_account_id: string | null;
    instagram_username: string | null;
  };
  metrics_available?: string[];
  publish_available?: boolean;
  publish_note?: string;
} | null;

// ── Badge helpers ──────────────────────────────────────────────
function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
      <CheckCircle2 className="w-3 h-3" /> {label}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
      <Clock className="w-3 h-3" /> {label}
    </span>
  );
}

function ComingSoonBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
      <Zap className="w-3 h-3" /> Em breve
    </span>
  );
}

// ── Componente interno (usa useSearchParams — precisa de Suspense) ──
function ConexoesContent() {
  const searchParams = useSearchParams();

  // Mensagens vindas do callback OAuth
  const metaOk   = searchParams.get("meta_ok");
  const metaWarn = searchParams.get("meta_warn");
  const metaErr  = searchParams.get("meta_error");

  // ── Estados ────────────────────────────────────────────────
  const [aiData,      setAiData]      = useState<AiResponse>(null);
  const [aiLoading,   setAiLoading]   = useState(false);
  const [aiTested,    setAiTested]    = useState(false);

  const [metaData,    setMetaData]    = useState<MetaResponse>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaTested,  setMetaTested]  = useState(false);

  const [insightsData,    setInsightsData]    = useState<InsightsResponse>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsTested,  setInsightsTested]  = useState(false);

  // ── Checagens ──────────────────────────────────────────────
  const checkAi = useCallback(async () => {
    setAiLoading(true);
    try {
      const res  = await fetch("/api/ai/status");
      const json = await res.json() as AiResponse;
      setAiData(json); setAiTested(true);
    } catch { setAiData(null); setAiTested(true); }
    finally { setAiLoading(false); }
  }, []);

  const checkMeta = useCallback(async () => {
    setMetaLoading(true);
    try {
      const res  = await fetch("/api/meta/status");
      const json = await res.json() as MetaResponse;
      setMetaData(json); setMetaTested(true);
    } catch { setMetaData(null); setMetaTested(true); }
    finally { setMetaLoading(false); }
  }, []);

  const checkInsights = useCallback(async () => {
    setInsightsLoading(true);
    try {
      const res  = await fetch("/api/meta/insights");
      const json = await res.json() as InsightsResponse;
      setInsightsData(json); setInsightsTested(true);
    } catch { setInsightsData(null); setInsightsTested(true); }
    finally { setInsightsLoading(false); }
  }, []);

  // Carrega tudo ao montar
  useEffect(() => {
    void checkAi();
    void checkMeta();
  }, [checkAi, checkMeta]);

  // ── Status Meta derivado ───────────────────────────────────
  const metaEnvOk     = metaTested && !!metaData?.canConnect;
  const metaConnected = insightsTested && insightsData?.ok === true;
  const metaReason: string = !metaTested
    ? "checking"
    : !metaData?.ok
      ? "env_missing"
      : metaData.sqlPending
        ? "sql_pending"
        : metaData.connected
          ? "connected"
          : !insightsTested
            ? "env_ok"
            : insightsData?.reason ?? "env_ok";

  const metaStatusLabel = () => {
    if (!metaTested || metaLoading) return "Verificando...";
    if (metaData?.message) return metaData.message;
    return "Verificando...";
  };

  const metaColor = () => {
    if (!metaTested) return "gray";
    if (!metaData?.ok) return "red";
    if (metaConnected || metaData?.connected) return "emerald";
    if (metaReason === "token_expired") return "red";
    if (metaReason === "sql_pending" || metaData?.sqlPending) return "amber";
    return "blue";
  };

  const colorMap: Record<string, string> = {
    gray:    "text-gray-500 bg-gray-50 border-gray-100",
    red:     "text-red-700 bg-red-50 border-red-100",
    emerald: "text-emerald-700 bg-emerald-50 border-emerald-100",
    amber:   "text-amber-700 bg-amber-50 border-amber-100",
    blue:    "text-blue-700 bg-blue-50 border-blue-100",
  };

  const metaIconColor = () => {
    const c = metaColor();
    return c === "emerald" ? "text-emerald-500" : c === "red" ? "text-red-400" : c === "amber" ? "text-amber-500" : "text-gray-400";
  };

  return (
    <div>
      <PageHeader
        title="Conexoes"
        description="Integracoes externas da LOKAT OS"
      />

      {/* ── Mensagens do callback OAuth ── */}
      {metaOk && (
        <div className="max-w-2xl mb-4 p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-emerald-800">{decodeURIComponent(metaOk)}</p>
        </div>
      )}
      {metaWarn && (
        <div className="max-w-2xl mb-4 p-3.5 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-800">{decodeURIComponent(metaWarn)}</p>
        </div>
      )}
      {metaErr && (
        <div className="max-w-2xl mb-4 p-3.5 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-2.5">
          <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{decodeURIComponent(metaErr)}</p>
        </div>
      )}

      <div className="max-w-2xl space-y-4">

        {/* ══ CARD: OpenAI ══════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Bot className={`w-5 h-5 ${aiTested && aiData?.openaiConfigured ? "text-violet-500" : "text-gray-400"}`} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">OpenAI</p>
                <p className="text-xs text-gray-400">Motor de IA da LOKAT OS</p>
              </div>
            </div>
            {aiTested
              ? <StatusBadge ok={!!aiData?.openaiConfigured} label={aiData?.openaiConfigured ? "Configurado" : "Nao configurado"} />
              : <span className="text-xs text-gray-400">Verificando...</span>
            }
          </div>

          <div className="space-y-1 mb-4 text-xs text-gray-500">
            <p className="flex items-center gap-1.5">
              <ChevronRight className="w-3 h-3 text-violet-400" />
              Diagnostico com IA, briefings, legendas e sugestoes de conteudo
            </p>
            <p className="flex items-center gap-1.5">
              <ChevronRight className="w-3 h-3 text-violet-400" />
              Lokat Voice — assistente de voz no painel
            </p>
          </div>

          {aiTested && aiData?.openaiConfigured && (
            <p className="text-xs text-gray-400 mb-3">
              Ambiente: <span className="font-medium text-gray-600">{aiData.environment}</span>
            </p>
          )}
          {aiTested && !aiData?.openaiConfigured && (
            <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-600 mb-3">
              Adicione <code className="font-mono bg-white border border-gray-200 px-1 rounded">OPENAI_API_KEY</code> no painel da Vercel e faca redeploy.
            </div>
          )}

          <button
            onClick={() => void checkAi()}
            disabled={aiLoading}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
          >
            {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Testar configuracao
          </button>
        </div>

        {/* ══ CARD: Meta / Instagram ════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${metaColor() === "emerald" ? "bg-emerald-50" : metaColor() === "red" ? "bg-red-50" : metaColor() === "amber" ? "bg-amber-50" : metaColor() === "blue" ? "bg-blue-50" : "bg-gray-50"}`}>
                <AtSign className={`w-5 h-5 ${metaIconColor()}`} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">Meta / Instagram</p>
                <p className="text-xs text-gray-400">Instagram Business, Paginas e Campanhas</p>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1 text-xs font-medium border px-2 py-0.5 rounded-full flex-shrink-0 ${colorMap[metaColor()]}`}>
              {metaLoading
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Verificando</>
                : metaColor() === "emerald"
                  ? <><CheckCircle2 className="w-3 h-3" /> Conectado</>
                  : metaColor() === "red"
                    ? <><XCircle className="w-3 h-3" /> Nao configurado</>
                    : metaColor() === "amber"
                      ? <><AlertCircle className="w-3 h-3" /> Aguardando SQL</>
                      : metaColor() === "blue"
                        ? <><Clock className="w-3 h-3" /> Aguardando conexao</>
                        : <><Clock className="w-3 h-3" /> —</>
              }
            </span>
          </div>

          {/* Status textual — usa a mensagem segura do servidor */}
          <p className="text-xs text-gray-500 mb-3">{metaStatusLabel()}</p>

          {/* Status por variável de ambiente */}
          {metaTested && metaData && !metaData.ok && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 mb-3 space-y-1">
              <p className="font-semibold mb-1">Variaveis ausentes:</p>
              {Object.entries(metaData.configured).map(([key, val]) => (
                <p key={key} className="flex items-center gap-1.5">
                  {val
                    ? <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                    : <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                  }
                  <code className="font-mono">{key}</code>
                </p>
              ))}
              <p className="mt-1 text-red-600">Adicione as variaveis no painel da Vercel e faca redeploy.</p>
            </div>
          )}

          {/* Aviso SQL 35 */}
          {metaTested && metaData?.sqlPending && (
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800 mb-3">
              Variaveis configuradas. Para salvar conexoes, rode o arquivo{" "}
              <code className="font-mono bg-white border border-amber-200 px-1 rounded">docs/supabase/35-meta-connections.sql</code>{" "}
              no Supabase SQL Editor.
            </div>
          )}

          {/* Funcionalidades */}
          <div className="space-y-1 mb-4 text-xs text-gray-500">
            {[
              { label: "Insights do Instagram", ready: metaConnected },
              { label: "Paginas do Facebook", ready: metaConnected },
              { label: "Meta Business Manager", ready: metaConnected },
              { label: "Publicacao automatica", ready: false, soon: true },
              { label: "Trafego e anuncios", ready: false, soon: true },
            ].map(({ label, ready, soon }) => (
              <p key={label} className="flex items-center gap-1.5">
                <ChevronRight className={`w-3 h-3 ${ready ? "text-emerald-500" : soon ? "text-amber-400" : "text-gray-300"}`} />
                <span className={ready ? "text-gray-700 font-medium" : ""}>{label}</span>
                {soon && <span className="text-amber-500 text-[10px]">· em breve</span>}
              </p>
            ))}
          </div>

          {/* Conta conectada */}
          {metaConnected && insightsData?.connection && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800 mb-3 space-y-1">
              {insightsData.connection.instagram_username && (
                <p>Instagram: <strong>@{insightsData.connection.instagram_username}</strong></p>
              )}
              {insightsData.connection.page_name && (
                <p>Pagina: <strong>{insightsData.connection.page_name}</strong></p>
              )}
            </div>
          )}

          {/* Instrucoes de conexao */}
          {metaTested && metaData?.ok && !metaConnected && (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 mb-3">
              Para conectar Meta/Instagram, clique em <strong>Conectar Meta</strong> abaixo.
              Voce sera levado para autenticacao da Meta e depois voltara para a LOKAT OS automaticamente.
            </div>
          )}

          {/* Acoes */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { void checkMeta(); void checkInsights(); }}
              disabled={metaLoading || insightsLoading}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {(metaLoading || insightsLoading) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Testar status
            </button>

            {metaEnvOk && !metaConnected && (
              <a
                href="/api/meta/connect"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-xl transition-colors"
              >
                <Link2 className="w-3.5 h-3.5" /> Conectar Meta
              </a>
            )}

            {metaConnected && (
              <>
                <button
                  onClick={() => void checkInsights()}
                  disabled={insightsLoading}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 px-3 py-1.5 rounded-xl transition-colors"
                >
                  <BarChart3 className="w-3.5 h-3.5" /> Ver contas conectadas
                </button>
                <button
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 px-3 py-1.5 rounded-xl transition-colors"
                  onClick={() => alert("Desconectar: disponivel em breve. Para revogar, acesse facebook.com/settings > Apps e Sites.")}
                >
                  <Link2Off className="w-3.5 h-3.5" /> Desconectar
                </button>
              </>
            )}

            {metaReason === "token_expired" && (
              <a
                href="/api/meta/connect"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-xl transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reconectar
              </a>
            )}
          </div>

          {/* Publicacao futura */}
          <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { label: "Insights",             status: metaConnected ? "Pronto" : "Conecte a Meta", ok: metaConnected },
              { label: "Publicacao automatica", status: "Em breve",          ok: false },
              { label: "Trafego / Anuncios",    status: "Em breve",          ok: false },
            ].map(({ label, status, ok }) => (
              <div key={label} className="p-2.5 bg-gray-50 rounded-xl">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                <p className={`text-xs font-medium ${ok ? "text-emerald-600" : "text-gray-400"}`}>{status}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ══ CARD: Canva ═══════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 opacity-75">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Palette className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">Canva</p>
                <p className="text-xs text-gray-400">Design e templates visuais</p>
              </div>
            </div>
            <ComingSoonBadge />
          </div>
          <p className="text-xs text-gray-500">
            Integracao direta com o Canva para criacao de posts, stories e artes — em breve.
          </p>
          <a
            href="/contentos/canva"
            className="inline-flex items-center gap-1.5 mt-3 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            Configurar no ContentOS <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* ══ CARD: Google Analytics ════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 opacity-75">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">Google Analytics</p>
                <p className="text-xs text-gray-400">Metricas de trafego e conversao</p>
              </div>
            </div>
            <ComingSoonBadge />
          </div>
          <p className="text-xs text-gray-500">
            Conecte o GA4 para visualizar metricas de trafego diretamente nos relatorios da LOKAT OS.
          </p>
        </div>

        {/* ══ CARD: Google Drive ════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 opacity-75">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <HardDrive className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">Google Drive</p>
                <p className="text-xs text-gray-400">Arquivos e ativos de campanha</p>
              </div>
            </div>
            <ComingSoonBadge />
          </div>
          <p className="text-xs text-gray-500">
            Integre o Drive para anexar arquivos de campanha, artes e documentos diretamente nos projetos.
          </p>
        </div>

        {/* ══ CARD: Google Ads ══════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 opacity-75">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">Google Ads</p>
                <p className="text-xs text-gray-400">Campanhas de trafego pago</p>
              </div>
            </div>
            <ComingSoonBadge />
          </div>
          <p className="text-xs text-gray-500 mb-2">
            Conecte o Google Ads para monitorar campanhas, custo por clique e conversoes diretamente no painel.
          </p>
          <div className="space-y-1 text-xs text-gray-400">
            <p className="flex items-center gap-1.5"><ChevronRight className="w-3 h-3" /> Performance de campanhas — em breve</p>
            <p className="flex items-center gap-1.5"><ChevronRight className="w-3 h-3" /> Custo por resultado — em breve</p>
            <p className="flex items-center gap-1.5"><ChevronRight className="w-3 h-3" /> Relatorio integrado — em breve</p>
          </div>
        </div>

        {/* ══ CARD: Google Meu Negócio ══════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 opacity-75">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">Google Meu Negocio</p>
                <p className="text-xs text-gray-400">Presenca local e avaliacoes</p>
              </div>
            </div>
            <ComingSoonBadge />
          </div>
          <p className="text-xs text-gray-500 mb-2">
            Gerencie a presenca local do cliente, responda avaliacoes e acompanhe buscas organicas por localizacao.
          </p>
          <div className="space-y-1 text-xs text-gray-400">
            <p className="flex items-center gap-1.5"><ChevronRight className="w-3 h-3" /> Avaliacoes e respostas — em breve</p>
            <p className="flex items-center gap-1.5"><ChevronRight className="w-3 h-3" /> Buscas e visualizacoes — em breve</p>
            <p className="flex items-center gap-1.5"><ChevronRight className="w-3 h-3" /> Posts no perfil local — em breve</p>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Export com Suspense (necessario para useSearchParams) ──────
export default function ConexoesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center gap-2 text-sm text-gray-400 p-8">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
      </div>
    }>
      <ConexoesContent />
    </Suspense>
  );
}
