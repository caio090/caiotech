"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { formatCents } from "@/lib/motor-lokat/money";
import { buildMarketBenchmark, classifyMarketPosition } from "@/lib/market/calculations";
import { CHANNEL_RESULTS, INTERNAL_MARKET_PRODUCT, MARKET_BENCHMARK, MARKET_COMPARABLES, MARKET_FRESHNESS_POLICY, MAXIMUM_COST_EXAMPLE, MIX_CHANGE_POINTS, PRICING_SCENARIOS, REQUIRED_PRICE_EXAMPLE, SALES_MIX_SUMMARY } from "@/lib/market/fixtures";
import { interpretMarketPricing, interpretSalesMix } from "@/lib/market/interpretation";
import type { MarketComparable } from "@/lib/market/types";
import type { BusinessViewMode } from "@/lib/finance/types";

const pct = (value: number | null) => value === null ? "—" : `${(value * 100).toFixed(1).replace(".", ",")}%`;
const CHANNEL_LABEL: Record<string, string> = { dine_in: "Salão", pickup: "Retirada", own_delivery: "Delivery próprio", marketplace_delivery: "Marketplace", whatsapp: "WhatsApp", unknown: "Não informado" };

function Block({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) { return <section className="border border-gray-100 bg-white p-4"><h3 className="text-sm font-black text-gray-900">{title}</h3>{note && <p className="text-[10px] text-gray-400">{note}</p>}<div className="mt-3">{children}</div></section>; }

export function MarketBenchmarkPanel({ viewMode }: { viewMode: BusinessViewMode }) {
  const [samples, setSamples] = useState(MARKET_COMPARABLES);
  const [showForm, setShowForm] = useState(false);
  const benchmark = useMemo(() => buildMarketBenchmark(INTERNAL_MARKET_PRODUCT, samples, "2026-07-27", MARKET_FRESHNESS_POLICY), [samples]);
  const [draftPrice, setDraftPrice] = useState("31,00");
  function addExample() {
    const value = Math.round(Number(draftPrice.replace(",", ".")) * 100);
    if (!Number.isFinite(value) || value <= 0) return;
    const next: MarketComparable = { ...MARKET_COMPARABLES[0], id: `local-${samples.length + 1}`, competitorLabel: `Concorrente local ${samples.length + 1}`, productName: "Comparação adicionada localmente", regularPrice: value, sourceType: "manual_research", notes: "EXEMPLO SIMULADO — revisão humana", confirmedByUser: true };
    setSamples((current) => [...current, next]); setShowForm(false);
  }
  return <div className="space-y-3" data-testid="market-benchmark-panel">
    <Block title="Mercado e concorrência" note="Referência de mercado, não ordem automática · EXEMPLO SIMULADO">
      <div className="grid gap-2 sm:grid-cols-3"><Metric label="Menor preço comparável" value={formatCents(benchmark.minimum ?? 0)} /><Metric label="Mediana do mercado" value={formatCents(benchmark.median ?? 0)} /><Metric label="Maior preço comparável" value={formatCents(benchmark.maximum ?? 0)} /></div>
      <p className="mt-3 text-xs text-gray-600">Encontramos uma faixa entre <strong>{formatCents(benchmark.minimum ?? 0)}</strong> e <strong>{formatCents(benchmark.maximum ?? 0)}</strong> em {benchmark.sampleCount} produtos comparáveis. Preço atual: {formatCents(INTERNAL_MARKET_PRODUCT.regularPrice)}.</p>
      <p className="mt-2 text-[10px] text-gray-500">Média {formatCents(benchmark.average ?? 0)} · confiança {benchmark.confidence} · {benchmark.discardedCount} descartada(s) · {benchmark.promotionalCount} promoção(ões) separada(s).</p>
      <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => setShowForm((value) => !value)} className="flex items-center gap-1 border border-purple-200 px-3 py-2 text-xs font-bold text-purple-700"><Plus className="h-3.5 w-3.5" />Adicionar comparação</button><button disabled className="border border-gray-200 px-3 py-2 text-xs font-bold text-gray-400">Importar pesquisa · revisão obrigatória</button></div>
      {showForm && <div className="mt-3 grid gap-2 border border-gray-100 p-3 sm:grid-cols-[1fr_1fr_auto]"><label className="text-[10px] text-gray-500">Concorrente<input readOnly value="Concorrente local simulado" className="mt-1 w-full border border-gray-200 px-2 py-2 text-xs" /></label><label className="text-[10px] text-gray-500">Preço observado<input value={draftPrice} onChange={(event) => setDraftPrice(event.target.value)} className="mt-1 w-full border border-gray-200 px-2 py-2 text-xs" /></label><button onClick={addExample} className="self-end bg-purple-600 px-3 py-2 text-xs font-bold text-white">Revisar e adicionar</button></div>}
    </Block>
    {viewMode === "manager" && <Block title="Amostras, comparabilidade e limitações" note="Produtos parcialmente comparáveis ficam fora da mediana principal"><div className="overflow-x-auto"><table className="min-w-[780px] w-full text-[11px]"><thead><tr className="border-b text-left text-gray-400"><th className="py-2">Referência</th><th>Produto</th><th>Canal</th><th>Preço regular</th><th>Promoção</th><th>Comparabilidade</th><th>Observado em</th></tr></thead><tbody>{samples.map((sample) => { const result = benchmark.comparableResults.find((item) => item.comparableId === sample.id); return <tr key={sample.id} className="border-b border-gray-50"><td className="py-2 font-bold">{sample.competitorLabel}</td><td>{sample.productName}</td><td>{CHANNEL_LABEL[sample.channel]}</td><td>{formatCents(sample.regularPrice)}</td><td>{sample.promotionalPrice ? formatCents(sample.promotionalPrice) : "—"}</td><td>{result?.classification ?? "revisar"}<br /><span className="text-gray-400">{result?.limitations[0] ?? "sem ressalva principal"}</span></td><td>{sample.observedAt ?? "Não informado"}</td></tr>; })}</tbody></table></div></Block>}
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="border border-gray-100 bg-gray-50 p-3"><p className="text-[10px] uppercase text-gray-400">{label}</p><p className="mt-1 text-lg font-black">{value}</p></div>; }

