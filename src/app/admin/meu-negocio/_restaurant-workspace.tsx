"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Database, FileBarChart, LayoutGrid, Package, Settings, Tags, UtensilsCrossed, Wallet } from "lucide-react";
import type { BusinessModuleKey } from "@/lib/business-archetypes/types";
import { getArchetypeConfig } from "@/lib/business-archetypes/types";
import { TECHNICAL_SHEET_FIXTURES } from "@/lib/costing/fixtures";
import { STOCK_BALANCE_FIXTURES, STOCK_ITEM_FIXTURES, STOCK_MOVEMENT_FIXTURES } from "@/lib/stock/fixtures";
import type { StockBalance, StockMovement } from "@/lib/stock/types";
import { cn } from "@/lib/utils";
import { MotionSection } from "@/components/motion/motion-section";
import { CmvCenter } from "./_cmv-center";
import { CommandCenterDashboard } from "./_command-center-dashboard";
import { ComingSoonPanel } from "./_coming-soon-panel";
import { dashboardTokens } from "./_dashboard-design-tokens";
import { FinanceTab } from "./_finance-tab";
import { useBusinessViewMode } from "./_view-mode";
import { PeriodSelector } from "./_period-selector";
import { buildPeriodSelection } from "@/lib/business-period/calculations";
import type { BusinessPeriodSelection } from "@/lib/business-period/types";
import { ProductCommandCenter } from "./_product-command-center";
import { RestaurantAnalyzeFill } from "./_restaurant-analyze-fill";
import { RestaurantPurchasing } from "./_restaurant-purchasing";
import { RestaurantReports } from "./_restaurant-reports";
import { RestaurantStock } from "./_restaurant-stock";
import { RestaurantTechnicalSheets } from "./_restaurant-technical-sheets";
import { SourcesTab } from "./_sources-tab";

type DashboardSection = "overview" | "finance" | "cmv" | "products" | "inventory" | "reports" | "sources" | "settings";

const SECTIONS: Array<{ id: DashboardSection; label: string; icon: React.ElementType }> = [
  { id: "overview", label: "Visão geral", icon: LayoutGrid },
  { id: "finance", label: "Financeiro", icon: Wallet },
  { id: "cmv", label: "CMV e Cardápio", icon: UtensilsCrossed },
  { id: "products", label: "Produtos e Fichas", icon: Tags },
  { id: "inventory", label: "Estoque e Compras", icon: Package },
  { id: "reports", label: "Relatórios", icon: FileBarChart },
  { id: "sources", label: "Fontes e Integrações", icon: Database },
  { id: "settings", label: "Configurações", icon: Settings },
];

// Fase 8: dia operacional é configurável por empresa, nunca um padrão global
// fixo -- estes dois valores são a configuração da empresa de demonstração.
const COMPANY_TIMEZONE = "America/Fortaleza";
const COMPANY_OPERATIONAL_DAY_START = "04:00";

const SUBSECTIONS: Record<DashboardSection, string[]> = {
  overview: [],
  finance: ["Resumo", "Faturamento", "Fluxo de caixa", "Planejado versus realizado", "Reserva", "Contas a pagar", "Contas a receber", "Projeções", "Dados e relatórios"],
  cmv: ["Resumo", "CMV teórico", "CMV real", "Evolução", "Diferença e investigação", "Engenharia de cardápio", "Mercado e concorrência", "Simulador de preço", "Cobertura"],
  products: ["Catálogo", "Fichas técnicas", "Custos", "Preços e margens", "Vínculos do cardápio", "Anexos", "Histórico"],
  inventory: ["Visão geral", "Estoque central", "Cozinha", "Movimentações", "Inventários", "Perdas", "Lista de compras", "Pedidos", "Fornecedores"],
  reports: ["Executivo", "Financeiro", "CMV", "Produtos", "Estoque", "Compras", "Mercado", "Dados e qualidade", "Exportações"],
  sources: ["Visão geral", "Cardápio digital", "Planilhas", "Diagnóstico", "Estoque", "Fichas", "OpenAI", "Google Planilhas futuro", "Histórico de sincronização"],
  settings: [],
};

