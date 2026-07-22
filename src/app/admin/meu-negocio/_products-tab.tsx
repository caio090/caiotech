"use client";

import { useState } from "react";
import Link from "next/link";
import { Package, FlaskConical, Grid3x3, Plus, Trash2, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCents, formatPercent } from "@/lib/motor-lokat/money";
import { calculateProductCost } from "@/lib/motor-lokat/product-cost-engine";
import { calculateProductOperation } from "@/lib/motor-lokat/product-operations-engine";
import { classifyProductPerformance, buildProductRecommendation } from "@/lib/motor-lokat/performance-matrix";
import { calculateCampaignProjection } from "@/lib/motor-lokat/campaign-engine";
import { recommendLabDecision } from "@/lib/motor-lokat/lab-decision-rules";
import { PRODUCT_SEGMENT_FIELDS } from "@/lib/motor-lokat/product-presets";
import type {
  ProductServiceItem, ProductSituation, LabTest, LabDecision, PerformanceQuadrant,
} from "@/lib/motor-lokat/business-types";
import type { BusinessSegment, CampaignInput } from "@/lib/motor-lokat/types";
import { MoneyInput, PercentInput, NumberInput, ConfidenceLabel, StatusPill, GlossaryHelpIcon, generateId } from "./_shared";

type SubTab = "portfolio" | "lab" | "matrix";

const SUB_TABS: Array<{ key: SubTab; label: string; icon: React.ElementType }> = [
  { key: "portfolio", label: "Portfólio", icon: Package },
  { key: "lab", label: "Laboratório", icon: FlaskConical },
  { key: "matrix", label: "Matriz de Desempenho", icon: Grid3x3 },
];

const SITUATION_LABEL: Record<ProductSituation, string> = {
  ideia: "Ideia", teste: "Teste", ativo: "Ativo", sazonal: "Sazonal", descontinuado: "Descontinuado",
};
const SITUATION_STYLE: Record<ProductSituation, string> = {
  ideia: "bg-gray-50 text-gray-500 border-gray-200",
  teste: "bg-blue-50 text-blue-700 border-blue-100",
  ativo: "bg-emerald-50 text-emerald-700 border-emerald-100",
  sazonal: "bg-amber-50 text-amber-700 border-amber-100",
  descontinuado: "bg-red-50 text-red-700 border-red-100",
};

function newProduct(segment: BusinessSegment): ProductServiceItem {
  return {
    id: generateId("product"),
    name: "Novo produto", category: "Geral", audience: "", problemOrDesire: "",
    salesPrice: 4000, channel: "", unit: "un.", situation: "ideia",
    segmentFields: Object.fromEntries(PRODUCT_SEGMENT_FIELDS[segment].map((f) => [f, ""])),
    cost: { components: [], packagingCost: 0, feePct: 0.10, commissionPct: 0, discountPct: 0, deliveryCost: 0, taxPct: 0.04, expectedLossPct: 0.05 },
    operation: { productionTimeMinutes: 15, capacityPerPeriod: 100, period: "dia", equipment: "", storage: "", shelfLifeDays: 1, wasteRisk: "medio", complexity: "media", supplier: "", dependency: "", bottleneck: "", maxCapacity: 150 },
    positioning: { mainAudience: "", priceRange: "", consumptionOccasion: "", competitors: "", differentiator: "", visualPresentation: "", valuePerception: "", place: "", promotion: "", seasonality: "", inheritedFromDna: false },
  };
}

interface Props {
  segment: BusinessSegment;
  products: ProductServiceItem[];
  onProductsChange: (p: ProductServiceItem[]) => void;
  labTests: LabTest[];
  onLabTestsChange: (t: LabTest[]) => void;
  onTestInCampaign: (input: CampaignInput) => void;
  onOpenGlossary: (termId: string) => void;
}

