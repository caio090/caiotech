"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import {
  CheckCircle2, XCircle, AlertCircle, Loader2, RefreshCw,
  Link2, Link2Off, AtSign, Bot, Palette, BarChart3, HardDrive,
  ChevronRight, Clock, Zap, TrendingUp, MapPin, Copy, Info,
  ShieldCheck, CalendarDays, User, Globe, Layers,
  UtensilsCrossed, X, Eye, EyeOff, ShieldAlert, Lock, ChevronDown,
} from "lucide-react";

// ── Tipos ──────────────────────────────────────────────────────
type MetaStatusResponse = {
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
  redirectConfigured?: boolean;
  redirectHost?: string | null;
  hasLocalhostRedirect?: boolean;
  missing?: string[];
} | null;

type AiResponse = { openaiConfigured: boolean; environment: string } | null;

type InsightsConnection = {
  id: string;
  meta_user_id: string | null;
  page_id: string | null;
  page_name: string | null;
  instagram_business_account_id: string | null;
  instagram_username: string | null;
  created_at: string | null;
  api_version: string;
};

type InsightsResponse = {
  ok: boolean;
  reason?: string;
  message?: string;
  connection?: InsightsConnection;
  metrics_available?: string[];
  publish_available?: boolean;
  publish_note?: string;
} | null;

type MetaPage = {
  id: string;
  name: string;
  picture_url: string | null;
  instagram: {
    id: string;
    name: string | null;
    username: string | null;
    picture_url: string | null;
  } | null;
};

type AccountsResponse = {
  ok: boolean;
  reason?: string;
  message?: string;
  connection_id?: string;
  pages?: MetaPage[];
  instagram_accounts?: { id: string; name: string | null; username: string | null; picture_url: string | null }[];
  total_pages?: number;
  total_instagram?: number;
} | null;

// ── Helpers visuais ────────────────────────────────────────────
function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
      <CheckCircle2 className="w-3 h-3" /> {label}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
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

function StepRow({
  ok, label, detail,
}: { ok: boolean | null; label: string; detail?: string }) {
  return (
    <div className="flex items-start gap-2">
      {ok === null
        ? <Clock className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mt-0.5" />
        : ok
          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
          : <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
      }
      <div>
        <p className={`text-xs font-medium leading-tight ${ok ? "text-gray-700" : ok === false ? "text-red-700" : "text-gray-400"}`}>
          {label}
        </p>
        {detail && <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{detail}</p>}
      </div>
    </div>
  );
}

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { void navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 transition-colors whitespace-nowrap"
    >
      <Copy className="w-3 h-3" /> {copied ? "Copiado!" : "Copiar"}
    </button>
  );
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return "—"; }
}

