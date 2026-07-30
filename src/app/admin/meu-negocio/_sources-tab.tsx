"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Database, Info, Link2, Play, RefreshCw, Unlink } from "lucide-react";
import { cn } from "@/lib/utils";
import { dashboardTokens } from "./_dashboard-design-tokens";
import { DIGITAL_MENU_CAPABILITY_LABEL, DIGITAL_MENU_CONNECTION_STATUS_LABEL, resolveConnectionStatus } from "@/lib/digital-menu/provider-status";
import { findDigitalMenuProvider } from "@/lib/digital-menu/provider-registry";

type SourceState = "connected" | "not_tested" | "simulated" | "stale" | "needs_setup" | "unavailable";
const STATE: Record<SourceState, { label: string; style: string }> = {
  connected: { label: "Conectado", style: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  not_tested: { label: "Não testado", style: "border-amber-200 bg-amber-50 text-amber-800" },
  simulated: { label: "Simulado", style: "border-violet-200 bg-violet-50 text-violet-700" },
  stale: { label: "Desatualizado", style: "border-orange-200 bg-orange-50 text-orange-700" },
  needs_setup: { label: "Precisa configurar", style: "border-blue-200 bg-blue-50 text-blue-700" },
  unavailable: { label: "Indisponível", style: "border-slate-200 bg-slate-50 text-slate-500" },
};
const STATUS_STYLE: Record<string, string> = {
  UPDATED: "border-amber-200 bg-amber-50 text-amber-800",
  NOT_LINKED: "border-slate-200 bg-slate-50 text-slate-500",
  CONNECTION_ERROR: "border-rose-200 bg-rose-50 text-rose-700",
};

interface OlaClickEnvStatus { ok: boolean; hasAnyConnection?: boolean; connectionCount?: number }
type OlaClickCheckState = "loading" | "checked" | "unauthenticated" | "error";

/**
 * "Cardápio digital" é a camada genérica da LOKAT OS (Fontes e Integrações →
 * Cardápios digitais → conexão vinculada → Provedor). OlaClick é apenas o
 * provedor hoje registrado, nunca o nome do card ou do domínio. A checagem
 * em si (GET /api/olaclick/env-status, read-only, nenhum segredo retornado)
 * continua específica do adapter -- "Conectado"/"Atualizado" nunca aparecem
 * sem runtimeValidated=true, e nesta sprint isso nunca é true.
 */
function DigitalMenuConnectionCard() {
  const [state, setState] = useState<OlaClickCheckState>("loading");
  const [data, setData] = useState<OlaClickEnvStatus | null>(null);
  const [expanded, setExpanded] = useState(false);
  const provider = findDigitalMenuProvider("olaclick");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/olaclick/env-status")
      .then(async (response) => {
        if (cancelled) return;
        if (response.status === 401) { setState("unauthenticated"); return; }
        if (!response.ok) { setState("error"); return; }
        const json = (await response.json()) as OlaClickEnvStatus;
        setData(json);
        setState(json.ok ? "checked" : "error");
      })
      .catch(() => { if (!cancelled) setState("error"); });
    return () => { cancelled = true; };
  }, []);

  const hasConnectionRow = state === "checked" && (data?.connectionCount ?? 0) > 0;
  const status = state === "loading" ? null
    : state === "unauthenticated" || state === "error" ? "CONNECTION_ERROR"
    : resolveConnectionStatus({ hasConnectionRow, runtimeValidated: false });
  const statusLabel = state === "loading" ? "Verificando..." : DIGITAL_MENU_CONNECTION_STATUS_LABEL[status!];
  const statusStyle = state === "loading" ? "border-slate-200 bg-slate-50 text-slate-500" : STATUS_STYLE[status!] ?? "border-slate-200 bg-slate-50 text-slate-500";
  const note = state === "loading" ? "Verificando configuração..."
    : state === "unauthenticated" ? "Não foi possível verificar (sessão não encontrada)."
    : state === "error" ? "Não foi possível verificar agora. Rotas server-side encontradas; nenhuma leitura foi confirmada."
    : hasConnectionRow ? `${data?.connectionCount} conexão(ões) configurada(s) para este ambiente, mas a leitura de pedidos em runtime não foi comprovada nesta sprint.`
    : "Nenhuma conexão configurada para este ambiente nesta sprint.";
  const disabledAction = "inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1.5 text-[10px] font-bold text-slate-400 cursor-not-allowed";

  return (
    <article className="rounded-md border border-slate-200 bg-slate-50/60 p-4" data-testid="digital-menu-connection-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-extrabold text-slate-900">Cardápio digital</h3>
          <p className="mt-1 text-[11px] text-slate-500">Provedor: <strong className="text-slate-700">{provider?.displayName ?? "Nenhum vinculado"}</strong></p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{note}</p>
        </div>
        <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold", statusStyle)}>{statusLabel}</span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200 pt-3 text-[10px]">
        <div><dt className="text-slate-400">Loja vinculada</dt><dd className="mt-0.5 font-bold text-slate-700">Indisponível</dd></div>
        <div><dt className="text-slate-400">Última verificação</dt><dd className="mt-0.5 font-bold text-slate-700">{state === "checked" ? "Agora (env-status)" : "Indisponível"}</dd></div>
        <div><dt className="text-slate-400">Última sincronização</dt><dd className="mt-0.5 font-bold text-slate-700">Indisponível</dd></div>
        <div><dt className="text-slate-400">Período coberto</dt><dd className="mt-0.5 font-bold text-slate-700">Indisponível</dd></div>
        <div><dt className="text-slate-400">Pedidos recebidos</dt><dd className="mt-0.5 font-bold text-slate-700">Indisponível</dd></div>
        <div><dt className="text-slate-400">Registros ignorados</dt><dd className="mt-0.5 font-bold text-slate-700">Indisponível</dd></div>
      </dl>

      <button onClick={() => setExpanded((current) => !current)} className={`${dashboardTokens.focus} mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-violet-700`}>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}Abrir detalhes
      </button>
      {expanded && (
        <div className="mt-2 border-t border-slate-200 pt-2">
          <p className="text-[10px] font-black uppercase text-slate-400">Capacidades declaradas pelo adapter (não verificadas em runtime)</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(provider?.supportedCapabilities ?? []).map((capability) => (
              <span key={capability} className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-bold text-slate-600">{DIGITAL_MENU_CAPABILITY_LABEL[capability]}</span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
        <button disabled className={disabledAction} title="Ação demonstrativa; requer infraestrutura segura de conexão real"><Link2 className="h-3 w-3" />Vincular cardápio digital</button>
        <button disabled className={disabledAction} title="Ação demonstrativa; testar conexão exige autorização e ambiente real"><Play className="h-3 w-3" />Testar conexão</button>
        <button disabled className={disabledAction} title="Ação demonstrativa; sincronizar dados exige runtime comprovado"><RefreshCw className="h-3 w-3" />Sincronizar dados</button>
        <button disabled className={disabledAction} title="Ação demonstrativa; nenhuma conexão para desvincular nesta sprint"><Unlink className="h-3 w-3" />Desvincular provedor</button>
      </div>
    </article>
  );
}

const SOURCES: Array<{ name: string; state: SourceState; updated: string; reliability: string; note: string }> = [
  { name: "Planilhas", state: "simulated", updated: "01/07/2026 09:00", reliability: "Média", note: "Exemplo importado apenas para demonstração visual." },
  { name: "Preenchimento manual", state: "connected", updated: "Disponível nesta sessão", reliability: "Depende da revisão", note: "Alterações permanecem locais e não são persistidas nesta sprint." },
  { name: "Diagnóstico", state: "needs_setup", updated: "Sem atualização", reliability: "Não avaliada", note: "A fonte ainda precisa ser associada ao contexto do negócio." },
  { name: "Estoque", state: "simulated", updated: "30/06/2026", reliability: "Média", note: "Fixtures determinísticos de central e cozinha." },
  { name: "Fichas técnicas", state: "simulated", updated: "30/06/2026", reliability: "82% de cobertura", note: "Há uma ficha incompleta no exemplo." },
  { name: "Cálculos Lokat", state: "connected", updated: "01/07/2026 09:00", reliability: "Alta sobre a base disponível", note: "Fórmulas locais com rastreabilidade." },
  { name: "OpenAI", state: "needs_setup", updated: "Não inspecionado", reliability: "Não avaliada", note: "O assistente apresenta fallback seguro quando não configurado." },
  { name: "Google Planilhas", state: "unavailable", updated: "Planejado", reliability: "Não avaliada", note: "Integração futura; nenhuma conexão existe nesta versão." },
];

export function SourcesTab() {
  return <div className="space-y-4" data-testid="sources-and-integrations">
    <section className={`${dashboardTokens.panel} ${dashboardTokens.radius} ${dashboardTokens.cardPadding}`}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Database className="h-4 w-4 text-violet-400" /><h2 className="text-base font-black text-[#f6f7fb]">Fontes e Integrações</h2></div><p className="mt-1 text-xs text-[#8993a8]">Origem, atualidade e confiabilidade dos dados usados no Centro de Comando.</p></div><button className={`${dashboardTokens.focus} inline-flex items-center gap-1.5 rounded-md border border-[#3a4354] bg-[#1d2230] px-3 py-2 text-xs font-bold text-[#bcc4d4] hover:text-white`} title="Ação demonstrativa"><RefreshCw className="h-3.5 w-3.5" />Revisar estados</button></div>

      <p className="mt-5 text-[10px] font-black uppercase tracking-wide text-[#697386]" data-testid="digital-menus-subsection">Cardápios digitais</p>
      <div className="mt-2 grid gap-3 lg:grid-cols-2">
        <DigitalMenuConnectionCard />
      </div>

      <p className="mt-5 text-[10px] font-black uppercase tracking-wide text-[#697386]">Outras fontes</p>
      <div className="mt-2 grid gap-3 lg:grid-cols-2">
        {SOURCES.map((source) => <article key={source.name} className="rounded-md border border-slate-200 bg-slate-50/60 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-xs font-extrabold text-slate-900">{source.name}</h3><p className="mt-1 text-[11px] leading-relaxed text-slate-600">{source.note}</p></div><span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold", STATE[source.state].style)}>{STATE[source.state].label}</span></div><dl className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200 pt-3 text-[10px]"><div><dt className="text-slate-400">Atualização</dt><dd className="mt-0.5 font-bold text-slate-700">{source.updated}</dd></div><div><dt className="text-slate-400">Confiabilidade</dt><dd className="mt-0.5 font-bold text-slate-700">{source.reliability}</dd></div></dl></article>)}
      </div>
    </section>
    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3"><Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" /><p className="text-xs leading-relaxed text-amber-900">O cardápio digital não está marcado como conectado: a integração com o provedor OlaClick foi encontrada no código, mas o runtime não foi comprovado nesta sprint. Nenhuma chave ou token é exibido.</p></div>
  </div>;
}
