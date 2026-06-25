"use client";
import { PageHeader } from "@/components/page-header";
import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, XCircle, Mic, Sparkles, RefreshCw, Bot, Zap, FileText, MessageSquare, Brain, Mic2 } from "lucide-react";

const VOICE_ENABLED_KEY = "lokat_voice_enabled";
const VOICE_FLOAT_KEY   = "lokat_voice_floating_button";

type AiStatus = { openaiConfigured: boolean; environment: string } | null;

export default function AdminConfigPage() {
  const [orgName, setOrgName] = useState("Lokat Agência");
  const [saved,   setSaved]   = useState(false);

  // ── Lokat Voice ──────────────────────────────────────────────
  const [voiceEnabled,   setVoiceEnabled]   = useState(false);
  const [voiceFloat,     setVoiceFloat]     = useState(false);
  const [voiceMounted,   setVoiceMounted]   = useState(false);

  // ── IA ───────────────────────────────────────────────────────
  const [aiStatus,       setAiStatus]       = useState<AiStatus>(null);
  const [aiLoading,      setAiLoading]      = useState(false);
  const [aiTested,       setAiTested]       = useState(false);

  // Lê localStorage apenas no client
  useEffect(() => {
    setVoiceEnabled(localStorage.getItem(VOICE_ENABLED_KEY) === "true");
    setVoiceFloat(localStorage.getItem(VOICE_FLOAT_KEY) !== "false");
    setVoiceMounted(true);
  }, []);

  const toggleVoice = (val: boolean) => {
    setVoiceEnabled(val);
    localStorage.setItem(VOICE_ENABLED_KEY, String(val));
    // Forçar atualização do painel de voice (dispara evento storage cross-tab)
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
      const res = await fetch("/api/ai/status");
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

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const AI_RESOURCES = [
    { icon: Brain,       label: "Diagnóstico com IA",    desc: "Análise estratégica da marca" },
    { icon: FileText,    label: "Briefing com IA",        desc: "Briefing estruturado para design" },
    { icon: MessageSquare, label: "Legenda com IA",       desc: "3 opções de copy e legenda" },
    { icon: Sparkles,    label: "Sugestões inteligentes", desc: "Ideias de conteúdo e campanha" },
    { icon: Mic2,        label: "Lokat Voice",            desc: "Assistente de voz integrado" },
  ];

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
            {voiceMounted && (
              <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${voiceEnabled ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                {voiceEnabled ? "ATIVO" : "INATIVO"}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-5 ml-9">Assistente de navegação rápida por voz e texto.</p>

          {!voiceMounted ? (
            <div className="flex items-center gap-2 text-xs text-gray-400 py-4">
              <Loader2 className="w-3 h-3 animate-spin" />
              Carregando configurações...
            </div>
          ) : (
            <div className="space-y-4">
              {/* Ativar Voice */}
              <label className="flex items-center justify-between py-3 border-b border-gray-50 cursor-pointer">
                <div>
                  <span className="text-sm text-gray-700 font-medium">Ativar Lokat Voice</span>
                  <p className="text-xs text-gray-400 mt-0.5">Exibe o assistente para todos os admins</p>
                </div>
                <button
                  onClick={() => toggleVoice(!voiceEnabled)}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${voiceEnabled ? "bg-indigo-600" : "bg-gray-200"}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${voiceEnabled ? "left-5" : "left-0.5"}`} />
                </button>
              </label>

              {/* Botão flutuante */}
              <label className={`flex items-center justify-between py-3 border-b border-gray-50 cursor-pointer ${!voiceEnabled ? "opacity-40 pointer-events-none" : ""}`}>
                <div>
                  <span className="text-sm text-gray-700 font-medium">Mostrar botão flutuante</span>
                  <p className="text-xs text-gray-400 mt-0.5">Botão no canto da tela para abrir o painel</p>
                </div>
                <button
                  onClick={() => toggleFloat(!voiceFloat)}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${voiceFloat ? "bg-indigo-600" : "bg-gray-200"}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${voiceFloat ? "left-5" : "left-0.5"}`} />
                </button>
              </label>

              {/* Restaurar */}
              {!voiceEnabled && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  <p className="text-xs text-amber-700 mb-2 font-medium">Lokat Voice está desativado</p>
                  <button
                    onClick={() => { toggleVoice(true); toggleFloat(true); }}
                    className="text-xs font-bold text-amber-700 border border-amber-200 bg-white px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-colors flex items-center gap-1.5"
                  >
                    <Zap className="w-3 h-3" />
                    Restaurar Lokat Voice
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Inteligência Artificial ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center">
              <Bot className="w-4 h-4 text-purple-600" />
            </div>
            <h2 className="text-sm font-bold text-gray-800">Inteligência Artificial</h2>
          </div>
          <p className="text-xs text-gray-400 mb-5 ml-9">Status das integrações de IA da LOKAT OS.</p>

          {/* Status badge */}
          {aiTested && aiStatus && (
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium mb-4 ${aiStatus.openaiConfigured ? "bg-emerald-50 border border-emerald-100 text-emerald-700" : "bg-red-50 border border-red-100 text-red-700"}`}>
              {aiStatus.openaiConfigured
                ? <><CheckCircle2 className="w-3.5 h-3.5" /> OpenAI configurada · Ambiente: {aiStatus.environment}</>
                : <><XCircle className="w-3.5 h-3.5" /> OpenAI não configurada — adicione OPENAI_API_KEY na Vercel</>}
            </div>
          )}

          {/* Recursos */}
          <div className="space-y-2 mb-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Recursos de IA</p>
            {AI_RESOURCES.map((r) => (
              <div key={r.label} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="w-7 h-7 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <r.icon className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700">{r.label}</p>
                  <p className="text-[11px] text-gray-400">{r.desc}</p>
                </div>
                {aiTested && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${aiStatus?.openaiConfigured ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>
                    {aiStatus?.openaiConfigured ? "ATIVO" : "INATIVO"}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Botão testar */}
          <button
            onClick={checkAiStatus}
            disabled={aiLoading}
            className="flex items-center gap-2 text-sm font-medium text-indigo-600 border border-indigo-200 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors disabled:opacity-60"
          >
            {aiLoading
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Verificando...</>
              : <><RefreshCw className="w-3.5 h-3.5" /> Testar conexão IA</>}
          </button>

          {aiTested && !aiStatus?.openaiConfigured && (
            <p className="text-xs text-gray-400 mt-3">
              Para ativar: Vercel → Project Settings → Environment Variables → adicionar <code className="bg-gray-100 px-1 rounded">OPENAI_API_KEY</code> → Redeploy.
            </p>
          )}
        </div>

        {/* ── Notificações ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Notificações</h2>
          {["Aprovações pendentes", "Tarefas atrasadas", "Cobranças vencidas", "Novos leads", "Novos cadastros"].map((n) => (
            <label key={n} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0 cursor-pointer">
              <span className="text-sm text-gray-700">{n}</span>
              <div className="w-10 h-5 bg-indigo-600 rounded-full relative flex-shrink-0">
                <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow" />
              </div>
            </label>
          ))}
        </div>

      </div>
    </div>
  );
}