export function ProductsTab({ segment, products, onProductsChange, labTests, onLabTestsChange, onTestInCampaign, onOpenGlossary }: Props) {
  const [subTab, setSubTab] = useState<SubTab>("portfolio");

  function addProduct() {
    onProductsChange([...products, newProduct(segment)]);
  }
  function updateProduct(id: string, patch: Partial<ProductServiceItem>) {
    onProductsChange(products.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }
  function removeProduct(id: string) {
    onProductsChange(products.filter((p) => p.id !== id));
    onLabTestsChange(labTests.filter((t) => t.productId !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {SUB_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            data-testid={`products-subtab-${key}`}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg border whitespace-nowrap transition-colors",
              subTab === key ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            )}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      {subTab === "portfolio" && (
        <PortfolioSection
          segment={segment} products={products} onAdd={addProduct} onUpdate={updateProduct} onRemove={removeProduct}
          onOpenGlossary={onOpenGlossary}
        />
      )}
      {subTab === "lab" && (
        <LabSection products={products} labTests={labTests} onLabTestsChange={onLabTestsChange} onTestInCampaign={onTestInCampaign} />
      )}
      {subTab === "matrix" && <MatrixSection products={products} labTests={labTests} />}
    </div>
  );
}

// ── Portfolio ────────────────────────────────────────────────────────────────

function PortfolioSection({
  segment, products, onAdd, onUpdate, onRemove, onOpenGlossary,
}: {
  segment: BusinessSegment; products: ProductServiceItem[];
  onAdd: () => void; onUpdate: (id: string, patch: Partial<ProductServiceItem>) => void; onRemove: (id: string) => void;
  onOpenGlossary: (termId: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-700">Produtos e serviços cadastrados</p>
        <button onClick={onAdd} data-testid="product-add" className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors">
          <Plus className="w-3 h-3" /> Novo produto/serviço
        </button>
      </div>

      {products.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <Package className="w-8 h-8 mx-auto mb-2 text-gray-200" />
          <p className="text-xs text-gray-400">Nenhum produto ou serviço cadastrado ainda.</p>
        </div>
      )}

      {products.map((product) => {
        const isExpanded = expandedId === product.id;
        const costResult = calculateProductCost(product.cost, product.salesPrice);
        return (
          <div key={product.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <button
              onClick={() => setExpandedId(isExpanded ? null : product.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="text-left min-w-0">
                  <p className="text-xs font-bold text-gray-800 truncate">{product.name}</p>
                  <p className="text-[10px] text-gray-400">{product.category} · {formatCents(product.salesPrice)}</p>
                </div>
                <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0", SITUATION_STYLE[product.situation])}>
                  {SITUATION_LABEL[product.situation]}
                </span>
                {costResult.contributionMarginPct !== null && (
                  <span className="text-[10px] text-gray-400 flex-shrink-0">margem {formatPercent(costResult.contributionMarginPct)}</span>
                )}
              </div>
              {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
            </button>

            {isExpanded && (
              <div className="border-t border-gray-50 p-4 space-y-5">
                {/* Basic fields */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <label className="block">
                    <span className="block text-[11px] font-semibold text-gray-600 mb-1">Nome</span>
                    <input value={product.name} onChange={(e) => onUpdate(product.id, { name: e.target.value })} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-emerald-400" />
                  </label>
                  <label className="block">
                    <span className="block text-[11px] font-semibold text-gray-600 mb-1">Categoria</span>
                    <input value={product.category} onChange={(e) => onUpdate(product.id, { category: e.target.value })} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-emerald-400" />
                  </label>
                  <label className="block">
                    <span className="block text-[11px] font-semibold text-gray-600 mb-1">Público</span>
                    <input value={product.audience} onChange={(e) => onUpdate(product.id, { audience: e.target.value })} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-emerald-400" />
                  </label>
                  <label className="block">
                    <span className="block text-[11px] font-semibold text-gray-600 mb-1">Problema/desejo atendido</span>
                    <input value={product.problemOrDesire} onChange={(e) => onUpdate(product.id, { problemOrDesire: e.target.value })} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-emerald-400" />
                  </label>
                  <MoneyInput label="Preço de venda" valueCents={product.salesPrice} onChange={(v) => onUpdate(product.id, { salesPrice: v })} dataTestId={`product-price-${product.id}`} />
                  <label className="block">
                    <span className="block text-[11px] font-semibold text-gray-600 mb-1">Canal</span>
                    <input value={product.channel} onChange={(e) => onUpdate(product.id, { channel: e.target.value })} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-emerald-400" />
                  </label>
                  <label className="block">
                    <span className="block text-[11px] font-semibold text-gray-600 mb-1">Unidade</span>
                    <input value={product.unit} onChange={(e) => onUpdate(product.id, { unit: e.target.value })} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-emerald-400" />
                  </label>
                  <label className="block">
                    <span className="block text-[11px] font-semibold text-gray-600 mb-1">Situação</span>
                    <select value={product.situation} onChange={(e) => onUpdate(product.id, { situation: e.target.value as ProductSituation })} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-emerald-400 bg-white">
                      {(Object.keys(SITUATION_LABEL) as ProductSituation[]).map((s) => <option key={s} value={s}>{SITUATION_LABEL[s]}</option>)}
                    </select>
                  </label>
                </div>

                {/* Segment-specific fields */}
                {PRODUCT_SEGMENT_FIELDS[segment].length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Campos específicos do segmento</p>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {PRODUCT_SEGMENT_FIELDS[segment].map((field) => (
                        <label key={field} className="block">
                          <span className="block text-[11px] font-semibold text-gray-600 mb-1">{field}</span>
                          <input
                            value={product.segmentFields[field] ?? ""}
                            onChange={(e) => onUpdate(product.id, { segmentFields: { ...product.segmentFields, [field]: e.target.value } })}
                            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-emerald-400"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <ProductCostSection product={product} onUpdate={onUpdate} onOpenGlossary={onOpenGlossary} />
                <ProductOperationSection product={product} onUpdate={onUpdate} />
                <ProductPositioningSection product={product} onUpdate={onUpdate} />

                <div className="flex justify-end">
                  <button onClick={() => onRemove(product.id)} className="flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg hover:bg-red-100 transition-colors">
                    <Trash2 className="w-3 h-3" /> Remover produto
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProductCostSection({ product, onUpdate, onOpenGlossary }: { product: ProductServiceItem; onUpdate: (id: string, patch: Partial<ProductServiceItem>) => void; onOpenGlossary: (t: string) => void }) {
  const result = calculateProductCost(product.cost, product.salesPrice);

  function addComponent() {
    onUpdate(product.id, { cost: { ...product.cost, components: [...product.cost.components, { id: generateId("comp"), name: "Componente", quantity: 1, unit: "un.", unitCost: 0 }] } });
  }
  function updateComponent(compId: string, patch: Partial<typeof product.cost.components[number]>) {
    onUpdate(product.id, { cost: { ...product.cost, components: product.cost.components.map((c) => (c.id === compId ? { ...c, ...patch } : c)) } });
  }
  function removeComponent(compId: string) {
    onUpdate(product.id, { cost: { ...product.cost, components: product.cost.components.filter((c) => c.id !== compId) } });
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Composição e custo</p>
        <GlossaryHelpIcon termId="margem_contribuicao" onOpen={onOpenGlossary} />
      </div>

      <div className="space-y-1.5 mb-3">
        {product.cost.components.map((comp) => (
          <div key={comp.id} className="flex items-center gap-1.5">
            <input value={comp.name} onChange={(e) => updateComponent(comp.id, { name: e.target.value })} placeholder="Nome" className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-emerald-400" />
            <input type="text" inputMode="decimal" value={comp.quantity || ""} onChange={(e) => updateComponent(comp.id, { quantity: Number.parseFloat(e.target.value) || 0 })} placeholder="Qtd." className="w-16 text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-emerald-400" />
            <input value={comp.unit} onChange={(e) => updateComponent(comp.id, { unit: e.target.value })} placeholder="Un." className="w-14 text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-emerald-400" />
            <input type="text" inputMode="decimal" value={comp.unitCost ? (comp.unitCost / 100).toFixed(2) : ""} onChange={(e) => updateComponent(comp.id, { unitCost: Math.round((Number.parseFloat(e.target.value.replace(",", ".")) || 0) * 100) })} placeholder="Custo un." className="w-20 text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-emerald-400" />
            <button onClick={() => removeComponent(comp.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
        <button onClick={addComponent} className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-800 transition-colors">
          <Plus className="w-3 h-3" /> Adicionar componente
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <MoneyInput label="Embalagem" valueCents={product.cost.packagingCost} onChange={(v) => onUpdate(product.id, { cost: { ...product.cost, packagingCost: v } })} />
        <MoneyInput label="Entrega" valueCents={product.cost.deliveryCost} onChange={(v) => onUpdate(product.id, { cost: { ...product.cost, deliveryCost: v } })} />
        <PercentInput label="Taxa" valueFraction={product.cost.feePct} onChange={(v) => onUpdate(product.id, { cost: { ...product.cost, feePct: v } })} />
        <PercentInput label="Comissão" valueFraction={product.cost.commissionPct} onChange={(v) => onUpdate(product.id, { cost: { ...product.cost, commissionPct: v } })} />
        <PercentInput label="Desconto" valueFraction={product.cost.discountPct} onChange={(v) => onUpdate(product.id, { cost: { ...product.cost, discountPct: v } })} />
        <PercentInput label="Imposto" valueFraction={product.cost.taxPct} onChange={(v) => onUpdate(product.id, { cost: { ...product.cost, taxPct: v } })} />
        <PercentInput label="Perda esperada" valueFraction={product.cost.expectedLossPct} onChange={(v) => onUpdate(product.id, { cost: { ...product.cost, expectedLossPct: v } })} />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 bg-gray-50 rounded-xl p-3">
        <div>
          <p className="text-[10px] text-gray-500">Custo direto</p>
          <p className="text-xs font-bold text-gray-800">{formatCents(result.directCost)}{result.directCostPct !== null ? ` (${formatPercent(result.directCostPct)})` : ""}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500">Margem de contribuição unitária</p>
          <p className="text-xs font-bold text-gray-800">{formatCents(result.contributionMarginUnit)}{result.contributionMarginPct !== null ? ` (${formatPercent(result.contributionMarginPct)})` : ""}</p>
        </div>
        <div className="lg:col-span-2">
          <p className="text-[10px] text-gray-500">Confiança / status</p>
          <div className="flex items-center gap-2 flex-wrap">
            <ConfidenceLabel confidence={result.confidence} />
            <StatusPill status={result.status} />
          </div>
        </div>
      </div>
      <p className="text-[10px] text-gray-400 mt-1.5 font-mono">{result.formula}</p>
      {result.missingInputs.length > 0 && (
        <p className="text-[10px] text-amber-600 mt-1">Dados faltantes: {result.missingInputs.join(", ")}</p>
      )}
    </div>
  );
}

function ProductOperationSection({ product, onUpdate }: { product: ProductServiceItem; onUpdate: (id: string, patch: Partial<ProductServiceItem>) => void }) {
  const result = calculateProductOperation(product.operation);
  return (
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Operação e capacidade</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <NumberInput label="Tempo de produção (min.)" value={product.operation.productionTimeMinutes} onChange={(v) => onUpdate(product.id, { operation: { ...product.operation, productionTimeMinutes: v } })} />
        <NumberInput label="Capacidade por período" value={product.operation.capacityPerPeriod} onChange={(v) => onUpdate(product.id, { operation: { ...product.operation, capacityPerPeriod: v } })} />
        <label className="block">
          <span className="block text-[11px] font-semibold text-gray-600 mb-1">Período</span>
          <select value={product.operation.period} onChange={(e) => onUpdate(product.id, { operation: { ...product.operation, period: e.target.value as "dia" | "semana" | "mes" } })} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-emerald-400 bg-white">
            <option value="dia">Por dia</option>
            <option value="semana">Por semana</option>
            <option value="mes">Por mês</option>
          </select>
        </label>
        <NumberInput label="Capacidade máxima" value={product.operation.maxCapacity} onChange={(v) => onUpdate(product.id, { operation: { ...product.operation, maxCapacity: v } })} />
        <label className="block">
          <span className="block text-[11px] font-semibold text-gray-600 mb-1">Equipamento</span>
          <input value={product.operation.equipment} onChange={(e) => onUpdate(product.id, { operation: { ...product.operation, equipment: e.target.value } })} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-emerald-400" />
        </label>
        <label className="block">
          <span className="block text-[11px] font-semibold text-gray-600 mb-1">Fornecedor</span>
          <input value={product.operation.supplier} onChange={(e) => onUpdate(product.id, { operation: { ...product.operation, supplier: e.target.value } })} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-emerald-400" />
        </label>
        <label className="block">
          <span className="block text-[11px] font-semibold text-gray-600 mb-1">Gargalo</span>
          <input value={product.operation.bottleneck} onChange={(e) => onUpdate(product.id, { operation: { ...product.operation, bottleneck: e.target.value } })} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-emerald-400" />
        </label>
        <label className="block">
          <span className="block text-[11px] font-semibold text-gray-600 mb-1">Risco de desperdício</span>
          <select value={product.operation.wasteRisk} onChange={(e) => onUpdate(product.id, { operation: { ...product.operation, wasteRisk: e.target.value as "baixo" | "medio" | "alto" } })} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-emerald-400 bg-white">
            <option value="baixo">Baixo</option><option value="medio">Médio</option><option value="alto">Alto</option>
          </select>
        </label>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 bg-gray-50 rounded-xl p-3 text-xs">
        <div><p className="text-gray-500">Capacidade projetada</p><p className="font-bold text-gray-800">{result.projectedCapacity}</p></div>
        <div><p className="text-gray-500">Utilização</p><p className="font-bold text-gray-800">{result.utilizationPct !== null ? formatPercent(result.utilizationPct) : "—"}</p></div>
        <div><p className="text-gray-500">Vendas possíveis</p><p className="font-bold text-gray-800">{result.possibleSales}</p></div>
        <div><p className="text-gray-500">Risco operacional</p><p className="font-bold text-gray-800 capitalize">{result.operationalRisk}</p></div>
      </div>
      <p className="text-[10px] text-gray-400 mt-1">Gargalo principal: {result.mainBottleneck}</p>
    </div>
  );
}

function ProductPositioningSection({ product, onUpdate }: { product: ProductServiceItem; onUpdate: (id: string, patch: Partial<ProductServiceItem>) => void }) {
  const p = product.positioning;
  return (
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Público e posicionamento</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {([
          ["mainAudience", "Público principal"], ["priceRange", "Faixa de preço"], ["consumptionOccasion", "Ocasião de consumo"],
          ["competitors", "Concorrentes"], ["differentiator", "Diferencial"], ["visualPresentation", "Apresentação visual"],
          ["place", "Praça"], ["promotion", "Promoção"],
        ] as const).map(([key, label]) => (
          <label key={key} className="block">
            <span className="block text-[11px] font-semibold text-gray-600 mb-1">{label}</span>
            <input value={p[key]} onChange={(e) => onUpdate(product.id, { positioning: { ...p, [key]: e.target.value } })} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-emerald-400" />
          </label>
        ))}
      </div>
    </div>
  );
}

// ── Laboratory ───────────────────────────────────────────────────────────────

function buildTestCampaignInput(product: ProductServiceItem): CampaignInput {
  return {
    name: `${product.name} — teste`,
    objective: "vender",
    product: product.name,
    regularPrice: product.salesPrice,
    pricePaidByCustomer: product.salesPrice,
    platformSubsidyPerOrder: 0,
    directCostPerUnit: calculateProductCost(product.cost, product.salesPrice).directCost,
    projectedQuantity: 100,
    marketplaceFeePct: product.cost.feePct,
    marketplaceFeeBase: "receita_reconhecida",
    cardFeePct: 0.02,
    salesTaxPct: product.cost.taxPct,
    subsidizedDeliveryPerOrder: product.cost.deliveryCost,
    mediaBudget: 0, influencerBudget: 0, contentProductionBudget: 0, decorationBudget: 0, printedMaterialBudget: 0, otherFixedCosts: 0,
    expectedNewCustomers: 0, futureAverageTicket: 0, futureRepeatPurchases: 0, futureContributionMarginPct: 0,
  };
}

function LabSection({
  products, labTests, onLabTestsChange, onTestInCampaign,
}: { products: ProductServiceItem[]; labTests: LabTest[]; onLabTestsChange: (t: LabTest[]) => void; onTestInCampaign: (input: CampaignInput) => void }) {
  function addTest(product: ProductServiceItem) {
    const test: LabTest = {
      id: generateId("lab"), productId: product.id, productName: product.name, stage: "planejamento",
      test: buildTestCampaignInput(product), result: null, recommendedDecision: null, decisionReason: "",
    };
    onLabTestsChange([...labTests, test]);
  }
  function updateTest(id: string, patch: Partial<LabTest>) {
    onLabTestsChange(labTests.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }
  function removeTest(id: string) {
    onLabTestsChange(labTests.filter((t) => t.id !== id));
  }

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-xs font-bold text-gray-700 mb-1">Laboratório de produtos</p>
        <p className="text-[10px] text-gray-400 mb-3">Fluxo: Ideia → Planejamento → Teste → Resultado → Decisão. Reutiliza o simulador de campanha existente — nenhum segundo motor financeiro.</p>
        <div className="flex flex-wrap gap-2">
          {products.map((p) => (
            <button key={p.id} onClick={() => addTest(p)} className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5 hover:bg-blue-100 transition-colors">
              + Testar &ldquo;{p.name}&rdquo;
            </button>
          ))}
          {products.length === 0 && <p className="text-xs text-gray-400">Cadastre um produto no Portfólio primeiro.</p>}
        </div>
      </div>

      {labTests.map((labTest) => (
        <LabTestCard key={labTest.id} labTest={labTest} onUpdate={(patch) => updateTest(labTest.id, patch)} onRemove={() => removeTest(labTest.id)} onTestInCampaign={onTestInCampaign} />
      ))}
    </div>
  );
}

const LAB_STAGE_LABEL: Record<LabTest["stage"], string> = {
  ideia: "Ideia", planejamento: "Planejamento", teste: "Teste", resultado: "Resultado", decisao: "Decisão",
};
const DECISION_LABEL: Record<LabDecision, string> = {
  manter: "Manter", ajustar_preco: "Ajustar preço", reformular: "Reformular", transformar_combo: "Transformar em combo",
  tornar_sazonal: "Tornar sazonal", retirar: "Retirar", expandir: "Expandir",
};

function LabTestCard({ labTest, onUpdate, onRemove, onTestInCampaign }: { labTest: LabTest; onUpdate: (patch: Partial<LabTest>) => void; onRemove: () => void; onTestInCampaign: (input: CampaignInput) => void }) {
  const projection = calculateCampaignProjection(labTest.test);
  const suggestion = recommendLabDecision(labTest.test, labTest.result);

  function updateField<K extends keyof CampaignInput>(key: K, value: CampaignInput[K]) {
    onUpdate({ test: { ...labTest.test, [key]: value } });
  }
  function updateResult(patch: Partial<NonNullable<LabTest["result"]>>) {
    const base = labTest.result ?? { revenue: 0, quantitySold: 0, cmvOrCsv: 0, productionTimeMinutes: 0, rating: null, repeatPurchaseRate: null, wastePct: null, cancellationsCount: 0, capacityUsedPct: null, acquisitionCost: null };
    onUpdate({ result: { ...base, ...patch } });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold text-gray-800">{labTest.productName}</p>
          <select value={labTest.stage} onChange={(e) => onUpdate({ stage: e.target.value as LabTest["stage"] })} className="text-[10px] font-bold border border-gray-200 rounded-full px-2 py-0.5 bg-white">
            {(Object.keys(LAB_STAGE_LABEL) as LabTest["stage"][]).map((s) => <option key={s} value={s}>{LAB_STAGE_LABEL[s]}</option>)}
          </select>
        </div>
        <button onClick={onRemove} className="p-1 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <MoneyInput label="Preço normal" valueCents={labTest.test.regularPrice} onChange={(v) => updateField("regularPrice", v)} />
        <MoneyInput label="Preço de teste" valueCents={labTest.test.pricePaidByCustomer} onChange={(v) => updateField("pricePaidByCustomer", v)} />
        <MoneyInput label="Custo" valueCents={labTest.test.directCostPerUnit} onChange={(v) => updateField("directCostPerUnit", v)} />
        <NumberInput label="Meta de pedidos" value={labTest.test.projectedQuantity} onChange={(v) => updateField("projectedQuantity", v)} />
        <MoneyInput label="Verba de campanha" valueCents={labTest.test.mediaBudget} onChange={(v) => updateField("mediaBudget", v)} />
        <MoneyInput label="Cupons" valueCents={labTest.test.otherFixedCosts} onChange={(v) => updateField("otherFixedCosts", v)} />
        <MoneyInput label="Influenciador" valueCents={labTest.test.influencerBudget} onChange={(v) => updateField("influencerBudget", v)} />
        <MoneyInput label="Ornamentação" valueCents={labTest.test.decorationBudget} onChange={(v) => updateField("decorationBudget", v)} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 bg-gray-50 rounded-xl p-3 text-xs mb-3">
        <div><p className="text-gray-500">Ponto de equilíbrio</p><p className="font-bold text-gray-800">{projection.ordersToBreakEven !== null ? Math.ceil(projection.ordersToBreakEven) : "—"} pedidos</p></div>
        <div><p className="text-gray-500">Margem por pedido</p><p className="font-bold text-gray-800">{formatCents(projection.contributionMarginPerOrder)}</p></div>
        <div><p className="text-gray-500">Resultado projetado</p><p className={cn("font-bold", projection.resultBeforeOverhead >= 0 ? "text-emerald-600" : "text-red-600")}>{formatCents(projection.resultBeforeOverhead)}</p></div>
        <div><p className="text-gray-500">Status</p><p className="font-bold text-gray-800">{projection.status}</p></div>
      </div>

      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Resultado do teste</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <MoneyInput label="Faturamento" valueCents={labTest.result?.revenue ?? 0} onChange={(v) => updateResult({ revenue: v })} />
        <NumberInput label="Quantidade vendida" value={labTest.result?.quantitySold ?? 0} onChange={(v) => updateResult({ quantitySold: v })} />
        <MoneyInput label="CMV/CSV do teste" valueCents={labTest.result?.cmvOrCsv ?? 0} onChange={(v) => updateResult({ cmvOrCsv: v })} />
        <PercentInput label="Desperdício" valueFraction={labTest.result?.wastePct ?? 0} onChange={(v) => updateResult({ wastePct: v })} />
        <PercentInput label="Taxa de recompra" valueFraction={labTest.result?.repeatPurchaseRate ?? 0} onChange={(v) => updateResult({ repeatPurchaseRate: v })} />
        <NumberInput label="Cancelamentos" value={labTest.result?.cancellationsCount ?? 0} onChange={(v) => updateResult({ cancellationsCount: v })} />
      </div>

      <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2.5 mb-3">
        <p className="text-[10px] font-bold text-indigo-700">Decisão sugerida: {DECISION_LABEL[suggestion.decision]}</p>
        <p className="text-[11px] text-indigo-600 mt-0.5">{suggestion.reason}</p>
        <p className="text-[9px] text-indigo-400 mt-1">Nenhuma decisão é executada automaticamente — escolha abaixo.</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={labTest.recommendedDecision ?? ""}
          onChange={(e) => onUpdate({ recommendedDecision: (e.target.value || null) as LabDecision | null, decisionReason: suggestion.reason })}
          className="text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-purple-400 bg-white"
        >
          <option value="">Escolher decisão final</option>
          {(Object.keys(DECISION_LABEL) as LabDecision[]).map((d) => <option key={d} value={d}>{DECISION_LABEL[d]}</option>)}
        </select>
        <button
          onClick={() => onTestInCampaign(labTest.test)}
          className="flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2 hover:bg-purple-100 transition-colors"
        >
          Testar em campanha <ArrowRight className="w-3 h-3" />
        </button>
        <Link
          href="/admin/contentos/criar?step=brief"
          className="flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 hover:bg-indigo-100 transition-colors"
        >
          Criar campanha no REC OS <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <p className="text-[9px] text-gray-400 mt-2">Contexto preparado para a próxima integração — nenhum preenchimento automático nesta versão.</p>
    </div>
  );
}

// ── Performance matrix ───────────────────────────────────────────────────────

const QUADRANT_LABEL: Record<PerformanceQuadrant, string> = {
  alta_venda_alta_margem: "Alta venda + alta margem",
  alta_venda_baixa_margem: "Alta venda + baixa margem",
  baixa_venda_alta_margem: "Baixa venda + alta margem",
  baixa_venda_baixa_margem: "Baixa venda + baixa margem",
};
const QUADRANT_STYLE: Record<PerformanceQuadrant, string> = {
  alta_venda_alta_margem: "bg-emerald-50 border-emerald-100",
  alta_venda_baixa_margem: "bg-amber-50 border-amber-100",
  baixa_venda_alta_margem: "bg-blue-50 border-blue-100",
  baixa_venda_baixa_margem: "bg-red-50 border-red-100",
};

function MatrixSection({ products, labTests }: { products: ProductServiceItem[]; labTests: LabTest[] }) {
  const performanceInputs = products.map((p) => {
    const latestTest = [...labTests].reverse().find((t) => t.productId === p.id && t.result);
    const unitsSold = latestTest?.result?.quantitySold ?? 0;
    const costResult = calculateProductCost(p.cost, p.salesPrice);
    return { productId: p.id, productName: p.name, category: p.category, unitsSold, contributionMarginPct: costResult.contributionMarginPct };
  });

  const classifications = classifyProductPerformance(performanceInputs, {});

  const quadrants: PerformanceQuadrant[] = ["alta_venda_alta_margem", "alta_venda_baixa_margem", "baixa_venda_alta_margem", "baixa_venda_baixa_margem"];

  return (
    <div className="space-y-4">
      {products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <Grid3x3 className="w-8 h-8 mx-auto mb-2 text-gray-200" />
          <p className="text-xs text-gray-400">Cadastre produtos no Portfólio para ver a matriz de desempenho.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {quadrants.map((quadrant) => {
            const inQuadrant = classifications.filter((c) => c.quadrant === quadrant);
            return (
              <div key={quadrant} className={cn("rounded-2xl border p-4", QUADRANT_STYLE[quadrant])}>
                <p className="text-xs font-bold text-gray-800 mb-2">{QUADRANT_LABEL[quadrant]}</p>
                {inQuadrant.length === 0 ? (
                  <p className="text-[10px] text-gray-400">Nenhum produto neste quadrante.</p>
                ) : (
                  <div className="space-y-2">
                    {inQuadrant.map((c) => {
                      const product = products.find((p) => p.id === c.productId);
                      const performanceInput = performanceInputs.find((pi) => pi.productId === c.productId);
                      const confidence = performanceInput?.unitsSold ? "media" : "insuficiente";
                      const recommendation = buildProductRecommendation(c.productId, c.quadrant, confidence, c.salesCriterionLabel, c.marginCriterionLabel);
                      return (
                        <div key={c.productId} className="bg-white/70 rounded-xl p-2.5">
                          <p className="text-xs font-bold text-gray-800">{product?.name}</p>
                          <p className="text-[9px] text-gray-500 mt-0.5">{c.salesCriterionLabel} · {c.marginCriterionLabel}</p>
                          {recommendation && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {recommendation.actions.map((a) => (
                                <span key={a} className="text-[9px] font-medium bg-white text-gray-600 border border-gray-200 rounded-full px-1.5 py-0.5">{a}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {classifications.some((c) => c.quadrant === null) && (
        <p className="text-[10px] text-gray-400 text-center">Alguns produtos ainda não têm dados suficientes (venda de teste ou margem) para entrar na matriz.</p>
      )}
      {classifications.some((c) => c.categoryMixedWarning) && (
        <p className="text-[10px] text-amber-600 text-center">Categorias diferentes sendo comparadas sem meta configurada — o critério usado é a mediana de cada categoria, não um limite único.</p>
      )}
    </div>
  );
}
