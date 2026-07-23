"use client";

import { useMemo, useState } from "react";
import { Sparkles, LayoutGrid, Building2, Package, Tags, Megaphone, Wallet, Database, BookOpen } from "lucide-react";
import { SEGMENT_PRESETS, SEGMENT_ORDER } from "@/lib/motor-lokat/segment-presets";
import { buildFinancialSnapshot } from "@/lib/motor-lokat/financial-engine";
import { findGlossaryEntry } from "@/lib/motor-lokat/glossary";
import type { BusinessSegment, FinancialProfile, FinancialMetric, CampaignInput } from "@/lib/motor-lokat/types";
import type { BusinessDNA, FourPs, SwotItem, SalesGoal, ProductServiceItem, LabTest } from "@/lib/motor-lokat/business-types";
import { MetricDetailModal } from "./_shared";
import { OverviewTab } from "./_overview-tab";
import { BusinessTab } from "./_business-tab";
import { ProductsTab } from "./_products-tab";
import { PricingTab } from "./_pricing-tab";
import { CampaignTab } from "./_campaign-tab";
import { CashFlowTab } from "./_cashflow-tab";
import { SourcesTab } from "./_sources-tab";
import { GlossaryTab } from "./_glossary-tab";
import { buildAssistantContext } from "@/lib/motor-lokat/ai/context-builder";
import type { ProposedUpdate } from "@/lib/motor-lokat/ai/types";
import { AssistantPanel } from "./_ai/assistant-panel";
import { CampaignWizard } from "./_ai/campaign-wizard";

type TabKey = "overview" | "business" | "products" | "pricing" | "campaigns" | "cashflow" | "sources" | "glossary";

const TABS: Array<{ key: TabKey; label: string; icon: React.ElementType }> = [
  { key: "overview",  label: "Visão Geral",           icon: LayoutGrid },
  { key: "business",  label: "Empresa",               icon: Building2 },
  { key: "products",  label: "Produtos e Serviços",   icon: Package },
  { key: "pricing",   label: "Precificação",          icon: Tags },
  { key: "campaigns", label: "Campanhas",             icon: Megaphone },
  { key: "cashflow",  label: "Fluxo de Caixa",        icon: Wallet },
  { key: "sources",   label: "Fontes",                icon: Database },
  { key: "glossary",  label: "Glossário",             icon: BookOpen },
];

function emptyDna(segment: BusinessSegment): BusinessDNA {
  const field = (value = "") => ({ value, source: "manual" as const });
  return {
    companyName: field(""), segment: { value: segment, source: "manual" }, businessModel: field(""),
    description: field(""), mainProducts: field(""), problemSolved: field(""), desiresServed: field(""),
    valueProposition: field(""), differentiators: field(""), audiences: field(""), priceRange: field(""),
    salesChannels: field(""), units: field(""), regionsServed: field(""), seasonality: field(""),
    goals: field(""), restrictions: field(""), contactNetwork: field(""), competitors: field(""), positioning: field(""),
  };
}

function emptyFourPs(): FourPs {
  const section = () => ({ text: "", evidence: "", notes: "" });
  return { product: section(), price: section(), place: section(), promotion: section() };
}

function exampleSwotForSegment(segment: BusinessSegment): SwotItem[] {
  const examples: Record<BusinessSegment, { forca: string; fraqueza: string; oportunidade: string; ameaca: string }> = {
    delivery: { forca: "Tempo de entrega rápido na região", fraqueza: "Dependência de uma única plataforma de pedidos", oportunidade: "Crescimento de pedidos por WhatsApp", ameaca: "Aumento das taxas de marketplace" },
    varejo: { forca: "Localização de fácil acesso", fraqueza: "Estoque parado em itens de baixo giro", oportunidade: "Expansão para venda online", ameaca: "Concorrência de grandes redes" },
    clinica: { forca: "Equipe qualificada e fidelizada", fraqueza: "Agenda com horários ociosos", oportunidade: "Parcerias com convênios locais", ameaca: "Novos concorrentes na região" },
    servicos: { forca: "Relacionamento próximo com clientes", fraqueza: "Capacidade limitada da equipe", oportunidade: "Demanda crescente por serviços especializados", ameaca: "Concorrência via freelancers" },
    agencia: { forca: "Portfólio consolidado", fraqueza: "Dependência de poucos clientes grandes", oportunidade: "Novos formatos de conteúdo em alta", ameaca: "Pressão de preço de agências menores" },
    saas: { forca: "Produto com baixo custo de manutenção", fraqueza: "Onboarding manual e demorado", oportunidade: "Expansão para novo segmento de clientes", ameaca: "Concorrente com funcionalidade similar mais barata" },
  };
  const e = examples[segment];
  const base = (category: SwotItem["category"], text: string): SwotItem => ({
    id: `swot-example-${category}`, category, text, source: "estimated", evidence: "", impact: "medio", priority: "media", confirmed: false, isExample: true,
  });
  return [base("forca", e.forca), base("fraqueza", e.fraqueza), base("oportunidade", e.oportunidade), base("ameaca", e.ameaca)];
}

