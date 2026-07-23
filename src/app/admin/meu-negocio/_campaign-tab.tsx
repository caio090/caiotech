"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Megaphone, ArrowRight, AlertTriangle, Info } from "lucide-react";
import { formatCents } from "@/lib/motor-lokat/money";
import { calculateCampaignProjection } from "@/lib/motor-lokat/campaign-engine";
import { generateCampaignInsights } from "@/lib/motor-lokat/insight-rules";
import type { CampaignInput, CampaignObjective, MarketplaceFeeBase, RecOsCampaignContext } from "@/lib/motor-lokat/types";
import { MoneyInput, PercentInput, NumberInput, GlossaryHelpIcon } from "./_shared";

const OBJECTIVES: Array<{ value: CampaignObjective; label: string }> = [
  { value: "vender", label: "Vender" },
  { value: "aumentar_ticket", label: "Aumentar ticket" },
  { value: "conquistar_clientes", label: "Conquistar clientes" },
  { value: "recuperar_clientes", label: "Recuperar clientes" },
  { value: "gerar_recorrencia", label: "Gerar recorrência" },
  { value: "fortalecer_marca", label: "Fortalecer a marca" },
];

const FEE_BASES: Array<{ value: MarketplaceFeeBase; label: string }> = [
  { value: "preco_normal", label: "Preço normal" },
  { value: "receita_reconhecida", label: "Receita reconhecida" },
  { value: "valor_pago_cliente", label: "Valor pago pelo cliente" },
];

const STATUS_LABEL: Record<string, string> = {
  saudavel: "Saudável", viavel_com_atencao: "Viável com atenção", margem_apertada: "Margem apertada",
  prejuizo_projetado: "Prejuízo projetado", dados_insuficientes: "Dados insuficientes",
};
const STATUS_STYLE: Record<string, string> = {
  saudavel: "bg-emerald-50 text-emerald-700 border-emerald-100",
  viavel_com_atencao: "bg-blue-50 text-blue-700 border-blue-100",
  margem_apertada: "bg-amber-50 text-amber-700 border-amber-100",
  prejuizo_projetado: "bg-red-50 text-red-700 border-red-100",
  dados_insuficientes: "bg-gray-50 text-gray-500 border-gray-200",
};

export function defaultCampaignInput(): CampaignInput {
  return {
    name: "Combo de verão",
    objective: "vender",
    product: "Combo promocional",
    regularPrice: 4000,
    pricePaidByCustomer: 3000,
    platformSubsidyPerOrder: 500,
    directCostPerUnit: 1600,
    projectedQuantity: 300,
    marketplaceFeePct: 0.12,
    marketplaceFeeBase: "receita_reconhecida",
    cardFeePct: 0.02,
    salesTaxPct: 0.04,
    subsidizedDeliveryPerOrder: 200,
    mediaBudget: 150_000,
    influencerBudget: 50_000,
    contentProductionBudget: 20_000,
    decorationBudget: 0,
    printedMaterialBudget: 0,
    otherFixedCosts: 0,
    expectedNewCustomers: 80,
    futureAverageTicket: 4000,
    futureRepeatPurchases: 4,
    futureContributionMarginPct: 0.40,
  };
}

interface CampaignTabProps {
  onOpenGlossary: (termId: string) => void;
  /** Prepared by Products & Services (Fase 17) or the REC OS bridge — never sent anywhere automatically. */
  seedInput?: CampaignInput;
}

