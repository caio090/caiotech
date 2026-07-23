"use client";

import { useState } from "react";
import { Wallet, Info } from "lucide-react";
import { formatCents } from "@/lib/motor-lokat/money";
import { calculateCashFlow } from "@/lib/motor-lokat/cash-flow-engine";
import type { FinancialSnapshot } from "@/lib/motor-lokat/types";
import { MoneyInput, NumberInput, GlossaryHelpIcon, SimpleBarChart } from "./_shared";

const RISK_STYLE: Record<string, string> = {
  baixo: "bg-emerald-50 text-emerald-700 border-emerald-100",
  atencao: "bg-amber-50 text-amber-700 border-amber-100",
  alto: "bg-red-50 text-red-700 border-red-100",
  insuficiente: "bg-gray-50 text-gray-500 border-gray-200",
};
const RISK_LABEL: Record<string, string> = {
  baixo: "Risco baixo", atencao: "Risco de atenção", alto: "Risco alto", insuficiente: "Dados insuficientes",
};

export function CashFlowTab({ snapshot, onOpenGlossary }: { snapshot: FinancialSnapshot; onOpenGlossary: (termId: string) => void }) {
  const [openingBalance, setOpeningBalance] = useState(500_000);
  const [expectedInflows, setExpectedInflows] = useState(snapshot.netRevenue.value);
  const [realizedInflows, setRealizedInflows] = useState(Math.round(snapshot.netRevenue.value * 0.85));
  const [expectedOutflows, setExpectedOutflows] = useState(snapshot.fixedExpenses.value + snapshot.variableExpenses.value);
  const [realizedOutflows, setRealizedOutflows] = useState(Math.round((snapshot.fixedExpenses.value + snapshot.variableExpenses.value) * 0.95));
  const [receivables, setReceivables] = useState(300_000);
  const [payables, setPayables] = useState(200_000);
  const [currentReserve, setCurrentReserve] = useState(1_800_000);
  const [desiredReserveMonths, setDesiredReserveMonths] = useState(3);

  const averageMonthlyOutflow = snapshot.fixedExpenses.value + snapshot.variableExpenses.value;

  const result = calculateCashFlow({
    openingBalance, expectedInflows, realizedInflows, expectedOutflows, realizedOutflows,
    receivables, payables, currentReserve, desiredReserveMonths, averageMonthlyOutflow,
  });

  const bars = [
    { label: "Saldo projetado", value: result.projectedBalance, colorClass: result.projectedBalance >= 0 ? "bg-purple-500" : "bg-red-600", displayValue: formatCents(result.projectedBalance) },
    { label: "Saldo realizado", value: result.realizedBalance, colorClass: result.realizedBalance >= 0 ? "bg-indigo-500" : "bg-red-600", displayValue: formatCents(result.realizedBalance) },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800">Uma venda pode existir antes de o dinheiro realmente entrar. Faturamento e entrada de caixa são coisas diferentes.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Wallet className="w-3.5 h-3.5 text-indigo-600" />
          <p className="text-xs font-bold text-gray-700">Movimentações do período</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <MoneyInput label="Saldo inicial" valueCents={openingBalance} onChange={setOpeningBalance} />
          <MoneyInput label="Entradas previstas" valueCents={expectedInflows} onChange={setExpectedInflows} />
          <MoneyInput label="Entradas realizadas" valueCents={realizedInflows} onChange={setRealizedInflows} />
          <MoneyInput label="Saídas previstas" valueCents={expectedOutflows} onChange={setExpectedOutflows} />
          <MoneyInput label="Saídas realizadas" valueCents={realizedOutflows} onChange={setRealizedOutflows} />
          <MoneyInput label="Contas a receber" valueCents={receivables} onChange={setReceivables} />
          <MoneyInput label="Contas a pagar" valueCents={payables} onChange={setPayables} />
          <MoneyInput label="Reserva atual" valueCents={currentReserve} onChange={setCurrentReserve} dataTestId="mn-cashflow-reserve" />
          <NumberInput label="Meses desejados de reserva" value={desiredReserveMonths} onChange={setDesiredReserveMonths} />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Resultado</p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-gray-50 rounded-xl px-3 py-2.5">
              <p className="text-gray-500">Saldo projetado</p>
              <p className="font-bold text-gray-800">{formatCents(result.projectedBalance)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl px-3 py-2.5">
              <p className="text-gray-500">Saldo realizado</p>
              <p className="font-bold text-gray-800">{formatCents(result.realizedBalance)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl px-3 py-2.5">
              <p className="text-gray-500">Diferença</p>
              <p className={`font-bold ${result.difference >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatCents(result.difference)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-1">
                <p className="text-gray-500">Capital de giro sugerido</p>
                <GlossaryHelpIcon termId="capital_giro" onOpen={onOpenGlossary} />
              </div>
              <p className="font-bold text-gray-800">{formatCents(result.suggestedWorkingCapital)}</p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Meses de cobertura</p>
              <p className="text-lg font-black text-gray-900">{result.coverageMonths !== null ? `${result.coverageMonths.toFixed(1)} meses` : "—"}</p>
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${RISK_STYLE[result.risk]}`}>{RISK_LABEL[result.risk]}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Fluxo de caixa projetado</p>
          <SimpleBarChart bars={bars} />
        </div>
      </div>
    </div>
  );
}
