"use client";

import { Database, Info, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { dashboardTokens } from "./_dashboard-design-tokens";

type SourceState = "connected" | "not_tested" | "simulated" | "stale" | "needs_setup" | "unavailable";
const STATE: Record<SourceState, { label: string; style: string }> = {
  connected: { label: "Conectado", style: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  not_tested: { label: "Não testado", style: "border-amber-200 bg-amber-50 text-amber-800" },
  simulated: { label: "Simulado", style: "border-violet-200 bg-violet-50 text-violet-700" },
  stale: { label: "Desatualizado", style: "border-orange-200 bg-orange-50 text-orange-700" },
  needs_setup: { label: "Precisa configurar", style: "border-blue-200 bg-blue-50 text-blue-700" },
  unavailable: { label: "Indisponível", style: "border-slate-200 bg-slate-50 text-slate-500" },
};
const SOURCES: Array<{ name: string; state: SourceState; updated: string; reliability: string; note: string }> = [
  { name: "Cardápio digital · OlaClick", state: "not_tested", updated: "Runtime não validado", reliability: "A confirmar", note: "Rotas server-side encontradas; nenhuma leitura real foi feita nesta sprint." },
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
      <div className="mt-4 grid gap-3 lg:grid-cols-2">{SOURCES.map((source) => <article key={source.name} className="rounded-md border border-slate-200 bg-slate-50/60 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-xs font-extrabold text-slate-900">{source.name}</h3><p className="mt-1 text-[11px] leading-relaxed text-slate-600">{source.note}</p></div><span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold", STATE[source.state].style)}>{STATE[source.state].label}</span></div><dl className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200 pt-3 text-[10px]"><div><dt className="text-slate-400">Atualização</dt><dd className="mt-0.5 font-bold text-slate-700">{source.updated}</dd></div><div><dt className="text-slate-400">Confiabilidade</dt><dd className="mt-0.5 font-bold text-slate-700">{source.reliability}</dd></div></dl></article>)}</div>
    </section>
    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3"><Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" /><p className="text-xs leading-relaxed text-amber-900">OlaClick não está marcada como conectada: a implementação foi encontrada, mas o runtime não foi comprovado nesta sprint. Nenhuma chave ou token é exibido.</p></div>
  </div>;
}