export function PricingStrategyPanel({ viewMode }: { viewMode: BusinessViewMode }) {
  const position = classifyMarketPosition(3000, MARKET_BENCHMARK.median);
  const interpretation = interpretMarketPricing(position, true, false, true, MARKET_BENCHMARK, PRICING_SCENARIOS);
  return <div className="space-y-3" data-testid="pricing-strategy-panel">
    <Block title="Três referências para decidir" note="Nenhuma delas é chamada de preço ideal"><div className="grid gap-2 sm:grid-cols-3"><Metric label="Preço atual" value="R$ 30,00" /><Metric label="Preço pela meta interna" value={formatCents(REQUIRED_PRICE_EXAMPLE ?? 0)} /><Metric label="Faixa de mercado" value={`${formatCents(MARKET_BENCHMARK.minimum ?? 0)}–${formatCents(MARKET_BENCHMARK.maximum ?? 0)}`} /></div><p className="mt-3 text-xs text-gray-600">Custo R$ 10,00 ÷ meta simulada de 25% = R$ 40,00. Para vender a R$ 30,00 mantendo essa meta, o custo máximo seria {formatCents(MAXIMUM_COST_EXAMPLE)}. O CMV atual do exemplo é 33,33%.</p></Block>
    <Block title="Cenários de decisão" note="Nenhum cenário é aplicado automaticamente"><div className="grid gap-2 lg:grid-cols-2">{PRICING_SCENARIOS.map((scenario) => <article key={scenario.id} className="border border-gray-100 p-3"><div className="flex justify-between gap-2"><strong className="text-xs">{scenario.name}</strong><span className="text-xs font-black">{formatCents(scenario.price)}</span></div><p className="mt-1 text-[10px] text-gray-500">CMV esperado {pct(scenario.expectedCmv)} · margem unitária {scenario.expectedUnitMargin === null ? "a revisar" : formatCents(scenario.expectedUnitMargin)}</p><p className="mt-2 text-[11px] text-amber-700">Risco: {scenario.risk}</p><p className="mt-1 text-[10px] text-gray-500">Verificar: {scenario.requiredActions.join("; ")}.</p></article>)}</div></Block>
    <Block title="Preço médio realizado e canais" note="Desconto da plataforma não é custo da loja sem configuração"><div className="overflow-x-auto"><table className="min-w-[720px] w-full text-[11px]"><thead><tr className="border-b text-left text-gray-400"><th className="py-2">Canal</th><th>Preço</th><th>Receita realizada</th><th>Custos variáveis</th><th>Margem</th><th>CMV</th></tr></thead><tbody>{CHANNEL_RESULTS.map((channel) => <tr key={channel.channel} className="border-b border-gray-50"><td className="py-2 font-bold">{CHANNEL_LABEL[channel.channel]}</td><td>{formatCents(channel.price)}</td><td>{formatCents(channel.realizedRevenue)}</td><td>{channel.attributedVariableCosts === null ? "Taxa ausente" : formatCents(channel.attributedVariableCosts)}</td><td>{channel.contributionMargin === null ? "—" : formatCents(channel.contributionMargin)}</td><td>{pct(channel.cmv)}</td></tr>)}</tbody></table></div></Block>
    <Block title="Interpretação integrada" note="Hipótese, evidência, limitação e verificação"><p className="text-sm font-bold text-gray-900">{interpretation.situation}</p><p className="mt-2 text-xs text-gray-600">{interpretation.hypothesis}</p><p className="mt-2 text-[10px] text-gray-500">Evidências: {interpretation.evidence.join("; ")}. Limitações: {interpretation.limitations.join("; ") || "nenhuma relevante"}.</p></Block>
    {viewMode === "manager" && <Block title="Por que seu produto pode custar mais?" note="Diferenciais precisam ser percebidos e valorizados pelo cliente"><div className="flex flex-wrap gap-1.5">{["Qualidade", "Gramagem", "Exclusividade", "Marca", "Apresentação", "Experiência", "Atendimento", "Velocidade", "Embalagem", "Reputação", "Conveniência"].map((item) => <span key={item} className="border border-gray-200 px-2 py-1 text-[10px] text-gray-600">{item}</span>)}</div></Block>}
  </div>;
}

