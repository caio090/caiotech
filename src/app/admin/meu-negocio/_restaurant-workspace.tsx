"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, LayoutGrid, FileBarChart, Package, ShoppingCart, ClipboardList, Tags, Wallet, Settings, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BusinessModuleKey } from "@/lib/business-archetypes/types";
import { getArchetypeConfig } from "@/lib/business-archetypes/types";
import { STOCK_ITEM_FIXTURES, STOCK_BALANCE_FIXTURES, STOCK_MOVEMENT_FIXTURES } from "@/lib/stock/fixtures";
import { TECHNICAL_SHEET_FIXTURES } from "@/lib/costing/fixtures";
import type { StockBalance, StockMovement } from "@/lib/stock/types";
import { RestaurantOverview } from "./_restaurant-overview";
import { RestaurantStock } from "./_restaurant-stock";
import { RestaurantPurchasing } from "./_restaurant-purchasing";
import { RestaurantTechnicalSheets } from "./_restaurant-technical-sheets";
import { RestaurantReports } from "./_restaurant-reports";
import { RestaurantAnalyzeFill } from "./_restaurant-analyze-fill";
import { ComingSoonPanel } from "./_coming-soon-panel";
import { FinanceTab } from "./_finance-tab";
import { CmvCenter } from "./_cmv-center";

const SECTION_ORDER: BusinessModuleKey[] = [
  "overview", "reports", "cmv_menu", "stock", "purchasing", "technical_sheets", "products_pricing", "finance", "settings",
];

const SECTION_META: Record<BusinessModuleKey, { label: string; icon: React.ElementType }> = {
  overview: { label: "Visão geral", icon: LayoutGrid },
  reports: { label: "Relatórios", icon: FileBarChart },
  cmv_menu: { label: "CMV e Cardápio", icon: UtensilsCrossed },
  stock: { label: "Estoque", icon: Package },
  purchasing: { label: "Compras", icon: ShoppingCart },
  technical_sheets: { label: "Fichas técnicas", icon: ClipboardList },
  products_pricing: { label: "Produtos e preços", icon: Tags },
  finance: { label: "Financeiro", icon: Wallet },
  settings: { label: "Configurações", icon: Settings },
};

export function RestaurantWorkspace({ companyName, onBack }: { companyName: string; onBack: () => void }) {
  const archetype = getArchetypeConfig("food_service");
  const [activeSection, setActiveSection] = useState<BusinessModuleKey>("overview");

  const [balances, setBalances] = useState<StockBalance[]>(STOCK_BALANCE_FIXTURES);
  const [movements, setMovements] = useState<StockMovement[]>(STOCK_MOVEMENT_FIXTURES);
  const items = useMemo(() => STOCK_ITEM_FIXTURES, []);
  const sheets = useMemo(() => TECHNICAL_SHEET_FIXTURES, []);

  function recordMovement(movement: StockMovement) {
    setMovements((prev) => [movement, ...prev]);
  }

  function navigateTo(section: BusinessModuleKey) {
    setActiveSection(section);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <button onClick={onBack} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Trocar empresa
        </button>
        <div className="text-right">
          <p className="text-sm font-bold text-gray-900">{companyName}</p>
          <p className="text-[10px] text-gray-400">{archetype.label}</p>
        </div>
      </div>

      <div className="mb-5 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
        <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider mb-0.5">Modo demonstração</p>
        <p className="text-xs text-amber-700 leading-relaxed">
          Estoque, compras, fichas técnicas e relatórios desta tela usam dados de exemplo em memória — nada é salvo
          e nada representa a situação real de nenhum cliente.
        </p>
      </div>

      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1 scrollbar-none" role="tablist">
        {SECTION_ORDER.map((key) => {
          const meta = SECTION_META[key];
          const Icon = meta.icon;
          const available = archetype.modules.includes(key);
          return (
            <button
              key={key}
              role="tab"
              aria-selected={activeSection === key}
              disabled={!available}
              onClick={() => navigateTo(key)}
              data-testid={`restaurant-nav-${key}`}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border whitespace-nowrap transition-colors",
                !available && "opacity-40 cursor-not-allowed",
                activeSection === key
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {meta.label}
            </button>
          );
        })}
      </div>

      {activeSection === "overview" && (
        <RestaurantOverview
          items={items} balances={balances} movements={movements} sheets={sheets}
          onNavigate={navigateTo}
        />
      )}
      {activeSection === "reports" && <RestaurantReports items={items} balances={balances} movements={movements} />}
      {activeSection === "cmv_menu" && <CmvCenter companyName={companyName} />}
      {activeSection === "stock" && (
        <RestaurantStock items={items} balances={balances} movements={movements} onBalancesChange={setBalances} onRecordMovement={recordMovement} />
      )}
      {activeSection === "purchasing" && <RestaurantPurchasing items={items} balances={balances} />}
      {activeSection === "technical_sheets" && <RestaurantTechnicalSheets sheets={sheets} />}
      {activeSection === "products_pricing" && <RestaurantTechnicalSheets sheets={sheets} pricingFocus />}
      {activeSection === "finance" && <FinanceTab companyName={companyName} onNavigate={navigateTo} />}
      {activeSection === "settings" && <ComingSoonPanel title="Configurações" description="Preferências do módulo (unidades, fornecedores padrão, alertas) — planejado para uma sprint futura." />}

      <RestaurantAnalyzeFill />
    </div>
  );
}
