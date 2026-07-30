"use client";

import { useState } from "react";
import { Warehouse, ChefHat, ArrowRightLeft, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StockBalance, StockItem, StockLocationId, StockMovement } from "@/lib/stock/types";
import { STOCK_LOCATIONS, calculateReplenishmentPoint, calculateStockCoverageDays, isBelowReplenishmentPoint } from "@/lib/stock/calculations";
import { StockTransferPanel } from "./_stock-transfer-panel";
import { StockCountPanel } from "./_stock-count-panel";
import { StockGlossaryTerm } from "./_stock-glossary-term";

interface Props {
  items: StockItem[];
  balances: StockBalance[];
  movements: StockMovement[];
  onBalancesChange: (balances: StockBalance[]) => void;
  onRecordMovement: (movement: StockMovement) => void;
}

type StockView = "balances" | "transfer" | "count";

export function RestaurantStock({ items, balances, movements, onBalancesChange, onRecordMovement }: Props) {
  const [location, setLocation] = useState<StockLocationId>("central");
  const [view, setView] = useState<StockView>("balances");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-1.5">
          {(Object.keys(STOCK_LOCATIONS) as StockLocationId[]).map((loc) => (
            <button
              key={loc}
              onClick={() => setLocation(loc)}
              data-testid={`stock-location-${loc}`}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-colors",
                location === loc ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              )}
            >
              {loc === "central" ? <Warehouse className="w-3.5 h-3.5" /> : <ChefHat className="w-3.5 h-3.5" />}
              {STOCK_LOCATIONS[loc].label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setView("balances")} className={cn("text-xs font-bold px-3 py-2 rounded-xl border", view === "balances" ? "border-purple-300 text-purple-700 bg-purple-50" : "border-gray-200 text-gray-500")}>Saldos</button>
          <button onClick={() => setView("transfer")} data-testid="stock-view-transfer" className={cn("flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border", view === "transfer" ? "border-purple-300 text-purple-700 bg-purple-50" : "border-gray-200 text-gray-500")}>
            <ArrowRightLeft className="w-3.5 h-3.5" /> Transferir
          </button>
          <button onClick={() => setView("count")} data-testid="stock-view-count" className={cn("flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border", view === "count" ? "border-purple-300 text-purple-700 bg-purple-50" : "border-gray-200 text-gray-500")}>
            <ClipboardCheck className="w-3.5 h-3.5" /> Inventário
          </button>
        </div>
      </div>

      <p className="text-[11px] text-gray-400 mb-4">{STOCK_LOCATIONS[location].description}</p>

      {view === "balances" && <BalancesTable items={items} balances={balances} location={location} />}
      {view === "transfer" && (
        <StockTransferPanel items={items} balances={balances} onBalancesChange={onBalancesChange} onRecordMovement={onRecordMovement} />
      )}
      {view === "count" && (
        <StockCountPanel items={items} balances={balances} location={location} onBalancesChange={onBalancesChange} onRecordMovement={onRecordMovement} />
      )}

      <div className="mt-4">
        <p className="text-xs font-bold text-gray-700 mb-2">Movimentações recentes</p>
        <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100 overflow-x-auto">
          {movements.slice(0, 8).map((m) => (
            <div key={m.id} className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs min-w-[560px]">
              <span className="font-bold text-gray-700 w-40 truncate">{items.find((i) => i.id === m.itemId)?.name ?? m.itemId}</span>
              <span className="text-gray-400 w-32">{MOVEMENT_LABEL[m.type]}</span>
              <span className="text-gray-500 w-24">{STOCK_LOCATIONS[m.locationId].label}</span>
              <span className={cn("w-20 font-bold", m.quantity < 0 ? "text-red-500" : "text-gray-700")}>{m.quantity > 0 ? "+" : ""}{m.quantity} {m.unit}</span>
              <span className="text-gray-400 w-32 truncate">{m.responsible}</span>
              <span className="text-gray-300">{m.occurredAtLabel}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <StockGlossaryTerm termId="cobertura-estoque" />
      </div>
    </div>
  );
}

const MOVEMENT_LABEL: Record<StockMovement["type"], string> = {
  purchase: "Compra", transfer_in: "Entrada (transf.)", transfer_out: "Saída (transf.)",
  production_consumption: "Consumo produção", waste: "Perda", expiration: "Vencimento",
  staff_meal: "Refeição equipe", courtesy: "Cortesia", correction: "Correção",
  return_to_supplier: "Devolução", manual_adjustment: "Ajuste manual",
};

function BalancesTable({ items, balances, location }: { items: StockItem[]; balances: StockBalance[]; location: StockLocationId }) {
  const rows = items.map((item) => {
    const balance = balances.find((b) => b.itemId === item.id && b.locationId === location);
    const theoretical = balance?.theoreticalQuantity ?? 0;
    const physical = balance?.physicalQuantity ?? null;
    const divergence = physical !== null ? physical - theoretical : null;
    const replenishmentPoint = calculateReplenishmentPoint(item);
    const below = isBelowReplenishmentPoint(theoretical, replenishmentPoint);
    const coverage = calculateStockCoverageDays({ availableQuantity: theoretical, averageDailyConsumption: item.averageDailyConsumption });
    return { item, theoretical, physical, divergence, replenishmentPoint, below, coverage, unitValue: balance?.unitValue ?? item.averageUnitCost };
  });

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto">
      <table className="w-full text-xs min-w-[820px]">
        <thead>
          <tr className="text-left text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100">
            <th className="px-4 py-2.5">Insumo</th>
            <th className="px-4 py-2.5">Saldo teórico</th>
            <th className="px-4 py-2.5">Saldo físico</th>
            <th className="px-4 py-2.5">Divergência</th>
            <th className="px-4 py-2.5">Valor</th>
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5">Cobertura</th>
            <th className="px-4 py-2.5">Ponto de reposição</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map(({ item, theoretical, physical, divergence, replenishmentPoint, below, coverage, unitValue }) => (
            <tr key={item.id} data-testid={`stock-row-${item.id}`}>
              <td className="px-4 py-2.5 font-bold text-gray-700">{item.name}</td>
              <td className="px-4 py-2.5 text-gray-600">{theoretical} {item.unit}</td>
              <td className="px-4 py-2.5 text-gray-600">{physical !== null ? `${physical} ${item.unit}` : "—"}</td>
              <td className={cn("px-4 py-2.5 font-bold", divergence !== null && divergence !== 0 ? "text-amber-600" : "text-gray-400")}>
                {divergence !== null ? `${divergence > 0 ? "+" : ""}${Math.round(divergence * 100) / 100} ${item.unit}` : "—"}
              </td>
              <td className="px-4 py-2.5 text-gray-600">{(theoretical * unitValue).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
              <td className="px-4 py-2.5">
                <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full", below ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700")}>
                  {below ? "Abaixo do ponto de reposição" : "Normal"}
                </span>
              </td>
              <td className="px-4 py-2.5 text-gray-500">{coverage.days !== null ? `${coverage.days} dias` : "—"}</td>
              <td className="px-4 py-2.5 text-gray-500">{Math.round(replenishmentPoint * 10) / 10} {item.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
