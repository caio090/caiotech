"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TechnicalSheet } from "@/lib/costing/types";
import {
  calculateIngredientsCost, calculateTechnicalSheetTotalCost, calculateSheetCmvPercentage,
  calculateContributionMargin, calculateCorrectionFactor, calculateCookingYield, SHEET_COST_DISCLAIMER,
} from "@/lib/costing/calculations";
import { StockGlossaryTerm } from "./_stock-glossary-term";

export function RestaurantTechnicalSheets({ sheets, pricingFocus = false }: { sheets: TechnicalSheet[]; pricingFocus?: boolean }) {
  return (
    <div className="space-y-4">
      {sheets.map((sheet) => <TechnicalSheetCard key={sheet.id} sheet={sheet} pricingFocus={pricingFocus} />)}
    </div>
  );
}

function TechnicalSheetCard({ sheet, pricingFocus }: { sheet: TechnicalSheet; pricingFocus: boolean }) {
  const [expandedIngredient, setExpandedIngredient] = useState<string | null>(null);
  const ingredientsCost = calculateIngredientsCost(sheet);
  const totalCost = calculateTechnicalSheetTotalCost(sheet);
  const cmv = calculateSheetCmvPercentage(sheet);
  const margin = calculateContributionMargin(sheet);

  return (
    <div data-testid={`technical-sheet-${sheet.id}`} className="bg-white border border-gray-200 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-gray-900">{sheet.product}</p>
            {sheet.isExample && (
              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500 text-white">
                Exemplo simulado
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-400">{sheet.category} · {sheet.portionSize} · v{sheet.version}</p>
        </div>
        <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full",
          sheet.status === "active" ? "bg-emerald-50 text-emerald-700" : sheet.status === "outdated" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-500"
        )}>
          {STATUS_LABEL[sheet.status]}
        </span>
      </div>

      {!pricingFocus && (
        <div className="mb-4">
          <p className="text-[11px] font-bold text-gray-500 mb-2">Ingredientes</p>
          <div className="space-y-1.5">
            {sheet.ingredients.map((ing) => (
              <div key={ing.id}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">{ing.name} — {ing.quantity} {ing.unit}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-700">{ing.cost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                    {ing.breakdown && (
                      <button
                        onClick={() => setExpandedIngredient((v) => (v === ing.id ? null : ing.id))}
                        data-testid={`ingredient-breakdown-toggle-${ing.id}`}
                        className="text-gray-400 hover:text-purple-600"
                      >
                        {expandedIngredient === ing.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
                {ing.breakdown && expandedIngredient === ing.id && (
                  <IngredientBreakdown breakdown={ing.breakdown} />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-gray-100">
            <span className="font-bold text-gray-700">Custo dos ingredientes</span>
            <span className="font-black text-gray-900">{ingredientsCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <Metric label="Embalagem" value={sheet.packagingCost !== null ? sheet.packagingCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Não preenchida"} highlight={sheet.packagingCost === null} />
        <Metric label="Custo total" value={totalCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
        <Metric label="Preço praticado" value={sheet.practicedPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
        <Metric label="CMV do produto" value={cmv !== null ? `${cmv}%` : "—"} data-testid="sheet-cmv-value" />
      </div>

      <div className="text-xs text-gray-600 mb-3">
        <StockGlossaryTerm termId="margem-contribuicao" />
        <span className="block mt-1 font-bold text-gray-800">{margin.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
      </div>

      {sheet.isExample && (
        <p className="text-[10px] text-gray-400 italic leading-relaxed">{SHEET_COST_DISCLAIMER}</p>
      )}
    </div>
  );
}

const STATUS_LABEL: Record<TechnicalSheet["status"], string> = {
  draft: "Rascunho", active: "Ativa", outdated: "Desatualizada", archived: "Arquivada",
};

function Metric({ label, value, highlight, ...rest }: {
  label: string;
  value: string;
  highlight?: boolean;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "children">) {
  return (
    <div {...rest} className={cn("rounded-xl px-3 py-2", highlight ? "bg-amber-50" : "bg-gray-50")}>
      <p className="text-[10px] text-gray-400">{label}</p>
      <p className={cn("text-sm font-black", highlight ? "text-amber-700" : "text-gray-900")}>{value}</p>
    </div>
  );
}

function IngredientBreakdown({ breakdown }: { breakdown: { grossWeight: number; netWeight: number; weightAfterPreparation: number | null } }) {
  const correctionFactor = calculateCorrectionFactor(breakdown.grossWeight, breakdown.netWeight);
  const cookingYield = breakdown.weightAfterPreparation !== null
    ? calculateCookingYield(breakdown.weightAfterPreparation, breakdown.netWeight)
    : null;

  return (
    <div className="mt-1.5 ml-2 pl-3 border-l-2 border-gray-100 text-[11px] text-gray-500 space-y-1">
      <p>Peso bruto: <strong className="text-gray-700">{breakdown.grossWeight} g</strong></p>
      <p>Peso líquido: <strong className="text-gray-700">{breakdown.netWeight} g</strong></p>
      <p className="flex items-center gap-1">
        <StockGlossaryTerm termId="fator-correcao" />
        <strong className="text-gray-700">{correctionFactor !== null ? correctionFactor.toFixed(2) : "—"}</strong>
      </p>
      {breakdown.weightAfterPreparation !== null && (
        <>
          <p>Peso após preparo: <strong className="text-gray-700">{breakdown.weightAfterPreparation} g</strong></p>
          <p>Rendimento de cocção: <strong className="text-gray-700">{cookingYield !== null ? `${Math.round(cookingYield * 100)}%` : "—"}</strong></p>
        </>
      )}
      <p className="italic text-gray-400">Cálculo ilustrativo — não altera o custo do ingrediente mostrado acima.</p>
    </div>
  );
}
