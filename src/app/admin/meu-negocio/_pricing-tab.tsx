"use client";

import { useState } from "react";
import { AlertTriangle, Tags } from "lucide-react";
import { formatCents } from "@/lib/motor-lokat/money";
import { calculatePricing } from "@/lib/motor-lokat/pricing-engine";
import { MoneyInput, PercentInput, GlossaryHelpIcon } from "./_shared";

export function PricingTab({ onOpenGlossary }: { onOpenGlossary: (termId: string) => void }) {
  const [productCost, setProductCost] = useState(1600); // R$ 16,00 demo
  const [fixedExpensesPct, setFixedExpensesPct] = useState(0.20);
  const [variableExpensesPct, setVariableExpensesPct] = useState(0.10);
  const [desiredMarginPct, setDesiredMarginPct] = useState(0.20);
  const [currentPrice, setCurrentPrice] = useState(4000); // R$ 40,00 demo

  const result = calculatePricing({ productCost, fixedExpensesPct, variableExpensesPct, desiredMarginPct, currentPrice });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Tags className="w-3.5 h-3.5 text-purple-600" />
          <p className="text-xs font-bold text-gray-700">Calculadora de preço</p>
        </div>
        <p className="text-[11px] text-gray-400 mb-4">
          Metodologia: Preço = Custo ÷ [1 − (gastos fixos % + gastos variáveis % + margem desejada %)].
          Esta é uma metodologia selecionada para esta versão — não é a única fórmula de precificação existente.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <MoneyInput label="Custo do produto ou serviço" valueCents={productCost} onChange={setProductCost} dataTestId="mn-pricing-cost" />
          <PercentInput label="Gastos fixos (%)" valueFraction={fixedExpensesPct} onChange={setFixedExpensesPct} />
          <PercentInput label="Gastos variáveis (%)" valueFraction={variableExpensesPct} onChange={setVariableExpensesPct} />
          <PercentInput label="Margem desejada (%)" valueFraction={desiredMarginPct} onChange={setDesiredMarginPct} />
        </div>
        <div className="mt-3 max-w-xs">
          <MoneyInput label="Preço praticado hoje (opcional)" valueCents={currentPrice} onChange={setCurrentPrice} />
        </div>
      </div>

      {!result.valid ? (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{result.error}</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Preço mínimo calculado</p>
            <p className="text-2xl font-black text-gray-900">{formatCents(result.minimumPrice)}</p>

            {typeof result.differenceFromCurrent === "number" && (
              <div className={`mt-3 rounded-xl px-3 py-2.5 text-xs ${result.belowMinimum ? "bg-red-50 border border-red-100 text-red-700" : "bg-emerald-50 border border-emerald-100 text-emerald-700"}`}>
                {result.belowMinimum
                  ? `O preço praticado está ${formatCents(Math.abs(result.differenceFromCurrent))} abaixo do mínimo necessário.`
                  : `O preço praticado está ${formatCents(result.differenceFromCurrent)} acima do mínimo necessário.`}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-50 rounded-xl px-3 py-2">
                <p className="text-gray-500">Preço atual</p>
                <p className="font-bold text-gray-800">{typeof currentPrice === "number" && currentPrice > 0 ? formatCents(currentPrice) : "—"}</p>
              </div>
              <div className="bg-gray-50 rounded-xl px-3 py-2">
                <p className="text-gray-500">Preço mínimo</p>
                <p className="font-bold text-gray-800">{formatCents(result.minimumPrice)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Composição do preço</p>
              <GlossaryHelpIcon termId="margem_lucro" onOpen={onOpenGlossary} />
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Custo do produto/serviço</span>
                <span className="font-bold text-gray-800">{formatCents(result.composition.productCost)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Gastos fixos embutidos</span>
                <span className="font-bold text-gray-800">{formatCents(result.composition.fixedExpensesAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Gastos variáveis embutidos</span>
                <span className="font-bold text-gray-800">{formatCents(result.composition.variableExpensesAmount)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-gray-700 font-semibold">Margem desejada</span>
                <span className="font-bold text-emerald-600">{formatCents(result.composition.marginAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