function exampleGoals(): SalesGoal[] {
  return [
    { id: "goal-example-1", label: "Faturamento do mês", metric: "faturamento", actualValue: 0, goalValue: 0, period: "Mês atual (demonstração)", channel: "Todos", product: "Todos", unit: "R$" },
    { id: "goal-example-2", label: "Clientes novos", metric: "clientes_novos", actualValue: 0, goalValue: 0, period: "Mês atual (demonstração)", channel: "Todos", product: "Todos", unit: "clientes" },
  ];
}

function demoProfileForSegment(segment: BusinessSegment): FinancialProfile {
  const preset = SEGMENT_PRESETS[segment];
  const demo: Record<BusinessSegment, { gross: number; subsidy: number; refunds: number; chargebacks: number; direct: number; variable: number; fixed: number; orders: number }> = {
    delivery: { gross: 4_500_000, subsidy: 120_000, refunds: 45_000, chargebacks: 10_000, direct: 1_575_000, variable: 900_000, fixed: 1_200_000, orders: 1500 },
    varejo:   { gross: 8_000_000, subsidy: 0,        refunds: 160_000, chargebacks: 20_000, direct: 3_600_000, variable: 800_000, fixed: 2_100_000, orders: 900 },
    clinica:  { gross: 3_200_000, subsidy: 0,        refunds: 30_000,  chargebacks: 0,        direct: 640_000,  variable: 256_000, fixed: 1_400_000, orders: 260 },
    servicos: { gross: 5_000_000, subsidy: 0,        refunds: 0,        chargebacks: 0,        direct: 1_250_000, variable: 500_000, fixed: 1_800_000, orders: 40 },
    agencia:  { gross: 6_500_000, subsidy: 0,        refunds: 0,        chargebacks: 0,        direct: 1_950_000, variable: 520_000, fixed: 2_400_000, orders: 12 },
    saas:     { gross: 2_800_000, subsidy: 0,        refunds: 0,        chargebacks: 0,        direct: 420_000,  variable: 224_000, fixed: 900_000,  orders: 320 },
  };
  const d = demo[segment];
  return {
    segment,
    grossSales: { value: d.gross, source: "manual" },
    platformSubsidies: { value: d.subsidy, source: d.subsidy > 0 ? "manual" : "missing" },
    refunds: { value: d.refunds, source: "manual" },
    chargebacks: { value: d.chargebacks, source: d.chargebacks > 0 ? "manual" : "missing" },
    directCost: { value: d.direct, source: "estimated" },
    variableExpenses: { value: d.variable, source: "estimated" },
    fixedExpenses: { value: d.fixed, source: "manual" },
    ordersCount: { value: d.orders, source: "manual" },
    goals: { ...preset.suggestedGoals },
  };
}

