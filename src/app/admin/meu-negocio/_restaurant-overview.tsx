"use client";

import { TrendingUp, TrendingDown, Package, ShoppingCart, ClipboardList, AlertTriangle, ListChecks } from "lucide-react";
import type { BusinessModuleKey } from "@/lib/business-archetypes/types";
import type { StockBalance, StockItem, StockMovement } from "@/lib/stock/types";
import type { TechnicalSheet } from "@/lib/costing/types";
import { calculateReplenishmentPoint, isBelowReplenishmentPoint, calculateInventoryCount } from "@/lib/stock/calculations";
import {
  calculateActualConsumption, calculateActualCmvPercentage, calculateTheoreticalCmvPercentage, calculateCmvGap,
} from "@/lib/costing/calculations";
import { CMV_REPORT_FIXTURE } from "@/lib/stock/fixtures";
import { StockGlossaryTerm } from "./_stock-glossary-term";

interface Props {
  items: StockItem[];
  balances: StockBalance[];
  movements: StockMovement[];
  sheets: TechnicalSheet[];
  onNavigate: (section: BusinessModuleKey) => void;
}

export function RestaurantOverview({ items, balances, sheets, onNavigate }: Props) {
  const actualConsumption = calculateActualConsumption(CMV_REPORT_FIXTURE);
  const actualCmv = calculateActualCmvPercentage({ actualConsumption, sales: CMV_REPORT_FIXTURE.sales });
  const theoreticalCmv = calculateTheoreticalCmvPercentage({
    theoreticalConsumption: CMV_REPORT_FIXTURE.theoreticalConsumption, sales: CMV_REPORT_FIXTURE.sales,
  });
  const gap = calculateCmvGap({ actualConsumption, theoreticalConsumption: CMV_REPORT_FIXTURE.theoreticalConsumption });

  const belowReplenishment = items.filter((item) => {
    const central = balances.find((b) => b.itemId === item.id && b.locationId === "central");
    const point = calculateReplenishmentPoint(item);
    return isBelowReplenishmentPoint(central?.theoreticalQuantity ?? 0, point);
  });

  const precisionSamples = balances
    .filter((b) => b.physicalQuantity !== null)
    .map((b) => calculateInventoryCount({
      theoreticalQuantity: b.theoreticalQuantity, countedQuantity: b.physicalQuantity as number,
      unitValue: b.unitValue, theoreticalUnit: "u", countedUnit: "u",
    }))
    .filter((r) => r.valid && r.precisionPercent !== null);
  const averagePrecision = precisionSamples.length
    ? Math.round((precisionSamples.reduce((s, r) => s + (r.precisionPercent ?? 0), 0) / precisionSamples.length) * 10) / 10
    : null;

  const incompleteSheets = sheets.filter((s) => s.status === "draft" || s.status === "outdated");
  const productsOffTarget = sheets.filter((s) => {
    const totalCost = s.ingredients.reduce((sum, i) => sum + i.cost, 0) + (s.packagingCost ?? 0);
    const cmv = s.practicedPrice > 0 ? (totalCost / s.practicedPrice) * 100 : 0;
    return cmv > 35; // meta simulada: CMV acima de 35% é considerado fora da meta
  });

  const cards: Array<{
    key: string; label: string; value: string; sub?: string; icon: React.ElementType; tone: "up" | "down" | "neutral" | "alert";
    section: BusinessModuleKey;
  }> = [
    { key: "revenue", label: "Receita simulada do período", value: formatCurrency(CMV_REPORT_FIXTURE.sales), sub: CMV_REPORT_FIXTURE.periodLabel, icon: TrendingUp, tone: "up", section: "reports" },
    { key: "actual", label: "Consumo real", value: formatCurrency(actualConsumption), sub: actualCmv !== null ? `${actualCmv}% das vendas` : undefined, icon: TrendingDown, tone: "neutral", section: "reports" },
    { key: "theoretical", label: "Consumo esperado", value: formatCurrency(CMV_REPORT_FIXTURE.theoreticalConsumption), sub: theoreticalCmv !== null ? `${theoreticalCmv}% das vendas` : undefined, icon: TrendingDown, tone: "neutral", section: "reports" },
    { key: "gap", label: "Diferença não explicada (lacuna de CMV)", value: formatCurrency(gap), sub: gap > 0 ? "Consumo real acima do esperado" : "Dentro do esperado", icon: AlertTriangle, tone: gap > 0 ? "alert" : "neutral", section: "reports" },
    { key: "precision", label: "Precisão do estoque", value: averagePrecision !== null ? `${averagePrecision}%` : "—", icon: Package, tone: "neutral", section: "stock" },
    { key: "replenishment", label: "Itens abaixo do ponto de reposição", value: String(belowReplenishment.length), sub: belowReplenishment.map((i) => i.name).join(", ") || undefined, icon: ShoppingCart, tone: belowReplenishment.length > 0 ? "alert" : "neutral", section: "purchasing" },
    { key: "sheets", label: "Fichas técnicas incompletas", value: String(incompleteSheets.length), icon: ClipboardList, tone: incompleteSheets.length > 0 ? "alert" : "neutral", section: "technical_sheets" },
    { key: "offtarget", label: "Produtos fora da meta de CMV", value: String(productsOffTarget.length), icon: AlertTriangle, tone: productsOffTarget.length > 0 ? "alert" : "neutral", section: "technical_sheets" },
  ];

  return (
    <div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {cards.map((c) => (
          <button
            key={c.key}
            onClick={() => onNavigate(c.section)}
            data-testid={`overview-card-${c.key}`}
            className="text-left bg-white border border-gray-200 rounded-2xl p-4 transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-purple-200 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <div className="flex items-center justify-between mb-2">
              <c.icon className={
                c.tone === "alert" ? "w-4 h-4 text-amber-500" : c.tone === "up" ? "w-4 h-4 text-emerald-500" : "w-4 h-4 text-gray-400"
              } />
            </div>
            <p className="text-[11px] text-gray-400 mb-0.5">{c.label}</p>
            <p className="text-base font-black text-gray-900">{c.value}</p>
            {c.sub && <p className="text-[10px] text-gray-400 mt-0.5">{c.sub}</p>}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">
        <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5"><ListChecks className="w-3.5 h-3.5" /> Tarefas de configuração</p>
        <ul className="text-xs text-gray-500 space-y-1.5">
          <li>• Preencher embalagem nas fichas técnicas ainda sem esse custo.</li>
          <li>• Confirmar consumo médio diário dos insumos com maior divergência de contagem.</li>
          <li>• Revisar produtos com CMV acima da meta simulada de 35%.</li>
        </ul>
      </div>

      <StockGlossaryTerm termId="lacuna-cmv" />
    </div>
  );
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
