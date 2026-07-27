"use client";

import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StockBalance, StockItem } from "@/lib/stock/types";
import { calculateStockCoverageDays } from "@/lib/stock/calculations";
import { buildPurchaseDrafts } from "@/lib/stock/fixtures";

export function RestaurantPurchasing({ items, balances }: { items: StockItem[]; balances: StockBalance[] }) {
  const drafts = buildPurchaseDrafts();

  return (
    <div>
      <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto mb-6">
        <table className="w-full text-xs min-w-[920px]">
          <thead>
            <tr className="text-left text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100">
              <th className="px-4 py-2.5">Insumo</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Cobertura</th>
              <th className="px-4 py-2.5">Quantidade sugerida</th>
              <th className="px-4 py-2.5">Fornecedor</th>
              <th className="px-4 py-2.5">Último custo</th>
              <th className="px-4 py-2.5">Custo médio</th>
              <th className="px-4 py-2.5">Prazo de entrega</th>
              <th className="px-4 py-2.5">Estoque de segurança</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {drafts.map((draft) => {
              const item = items.find((i) => i.id === draft.itemId);
              const central = balances.find((b) => b.itemId === draft.itemId && b.locationId === "central");
              const coverage = item ? calculateStockCoverageDays({ availableQuantity: central?.theoreticalQuantity ?? 0, averageDailyConsumption: item.averageDailyConsumption }) : { days: null, label: "" };
              return (
                <tr key={draft.itemId} data-testid={`purchase-row-${draft.itemId}`}>
                  <td className="px-4 py-2.5 font-bold text-gray-700">{item?.name}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full", draft.status === "below_replenishment_point" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700")}>
                      {draft.status === "below_replenishment_point" ? "Abaixo do ponto de reposição" : "Normal"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500" title={coverage.label}>{coverage.days !== null ? `${coverage.days} dias` : "—"}</td>
                  <td className="px-4 py-2.5 font-bold text-gray-700">{draft.suggestedQuantity > 0 ? `${draft.suggestedQuantity} ${draft.unit}` : "—"}</td>
                  <td className="px-4 py-2.5 text-gray-600">{draft.supplierName}</td>
                  <td className="px-4 py-2.5 text-gray-500">{draft.lastUnitCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                  <td className="px-4 py-2.5 text-gray-500">{draft.averageUnitCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                  <td className="px-4 py-2.5 text-gray-500">{draft.leadTimeDays} dias</td>
                  <td className="px-4 py-2.5 text-gray-500">{draft.safetyStock} {draft.unit}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-start gap-3">
        <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
          <MessageCircle className="w-4.5 h-4.5 text-emerald-600" />
        </div>
        <div>
          <p className="text-xs font-bold text-emerald-700 mb-1">Compras pelo WhatsApp — Em breve</p>
          <p className="text-[11px] text-emerald-700 leading-relaxed mb-2">
            Envie sua lista, nota, foto ou PDF pelo WhatsApp. A Lokat organizará os itens e pedirá sua confirmação
            antes de alterar compras ou estoque.
          </p>
          <p className="text-[10px] text-emerald-600 font-mono">
            documento recebido → proposta de extração → revisão do usuário → compra confirmada → entrada em estoque → recálculo de custo
          </p>
          <p className="text-[10px] text-emerald-600 mt-2 italic">Nenhuma entrada é aplicada automaticamente.</p>
        </div>
      </div>
    </div>
  );
}
