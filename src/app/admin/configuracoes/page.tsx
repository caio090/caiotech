"use client";
import { PageHeader } from "@/components/page-header";
import { useState, useEffect } from "react";
import {
  Loader2, CheckCircle2, XCircle, Mic, RefreshCw, Bot,
  FileText, MessageSquare, Brain, Mic2, Sparkles, AtSign, ExternalLink,
} from "lucide-react";
import Link from "next/link";

const VOICE_ENABLED_KEY = "lokat_voice_enabled";
const VOICE_FLOAT_KEY   = "lokat_voice_floating_button";

type AiStatus = { openaiConfigured: boolean; environment: string } | null;

const AI_RESOURCES = [
  { icon: Brain,         label: "Diagnóstico com IA",     desc: "Análise estratégica da marca" },
  { icon: FileText,      label: "Briefing com IA",        desc: "Briefing estruturado para design" },
  { icon: MessageSquare, label: "Legenda com IA",         desc: "3 opções de copy e legenda" },
  { icon: Sparkles,      label: "Sugestões inteligentes", desc: "Ideias de conteúdo e campanha" },
  { icon: Mic2,          label: "Lokat Voice",            desc: "Assistente de voz integrado" },
];

export default function AdminConfigPage() {
  const [orgName, setOrgName] = useState("Lokat Agência");
  const [saved,   setSaved]   = useState(false);

  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceFloat,   setVoiceFloat]   = useState(false);
  const [voiceMounted, setVoiceMounted] = useState(false);

  const [aiStatus,  setAiStatus]  = useState<AiStatus>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTested,  setAiTested]  = useState(false);
  const [aiTestedAt, setAiTestedAt] = useState<Date | null>(null);

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
      setAiTestedAt(new Date());
    } catch {
      setAiStatus(null);
      setAiTested(true);
      setAiTestedAt(new Date());
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
              <input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
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
            <button
              onClick={handleSave}
              className="text-sm font-medium text-white bg-indigo-600 px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
            >
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

          <button
            onClick={checkAiStatus}
            disabled={aiLoading}
            className="flex items-center gap-2 text-sm font-medium text-violet-600 bg-violet-50 px-4 py-2 rounded-xl hover:bg-violet-100 transition-colors disabled:opacity-60 mb-3"
          >
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Testar configuração
          </button>

          {aiTested && (
            <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
              aiStatus?.openaiConfigured
                ? "bg-emerald-50 border-emerald-100"
                : "bg-red-50 border-red-100"
            }`}>
              {aiStatus?.openaiConfigured ? (
                <>
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5" /> OpenAI configurada corretamente
                  </div>
                  <div className="text-emerald-700">Ambiente: <span className="font-medium">{aiStatus.environment}</span></div>
                  <div className="text-emerald-700">
                    Funções disponíveis: <span className="font-medium">diagnóstico, brief, legenda, sugestões, Lokat Voice</span>
                  </div>
                  {aiTestedAt && (
                    <div className="text-emerald-600 text-[11px]">
                      Último teste: {aiTestedAt.toLocaleString("pt-BR")}
                    </div>
                  )}
                  <p className="text-[11px] text-emerald-600 mt-1">
                    Este é um teste de conexão — verifica apenas se a chave está configurada, não consome créditos.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 font-semibold text-red-700">
                    <XCircle className="w-3.5 h-3.5" /> Chave da OpenAI ausente
                  </div>
                  <div className="text-red-600">
                    Adicione <code className="font-mono bg-red-100 px-1 rounded">OPENAI_API_KEY</code> na Vercel e faça redeploy.
                  </div>
                  <div className="text-red-600">
                    Funções de IA estarão indisponíveis até a configuração.
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Meta / Instagram — gerenciado em /admin/conexoes ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 bg-pink-50 rounded-lg flex items-center justify-center">
              <AtSign className="w-4 h-4 text-pink-500" />
            </div>
            <h2 className="text-sm font-bold text-gray-800">Meta / Instagram</h2>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            A conexão com Meta/Instagram é gerenciada centralmente na página de Conexões.
          </p>
          <Link
            href="/admin/conexoes"
            className="inline-flex items-center gap-2 text-sm font-medium text-pink-600 bg-pink-50 hover:bg-pink-100 px-4 py-2 rounded-xl transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Gerenciar em Conexões
          </Link>
        </div>

      </div>
    </div>
  );
}