export function CampaignTab({ onOpenGlossary, seedInput }: CampaignTabProps) {
  const [input, setInput] = useState<CampaignInput>(() => seedInput ?? defaultCampaignInput());

  function update<K extends keyof CampaignInput>(key: K, value: CampaignInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  const projection = useMemo(() => calculateCampaignProjection(input), [input]);
  const insights = useMemo(() => generateCampaignInsights(projection), [projection]);

  const recOsContext: RecOsCampaignContext = {
    campaignName: input.name || "Campanha sem nome",
    objective: input.objective,
    product: input.product || "Produto/serviço não informado",
    offer: `${formatCents(input.pricePaidByCustomer)} (de ${formatCents(input.regularPrice)})`,
    regularPriceLabel: formatCents(input.regularPrice),
    promoPriceLabel: formatCents(input.pricePaidByCustomer),
    audience: "A definir no briefing do REC OS",
    period: "A definir no briefing do REC OS",
    channel: "A definir no briefing do REC OS",
    budgetLabel: formatCents(projection.totalFixedInvestment),
    minimumMarginLabel: formatCents(Math.max(0, projection.contributionMarginPerOrder)),
    quantity: input.projectedQuantity,
    cta: "A definir no briefing do REC OS",
    risks: projection.status === "prejuizo_projetado" ? ["Projeção financeira indica prejuízo antes das despesas gerais."] : [],
    restrictions: projection.discountWasNegative ? ["Desconto financiado pela empresa calculado como negativo — revisar preços informados."] : [],
    expectedResult: projection.isBrandObjective
      ? "Objetivo de marca — acompanhar alcance, lembrança e crescimento de base, não apenas ponto de equilíbrio financeiro."
      : `Resultado projetado de ${formatCents(projection.resultBeforeOverhead)} antes das despesas gerais.`,
  };

  return (
    <div className="space-y-6">
      {seedInput && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3">
          <p className="text-xs font-bold text-indigo-800">Dados preparados a partir de Produtos e Serviços</p>
          <p className="text-[11px] text-indigo-700 mt-0.5">Nenhuma campanha foi salva ou enviada automaticamente — revise os campos abaixo antes de simular.</p>
        </div>
      )}

      {/* Campaign inputs */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Megaphone className="w-3.5 h-3.5 text-purple-600" />
          <p className="text-xs font-bold text-gray-700">Simulador de campanha</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          <label className="block">
            <span className="block text-[11px] font-semibold text-gray-600 mb-1">Nome da campanha</span>
            <input value={input.name} onChange={(e) => update("name", e.target.value)} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-purple-400" />
          </label>
          <label className="block">
            <span className="block text-[11px] font-semibold text-gray-600 mb-1">Objetivo</span>
            <select value={input.objective} onChange={(e) => update("objective", e.target.value as CampaignObjective)} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-purple-400 bg-white">
              {OBJECTIVES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-[11px] font-semibold text-gray-600 mb-1">Produto ou serviço</span>
            <input value={input.product} onChange={(e) => update("product", e.target.value)} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-purple-400" />
          </label>
        </div>

        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Preço e desconto</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <MoneyInput label="Preço normal" valueCents={input.regularPrice} onChange={(v) => update("regularPrice", v)} />
          <MoneyInput label="Valor pago pelo cliente" valueCents={input.pricePaidByCustomer} onChange={(v) => update("pricePaidByCustomer", v)} />
          <MoneyInput label="Subsídio da plataforma/pedido" valueCents={input.platformSubsidyPerOrder} onChange={(v) => update("platformSubsidyPerOrder", v)} />
          <MoneyInput label="Custo direto por unidade" valueCents={input.directCostPerUnit} onChange={(v) => update("directCostPerUnit", v)} />
        </div>

        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Volume e taxas</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <NumberInput label="Quantidade projetada" value={input.projectedQuantity} onChange={(v) => update("projectedQuantity", v)} dataTestId="mn-campaign-quantity" />
          <PercentInput label="Taxa do marketplace" valueFraction={input.marketplaceFeePct} onChange={(v) => update("marketplaceFeePct", v)} />
          <label className="block">
            <span className="block text-[11px] font-semibold text-gray-600 mb-1">Base da taxa de marketplace</span>
            <select value={input.marketplaceFeeBase} onChange={(e) => update("marketplaceFeeBase", e.target.value as MarketplaceFeeBase)} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-purple-400 bg-white">
              {FEE_BASES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </label>
          <PercentInput label="Taxa de cartão" valueFraction={input.cardFeePct} onChange={(v) => update("cardFeePct", v)} />
          <PercentInput label="Imposto sobre a venda" valueFraction={input.salesTaxPct} onChange={(v) => update("salesTaxPct", v)} />
          <MoneyInput label="Entrega subsidiada/pedido" valueCents={input.subsidizedDeliveryPerOrder} onChange={(v) => update("subsidizedDeliveryPerOrder", v)} />
        </div>

        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Investimento fixo da campanha</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <MoneyInput label="Verba de mídia" valueCents={input.mediaBudget} onChange={(v) => update("mediaBudget", v)} />
          <MoneyInput label="Influenciador" valueCents={input.influencerBudget} onChange={(v) => update("influencerBudget", v)} />
          <MoneyInput label="Produção de conteúdo" valueCents={input.contentProductionBudget} onChange={(v) => update("contentProductionBudget", v)} />
          <MoneyInput label="Ornamentação" valueCents={input.decorationBudget} onChange={(v) => update("decorationBudget", v)} />
          <MoneyInput label="Impressos" valueCents={input.printedMaterialBudget} onChange={(v) => update("printedMaterialBudget", v)} />
          <MoneyInput label="Outros custos fixos" valueCents={input.otherFixedCosts} onChange={(v) => update("otherFixedCosts", v)} />
        </div>

        <div className="flex items-center gap-1.5 mb-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">CAC e LTV futuros esperados</p>
          <GlossaryHelpIcon termId="cac" onOpen={onOpenGlossary} />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <NumberInput label="Novos clientes esperados" value={input.expectedNewCustomers} onChange={(v) => update("expectedNewCustomers", v)} />
          <MoneyInput label="Ticket médio futuro esperado" valueCents={input.futureAverageTicket} onChange={(v) => update("futureAverageTicket", v)} />
          <NumberInput label="Compras futuras/cliente" value={input.futureRepeatPurchases} onChange={(v) => update("futureRepeatPurchases", v)} />
          <PercentInput label="Margem de contribuição futura" valueFraction={input.futureContributionMarginPct} onChange={(v) => update("futureContributionMarginPct", v)} />
        </div>
      </div>

      {/* Brand objective indicators (Fase 18) */}
      {input.objective === "fortalecer_marca" && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
          <p className="text-xs font-bold text-indigo-800 mb-1">Campanha de marca</p>
          <p className="text-[11px] text-indigo-700 mb-3">
            Campanhas de fortalecimento de marca não devem ser classificadas automaticamente como fracasso por não atingirem ponto de equilíbrio imediato.
            Estes campos podem ser preenchidos manualmente — nenhum dado de alcance é simulado automaticamente.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <NumberInput label="Alcance estimado" value={input.brandMetrics?.reach ?? 0} onChange={(v) => update("brandMetrics", { ...input.brandMetrics, reach: v })} />
            <NumberInput label="Lembrança de marca (%)" value={input.brandMetrics?.recall ?? 0} onChange={(v) => update("brandMetrics", { ...input.brandMetrics, recall: v })} />
            <NumberInput label="Crescimento de base" value={input.brandMetrics?.baseGrowth ?? 0} onChange={(v) => update("brandMetrics", { ...input.brandMetrics, baseGrowth: v })} />
            <NumberInput label="Engajamento qualificado" value={input.brandMetrics?.qualifiedEngagement ?? 0} onChange={(v) => update("brandMetrics", { ...input.brandMetrics, qualifiedEngagement: v })} />
          </div>
        </div>
      )}

      {/* Result */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Resultado do simulador</p>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${STATUS_STYLE[projection.status]}`}>{STATUS_LABEL[projection.status]}</span>
        </div>
        <p className="text-xs text-gray-600 mb-4">{projection.statusReason}</p>

        {projection.discountWasNegative && (
          <div className="mb-3 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700">Desconto financiado pela empresa deu negativo ({formatCents(projection.companyFundedDiscount)}) — confira preço normal, valor pago e subsídio.</p>
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-gray-50 rounded-xl px-3 py-2.5">
            <p className="text-gray-500">Investimento total</p>
            <p className="font-bold text-gray-800">{formatCents(projection.totalFixedInvestment)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl px-3 py-2.5">
            <p className="text-gray-500">Margem por pedido com campanha</p>
            <p className="font-bold text-gray-800">{formatCents(projection.contributionMarginPerOrder)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl px-3 py-2.5">
            <p className="text-gray-500">Impacto do desconto</p>
            <p className="font-bold text-gray-800">{formatCents(projection.companyFundedDiscount)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl px-3 py-2.5">
            <p className="text-gray-500">Pedidos para equilíbrio</p>
            <p className="font-bold text-gray-800">{projection.ordersToBreakEven !== null ? Math.ceil(projection.ordersToBreakEven) : "—"}</p>
          </div>
          <div className="bg-gray-50 rounded-xl px-3 py-2.5">
            <p className="text-gray-500">Quantidade projetada</p>
            <p className="font-bold text-gray-800">{input.projectedQuantity}</p>
          </div>
          <div className="bg-gray-50 rounded-xl px-3 py-2.5">
            <p className="text-gray-500">Resultado projetado</p>
            <p className={`font-bold ${projection.resultBeforeOverhead >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatCents(projection.resultBeforeOverhead)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl px-3 py-2.5">
            <p className="text-gray-500">CAC estimado</p>
            <p className="font-bold text-gray-800">{projection.cac !== null ? formatCents(projection.cac) : "—"}</p>
          </div>
          <div className="bg-gray-50 rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-1">
              <p className="text-gray-500">LTV de contribuição estimado</p>
              <GlossaryHelpIcon termId="ltv_contribuicao" onOpen={onOpenGlossary} />
            </div>
            <p className="font-bold text-gray-800">{projection.ltvContribution !== null ? formatCents(projection.ltvContribution) : "—"}</p>
          </div>
        </div>

        {projection.ltvToCacRatio !== null && (
          <p className="text-[11px] text-gray-500 mt-3">
            Relação LTV/CAC: <strong className="text-gray-800">{projection.ltvToCacRatio.toFixed(2)}x</strong> · Payback estimado: <strong className="text-gray-800">{projection.paybackOrders !== null ? `${projection.paybackOrders.toFixed(1)} compras` : "—"}</strong>
            {" "}— benchmarks variam por segmento, sem regra fixa 3:1 aplicada aqui.
          </p>
        )}
      </div>

      {/* Campaign insights */}
      {insights.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Info className="w-3.5 h-3.5 text-indigo-500" />
            <p className="text-xs font-bold text-gray-700">Prévia de interpretação da campanha</p>
          </div>
          <p className="text-[10px] text-gray-400 mb-3">Nenhuma IA está conectada nesta versão.</p>
          <div className="space-y-2.5">
            {insights.map((insight) => (
              <div key={insight.id} className={`rounded-xl border px-3 py-2.5 ${insight.severity === "critico" ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"}`}>
                <p className={`text-xs font-bold ${insight.severity === "critico" ? "text-red-800" : "text-amber-800"}`}>{insight.what}</p>
                <p className={`text-[11px] mt-0.5 ${insight.severity === "critico" ? "text-red-700" : "text-amber-700"}`}>{insight.mainReason}</p>
                <p className="text-[10px] text-gray-500 mt-1">Sugestão: {insight.suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REC OS bridge (Fase 25) */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-xs font-bold text-gray-700 mb-1">Contexto da campanha para o REC OS</p>
        <p className="text-[10px] text-gray-400 mb-3">Contexto preparado. O preenchimento automático do REC OS será implementado na próxima fatia.</p>
        <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 text-xs space-y-1.5 mb-4 font-mono">
          <p><span className="text-gray-400">nome:</span> {recOsContext.campaignName}</p>
          <p><span className="text-gray-400">objetivo:</span> {OBJECTIVES.find((o) => o.value === recOsContext.objective)?.label}</p>
          <p><span className="text-gray-400">produto:</span> {recOsContext.product}</p>
          <p><span className="text-gray-400">oferta:</span> {recOsContext.offer}</p>
          <p><span className="text-gray-400">quantidade:</span> {recOsContext.quantity}</p>
          <p><span className="text-gray-400">orçamento:</span> {recOsContext.budgetLabel}</p>
          <p><span className="text-gray-400">margem mínima:</span> {recOsContext.minimumMarginLabel}</p>
          <p><span className="text-gray-400">resultado esperado:</span> {recOsContext.expectedResult}</p>
          {recOsContext.risks.length > 0 && <p><span className="text-gray-400">riscos:</span> {recOsContext.risks.join("; ")}</p>}
          {recOsContext.restrictions.length > 0 && <p><span className="text-gray-400">restrições:</span> {recOsContext.restrictions.join("; ")}</p>}
        </div>
        <Link
          href="/admin/contentos/criar?step=brief"
          className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
        >
          Abrir criação no REC OS <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