export function SalesMixPanel() {
  return <div className="space-y-3" data-testid="sales-mix-panel"><Block title="Efeito do mix de vendas" note="CMV ponderado por receita e custo, nunca média simples"><div className="grid gap-2 sm:grid-cols-3"><Metric label="CMV consolidado" value={pct(SALES_MIX_SUMMARY.consolidatedCmv)} /><Metric label="Mudança versus período anterior" value={MIX_CHANGE_POINTS === null ? "—" : `${(MIX_CHANGE_POINTS * 100).toFixed(1).replace(".", ",")} p.p.`} /><Metric label="Receita considerada" value={formatCents(SALES_MIX_SUMMARY.totalRevenue)} /></div><p className="mt-3 text-xs text-gray-600">{interpretSalesMix(SALES_MIX_SUMMARY, MIX_CHANGE_POINTS)}</p></Block><Block title="Contribuição de cada produto ao CMV"><div className="space-y-2">{SALES_MIX_SUMMARY.products.map((product) => <div key={product.productId} className="grid grid-cols-2 gap-2 border-b border-gray-50 py-2 text-[11px] sm:grid-cols-5"><strong>{product.productName}</strong><span>Mix {pct(product.quantityShare)}</span><span>CMV individual {pct(product.individualCmv)}</span><span>Impacto {pct(product.consolidatedCmvContribution)}</span><span>Contribuição total {formatCents(product.contributionTotal ?? 0)}</span></div>)}</div></Block></div>;
}
