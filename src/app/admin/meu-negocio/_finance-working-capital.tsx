"use client";

import { CalendarClock, Info } from "lucide-react";
import { formatCents } from "@/lib/motor-lokat/money";
import { StockGlossaryTerm } from "./_stock-glossary-term";
import type { WorkingCapitalSummary } from "@/lib/finance/types";

function formatDateBR(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function FinanceWorkingCapitalPanel({ summary }: { summary: WorkingCapitalSummary }) {
  const visibleDays = summary.dailyPoints.slice(0, 30);
  const worstBalance = Math.min(...summary.dailyPoints.map((p) => p.projectedBalance), 0);
  const bestBalance = Math.max(...summary.dailyPoints.map((p) => p.projectedBalance), 0);
  const range = Math.max(1, bestBalance - worstBalance);

  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 flex items-start gap-2">
        <CalendarClock className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800">Dinheiro necessário para manter a operação entre pagar e receber (capital de giro).</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Primeiro dia com risco de saldo negativo</p>
          <p className="text-lg font-black text-gray-900">{summary.firstNegativeDate ? formatDateBR(summary.firstNegativeDate) : "Nenhum previsto"}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Valor mínimo necessário</p>
          <p className="text-lg font-black text-gray-900">{formatCents(summary.minimumBalanceNeeded)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Diferença média — recebe vs. paga</p>
          <p className="text-lg font-black text-gray-900">
            {summary.averageReceivablePayableGapDays !== null ? `${summary.averageReceivablePayableGapDays} dias` : "—"}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Calendário financeiro — 30 dias</p>
          <span className="text-[9px] text-gray-400">Contas a receber e a pagar por data de vencimento</span>
        </div>
        <div className="overflow-x-auto">
          <div className="flex items-end gap-1 h-32 min-w-[600px]" role="img" aria-label="Saldo diário projetado para os próximos 30 dias">
            {visibleDays.map((p) => {
              const heightPct = Math.max(4, ((p.projectedBalance - worstBalance) / range) * 100);
              return (
                <div key={p.date} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                  <div
                    className={p.projectedBalance < 0 ? "w-full rounded-t bg-red-400" : "w-full rounded-t bg-purple-400"}
                    style={{ height: `${heightPct}%` }}
                    title={`${formatDateBR(p.date)}: ${formatCents(p.projectedBalance)}`}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex gap-1 min-w-[600px] mt-1">
            {visibleDays.map((p, i) => (
              <span key={p.date} className="flex-1 text-center text-[8px] text-gray-400">{i % 5 === 0 ? formatDateBR(p.date) : ""}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">
          Esta é uma <strong>projeção gerencial</strong>, não um cálculo contábil definitivo de necessidade de capital de giro.
          Use como referência de planejamento, não como fechamento financeiro.
        </p>
      </div>

      <div className="text-[11px] text-gray-500">
        <StockGlossaryTerm termId="capital-giro" />
      </div>
    </div>
  );
}