// ── Modal OlaClick ─────────────────────────────────────────────
function OlaClickModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [clientId,   setClientId]   = useState("");
  const [connName,   setConnName]   = useState("");
  const [token,      setToken]      = useState("");
  const [notes,      setNotes]      = useState("");
  const [showToken,  setShowToken]  = useState(false);
  const [showSteps,  setShowSteps]  = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");

  async function handleSave() {
    if (!clientId || !connName || !token) { setError("Preencha todos os campos obrigatórios."); return; }
    setSaving(true);
    setError("");
    try {
      const r = await fetch("/api/olaclick/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, connection_name: connName, access_token: token, notes }),
      });
      const d = await r.json() as { ok: boolean; reason?: string; message?: string };
      if (d.ok) { onSaved(); onClose(); }
      else if (d.reason === "sql_pending") { setError("SQL 39 pendente. Rode docs/supabase/39-olaclick-connections.sql no Supabase."); }
      else { setError(d.message ?? "Erro ao salvar conexão."); }
    } catch { setError("Erro de rede. Tente novamente."); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center">
              <UtensilsCrossed className="w-4 h-4 text-orange-500" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Conectar Cardápio Digital</p>
              <p className="text-[10px] text-gray-400">via OlaClick</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Aviso de segurança */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
            <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-700">
              Se o token apareceu em print ou conversa, revogue e gere outro no OlaClick antes de conectar.
            </p>
          </div>

          {/* Cliente */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">ID do cliente <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Cole o client_id do cliente na LOKAT OS"
              className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-orange-400"
            />
            <p className="text-[10px] text-gray-400 mt-1">Encontre em Clientes → selecione o cliente → copie o ID da URL.</p>
          </div>

          {/* Nome da conexão */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Nome da conexão <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={connName}
              onChange={(e) => setConnName(e.target.value)}
              placeholder="Ex: Duh Lanches — OlaClick"
              className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-orange-400"
            />
          </div>

          {/* Token */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Token OlaClick <span className="text-red-500">*</span></label>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Cole o token gerado no OlaClick"
                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2.5 pr-10 outline-none focus:border-orange-400 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" />Token salvo criptografado. Não aparece em tela após salvar.
            </p>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Observações internas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas sobre essa conexão..."
              rows={2}
              className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none resize-none focus:border-orange-400"
            />
          </div>

          {/* Como gerar token — accordion */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowSteps((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <span className="text-xs font-semibold text-gray-700">Como gerar token no OlaClick</span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showSteps ? "rotate-180" : ""}`} />
            </button>
            {showSteps && (
              <div className="p-4 space-y-2 text-xs text-gray-600">
                {[
                  "Acesse o painel OlaClick.",
                  "Vá em Integrações.",
                  "Clique em API Keys.",
                  "Clique em Gerar novo token.",
                  "Marque permissões de leitura: menu:read, orders:read, clients:read e companies:read.",
                  "Copie o token gerado.",
                  "Cole aqui na LOKAT OS.",
                  "Clique em Salvar e testar conexão.",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-4 h-4 bg-orange-100 text-orange-700 text-[9px] font-black rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
              <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-xs font-medium text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button
              onClick={() => void handleSave()}
              disabled={saving || !clientId || !connName || !token}
              className="flex-1 py-2.5 bg-orange-500 text-white text-xs font-bold rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
              {saving ? "Salvando..." : "Salvar conexão"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────
function ConexoesContent() {
  const searchParams = useSearchParams();
  const flashOk   = searchParams.get("meta_ok");
  const flashWarn = searchParams.get("meta_warn");
  const flashErr  = searchParams.get("meta_error");

  const [aiData,    setAiData]    = useState<AiResponse>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTested,  setAiTested]  = useState(false);

  const [metaStatus,    setMetaStatus]    = useState<MetaStatusResponse>(null);
  const [metaLoading,   setMetaLoading]   = useState(false);
  const [metaTested,    setMetaTested]    = useState(false);

  const [insights,        setInsights]        = useState<InsightsResponse>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsTested,  setInsightsTested]  = useState(false);
  const [showInsightsBox, setShowInsightsBox] = useState(false);

  const [showSetup, setShowSetup] = useState(false);

  const [accounts,        setAccounts]        = useState<AccountsResponse>(null);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsTested,  setAccountsTested]  = useState(false);

  const [showOlaModal, setShowOlaModal] = useState(false);
  const [olaConnected, setOlaConnected] = useState(false);

  // ── Fetches ────────────────────────────────────────────────
  const checkAi = useCallback(async () => {
    setAiLoading(true);
    try {
      setAiData(await fetch("/api/ai/status").then((r) => r.json()) as AiResponse);
      setAiTested(true);
    } catch { setAiTested(true); }
    finally { setAiLoading(false); }
  }, []);

  const checkMeta = useCallback(async () => {
    setMetaLoading(true);
    try {
      setMetaStatus(await fetch("/api/meta/status").then((r) => r.json()) as MetaStatusResponse);
      setMetaTested(true);
    } catch { setMetaTested(true); }
    finally { setMetaLoading(false); }
  }, []);

  const checkInsights = useCallback(async () => {
    setInsightsLoading(true);
    try {
      setInsights(await fetch("/api/meta/insights").then((r) => r.json()) as InsightsResponse);
      setInsightsTested(true);
    } catch { setInsightsTested(true); }
    finally { setInsightsLoading(false); }
  }, []);

  const checkAccounts = useCallback(async () => {
    setAccountsLoading(true);
    try {
      setAccounts(await fetch("/api/meta/accounts").then((r) => r.json()) as AccountsResponse);
      setAccountsTested(true);
    } catch { setAccountsTested(true); }
    finally { setAccountsLoading(false); }
  }, []);

  // Carrega tudo ao montar, incluindo insights
  useEffect(() => {
    void checkAi();
    void checkMeta();
    void checkInsights();
  }, [checkAi, checkMeta, checkInsights]);

  // Busca ativos da Meta após confirmar conexão
  useEffect(() => {
    if (insightsTested && insights?.ok) {
      void checkAccounts();
    }
  }, [insightsTested, insights?.ok, checkAccounts]);

  // ── Estado derivado Meta ───────────────────────────────────
  // Considera conectado se: status route diz connected=true OU insights ok
  const isConnected = Boolean(
    (metaTested && metaStatus?.connected) ||
    (insightsTested && insights?.ok)
  );
  const insightReason = insights?.reason ?? "";
  const envOk  = metaTested && !!metaStatus?.ok;
  const sqlOk  = metaTested && !metaStatus?.sqlPending;
  const conn   = insights?.connection;

  const isDomainError = Boolean(
    flashErr &&
    (flashErr.toLowerCase().includes("domain") ||
     flashErr.toLowerCase().includes("url") ||
     flashErr.toLowerCase().includes("redirect") ||
     flashErr.toLowerCase().includes("nao esta incluido") ||
     flashErr.toLowerCase().includes("não está incluído"))
  );

  // Cor do badge Meta
  const metaColor = (): "gray" | "red" | "emerald" | "amber" | "blue" => {
    if (!metaTested) return "gray";
    if (!metaStatus?.ok) return "red";
    if (isConnected && insightReason !== "token_expired") return "emerald";
    if (insightReason === "token_expired") return "red";
    if (metaStatus?.sqlPending) return "amber";
    return "blue";
  };

  const colorBg: Record<string, string> = {
    gray: "bg-gray-50", red: "bg-red-50", emerald: "bg-emerald-50", amber: "bg-amber-50", blue: "bg-blue-50",
  };
  const colorIcon: Record<string, string> = {
    gray: "text-gray-400", red: "text-red-400", emerald: "text-emerald-500", amber: "text-amber-500", blue: "text-blue-500",
  };
  const colorBadge: Record<string, string> = {
    gray:    "text-gray-500 bg-gray-50 border-gray-100",
    red:     "text-red-700 bg-red-50 border-red-100",
    emerald: "text-emerald-700 bg-emerald-50 border-emerald-100",
    amber:   "text-amber-700 bg-amber-50 border-amber-100",
    blue:    "text-blue-700 bg-blue-50 border-blue-100",
  };

  const REDIRECT_URI = "https://www.lokat.com.br/api/meta/callback";
  const isLoading = metaLoading || insightsLoading;

  return (
    <div>
      <PageHeader title="Conexoes" description="Integracoes externas da LOKAT OS" />

      {/* Flash messages */}
      {flashOk && (
        <div className="max-w-2xl mb-4 p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-emerald-800">{decodeURIComponent(flashOk)}</p>
        </div>
      )}
      {flashWarn && (
        <div className="max-w-2xl mb-4 p-3.5 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-800">{decodeURIComponent(flashWarn)}</p>
        </div>
      )}
      {flashErr && !isDomainError && (
        <div className="max-w-2xl mb-4 p-3.5 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-2.5">
          <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{decodeURIComponent(flashErr)}</p>
        </div>
      )}
      {isDomainError && (
        <div className="max-w-2xl mb-4 p-3.5 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-2.5">
          <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700">Meta recusou a conexao</p>
            <p className="text-xs text-red-600 mt-0.5">
              O dominio ou Redirect URI ainda nao esta cadastrado no App da Meta.
              Abra as instrucoes no card abaixo e configure antes de tentar novamente.
            </p>
          </div>
        </div>
      )}

      {/* Alerta: META_REDIRECT_URI aponta para localhost em produção */}
      {metaTested && metaStatus?.hasLocalhostRedirect && (
        <div className="max-w-2xl mb-4 p-3.5 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Redirect URI de produção incorreto</p>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              <code className="font-mono bg-amber-100 px-1 rounded">META_REDIRECT_URI</code> está apontando para{" "}
              <strong>{metaStatus.redirectHost ?? "localhost"}</strong>. Em produção, atualize na Vercel para:{" "}
              <code className="font-mono bg-amber-100 px-1 rounded">https://www.lokat.com.br/api/meta/callback</code>
            </p>
            <p className="text-xs text-amber-600 mt-1">Depois de corrigir a variável e fazer redeploy, reconecte a Meta.</p>
          </div>
        </div>
      )}

      <div className="max-w-2xl space-y-4">

        {/* ══ OpenAI ══════════════════════════════════════════ */}
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
            <p className="flex items-center gap-1.5"><ChevronRight className="w-3 h-3 text-violet-400" />Diagnostico, briefings, legendas e sugestoes de conteudo</p>
            <p className="flex items-center gap-1.5"><ChevronRight className="w-3 h-3 text-violet-400" />Lokat Voice — assistente no painel</p>
          </div>
          {aiTested && !aiData?.openaiConfigured && (
            <p className="text-xs text-gray-500 mb-3">
              Adicione <code className="font-mono bg-gray-50 border border-gray-200 px-1 rounded">OPENAI_API_KEY</code> na Vercel e faca redeploy.
            </p>
          )}
          <button onClick={() => void checkAi()} disabled={aiLoading}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50">
            {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Testar configuracao
          </button>
        </div>

        {/* ══ Meta / Instagram ════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">

          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${colorBg[metaColor()]}`}>
                <AtSign className={`w-5 h-5 ${colorIcon[metaColor()]}`} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">Meta / Instagram</p>
                <p className="text-xs text-gray-400">Instagram Business, Paginas e Anuncios</p>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1 text-xs font-medium border px-2 py-0.5 rounded-full flex-shrink-0 ${colorBadge[metaColor()]}`}>
              {isLoading && !insightsTested
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Verificando</>
                : isConnected
                  ? <><CheckCircle2 className="w-3 h-3" /> Conectado</>
                  : !metaStatus?.ok
                    ? <><XCircle className="w-3 h-3" /> Vars faltando</>
                    : metaStatus?.sqlPending
                      ? <><AlertCircle className="w-3 h-3" /> SQL pendente</>
                      : <><Clock className="w-3 h-3" /> Aguardando conexao</>
              }
            </span>
          </div>

          {/* ── ESTADO: CONECTADO ── */}
          {isConnected && (
            <>
              {/* Resumo da conexão */}
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl mb-4 space-y-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <p className="text-xs font-bold text-emerald-800">Conta conectada com sucesso</p>
                </div>

                {conn?.instagram_username && (
                  <div className="flex items-center gap-2 text-xs text-emerald-800">
                    <AtSign className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    <span>Instagram: <strong>@{conn.instagram_username}</strong></span>
                  </div>
                )}
                {conn?.page_name && (
                  <div className="flex items-center gap-2 text-xs text-emerald-800">
                    <Link2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    <span>Pagina: <strong>{conn.page_name}</strong></span>
                  </div>
                )}
                {conn?.meta_user_id && (
                  <div className="flex items-center gap-2 text-xs text-emerald-800">
                    <User className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    <span>Meta User ID: <strong>{conn.meta_user_id}</strong></span>
                  </div>
                )}
                {conn?.created_at && (
                  <div className="flex items-center gap-2 text-xs text-emerald-700">
                    <CalendarDays className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>Conectado em: {formatDate(conn.created_at)}</span>
                  </div>
                )}

                {insightReason === "connected_no_pages" && !accounts?.ok && (
                  <p className="text-[11px] text-emerald-700 mt-1 leading-snug">
                    Conta conectada. Para vincular Páginas ou Instagram Business, reconecte a Meta e autorize o escopo de páginas no fluxo OAuth.
                  </p>
                )}
              </div>

              {/* ── Ativos encontrados na Meta ── */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ativos encontrados na Meta</p>
                  <button
                    onClick={() => void checkAccounts()}
                    disabled={accountsLoading}
                    className="inline-flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                  >
                    {accountsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    Atualizar
                  </button>
                </div>

                {!accountsTested && accountsLoading && (
                  <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando ativos...
                  </div>
                )}

                {accountsTested && !accounts?.ok && (
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
                    {accounts?.reason === "graph_error"
                      ? <>Erro na Graph API: {accounts.message}</>
                      : accounts?.message ?? "Nao foi possivel buscar ativos da Meta."}
                  </div>
                )}

                {accountsTested && accounts?.ok && (
                  <div className="space-y-2">
                    {/* Banner contextual */}
                    {(accounts.pages ?? []).length > 0 ? (
                      <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        Ativos encontrados na Meta. Vincule cada Página/Instagram ao cliente correspondente na LOKAT OS.
                      </div>
                    ) : (
                      <div className="p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs text-gray-400 flex items-center gap-2 mb-2">
                        <Layers className="w-3.5 h-3.5 flex-shrink-0" />
                        Nenhuma Página ou Instagram Business encontrada. Reconecte a Meta e selecione páginas no fluxo OAuth.
                      </div>
                    )}
                    {/* Páginas Facebook */}
                    {(accounts.pages ?? []).length > 0 ? (
                      (accounts.pages ?? []).map((page) => (
                        <div key={page.id} className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                          <div className="flex items-center gap-2 mb-1">
                            {page.picture_url
                              ? <img src={page.picture_url} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                              : <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0"><Globe className="w-3.5 h-3.5 text-blue-600" /></div>
                            }
                            <div>
                              <p className="text-xs font-semibold text-blue-800">{page.name}</p>
                              <p className="text-[10px] text-blue-500">Pagina Facebook · ID {page.id}</p>
                            </div>
                          </div>
                          {page.instagram && (
                            <div className="flex items-center gap-2 mt-1.5 pl-8">
                              {page.instagram.picture_url
                                ? <img src={page.instagram.picture_url} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                                : <div className="w-5 h-5 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0"><AtSign className="w-3 h-3 text-pink-500" /></div>
                              }
                              <div>
                                <p className="text-[11px] font-medium text-gray-700">
                                  {page.instagram.username ? `@${page.instagram.username}` : page.instagram.name ?? "Instagram Business"}
                                </p>
                                <p className="text-[10px] text-gray-400">Instagram Business vinculado</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    ) : null}
                  </div>
                )}
              </div>

              {/* ── O que a conexão habilita agora ── */}
              <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl mb-4">
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-2">O que esta conexao habilita</p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-start gap-2 text-indigo-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Leitura de métricas do Instagram Business (alcance, impressões, engajamento)</span>
                  </div>
                  <div className="flex items-start gap-2 text-indigo-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Listagem de Páginas Facebook e contas Instagram vinculadas</span>
                  </div>
                  <div className="flex items-start gap-2 text-indigo-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Vinculação de ativos Meta a clientes da agência</span>
                  </div>
                  <div className="flex items-start gap-2 text-gray-400">
                    <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>Publicação automática · em breve (requer Meta App Review)</span>
                  </div>
                  <div className="flex items-start gap-2 text-gray-400">
                    <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>Gestão de anúncios · em breve</span>
                  </div>
                </div>
              </div>

              {/* Botão insights expandível */}
              {showInsightsBox && (
                <div className="p-3.5 bg-gray-50 border border-gray-100 rounded-xl mb-4">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Resultado de /api/meta/insights</p>
                  {insightReason === "ready" && insights?.metrics_available && insights.metrics_available.length > 0 ? (
                    <>
                      <p className="text-xs text-emerald-700 font-medium mb-1">Metricas disponiveis:</p>
                      <div className="flex flex-wrap gap-1">
                        {insights.metrics_available.map((m) => (
                          <span key={m} className="text-[11px] bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{m}</span>
                        ))}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-2">Leitura real via Graph API em implementacao.</p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-500">{insights?.message ?? "Conexao ativa, mas ainda nao ha leitura de dados configurada para este ativo."}</p>
                  )}
                </div>
              )}

              {/* Botões pós-conexão */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={async () => { await checkInsights(); setShowInsightsBox(true); }}
                  disabled={insightsLoading}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
                >
                  {insightsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Testar status
                </button>
                <button
                  onClick={async () => { setShowInsightsBox((v) => !v); if (!insightsTested) await checkInsights(); }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 px-3 py-1.5 rounded-xl transition-colors"
                >
                  <BarChart3 className="w-3.5 h-3.5" /> {showInsightsBox ? "Fechar insights" : "Testar insights"}
                </button>
                <a
                  href="/api/meta/connect"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-3 py-1.5 rounded-xl transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reconectar Meta
                </a>
                <button
                  onClick={() => alert("Desconectar: em breve. Para revogar agora, acesse facebook.com/settings > Apps e Sites.")}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 px-3 py-1.5 rounded-xl transition-colors"
                >
                  <Link2Off className="w-3.5 h-3.5" /> Desconectar
                </button>
              </div>
            </>
          )}

          {/* ── ESTADO: CARREGANDO (antes dos fetches retornarem) ── */}
          {!isConnected && !metaTested && !insightsTested && (
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-4 py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verificando conexao...
            </div>
          )}

          {/* ── ESTADO: TOKEN EXPIRADO ── */}
          {!isConnected && insightReason === "token_expired" && (metaTested || insightsTested) && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl mb-4">
              <p className="text-xs font-semibold text-red-700 mb-1">Token expirado</p>
              <p className="text-xs text-red-600">Reconecte a conta Meta para renovar o acesso.</p>
            </div>
          )}

          {/* ── ESTADO: NAO CONECTADO ── só renderiza após termos dados reais */}
          {!isConnected && insightReason !== "token_expired" && (metaTested || insightsTested) && (
            <>
              {/* Checklist de etapas */}
              <div className="space-y-2.5 mb-4 p-3.5 bg-gray-50 rounded-xl">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Status da configuracao</p>
                <StepRow
                  ok={metaTested ? (metaStatus?.configured
                    ? Object.values(metaStatus.configured).every(Boolean)
                    : false) : null}
                  label="Variaveis Vercel configuradas"
                  detail={metaTested && !metaStatus?.ok && metaStatus?.configured
                    ? `Faltando: ${Object.entries(metaStatus.configured).filter(([,v]) => !v).map(([k]) => k).join(", ")}`
                    : undefined
                  }
                />
                <StepRow
                  ok={metaTested ? sqlOk : null}
                  label="SQL 35 rodado no Supabase"
                  detail={metaStatus?.sqlPending ? "Rode docs/supabase/35-meta-connections.sql no Supabase SQL Editor" : undefined}
                />
                <StepRow
                  ok={null}
                  label="Dominio e Redirect URI no Meta Developers"
                  detail="Verificacao manual — veja instrucoes abaixo"
                />
                <StepRow
                  ok={false}
                  label="Conta Meta nao conectada"
                  detail={insightsTested ? (insights?.message ?? undefined) : undefined}
                />
              </div>

              {/* Instrução de conexão */}
              {envOk && sqlOk && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 mb-4">
                  Para conectar Meta/Instagram, clique em <strong>Conectar Meta</strong> abaixo.
                  Voce sera redirecionado para autenticacao da Meta e voltara automaticamente.
                </div>
              )}

              {/* Botões */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => { void checkMeta(); void checkInsights(); }}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Testar status
                </button>
                {envOk && (
                  <a href="/api/meta/connect"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-xl transition-colors">
                    <Link2 className="w-3.5 h-3.5" /> Conectar Meta
                  </a>
                )}
                {insightReason === "token_expired" && (
                  <a href="/api/meta/connect"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-xl transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" /> Reconectar
                  </a>
                )}
              </div>
            </>
          )}

          {/* Mini-grid funcionalidades */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4 pt-3 border-t border-gray-50">
            {[
              {
                label:  "Insights",
                status: isConnected
                  ? insightReason === "ready"
                    ? "Pronto para teste"
                    : "Aguardando leitura de dados"
                  : "Conecte a Meta",
                ok: isConnected,
              },
              { label: "Publicacao automatica", status: "Em breve", ok: false },
              { label: "Trafego / Anuncios",    status: "Em breve", ok: false },
            ].map(({ label, status, ok }) => (
              <div key={label} className="p-2.5 bg-gray-50 rounded-xl">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                <p className={`text-xs font-medium ${ok ? "text-emerald-600" : "text-gray-400"}`}>{status}</p>
              </div>
            ))}
          </div>

          {/* Funcionalidades detalhadas */}
          <div className="space-y-1 mb-4 text-xs text-gray-500">
            {[
              { label: "Insights do Instagram", ready: isConnected && insightReason === "ready" },
              { label: "Paginas do Facebook",   ready: isConnected && !!conn?.page_name },
              { label: "Meta Business Manager", ready: false },
              { label: "Publicacao automatica", ready: false, soon: true },
              { label: "Gerenciar anuncios",    ready: false, soon: true },
            ].map(({ label, ready, soon }) => (
              <p key={label} className="flex items-center gap-1.5">
                <ChevronRight className={`w-3 h-3 ${ready ? "text-emerald-500" : soon ? "text-amber-400" : "text-gray-300"}`} />
                <span className={ready ? "text-gray-700 font-medium" : ""}>{label}</span>
                {soon && <span className="text-amber-500 text-[10px]">· em breve</span>}
              </p>
            ))}
          </div>

          {/* Bloco expansível de instruções */}
          <div className="border border-indigo-100 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowSetup((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-indigo-50 hover:bg-indigo-100 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                <span className="text-xs font-semibold text-indigo-800">Como configurar no Meta Developers</span>
              </div>
              <ChevronRight className={`w-4 h-4 text-indigo-400 transition-transform ${showSetup ? "rotate-90" : ""}`} />
            </button>

            {showSetup && (
              <div className="p-4 space-y-4 text-xs text-gray-700">
                <div>
                  <p className="font-semibold text-gray-800 mb-1.5">1. App Domains</p>
                  <p className="text-gray-500 mb-2">Meta for Developers → Seu App → Configuracoes → Basico → App Domains:</p>
                  <div className="space-y-1">
                    {["lokat.com.br", "www.lokat.com.br"].map((d) => (
                      <div key={d} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                        <code className="font-mono text-gray-700">{d}</code>
                        <CopyBtn value={d} />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-gray-800 mb-1.5">2. Redirect URI</p>
                  <p className="text-gray-500 mb-2">Login com o Facebook → Configuracoes do OAuth → URIs validos:</p>
                  <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                    <code className="font-mono text-gray-700 text-[11px] break-all">{REDIRECT_URI}</code>
                    <CopyBtn value={REDIRECT_URI} />
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-gray-800 mb-1.5">3. Variaveis na Vercel</p>
                  <div className="space-y-1">
                    {[
                      { key: "META_APP_ID",       note: "ID do app no Meta Developers" },
                      { key: "META_APP_SECRET",    note: "★ nunca exposto em tela" },
                      { key: "META_REDIRECT_URI",  note: REDIRECT_URI },
                      { key: "META_API_VERSION",   note: "v21.0" },
                    ].map(({ key, note }) => (
                      <div key={key} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                        <code className="font-mono text-gray-700">{key}</code>
                        <span className="text-gray-400 text-[10px] italic truncate max-w-[140px] text-right">{note}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-gray-800 mb-1.5">4. SQL 35 no Supabase</p>
                  <p className="text-gray-500">Rode <code className="font-mono bg-gray-100 px-1 rounded">docs/supabase/35-meta-connections.sql</code> no Supabase SQL Editor.</p>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                  <p className="font-semibold text-amber-800 mb-1">Permissoes avancadas (App Review)</p>
                  <p className="text-amber-700">
                    <code className="font-mono">instagram_manage_insights</code> e <code className="font-mono">business_management</code> exigem
                    aprovacao pelo Meta App Review para usuarios fora do time de desenvolvimento.
                    Adicione seu usuario como Testador no App para testar agora.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ══ Canva ═══════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 opacity-75">
          <div className="flex items-start justify-between gap-3">
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
        </div>

        {/* ══ Google Analytics ════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 opacity-75">
          <div className="flex items-start justify-between gap-3">
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
        </div>

        {/* ══ Google Drive ════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 opacity-75">
          <div className="flex items-start justify-between gap-3">
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
        </div>

        {/* ══ Google Ads ══════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 opacity-75">
          <div className="flex items-start justify-between gap-3">
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
        </div>

        {/* ══ Google Meu Negocio ══════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 opacity-75">
          <div className="flex items-start justify-between gap-3">
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
        </div>

        {/* ── Separador: Por nicho ───────────────────────────── */}
        <div className="pt-2">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Conexões por nicho — Restaurante / Delivery</p>
        </div>

        {/* ══ Cardápio Digital / OlaClick ═════════════════════ */}
        <div className={`bg-white rounded-2xl border p-5 ${olaConnected ? "border-orange-100" : "border-gray-100"}`}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${olaConnected ? "bg-orange-50" : "bg-gray-50"}`}>
                <UtensilsCrossed className={`w-5 h-5 ${olaConnected ? "text-orange-500" : "text-gray-400"}`} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">Cardápio Digital</p>
                <p className="text-xs text-gray-400">OlaClick · Pedidos, produtos e faturamento</p>
              </div>
            </div>
            {olaConnected
              ? <StatusBadge ok={true} label="Conectado" />
              : <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full"><Clock className="w-3 h-3" /> Não conectado</span>
            }
          </div>

          <div className="space-y-1 mb-4 text-xs text-gray-500">
            <p className="flex items-center gap-1.5"><ChevronRight className="w-3 h-3 text-orange-400" />Cardápio, categorias e produtos</p>
            <p className="flex items-center gap-1.5"><ChevronRight className="w-3 h-3 text-orange-400" />Pedidos e faturamento do período</p>
            <p className="flex items-center gap-1.5"><ChevronRight className="w-3 h-3 text-orange-400" />Clientes recorrentes e frequência</p>
            <p className="flex items-center gap-1.5 text-gray-300"><ChevronRight className="w-3 h-3" />Publicação no cardápio · em breve</p>
          </div>

          {/* Grid de status funcionalidades */}
          <div className="grid grid-cols-3 gap-2 mb-4 pt-3 border-t border-gray-50">
            {[
              { label: "Cardápio",   ok: olaConnected },
              { label: "Pedidos",    ok: false, soon: true },
              { label: "Faturamento", ok: false, soon: true },
            ].map(({ label, ok, soon }) => (
              <div key={label} className="p-2.5 bg-gray-50 rounded-xl">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                <p className={`text-xs font-medium ${ok ? "text-emerald-600" : "text-gray-400"}`}>
                  {ok ? "Disponível" : soon ? "Em breve" : "Conectar"}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {!olaConnected && (
              <button
                onClick={() => setShowOlaModal(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 px-3 py-1.5 rounded-xl transition-colors"
              >
                <Link2 className="w-3.5 h-3.5" /> Conectar Cardápio Digital
              </button>
            )}
            {olaConnected && (
              <>
                <button className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" /> Sincronizar
                </button>
                <button
                  onClick={() => setShowOlaModal(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-100 px-3 py-1.5 rounded-xl transition-colors"
                >
                  <Info className="w-3.5 h-3.5" /> Gerenciar
                </button>
                <button
                  onClick={() => setOlaConnected(false)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 px-3 py-1.5 rounded-xl transition-colors"
                >
                  <Link2Off className="w-3.5 h-3.5" /> Desconectar
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Separador: Clínica ──────────────────────────────── */}
        <div className="pt-2">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Conexões por nicho — Clínica / Atendimento</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 opacity-60">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <CalendarDays className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">Agenda / Clínica</p>
                <p className="text-xs text-gray-400">Agendamentos, prontuários e atendimento</p>
              </div>
            </div>
            <ComingSoonBadge />
          </div>
        </div>

        {/* ── Separador: Comercial ───────────────────────────── */}
        <div className="pt-2">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Conexões por nicho — Serviços / Comercial</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 opacity-60">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Globe className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">CRM Externo</p>
                <p className="text-xs text-gray-400">HubSpot, RD Station, Pipedrive e similares</p>
              </div>
            </div>
            <ComingSoonBadge />
          </div>
        </div>

      </div>

      {/* Modal OlaClick */}
      {showOlaModal && (
        <OlaClickModal
          onClose={() => setShowOlaModal(false)}
          onSaved={() => setOlaConnected(true)}
        />
      )}
    </div>
  );
}

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