export function RestaurantWorkspace({ companyName, onBack }: { companyName: string; onBack: () => void }) {
  const archetype = getArchetypeConfig("food_service");
  const [activeSection, setActiveSection] = useState<DashboardSection>("overview");
  const [subsections, setSubsections] = useState<Record<DashboardSection, string>>(() => Object.fromEntries(SECTIONS.map(({ id }) => [id, SUBSECTIONS[id][0] ?? ""])) as Record<DashboardSection, string>);
  const [viewMode, setViewMode] = useBusinessViewMode();
  const [periodSelection, setPeriodSelection] = useState<BusinessPeriodSelection>(() => buildPeriodSelection("THIS_MONTH", COMPANY_TIMEZONE, COMPANY_OPERATIONAL_DAY_START, new Date()));
  const [balances, setBalances] = useState<StockBalance[]>(STOCK_BALANCE_FIXTURES);
  const [movements, setMovements] = useState<StockMovement[]>(STOCK_MOVEMENT_FIXTURES);
  const items = useMemo(() => STOCK_ITEM_FIXTURES, []);
  const sheets = useMemo(() => TECHNICAL_SHEET_FIXTURES, []);
  const activeMeta = SECTIONS.find((section) => section.id === activeSection) ?? SECTIONS[0];
  const activeSubsection = subsections[activeSection];

  function setSubsection(value: string) { setSubsections((current) => ({ ...current, [activeSection]: value })); }
  function recordMovement(movement: StockMovement) { setMovements((previous) => [movement, ...previous]); }
  function navigateFromLegacy(section: BusinessModuleKey, detail?: string) {
    const destination: Record<BusinessModuleKey, DashboardSection> = { overview: "overview", finance: "finance", cmv_menu: "cmv", products_pricing: "products", technical_sheets: "products", stock: "inventory", purchasing: "inventory", reports: "reports", settings: "sources" };
    const targetArea = destination[section];
    // legacy keys that always implied a fixed subarea before `detail` existed; kept as a fallback
    // so call sites that still pass only `section` (e.g. cross-links in Financeiro) keep working.
    const legacyDetail = section === "technical_sheets" ? "Fichas técnicas" : section === "purchasing" ? "Lista de compras" : undefined;
    const options = SUBSECTIONS[targetArea];
    const resolvedDetail = (detail && options.includes(detail) ? detail : undefined) ?? legacyDetail ?? options[0] ?? "";
    setActiveSection(targetArea);
    setSubsections((current) => ({ ...current, [targetArea]: resolvedDetail }));
  }

  return (
    <div className={`${dashboardTokens.page} min-h-screen rounded-lg p-2 sm:p-4`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <button onClick={onBack} className={`${dashboardTokens.focus} inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900`}><ArrowLeft className="h-3.5 w-3.5" />Trocar empresa</button>
        <div className="min-w-0 text-right"><p className="truncate text-sm font-extrabold text-[#f6f7fb]">{companyName}</p><p className="text-[10px] text-[#8993a8]">{archetype.label}</p></div>
      </div>

      <div className="mb-4 rounded-md border border-violet-400/25 bg-violet-400/10 px-4 py-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-wide text-violet-300">Exemplo simulado</p><p className="mt-0.5 text-xs leading-relaxed text-[#bcc4d4]">Os dados desta experiência ficam em memória e não representam a situação real de nenhum cliente.</p></div><div className="flex flex-wrap items-center gap-2"><PeriodSelector selection={periodSelection} onChange={setPeriodSelection} timezone={COMPANY_TIMEZONE} operationalDayStart={COMPANY_OPERATIONAL_DAY_START} managerMode={viewMode === "manager"} /><div className="inline-flex rounded-md border border-[#3a4354] bg-[#11141c] p-1" role="group" aria-label="Nível de detalhe"><button onClick={() => setViewMode("simple")} aria-pressed={viewMode === "simple"} className={modeClass(viewMode === "simple")}>Visão simples</button><button onClick={() => setViewMode("manager")} aria-pressed={viewMode === "manager"} className={modeClass(viewMode === "manager")}>Modo Gestor</button></div></div></div></div>

      <nav aria-label="Áreas de Meu Negócio" className={`${dashboardTokens.panel} ${dashboardTokens.radius} mb-3 hidden grid-cols-4 gap-1 p-1 lg:grid xl:grid-cols-8`}>
        {SECTIONS.map(({ id, label, icon: Icon }) => <button key={id} data-testid={`business-nav-${id}`} aria-current={activeSection === id ? "page" : undefined} onClick={() => setActiveSection(id)} className={cn(dashboardTokens.focus, dashboardTokens.motion, "flex min-h-10 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-[11px] font-bold", activeSection === id ? "bg-violet-600 text-white shadow-[0_0_14px_rgba(139,92,246,0.16)]" : "text-[#bcc4d4] hover:bg-[#1d2230] hover:text-[#f6f7fb]")}><Icon className="h-3.5 w-3.5 shrink-0" /><span>{label}</span></button>)}
      </nav>

      <label className="mb-3 block lg:hidden"><span className="mb-1 block text-[10px] font-bold uppercase text-[#8993a8]">Área atual</span><select value={activeSection} onChange={(event) => setActiveSection(event.target.value as DashboardSection)} className={`${dashboardTokens.focus} w-full rounded-md border border-[#3a4354] bg-[#171b26] px-3 py-2.5 text-sm font-bold text-[#f6f7fb]`}>{SECTIONS.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}</select></label>

      {SUBSECTIONS[activeSection].length > 0 && <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1" aria-label={`Subáreas de ${activeMeta.label}`}><span className="sticky left-0 shrink-0 bg-[#090b10] pr-1 text-[10px] font-black uppercase text-[#697386]">{activeMeta.label}</span>{SUBSECTIONS[activeSection].map((label) => <button key={label} onClick={() => setSubsection(label)} aria-pressed={activeSubsection === label} className={cn(dashboardTokens.focus, "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold", activeSubsection === label ? "border-violet-400/50 bg-violet-400/15 text-violet-200" : "border-[#272d3a] bg-[#11141c] text-[#bcc4d4] hover:border-[#3a4354] hover:bg-[#1d2230]")}>{label}</button>)}</div>}

      <MotionSection motionKey={`${activeSection}:${activeSubsection}:${viewMode}`}>
      {activeSection === "overview" && <CommandCenterDashboard companyName={companyName} managerMode={viewMode === "manager"} onNavigate={navigateFromLegacy} period={periodSelection} onRequestManagerMode={() => setViewMode("manager")} />}
      {activeSection === "finance" && <FinanceTab companyName={companyName} onNavigate={navigateFromLegacy} activeSubsection={activeSubsection} period={periodSelection} viewMode={viewMode} onViewModeChange={setViewMode} />}
      {activeSection === "cmv" && <CmvCenter companyName={companyName} viewMode={viewMode} onViewModeChange={setViewMode} />}
      {activeSection === "products" && activeSubsection === "Fichas técnicas" && <RestaurantTechnicalSheets sheets={sheets} />}
      {activeSection === "products" && activeSubsection !== "Fichas técnicas" && <ProductCommandCenter />}
      {activeSection === "inventory" && ["Lista de compras", "Pedidos", "Fornecedores"].includes(activeSubsection) && <RestaurantPurchasing items={items} balances={balances} />}
      {activeSection === "inventory" && !["Lista de compras", "Pedidos", "Fornecedores"].includes(activeSubsection) && <RestaurantStock items={items} balances={balances} movements={movements} onBalancesChange={setBalances} onRecordMovement={recordMovement} />}
      {activeSection === "reports" && <RestaurantReports items={items} balances={balances} movements={movements} />}
      {activeSection === "sources" && <SourcesTab />}
      {activeSection === "settings" && <ComingSoonPanel title="Configurações" description="Preferências do módulo, alertas e unidades. Esta sprint reorganiza a interface sem criar persistência." />}
      </MotionSection>
      <RestaurantAnalyzeFill />
    </div>
  );
}

function modeClass(active: boolean) { return cn("rounded px-3 py-1.5 text-[10px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400", active ? "bg-violet-600 text-white" : "text-[#bcc4d4] hover:bg-[#1d2230] hover:text-white"); }
