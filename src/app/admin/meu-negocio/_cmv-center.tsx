"use client";

import { useSyncExternalStore, useState } from "react";
import { Database, Info } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/motor-lokat/money";
import { CMV_ACTUAL, CMV_COVERAGE, CMV_FINAL_REFERENCE_PENDING, CMV_GAP, CMV_INTERPRETATION, CMV_PERIOD, CMV_POLICY, CMV_THEORETICAL, MENU_ENGINEERING, MENU_THRESHOLDS } from "@/lib/cmv/fixtures";
import type { CmvProductContribution, MenuEngineeringItem, MenuEngineeringQuadrant } from "@/lib/cmv/types";
import { DataSourceBadge } from "./_data-source-badge";
import { buildSimulatedProvenance } from "@/lib/finance/data-source";
import { useBusinessViewMode, ViewModeToggle } from "./_view-mode";
import { MarketBenchmarkPanel, PricingStrategyPanel, SalesMixPanel } from "./_market-pricing";

type CmvSection = "summary" | "cmv" | "menu" | "market" | "pricing" | "coverage" | "history";
const SECTION_LABEL: Record<CmvSection, string> = { summary: "Resumo", cmv: "CMV", menu: "Engenharia de cardápio", market: "Mercado e concorrência", pricing: "Simulador de preço", coverage: "Cobertura e fontes", history: "Histórico" };
const QUADRANT_LABEL: Record<MenuEngineeringQuadrant, string> = { star: "Estrela", popular_low_margin: "Popular, mas margem baixa", profitable_low_popularity: "Rentável, mas pouco vendido", low_performance: "Baixo desempenho" };
const QUADRANT_COLOR: Record<MenuEngineeringQuadrant, string> = { star: "#059669", popular_low_margin: "#d97706", profitable_low_popularity: "#2563eb", low_performance: "#9ca3af" };
const CMV_PROVENANCE = buildSimulatedProvenance({ id: "cmv-menu-engineering-demo", calculationVersion: "cmv-menu-engineering-v1" });

