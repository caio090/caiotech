"use client";

import { useState } from "react";
import { AlertTriangle, ArrowRight, Bot, Calculator, Database, RefreshCw, Settings2, X } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BusinessModuleKey } from "@/lib/business-archetypes/types";
import type { StockBalance, StockItem, StockMovement } from "@/lib/stock/types";
import type { TechnicalSheet } from "@/lib/costing/types";
import { COMMAND_CENTER_ALERTS, COMMAND_CENTER_METRICS, CMV_EVOLUTION, OLACLICK_CAPABILITIES } from "@/lib/business-command-center/fixtures";
import type { CommandCenterMetric, MetricCalculationTrace } from "@/lib/business-command-center/types";
import { AskLokatPanel } from "./_ask-lokat-panel";

interface Props { items: StockItem[]; balances: StockBalance[]; movements: StockMovement[]; sheets: TechnicalSheet[]; onNavigate: (section: BusinessModuleKey) => void; }
const NATURE = { simulated: "Simulado", manual: "Manual", imported: "Importado", calculated: "Calculado", integrated: "Integrado" } as const;
const CONFIDENCE = { high: "Alta", medium: "Média", low: "Baixa", insufficient: "Insuficiente" } as const;
const formatInput = (value: number, unit: string) => unit === "centavos" ? (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : `${value.toLocaleString("pt-BR")} ${unit}`;

export function RestaurantOverview({ onNavigate }: Props) {
  const [trace, setTrace] = useState<MetricCalculationTrace | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const sales = [{ period: "Abr.", vendas: 82000, pedidos: 211 }, { period: "Mai.", vendas: 92200, pedidos: 236 }, { period: "Jun.", vendas: 100000, pedidos: 248 }];
  return <div className="space-y-5" data-testid="command-center">
    <header className="border border-gray-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div><p className="text-[10px] font-black uppercase text-purple-700">Centro de comando</p><h2 className="mt-1 text-xl font-black text-gray-950">Decisões do negócio em um só lugar</h2><p className="mt-1 text-xs text-gray-600">Junho de 2026 · comparação mensal · atualizado em 01/07/2026 às 09:00</p></div>
        <div className="flex flex-wrap gap-2">
          <button className="inline-flex items-center gap-1.5 border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700"><RefreshCw className="h-3.5 w-3.5" />Atualizar</button>
          <button onClick={() => onNavigate("settings")} className="inline-flex items-center gap-1.5 border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700"><Settings2 className="h-3.5 w-3.5" />Configurar dados</button>
          <button onClick={() => setAssistantOpen(true)} className="inline-flex items-center gap-1.5 bg-purple-600 px-3 py-2 text-xs font-bold text-white"><Bot className="h-3.5 w-3.5" />Pergunte à Lokat</button>
        </div>
      </div>
    </header>

    <section aria-label="Situação das fontes" className="grid gap-px border border-gray-200 bg-gray-200 sm:grid-cols-2 xl:grid-cols-4">
      {[{ name: "Cardápio digital", state: "Não testado", tone: "text-amber-700" }, { name: "Planilha", state: "Exemplo importado", tone: "text-blue-700" }, { name: "Estoque e fichas", state: "Simulado", tone: "text-purple-700" }, { name: "Cálculos Lokat", state: "Disponível", tone: "text-emerald-700" }].map((source) => <div key={source.name} className="bg-white px-3 py-2.5"><p className="text-[10px] text-gray-500">{source.name}</p><p className={`text-xs font-bold ${source.tone}`}>{source.state}</p></div>)}
    </section>

    <section><div className="mb-3 flex items-end justify-between"><div><h3 className="text-sm font-black text-gray-900">Indicadores executivos</h3><p className="text-[11px] text-gray-500">Clique no valor para abrir o setor responsável.</p></div></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{COMMAND_CENTER_METRICS.map((metric) => <MetricCard key={metric.id} metric={metric} onNavigate={onNavigate} onTrace={setTrace} />)}</div>
    </section>

    <section className="grid gap-4 xl:grid-cols-2">
      <ChartPanel title="Evolução de vendas e pedidos" source="Cardápio digital simulado" period="Abril a junho de 2026">
        <ResponsiveContainer width="100%" height="100%"><LineChart data={sales}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="period" /><YAxis yAxisId="left" width={48} /><YAxis yAxisId="right" orientation="right" width={36} /><Tooltip formatter={(value, name) => name === "Vendas" ? Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : `${Number(value)} pedidos`} /><Legend /><Line yAxisId="left" dataKey="vendas" name="Vendas" stroke="#7c3aed" strokeWidth={2} /><Line yAxisId="right" dataKey="pedidos" name="Pedidos" stroke="#059669" strokeWidth={2} /></LineChart></ResponsiveContainer>
      </ChartPanel>
      <ChartPanel title="CMV real, teórico e meta" source="Inventário, compras e fichas simuladas" period="Abril a junho de 2026">
        <ResponsiveContainer width="100%" height="100%"><LineChart data={CMV_EVOLUTION}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="period" /><YAxis unit="%" /><Tooltip formatter={(value) => value === null ? "Indisponível" : `${Number(value).toFixed(1).replace(".", ",")}%`} /><Legend /><Line dataKey="actual" name="Real" stroke="#dc2626" /><Line dataKey="theoretical" name="Teórico" stroke="#7c3aed" /><Line dataKey="target" name="Meta simulada" stroke="#059669" strokeDasharray="4 4" /></LineChart></ResponsiveContainer>
      </ChartPanel>
    </section>

    <section className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
      <div className="border border-gray-200 bg-white p-4"><h3 className="text-sm font-black text-gray-900">O que precisa da sua atenção</h3><div className="mt-3 divide-y divide-gray-100">{COMMAND_CENTER_ALERTS.map((alert) => <button key={alert.id} onClick={() => onNavigate(alert.destination)} className="flex w-full items-start gap-3 py-3 text-left"><AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${alert.priority === "high" ? "text-red-600" : "text-amber-600"}`} /><span className="min-w-0 flex-1"><strong className="block text-xs text-gray-900">{alert.title}</strong><span className="mt-1 block text-[11px] text-gray-600">{alert.explanation} Impacto: {alert.impact}</span><span className="mt-1 block text-[10px] font-bold text-purple-700">{alert.action} · {alert.suggestedOwner}</span></span><ArrowRight className="h-4 w-4 text-gray-400" /></button>)}</div></div>
      <div className="border border-gray-200 bg-white p-4"><div className="flex items-center gap-2"><Database className="h-4 w-4 text-purple-600" /><h3 className="text-sm font-black">Cardápio digital</h3></div><p className="mt-1 text-[11px] text-gray-600">Integração OlaClick encontrada no repositório. O runtime não foi testado nesta sprint.</p><div className="mt-3 space-y-2">{OLACLICK_CAPABILITIES.slice(0, 6).map((cap) => <div key={cap.resource} className="flex justify-between gap-2 text-[10px]"><span className="text-gray-700">{cap.resource}</span><strong className={cap.state === "available" ? "text-emerald-700" : "text-gray-500"}>{cap.state === "available" ? "Implementado" : cap.state === "not_tested" ? "Não testado" : "Não implementado"}</strong></div>)}</div><button onClick={() => onNavigate("settings")} className="mt-4 text-xs font-bold text-purple-700">Ver todas as capacidades</button></div>
    </section>
    {trace && <TraceDrawer trace={trace} onClose={() => setTrace(null)} onNavigate={onNavigate} />}
    <AskLokatPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} onNavigate={onNavigate} />
  </div>;
}

function MetricCard({ metric, onNavigate, onTrace }: { metric: CommandCenterMetric; onNavigate: (section: BusinessModuleKey) => void; onTrace: (trace: MetricCalculationTrace) => void }) {
  return <article className="border border-gray-200 bg-white p-4"><button onClick={() => onNavigate(metric.destination)} className="w-full text-left"><div className="flex items-start justify-between gap-2"><p className="text-[11px] font-bold text-gray-600">{metric.label}</p>{metric.alert && <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}</div><p className="mt-1 text-xl font-black text-gray-950">{metric.formattedValue}</p><p className="text-[10px] font-bold text-emerald-700">{metric.comparison}</p></button><div className="mt-3 border-t border-gray-100 pt-2 text-[10px] text-gray-500"><p>{metric.period} · {metric.source}</p><p>{NATURE[metric.nature]} · confiança {CONFIDENCE[metric.confidence]}</p></div><button onClick={() => onTrace(metric.trace)} className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-purple-700"><Calculator className="h-3 w-3" />Como calculamos</button></article>;
}
function ChartPanel({ title, source, period, children }: { title: string; source: string; period: string; children: React.ReactNode }) { return <section className="border border-gray-200 bg-white p-4"><h3 className="text-sm font-black text-gray-900">{title}</h3><p className="text-[10px] text-gray-500">{period} · Fonte: {source}</p><div className="mt-3 h-64">{children}</div><p className="mt-2 text-[11px] text-gray-600">Interpretação: observe tendência e cobertura antes de tomar uma decisão.</p></section>; }
function TraceDrawer({ trace, onClose, onNavigate }: { trace: MetricCalculationTrace; onClose: () => void; onNavigate: (section: BusinessModuleKey) => void }) { return <div className="fixed inset-0 z-[80] bg-black/30" role="dialog" aria-modal="true"><aside className="ml-auto h-full w-full max-w-lg overflow-y-auto bg-white p-5 shadow-xl"><div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase text-purple-700">Como calculamos</p><h3 className="text-lg font-black">{trace.metricLabel}</h3></div><button onClick={onClose} aria-label="Fechar"><X className="h-5 w-5" /></button></div><div className="mt-5 space-y-4 text-xs"><section><p className="font-bold">Fórmula</p><p className="mt-1 bg-gray-50 p-3 font-mono text-[11px]">{trace.formulaExpression}</p></section><section><p className="font-bold">Valores usados</p>{trace.inputs.map((input) => <div key={input.label} className="mt-2 flex justify-between gap-3 border-b pb-2"><span>{input.label}<small className="block text-gray-500">Fonte: {input.source}</small></span><strong>{formatInput(input.value, input.unit)}</strong></div>)}</section><dl className="grid grid-cols-2 gap-3"><div><dt className="text-gray-500">Período</dt><dd>{new Date(`${trace.periodStart}T12:00:00`).toLocaleDateString("pt-BR")} a {new Date(`${trace.periodEnd}T12:00:00`).toLocaleDateString("pt-BR")}</dd></div><div><dt className="text-gray-500">Cobertura</dt><dd>{(trace.coverage * 100).toFixed(0)}%</dd></div><div><dt className="text-gray-500">Incluídos</dt><dd>{trace.includedRecords}</dd></div><div><dt className="text-gray-500">Excluídos</dt><dd>{trace.excludedRecords}</dd></div><div><dt className="text-gray-500">Versão</dt><dd>{trace.calculationVersion}</dd></div><div><dt className="text-gray-500">Atualizado</dt><dd>{new Date(trace.calculatedAt).toLocaleString("pt-BR")}</dd></div></dl>{trace.warnings.map((warning) => <p key={warning} className="bg-amber-50 p-3 text-amber-800">{warning}</p>)}</div><div className="mt-6 flex gap-2"><button onClick={() => onNavigate(trace.linksToFixData[0].destination)} className="bg-purple-600 px-3 py-2 text-xs font-bold text-white">Corrigir base</button><button onClick={() => onNavigate(trace.linksToFixData[0].destination)} className="border border-gray-200 px-3 py-2 text-xs font-bold">Abrir setor</button></div></aside></div>; }
