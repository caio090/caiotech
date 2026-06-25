"use client";
import { PageHeader } from "@/components/page-header";
import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, XCircle, Mic, Sparkles, RefreshCw, Bot, Zap, FileText, MessageSquare, Brain, Mic2, Instagram } from "lucide-react";

const VOICE_ENABLED_KEY = "lokat_voice_enabled";
const VOICE_FLOAT_KEY   = "lokat_voice_floating_button";

type AiStatus   = { openaiConfigured: boolean; environment: string } | null;
type MetaStatus = {
  ok: boolean;
  meta?: { configured: boolean; appId: string; appSecret: string; redirectUri: string; apiVersion: string };
  missing?: string[];
} | null;

export default function AdminConfigPage() {
  const [orgName, setOrgName] = useState("Lokat Agência");
  const [saved,   setSaved]   = useState(false);

  // ── Lokat Voice ──────────────────────────────────────────────
  const [voiceEnabled,  setVoiceEnabled]  = useState(false);
  const [voiceFloat,    setVoiceFloat]    = useState(false);
  const [voiceMounted,  setVoiceMounted]  = useState(false);

  // ── IA ───────────────────────────────────────────────────────
  const [aiStatus,   setAiStatus]   = useState<AiStatus>(null);
  const [aiLoading,  setAiLoading]  = useState(false);
  const [aiTested,   setAiTested]   = useState(false);

  // ── Meta / Instagram ─────────────────────────────────────────
  const [metaStatus,  setMetaStatus]  = useState<MetaStatus>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaTested,  setMetaTested]  = useState(false);

  useEffect(() => {
    setVoiceEnabled(localStorage.getItem(VOICE_ENABLED_KEY) === "true");
    setVoiceFloat(localStorage.getItem(VOICE_FLOAT_KEY) !== "false");
    setVoiceMounted(true);
  }, []);

  const toggleVoice = (val: boolean) => {
    setVoiceEnabled(val);
    localStorage.setItem(VOICE_ENABLED_KEY, String(val));
    window.dispatchEvent(new Event("storage"));
  };

  const toggleFloat = (val: boolean) => {
    setVoiceFloat(val);
    localStorage.setItem(VOICE_FLOAT_KEY, String(val));
    window.dispatchEvent(new Event("storage"));
  };

  const checkAiStatus = async () => {
    setAiLoading(true);
    try {
      const res  = await fetch("/api/ai/status");
      const data = await res.json() as AiStatus;
      setAiStatus(data);
      setAiTested(true);
    } catch {
      setAiStatus(null);
      setAiTested(true);
    } finally {
      setAiLoading(false);
    }
  };

  const checkMetaStatus = async () => {
    setMetaLoading(true);
    try {
      const res  = await fetch("/api/meta/status");
      const data = await res.json() as MetaStatus;
      setMetaStatus(data);
      setMetaTested(true);
    } catch {
      setMetaStatus(null);
      setMetaTested(true);
    } finally {
      setMetaLoading(false);
    }
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const AI_RESOURCES = [
    { icon: Brain,         label: "Diagnóstico com IA",    desc: "Análise estratégica da marca" },
    { icon: FileText,      label: "Briefing com IA",       desc: "Briefing estruturado para design" },
    { icon: MessageSquare, label: "Legenda com IA",        desc: "3 opções de copy e legenda" },
    { icon: Sparkles,      label: "Sugestões inteligentes",desc: "Ideias de conteúdo e campanha" },
    { icon: Mic2,          label: "Lokat Voice",           desc: "Assistente de voz integrado" },
  ];

  // Helper para badge de status Meta
  const metaBadge = () => {
    if (!metaTested) return null;
    if (!metaStatus) return <span className="text-xs text-red-500 font-medium">Erro ao verificar</span>;
    if (metaStatus.ok) return <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> Configurado</span>;
    return (
      <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
        <XCircle className="w-3.5 h-3.5" />
        Faltando: {metaStatus.missing?.join(", ")}
      </span>
    );
  };

  return (
    <div>
      <PageHeader title="Configurações" description="Gerencie sua organização e integrações" />
      <div className="max-w-2xl space-y-4">

        {/* ── Organização ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Organização</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nome da agência</label>
              <input value={orgName} onChange={(e) => setOrgName(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Segmento</label>
              <select className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 bg-white outline-none focus:border-indigo-400">
                <option>Agência de Marketing Digital</option>
                <option>Agência de Design</option>
                <option>Agência Full Service</option>
                <option>Freelancer</option>
              </select>
            </div>
            <button onClick={handleSave} className="text-sm font-medium text-white bg-indigo-600 px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors">
              {saved ? "✓ Salvo!" : "Salvar alterações"}
            </button>
          </div>
        </div>

        {/* ── Plano ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Plano atual</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-base font-black text-gray-900">Pro</div>
              <p className="text-xs text-gray-500">R$ 597/mês · 5 membros · Todos os módulos</p>
            </div>
            <button className="text-sm font-medium text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors">
              Gerenciar plano
            </button>
          </div>
        </div>

        {/* ── Lokat Voice ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Mic className="w-4 h-4 text-indigo-600" />
            </div>
            <h2 className="text-sm font-bold text-gray-800">Lokat Voice</h2>
          </div>
          <p className="text-xs text-gray-500 mb-4">Assistente de voz inteligente integrado ao painel.</p>
          {voiceMounted && (
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-gray-700">Ativar Lokat Voice</span>
                <button
                  onClick={() => toggleVoice(!voiceEnabled)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${voiceEnabled ? "bg-indigo-500" : "bg-gray-200"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${voiceEnabled ? "translate-x-5" : ""}`} />
                </button>
              </label>
              {voiceEnabled && (
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-gray-700">Botão flutuante</span>
                  <button
                    onClick={() => toggleFloat(!voiceFloat)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${voiceFloat ? "bg-indigo-500" : "bg-gray-200"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${voiceFloat ? "translate-x-5" : ""}`} />
                  </button>
                </label>
              )}
            </div>
          )}
        </div>

        {/* ── Inteligência Artificial ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center">
              <Bot className="w-4 h-4 text-violet-600" />
            </div>
            <h2 className="text-sm font-bold text-gray-800">Inteligência Artificial</h2>
          </div>
          <p className="text-xs text-gray-500 mb-4">OpenAI conectada ao motor de IA da LOKAT OS.</p>
          <div className="grid grid-cols-1 gap-2 mb-4">
            {AI_RESOURCES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                <div className="w-7 h-7 bg-white rounded-lg border border-gray-100 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-violet-500" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-800">{label}</div>
                  <div className="text-xs text-gray-500">{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={checkAiStatus}
              disabled={aiLoading}
              className="flex items-center gap-2 text-sm font-medium text-violet-600 bg-violet-50 px-4 py-2 rounded-xl hover:bg-violet-100 transition-colors disabled:opacity-60"
            >
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Testar configuração
            </button>
            {aiTested && aiStatus && (
              <span className={`flex items-center gap-1 text-xs font-medium ${aiStatus.openaiConfigured ? "text-green-600" : "text-red-500"}`}>
                {aiStatus.openaiConfigured
                  ? <><CheckCircle2 className="w-3.5 h-3.5" /> Configurado ({aiStatus.environment})</>
                  : <><XCircle className="w-3.5 h-3.5" /> Chave ausente</>
                }
              </span>
            )}
            {aiTested && !aiStatus && (
              <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                <XCircle className="w-3.5 h-3.5" /> Erro ao verificar
              </span>
            )}
          </div>
        </div>

        {/* ── Meta / Instagram ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 bg-pink-100 rounded-lg flex items-center justify-center">
              <Instagram className="w-4 h-4 text-pink-600" />
            </div>
            <h2 className="text-sm font-bold text-gray-800">Meta / Instagram</h2>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Conecte sua conta Meta para puxar insights do Instagram Business, páginas e campanhas.
          </p>
          <div className="grid grid-cols-1 gap-2 mb-4">
            {[
              { label: "Insights do Instagram",  desc: "Alcance, impressões e engajamento" },
              { label: "Páginas do Facebook",    desc: "Listagem e dados das páginas" },
              { label: "Meta Business Manager",  desc: "Gerenciamento de contas e ativos" },
            ].map(({ label, desc }) => (
              <div key={label} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                <div className="w-7 h-7 bg-white rounded-lg border border-gray-100 flex items-center justify-center shrink-0">
                  <Zap className="w-3.5 h-3.5 text-pink-500" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-800">{label}</div>
                  <div className="text-xs text-gray-500">{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Botão: Testar configuração */}
            <button
              onClick={checkMetaStatus}
              disabled={metaLoading}
              className="flex items-center gap-2 text-sm font-medium text-pink-600 bg-pink-50 px-4 py-2 rounded-xl hover:bg-pink-100 transition-colors disabled:opacity-60"
            >
              {metaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Testar configuração
            </button>
            {/* Botão: Conectar conta Meta (OAuth) */}
            <a
              href="/api/meta/connect"
              className="flex items-center gap-2 text-sm font-medium text-white bg-pink-600 px-4 py-2 rounded-xl hover:bg-pink-700 transition-colors"
            >
              <Instagram className="w-4 h-4" />
              Conectar conta Meta
            </a>
            {/* Status inline */}
            {metaBadge()}
          </div>
          {/* Detalhes do status */}
          {metaTested && metaStatus?.ok && metaStatus.meta && (
            <div className="mt-3 p-3 bg-green-50 rounded-xl text-xs text-green-800 space-y-0.5">
              <div>App ID: {metaStatus.meta.appId}</div>
              <div>App Secret: {metaStatus.meta.appSecret}</div>
              <div>Redirect URI: {metaStatus.meta.redirectUri}</div>
              <div>API Version: {metaStatus.meta.apiVersion}</div>
            </div>
          )}
          {metaTested && metaStatus && !metaStatus.ok && (
            <div className="mt-3 p-3 bg-red-50 rounded-xl text-xs text-red-700">
              Variáveis faltando: <strong>{metaStatus.missing?.join(", ")}</strong>. Adicione no painel da Vercel e faça redeploy.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
