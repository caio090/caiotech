"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { StockBalance, StockItem, StockLocationId, StockMovement } from "@/lib/stock/types";
import { calculateInventoryCount } from "@/lib/stock/calculations";
import { generateId } from "./_shared";

const INVALID_REASON_LABEL: Record<string, string> = {
  negative_theoretical: "Saldo teórico negativo é um estado inválido — não é possível calcular a precisão.",
  negative_counted: "Quantidade contada não pode ser negativa.",
  unit_mismatch: "A unidade contada não corresponde à unidade cadastrada do insumo.",
};

export function StockCountPanel({
  items, balances, location, onBalancesChange, onRecordMovement,
}: {
  items: StockItem[];
  balances: StockBalance[];
  location: StockLocationId;
  onBalancesChange: (balances: StockBalance[]) => void;
  onRecordMovement: (movement: StockMovement) => void;
}) {
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [justifications, setJustifications] = useState<Record<string, string>>({});

  function applyCount(itemId: string) {
    const balance = balances.find((b) => b.itemId === itemId && b.locationId === location);
    const item = items.find((i) => i.id === itemId);
    if (!balance || !item) return;
    const countedQuantity = Number(counts[itemId]);
    if (!Number.isFinite(countedQuantity)) return;

    const result = calculateInventoryCount({
      theoreticalQuantity: balance.theoreticalQuantity, countedQuantity,
      unitValue: balance.unitValue, theoreticalUnit: item.unit, countedUnit: item.unit,
    });
    if (!result.valid) return;

    onBalancesChange(balances.map((b) => (b === balance ? { ...b, physicalQuantity: countedQuantity } : b)));
    onRecordMovement({
      id: generateId(`count-${itemId}`), itemId, locationId: location, type: "correction",
      quantity: result.differenceQuantity, unit: item.unit, unitValue: balance.unitValue,
      occurredAtLabel: "Agora (demonstração)", responsible: "Você (demonstração)",
      reason: justifications[itemId] || "Contagem de inventário", origin: "Inventário", status: "confirmed",
    });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto">
      <table className="w-full text-xs min-w-[860px]">
        <thead>
          <tr className="text-left text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100">
            <th className="px-4 py-2.5">Insumo</th>
            <th className="px-4 py-2.5">Saldo teórico</th>
            <th className="px-4 py-2.5">Quantidade contada</th>
            <th className="px-4 py-2.5">Diferença</th>
            <th className="px-4 py-2.5">Diferença (R$)</th>
            <th className="px-4 py-2.5">Precisão</th>
            <th className="px-4 py-2.5">Justificativa</th>
            <th className="px-4 py-2.5"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {items.map((item) => {
            const balance = balances.find((b) => b.itemId === item.id && b.locationId === location);
            const theoretical = balance?.theoreticalQuantity ?? 0;
            const countedRaw = counts[item.id];
            const countedQuantity = countedRaw !== undefined && countedRaw !== "" ? Number(countedRaw) : null;
            const result = countedQuantity !== null
              ? calculateInventoryCount({ theoreticalQuantity: theoretical, countedQuantity, unitValue: balance?.unitValue ?? 0, theoreticalUnit: item.unit, countedUnit: item.unit })
              : null;

            return (
              <tr key={item.id} data-testid={`count-row-${item.id}`}>
                <td className="px-4 py-2.5 font-bold text-gray-700">{item.name}</td>
                <td className="px-4 py-2.5 text-gray-600">{theoretical} {item.unit}</td>
                <td className="px-4 py-2.5">
                  <input
                    type="number"
                    value={countedRaw ?? ""}
                    onChange={(e) => setCounts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    data-testid={`count-input-${item.id}`}
                    className="w-24 text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-purple-400"
                  />
                </td>
                <td className={cn("px-4 py-2.5 font-bold", result?.valid && result.differenceQuantity !== 0 ? "text-amber-600" : "text-gray-400")}>
                  {result?.valid ? `${result.differenceQuantity > 0 ? "+" : ""}${Math.round(result.differenceQuantity * 100) / 100} ${item.unit}` : result && !result.valid ? "—" : "—"}
                </td>
                <td className="px-4 py-2.5 text-gray-500">
                  {result?.valid ? (result.differenceValue).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}
                </td>
                <td className="px-4 py-2.5">
                  {result?.valid && result.precisionPercent !== null && (
                    <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full", result.precisionPercent >= 95 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
                      {result.precisionPercent}%
                    </span>
                  )}
                  {result && !result.valid && (
                    <span className="text-[10px] text-red-600">{INVALID_REASON_LABEL[result.invalidReason ?? ""]}</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <input
                    type="text"
                    placeholder="Motivo da diferença"
                    value={justifications[item.id] ?? ""}
                    onChange={(e) => setJustifications((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    className="w-36 text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-purple-400"
                  />
                </td>
                <td className="px-4 py-2.5">
                  <button
                    onClick={() => applyCount(item.id)}
                    disabled={countedQuantity === null || !result?.valid}
                    data-testid={`count-apply-${item.id}`}
                    className="text-[11px] font-bold text-purple-600 hover:text-purple-700 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Aplicar
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