export function MeuNegocioContent() {
  const [segment, setSegment] = useState<BusinessSegment>("delivery");
  const [profile, setProfile] = useState<FinancialProfile>(() => demoProfileForSegment("delivery"));
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [detailMetric, setDetailMetric] = useState<FinancialMetric | null>(null);
  const [glossaryTermId, setGlossaryTermId] = useState<string | null>(null);

  // Sprint Motor LOKAT 1.1 — Business DNA / 4 Ps / SWOT / Goals / Products / Lab.
  // Lifted here (not reset on segment change) so work in Empresa/Produtos e
  // Serviços is never discarded just because the segment dropdown changes.
  const [dna, setDna] = useState<BusinessDNA>(() => emptyDna("delivery"));
  const [fourPs, setFourPs] = useState<FourPs>(emptyFourPs);
  const [swotItems, setSwotItems] = useState<SwotItem[]>(() => exampleSwotForSegment("delivery"));
  const [salesGoals, setSalesGoals] = useState<SalesGoal[]>(exampleGoals);
  const [products, setProducts] = useState<ProductServiceItem[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);

  // Prepared by "Testar em campanha" (Products & Services) — never auto-sent.
  // `campaignSeedVersion` forces CampaignTab to remount and pick up the fresh
  // seed, the same key-remount pattern used to keep state deterministic
  // elsewhere in this project.
  const [campaignSeed, setCampaignSeed] = useState<CampaignInput | null>(null);
  const [campaignSeedVersion, setCampaignSeedVersion] = useState(0);

  // Sprint Motor LOKAT 1.2 — guided campaign mode toggle (Fase 14). Kept
  // separate from campaignSeed/campaignSeedVersion, which stay reserved for
  // the "Testar em campanha" bridge from Produtos e Serviços.
  const [campaignMode, setCampaignMode] = useState<"simulador" | "guiado">("simulador");

  const preset = SEGMENT_PRESETS[segment];
  const snapshot = useMemo(() => buildFinancialSnapshot(profile), [profile]);

  // Sprint Motor LOKAT 1.2 — compact context sent to the Assistant LOKAT.
  // Never the whole shell state: buildAssistantContext already drops empty
  // DNA fields and unconfirmed SWOT examples.
  const assistantContext = useMemo(() => buildAssistantContext({
    page: activeTab, segment, dna, fourPs, swotItems, salesGoals, snapshot,
    currentCampaign: campaignSeed,
  }), [activeTab, segment, dna, fourPs, swotItems, salesGoals, snapshot, campaignSeed]);

  function handleSegmentChange(next: BusinessSegment) {
    setSegment(next);
    setProfile(demoProfileForSegment(next));
  }

  function openGlossaryTerm(termId: string) {
    if (findGlossaryEntry(termId)) setGlossaryTermId(termId);
  }

  function handleTestInCampaign(input: CampaignInput) {
    setCampaignSeed(input);
    setCampaignSeedVersion((v) => v + 1);
    setActiveTab("campaigns");
  }

  /**
   * Fase 12 — applies assistant proposals to in-memory state only, never to
   * any backend. Deliberately a whitelist of known, safe paths rather than a
   * generic path-writer: an unrecognized path is simply skipped, never
   * evaluated dynamically. Only "dna.<field>" and "profile.<field>" are
   * supported in this first version — enough to cover the DNA and financial
   * snapshot fill flows without accepting an arbitrary write target.
   */
  function handleApplyProposedUpdates(updates: ProposedUpdate[]) {
    for (const update of updates) {
      const [namespace, field] = update.path.split(".");
      if (namespace === "dna" && field && field in dna) {
        setDna((prev) => ({ ...prev, [field]: { value: String(update.proposedValue), source: "manual" } }));
      } else if (namespace === "profile" && field && field in profile) {
        setProfile((prev) => ({
          ...prev,
          [field]: { value: Number(update.proposedValue) || 0, source: "manual" },
        }));
      }
      // Any other path is intentionally ignored — never write to an
      // unrecognized target just because the assistant proposed it.
    }
  }

  return (
    <div className="lokat-business-theme rounded-3xl p-4 sm:p-6" style={{ background: "var(--business-bg)" }}>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--business-accent-soft)" }}>
            <Sparkles className="w-5 h-5" style={{ color: "var(--business-accent)" }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold" style={{ color: "var(--business-text)" }}>Meu Negócio</h1>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-white" style={{ background: "var(--business-accent)" }}>
                Motor LOKAT
              </span>
            </div>
            <p className="text-xs" style={{ color: "var(--business-muted)" }}>Finanças, campanhas e decisões em um só lugar.</p>
          </div>
        </div>

        <select
          value={segment}
          onChange={(e) => handleSegmentChange(e.target.value as BusinessSegment)}
          data-testid="meu-negocio-segment-select"
          className="text-xs rounded-xl px-3 py-2 outline-none border"
          style={{ borderColor: "var(--business-border)", background: "var(--business-surface)", color: "var(--business-text)" }}
        >
          {SEGMENT_ORDER.map((s) => (
            <option key={s} value={s}>{SEGMENT_PRESETS[s].label}</option>
          ))}
        </select>
      </div>

      {/* Demo mode banner (Fase 3 — always visible, never hidden) */}
      <div className="mb-5 rounded-2xl px-4 py-3 border" style={{ background: "var(--business-accent-soft)", borderColor: "var(--business-border)" }}>
        <p className="text-[10px] font-black uppercase tracking-wider mb-0.5" style={{ color: "var(--business-accent)" }}>Modo demonstração</p>
        <p className="text-xs leading-relaxed" style={{ color: "var(--business-text)" }}>
          Os valores desta tela são exemplos editáveis e não representam a situação financeira real de nenhum cliente.
          Nada aqui é salvo — os dados existem apenas durante esta sessão da página.
        </p>
      </div>

      <p className="text-[11px] mb-5 italic" style={{ color: "var(--business-muted)" }}>
        Referência inicial. Ajuste conforme a realidade do negócio e a orientação do contador ou gestor financeiro.
      </p>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            data-testid={`meu-negocio-tab-${key}`}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border whitespace-nowrap transition-colors"
            style={activeTab === key
              ? { background: "var(--business-accent)", color: "white", borderColor: "var(--business-accent)" }
              : { background: "var(--business-surface)", color: "var(--business-muted)", borderColor: "var(--business-border)" }}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <OverviewTab
          profile={profile} onProfileChange={setProfile} snapshot={snapshot} preset={preset}
          onOpenDetail={setDetailMetric} onOpenGlossary={openGlossaryTerm}
        />
      )}
      {activeTab === "business" && (
        <BusinessTab
          dna={dna} onDnaChange={setDna}
          fourPs={fourPs} onFourPsChange={setFourPs}
          swotItems={swotItems} onSwotChange={setSwotItems}
          salesGoals={salesGoals} onSalesGoalsChange={setSalesGoals}
        />
      )}
      {activeTab === "products" && (
        <ProductsTab
          segment={segment} products={products} onProductsChange={setProducts}
          labTests={labTests} onLabTestsChange={setLabTests}
          onTestInCampaign={handleTestInCampaign} onOpenGlossary={openGlossaryTerm}
        />
      )}
      {activeTab === "pricing" && <PricingTab onOpenGlossary={openGlossaryTerm} />}
      {activeTab === "campaigns" && (
        <div className="space-y-4">
          <div className="flex gap-1.5">
            {(["simulador", "guiado"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setCampaignMode(m)}
                data-testid={`campaign-mode-${m}`}
                className="text-[11px] font-bold px-3 py-1.5 rounded-lg border"
                style={campaignMode === m
                  ? { background: "var(--business-accent)", color: "white", borderColor: "var(--business-accent)" }
                  : { background: "var(--business-surface)", color: "var(--business-muted)", borderColor: "var(--business-border)" }}
              >
                {m === "simulador" ? "Simulador" : "Planejar campanha comigo"}
              </button>
            ))}
          </div>
          {campaignMode === "simulador"
            ? <CampaignTab key={campaignSeedVersion} onOpenGlossary={openGlossaryTerm} seedInput={campaignSeed ?? undefined} />
            : <CampaignWizard context={assistantContext} onOpenGlossary={openGlossaryTerm} />}
        </div>
      )}
      {activeTab === "cashflow" && <CashFlowTab snapshot={snapshot} onOpenGlossary={openGlossaryTerm} />}
      {activeTab === "sources" && <SourcesTab />}
      {activeTab === "glossary" && <GlossaryTab initialTermId={glossaryTermId} />}

      {detailMetric && (
        <MetricDetailModal metric={detailMetric} onClose={() => setDetailMetric(null)} />
      )}

      {glossaryTermId && activeTab !== "glossary" && (
        <GlossaryQuickView termId={glossaryTermId} onClose={() => setGlossaryTermId(null)} />
      )}

      <AssistantPanel page={activeTab} context={assistantContext} onApplyProposedUpdates={handleApplyProposedUpdates} />
    </div>
  );
}

function GlossaryQuickView({ termId, onClose }: { termId: string; onClose: () => void }) {
  const entry = findGlossaryEntry(termId);
  if (!entry) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[80vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wider">{entry.technicalName}</p>
        <p className="text-base font-black text-gray-900 mt-0.5 mb-3">{entry.simpleName}</p>
        <p className="text-sm text-gray-700 leading-relaxed mb-3">{entry.explanation}</p>
        <p className="text-xs font-mono bg-gray-50 rounded-xl px-3 py-2 border border-gray-100 mb-3">{entry.formula}</p>
        <p className="text-xs text-gray-500 mb-4">{entry.example}</p>
        <button onClick={onClose} className="w-full text-xs font-bold py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
          Fechar
        </button>
      </div>
    </div>
  );
}