function useReducedMotion() {
  return useSyncExternalStore(
    (callback) => { const query = window.matchMedia("(prefers-reduced-motion: reduce)"); query.addEventListener("change", callback); return () => query.removeEventListener("change", callback); },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

const percent = (value: number | null) => value === null ? "—" : `${(value * 100).toFixed(1).replace(".", ",")}%`;
const points = (value: number | null) => value === null ? "—" : `${(value * 100).toFixed(1).replace(".", ",")} p.p.`;

function SummaryCard({ label, value, note, tone = "neutral" }: { label: string; value: string; note: string; tone?: "neutral" | "good" | "warning" }) {
  return <div className={cn("border p-3.5", tone === "good" ? "border-emerald-100 bg-emerald-50" : tone === "warning" ? "border-amber-100 bg-amber-50" : "border-gray-100 bg-white")}>
    <p className="text-[10px] font-bold uppercase text-gray-500">{label}</p><p className="mt-1 text-lg font-black text-gray-900">{value}</p><p className="mt-1 text-[10px] text-gray-500">{note}</p>
  </div>;
}

export function CmvSummaryCards() {
  return <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
    <SummaryCard label="Quanto realmente foi consumido" value={percent(CMV_ACTUAL.cmvPercentage)} note="CMV real · exemplo simulado" tone="warning" />
    <SummaryCard label="Quanto deveria ter sido consumido" value={percent(CMV_THEORETICAL.cmvPercentage)} note="CMV teórico coberto pelas fichas" />
    <SummaryCard label="Consumo ainda não explicado" value={formatCents(CMV_GAP.amount ?? 0)} note={`${points(CMV_GAP.percentagePoints)} — pontos percentuais`} tone="warning" />
    <SummaryCard label="Cobertura do cálculo" value={percent(CMV_COVERAGE.finalCoverage)} note={`${CMV_COVERAGE.productsWithoutSheet} produto(s) sem ficha`} tone={CMV_COVERAGE.confidence === "high" ? "good" : "warning"} />
    <SummaryCard label="Margem média dos itens cobertos" value={formatCents(Math.round(MENU_ENGINEERING.filter((item) => item.contributionMarginUnit !== null).reduce((sum, item) => sum + (item.contributionMarginUnit ?? 0), 0) / Math.max(MENU_ENGINEERING.filter((item) => item.contributionMarginUnit !== null).length, 1)))} note="Não é lucro líquido" />
    <SummaryCard label="Produtos sem ficha" value={String(CMV_COVERAGE.productsWithoutSheet)} note="Não tratados como custo zero" />
    <SummaryCard label="Meta configurada" value={percent(CMV_POLICY.targetCmvPercentage)} note="META SIMULADA — não é regra universal" />
    <SummaryCard label="Impacto potencial investigável" value={formatCents(Math.max(0, CMV_GAP.amount ?? 0))} note="Estimativa da lacuna, não perda confirmada" />
  </div>;
}

export function CmvComparisonChart() {
  const reduced = useReducedMotion();
  const data = [{ label: "CMV teórico", value: (CMV_THEORETICAL.cmvPercentage ?? 0) * 100 }, { label: "CMV real", value: (CMV_ACTUAL.cmvPercentage ?? 0) * 100 }];
  return <Panel title="CMV real versus teórico" subtitle={`${CMV_PERIOD.label} · Fonte: exemplo simulado`}>
    <div role="img" aria-label="Comparação entre CMV real e teórico" className="h-56">
      <ResponsiveContainer width="100%" height="100%"><LineChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" /><XAxis dataKey="label" tick={{ fontSize: 10 }} /><YAxis unit="%" tick={{ fontSize: 10 }} /><Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} /><ReferenceLine y={CMV_POLICY.targetCmvPercentage * 100} stroke="#7c3aed" strokeDasharray="4 4" label="Meta simulada" /><Line dataKey="value" name="CMV" stroke="#dc2626" strokeWidth={3} isAnimationActive={!reduced} /></LineChart></ResponsiveContainer>
    </div>
  </Panel>;
}

export function CmvTrendChart() {
  const reduced = useReducedMotion();
  const data = [{ period: "abr.", theoretical: 32.2, actual: 34.1 }, { period: "mai.", theoretical: 32.8, actual: 35.2 }, { period: "jun.", theoretical: (CMV_THEORETICAL.cmvPercentage ?? 0) * 100, actual: (CMV_ACTUAL.cmvPercentage ?? 0) * 100 }];
  return <Panel title="Evolução por período" subtitle="Série demonstrativa consistente · não são dados reais"><div role="img" aria-label="Evolução simulada do CMV" className="h-56"><ResponsiveContainer width="100%" height="100%"><LineChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" /><XAxis dataKey="period" tick={{ fontSize: 10 }} /><YAxis unit="%" tick={{ fontSize: 10 }} /><Tooltip /><Legend /><Line dataKey="theoretical" name="Teórico" stroke="#7c3aed" isAnimationActive={!reduced} /><Line dataKey="actual" name="Real" stroke="#dc2626" isAnimationActive={!reduced} /></LineChart></ResponsiveContainer></div></Panel>;
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return <section className="border border-gray-100 bg-white p-4"><div className="mb-3"><h3 className="text-sm font-black text-gray-900">{title}</h3>{subtitle && <p className="text-[10px] text-gray-400">{subtitle}</p>}</div>{children}</section>;
}

export function CmvGapPanel() {
  return <Panel title="Consumo não explicado (lacuna de CMV)" subtitle="Diferença entre consumo real e teórico">
    <p className="text-2xl font-black text-amber-700">{formatCents(CMV_GAP.amount ?? 0)} · {points(CMV_GAP.percentagePoints)}</p>
    <p className="mt-2 text-xs leading-relaxed text-gray-600">{CMV_INTERPRETATION.explanation}</p>
    <p className="mt-3 text-xs font-bold text-purple-700">Ação principal: {CMV_INTERPRETATION.action}</p>
  </Panel>;
}

export function CmvInvestigationPanel() {
  return <Panel title="Plano de investigação" subtitle="Hipóteses e verificações — nenhuma acusação automática">
    <div className="space-y-3">{CMV_INTERPRETATION.investigation.hypotheses.map((hypothesis) => <details key={hypothesis.id} className="border border-gray-100 p-3" open={hypothesis.priority === "high"}>
      <summary className="cursor-pointer text-xs font-bold text-gray-800">{hypothesis.title} · prioridade {hypothesis.priority}</summary>
      <p className="mt-2 text-[11px] text-gray-600">{hypothesis.rationale}</p>
      <p className="mt-2 text-[10px] font-bold uppercase text-gray-400">Verificações recomendadas</p>
      <ol className="mt-1 list-decimal space-y-1 pl-4 text-[11px] text-gray-600">{hypothesis.checks.map((item) => <li key={item.id}>{item.label}</li>)}</ol>
      <p className="mt-2 text-[10px] text-gray-400">Responsável sugerido: {hypothesis.owner}. Dados ausentes: {hypothesis.missingEvidence.join(", ") || "nenhum"}.</p>
    </details>)}</div>
  </Panel>;
}

export function CmvCoveragePanel({ manager }: { manager: boolean }) {
  const dimensions = [{ label: "Vendas cobertas", value: CMV_COVERAGE.salesCoverage }, { label: "Fichas completas", value: CMV_COVERAGE.sheetCoverage }, { label: "Estoque contado", value: CMV_COVERAGE.inventoryCoverage }, { label: "Compras registradas", value: CMV_COVERAGE.purchaseCoverage }, { label: "Período compatível", value: CMV_COVERAGE.periodConsistency }];
  return <Panel title="Qualidade do cálculo" subtitle={`Este resultado cobre ${(CMV_COVERAGE.salesCoverage * 100).toFixed(0)}% das vendas analisadas.`}>
    <div className="grid gap-2 sm:grid-cols-2">{dimensions.map((dimension) => <div key={dimension.label}><div className="flex justify-between text-[10px] text-gray-500"><span>{dimension.label}</span><strong>{percent(dimension.value)}</strong></div><div className="mt-1 h-1.5 bg-gray-100"><div className="h-full bg-purple-600" style={{ width: `${dimension.value * 100}%` }} /></div></div>)}</div>
    {manager && <div className="mt-3 text-[11px] text-gray-600"><strong>Composição explicável:</strong> média das cinco dimensões, confiança {CMV_COVERAGE.confidence}. Pendências: {CMV_COVERAGE.missingData.join("; ") || "nenhuma"}.</div>}
  </Panel>;
}

export function CmvPolicyPanel() {
  return <Panel title="Como este CMV foi calculado" subtitle="Política visível · META SIMULADA">
    <dl className="grid gap-2 text-[11px] sm:grid-cols-2"><div><dt className="text-gray-400">Base de vendas</dt><dd className="font-bold">Receita líquida</dd></div><div><dt className="text-gray-400">Embalagem</dt><dd className="font-bold">Incluída</dd></div><div><dt className="text-gray-400">Inventário</dt><dd className="font-bold">Custo médio ponderado</dd></div><div><dt className="text-gray-400">Dia comercial</dt><dd className="font-bold">05:00 · America/Fortaleza</dd></div><div><dt className="text-gray-400">Meta</dt><dd className="font-bold">{percent(CMV_POLICY.targetCmvPercentage)} · simulada</dd></div><div><dt className="text-gray-400">Cobertura mínima</dt><dd className="font-bold">{percent(CMV_POLICY.minimumCoveragePercentage)}</dd></div></dl>
    <p className="mt-3 text-[10px] leading-relaxed text-gray-500">A meta ideal depende do formato do negócio, cardápio, canal, preço, estrutura e estratégia. Use a meta configurada pela empresa e a orientação do responsável financeiro.</p>
  </Panel>;
}

export function MenuEngineeringMatrix() {
  const reduced = useReducedMotion();
  const pointsData = MENU_ENGINEERING.filter((item) => item.contributionMarginUnit !== null).map((item) => ({ ...item, x: item.popularity * 100, y: (item.contributionMarginUnit ?? 0) / 100 }));
  return <Panel title="Matriz de engenharia de cardápio" subtitle="Popularidade × margem de contribuição · exemplo simulado"><div role="img" aria-label="Matriz de popularidade e margem" className="h-72"><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ left: 4, right: 12, top: 8, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" dataKey="x" name="Popularidade" unit="%" tick={{ fontSize: 10 }} /><YAxis type="number" dataKey="y" name="Margem" unit=" R$" tick={{ fontSize: 10 }} /><ReferenceLine x={MENU_THRESHOLDS.popularityThreshold * 100} stroke="#9ca3af" /><ReferenceLine y={MENU_THRESHOLDS.contributionMarginThreshold / 100} stroke="#9ca3af" /><Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(value, name) => name === "Margem" ? `R$ ${Number(value).toFixed(2).replace(".", ",")}` : `${Number(value).toFixed(1)}%`} /><Scatter data={pointsData} name="Produtos" fill="#7c3aed" isAnimationActive={!reduced} /></ScatterChart></ResponsiveContainer></div></Panel>;
}

export function CmvProductTable({ products }: { products: CmvProductContribution[] }) {
  return <Panel title="Produtos analisados" subtitle="Tabela com scroll controlado no mobile"><div className="overflow-x-auto"><table className="min-w-[900px] w-full text-[11px]"><thead><tr className="border-b text-left text-gray-400"><th className="py-2">Produto</th><th>Qtd.</th><th>Faturamento</th><th>Custo</th><th>Margem unit.</th><th>Popularidade</th><th>Cobertura</th><th>Fonte</th></tr></thead><tbody>{products.map((product) => <tr key={product.productId} className="border-b border-gray-50"><td className="py-2 font-bold">{product.productName}<br /><span className="font-normal text-gray-400">{product.category}</span></td><td>{product.quantitySold}</td><td>{formatCents(product.netRevenue)}</td><td>{product.theoreticalConsumption === null ? "Sem ficha" : formatCents(product.theoreticalConsumption)}</td><td>{product.contributionMarginUnit === null ? "Estimativa indisponível" : formatCents(product.contributionMarginUnit)}</td><td>{percent(product.popularity)}</td><td>{percent(product.coverage)}</td><td><DataSourceBadge provenance={CMV_PROVENANCE} /></td></tr>)}</tbody></table></div></Panel>;
}

export function MenuEngineeringTable({ items }: { items: MenuEngineeringItem[] }) {
  return <Panel title="Ações por quadrante" subtitle={`Regra: ${MENU_THRESHOLDS.popularityMethod} · margem mínima simulada ${formatCents(MENU_THRESHOLDS.contributionMarginThreshold)}`}><div className="grid gap-2 lg:grid-cols-2">{items.map((item) => <div key={item.productId} className="border border-gray-100 p-3"><div className="flex items-center justify-between gap-2"><strong className="text-xs">{item.productName}</strong><span className="text-[9px] font-bold" style={{ color: QUADRANT_COLOR[item.quadrant] }}>{QUADRANT_LABEL[item.quadrant]}</span></div><p className="mt-1 text-[10px] text-gray-500">{percent(item.popularity)} do mix · margem {item.contributionMarginUnit === null ? "indisponível" : formatCents(item.contributionMarginUnit)}</p><p className="mt-2 text-[11px] text-gray-700">{item.suggestedAction}</p></div>)}</div></Panel>;
}

export function CmvCenter({ companyName }: { companyName: string }) {
  const [section, setSection] = useState<CmvSection>("summary");
  const [viewMode, setViewMode] = useBusinessViewMode();
  const manager = viewMode === "manager";
  return <div className="space-y-4" data-testid="cmv-center">
    <header className="border border-gray-100 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h2 className="text-lg font-black text-gray-900">CMV e Cardápio · {companyName}</h2><DataSourceBadge provenance={CMV_PROVENANCE} /></div><p className="mt-1 text-[11px] text-gray-500">{CMV_PERIOD.label} · Atualização simulada · fonte única demonstrativa</p></div><ViewModeToggle mode={viewMode} onChange={setViewMode} /></div><div className="mt-3 flex flex-wrap gap-2 text-[10px]"><span className="border border-purple-100 bg-purple-50 px-2 py-1 font-bold text-purple-700">META SIMULADA {percent(CMV_POLICY.targetCmvPercentage)}</span><span className="border border-emerald-100 bg-emerald-50 px-2 py-1 font-bold text-emerald-700">Cobertura {percent(CMV_COVERAGE.finalCoverage)}</span>{CMV_FINAL_REFERENCE_PENDING && <span className="border border-gray-200 bg-gray-50 px-2 py-1 text-gray-500">Referência visual final pendente</span>}</div></header>
    <nav className="flex gap-1 overflow-x-auto pb-1" aria-label="Seções da Central de CMV">{(Object.keys(SECTION_LABEL) as CmvSection[]).map((key) => <button key={key} onClick={() => setSection(key)} className={cn("whitespace-nowrap border px-3 py-2 text-[11px] font-bold", section === key ? "border-purple-600 bg-purple-600 text-white" : "border-gray-200 bg-white text-gray-600")}>{SECTION_LABEL[key]}</button>)}</nav>
    {section === "summary" && <><CmvSummaryCards /><div className="grid gap-3 xl:grid-cols-2"><CmvComparisonChart /><CmvTrendChart /></div><div className="grid gap-3 xl:grid-cols-2"><CmvGapPanel /><CmvCoveragePanel manager={manager} /></div></>}
    {section === "cmv" && <><Panel title="Quanto deveria ter sido consumido (CMV teórico)" subtitle="Quantidade vendida × custo da ficha vigente"><p className="text-2xl font-black">{formatCents(CMV_THEORETICAL.theoreticalConsumption)} · {percent(CMV_THEORETICAL.cmvPercentage)}</p><p className="mt-2 text-xs text-gray-600">Produtos sem ficha entram nas vendas e reduzem a cobertura; nunca recebem custo zero silenciosamente.</p></Panel><Panel title="Quanto realmente foi consumido (CMV real)" subtitle="Estoque inicial + compras − devoluções − estoque final"><p className="text-2xl font-black">{formatCents(CMV_ACTUAL.actualConsumption ?? 0)} · {percent(CMV_ACTUAL.cmvPercentage)}</p><p className="mt-2 text-xs text-gray-600">Transferências internas se anulam no consolidado.</p></Panel><CmvGapPanel /><CmvInvestigationPanel /></>}
    {section === "menu" && <><MenuEngineeringMatrix /><MenuEngineeringTable items={MENU_ENGINEERING} /><SalesMixPanel /></>}
    {section === "market" && <MarketBenchmarkPanel viewMode={viewMode} />}
    {section === "pricing" && <PricingStrategyPanel viewMode={viewMode} />}
    {section === "coverage" && <><CmvCoveragePanel manager={manager} />{manager && <CmvPolicyPanel />}</>}
    {section === "history" && <Panel title="Histórico" subtitle="Contrato futuro — sem persistência"><div className="flex items-center gap-2 text-xs text-gray-500"><Database className="h-4 w-4" />Nenhum histórico real foi salvo nesta demonstração.</div></Panel>}
    <div className="flex items-start gap-2 border border-blue-100 bg-blue-50 p-3 text-[11px] text-blue-800"><Info className="h-4 w-4 shrink-0" />Visão simples e Modo Gestor alteram apenas a profundidade da explicação. CMV teórico e CMV real são tipos de apuração, não permissões.</div>
  </div>;
}
