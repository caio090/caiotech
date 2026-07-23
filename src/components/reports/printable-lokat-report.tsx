"use client";

/**
 * "Baixar Relatório LOKAT" — a structured, print-optimized document the
 * user turns into a PDF via the browser's native print dialog ("Salvar como
 * PDF"). Deliberately not a screenshot/canvas capture (Fase "Não capturar a
 * tela inteira como imagem") and not a new PDF-generation dependency —
 * window.print() over real, semantic HTML is a standard, dependency-free
 * way to produce a structured, printable document.
 */

import { useEffect } from "react";
import type { ReportSummary, ReportPaymentMethod, ReportInsight } from "@/lib/reports/types";
import { formatCents, formatPercent } from "@/lib/motor-lokat/money";

interface Props {
  clientName: string;
  periodStart: string;
  periodEnd: string;
  summary: ReportSummary | null;
  payments: ReportPaymentMethod[] | null;
  insights: ReportInsight[];
  onClose: () => void;
}

export function PrintableLokatReport({ clientName, periodStart, periodEnd, summary, payments, insights, onClose }: Props) {
  useEffect(() => {
    document.body.classList.add("lokat-print-active");
    return () => document.body.classList.remove("lokat-print-active");
  }, []);

  const missingIndicators = summary
    ? Object.values(summary).filter((v) => typeof v === "object" && v !== null && "availability" in v && v.availability.status !== "available")
    : [];

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      <style>{`
        @media print {
          body > *:not(.lokat-printable-root) { display: none !important; }
          .lokat-print-hide { display: none !important; }
        }
      `}</style>
      <div className="lokat-printable-root max-w-3xl mx-auto p-8">
        <div className="lokat-print-hide flex justify-end gap-2 mb-4">
          <button onClick={() => window.print()} className="text-xs font-bold text-white bg-indigo-600 px-4 py-2 rounded-xl">Imprimir / Salvar como PDF</button>
          <button onClick={onClose} className="text-xs font-bold text-gray-500 px-4 py-2">Fechar</button>
        </div>

        {/* Capa */}
        <div className="border-b-4 border-indigo-600 pb-6 mb-6">
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Relatório LOKAT</p>
          <h1 className="text-2xl font-black text-gray-900 mt-1">{clientName || "Cliente"}</h1>
          <p className="text-sm text-gray-500 mt-1">Período: {periodStart} a {periodEnd}</p>
        </div>

        {/* Resumo executivo */}
        <section className="mb-6">
          <h2 className="text-sm font-black text-gray-800 mb-2">Resumo executivo</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            Este relatório resume o desempenho comercial de {clientName || "o cliente"} entre {periodStart} e {periodEnd},
            com base nos dados disponíveis nas fontes conectadas nesse período.
          </p>
        </section>

        {/* Indicadores */}
        {summary && (
          <section className="mb-6">
            <h2 className="text-sm font-black text-gray-800 mb-2">Indicadores</h2>
            <table className="w-full text-xs border-collapse">
              <tbody>
                {Object.values(summary).filter((v): v is import("@/lib/reports/types").ReportIndicator => typeof v === "object" && v !== null && "label" in v).map((ind) => (
                  <tr key={ind.id} className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-500">{ind.label}</td>
                    <td className="py-1.5 text-right font-bold text-gray-800">
                      {ind.availability.status === "available" && ind.value !== null
                        ? (ind.unit === "currency_cents" ? formatCents(ind.value) : ind.value)
                        : "Indisponível"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Formas de pagamento */}
        {payments && payments.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-black text-gray-800 mb-2">Formas de pagamento</h2>
            <table className="w-full text-xs border-collapse">
              <thead><tr className="text-left text-gray-400 border-b border-gray-200"><th className="py-1">Forma</th><th className="py-1 text-right">Pedidos</th><th className="py-1 text-right">Faturamento</th></tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.key} className="border-b border-gray-100">
                    <td className="py-1.5">{p.label}</td>
                    <td className="py-1.5 text-right">{p.orders}</td>
                    <td className="py-1.5 text-right">{formatCents(p.totalCents)} {p.shareOfTotal !== null ? `(${formatPercent(p.shareOfTotal)})` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Interpretação */}
        {insights.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-black text-gray-800 mb-2">Interpretação e pontos de atenção</h2>
            <div className="space-y-3">
              {insights.map((i) => (
                <div key={i.id} className="text-xs border-l-2 border-indigo-400 pl-3">
                  <p className="font-bold text-gray-800">{i.whatHappened}</p>
                  <p className="text-gray-500">{i.whyItMatters}</p>
                  <p className="text-gray-700 font-semibold mt-0.5">Próximos passos: {i.nextAction}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Limitações */}
        <section className="mb-6">
          <h2 className="text-sm font-black text-gray-800 mb-2">Limitações deste conjunto de dados</h2>
          <p className="text-xs text-gray-500">
            {missingIndicators.length > 0
              ? `${missingIndicators.length} indicador(es) não estavam disponíveis na fonte conectada neste período e aparecem como "Indisponível", não como zero.`
              : "Todos os indicadores exibidos acima estavam disponíveis na fonte conectada para este período."}
          </p>
        </section>

        <footer className="text-[10px] text-gray-400 border-t border-gray-100 pt-3 mt-8">
          Gerado por LOKAT OS em {new Date().toLocaleDateString("pt-BR")} · Fonte: OlaClick / entrada manual — ver seção Formas de pagamento para conciliação.
        </footer>
      </div>
    </div>
  );
}
