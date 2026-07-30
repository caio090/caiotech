"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";
import type { StockBalance, StockItem, StockMovement } from "@/lib/stock/types";
import { applyStockTransfer } from "@/lib/stock/calculations";
import { generateId } from "./_shared";

const REASON_LABEL: Record<string, string> = {
  insufficient_balance: "Saldo insuficiente no estoque central para essa quantidade.",
  invalid_quantity: "Informe uma quantidade válida, maior que zero.",
  same_location: "Origem e destino não podem ser o mesmo local.",
};

export function StockTransferPanel({
  items, balances, onBalancesChange, onRecordMovement,
}: {
  items: StockItem[];
  balances: StockBalance[];
  onBalancesChange: (balances: StockBalance[]) => void;
  onRecordMovement: (movement: StockMovement) => void;
}) {
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [quantity, setQuantity] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [confirmedLabel, setConfirmedLabel] = useState<string | null>(null);

  const item = items.find((i) => i.id === itemId);
  const fromBalance = balances.find((b) => b.itemId === itemId && b.locationId === "central");
  const toBalance = balances.find((b) => b.itemId === itemId && b.locationId === "kitchen");

  function handleConfirm() {
    setError(null);
    setConfirmedLabel(null);
    if (!fromBalance || !toBalance) return;

    const result = applyStockTransfer({ quantity, from: fromBalance, to: toBalance });
    if (!result.ok || !result.updatedBalances) {
      setError(REASON_LABEL[result.reason ?? ""] ?? "Não foi possível transferir.");
      return;
    }

    const next = balances.map((b) => {
      if (b === fromBalance) return result.updatedBalances!.from;
      if (b === toBalance) return result.updatedBalances!.to;
      return b;
    });
    onBalancesChange(next);
    onRecordMovement({
      id: generateId("transfer"), itemId, locationId: "kitchen", type: "transfer_in",
      quantity, unit: item?.unit ?? "", unitValue: fromBalance.unitValue,
      occurredAtLabel: "Agora (demonstração)", responsible: "Você (demonstração)",
      reason: "Transferência central → cozinha", origin: "Estoque central", status: "confirmed",
    });
    setConfirmedLabel(`${quantity} ${item?.unit} transferido(s) de Estoque central para Cozinha.`);
    setQuantity(0);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 max-w-xl">
      <p className="text-xs font-bold text-gray-700 mb-3">Transferência: Estoque central → Cozinha</p>

      <label className="block text-[11px] font-bold text-gray-500 mb-1">Insumo</label>
      <select
        value={itemId}
        onChange={(e) => { setItemId(e.target.value); setError(null); setConfirmedLabel(null); }}
        data-testid="transfer-item-select"
        className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 mb-3 outline-none focus:border-purple-400"
      >
        {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
      </select>

      <div className="grid grid-cols-2 gap-3 mb-3 text-[11px] text-gray-500">
        <div className="bg-gray-50 rounded-xl px-3 py-2">
          <p className="text-gray-400">Saldo disponível (origem)</p>
          <p className="font-bold text-gray-700">{fromBalance?.theoreticalQuantity ?? 0} {item?.unit}</p>
        </div>
        <div className="bg-gray-50 rounded-xl px-3 py-2">
          <p className="text-gray-400">Saldo atual (destino)</p>
          <p className="font-bold text-gray-700">{toBalance?.theoreticalQuantity ?? 0} {item?.unit}</p>
        </div>
      </div>

      <label className="block text-[11px] font-bold text-gray-500 mb-1">Quantidade a transferir ({item?.unit})</label>
      <input
        type="number"
        value={quantity || ""}
        onChange={(e) => { setQuantity(Number(e.target.value)); setError(null); setConfirmedLabel(null); }}
        data-testid="transfer-quantity-input"
        className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 mb-3 outline-none focus:border-purple-400"
      />

      <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-3">
        <span className="font-bold text-gray-600">Estoque central</span>
        <ArrowRight className="w-3.5 h-3.5" />
        <span className="font-bold text-gray-600">Cozinha</span>
      </div>

      {error && (
        <div className="flex items-start gap-1.5 text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-3">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {error}
        </div>
      )}
      {confirmedLabel && (
        <div className="flex items-start gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 mb-3">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {confirmedLabel}
        </div>
      )}

      <button
        onClick={handleConfirm}
        data-testid="transfer-confirm-button"
        className="w-full text-xs font-bold py-2.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors"
      >
        Confirmar transferência
      </button>
    </div>
  );
}
