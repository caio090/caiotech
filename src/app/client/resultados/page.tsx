import { PageHeader } from "@/components/page-header";
import { mockReports } from "@/data/mock-data";
import { TrendingUp, TrendingDown, Award } from "lucide-react";

const report = mockReports.find((r) => r.clientId === "client-1")!;

export default function ClientResultadosPage() {
  return (
    <div>
      <PageHeader title="Resultados" description={`Performance — ${report?.period}`} />
      {report ? (
        <div className="space-y-4">
          <div className="bg-indigo-600 rounded-2xl p-5 text-white">
            <p className="text-indigo-200 text-xs mb-1 flex items-center gap-1"><Award className="w-3.5 h-3.5" strokeWidth={1.5} />Melhor conteúdo do mês</p>
            <p className="font-bold">{report.topContent}</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(report.metrics).map(([key, m]) => (
              <div key={key} className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className="text-xs text-gray-500 capitalize mb-2">{key}</p>
                <p className="text-xl font-black text-gray-900">
                  {typeof m.value === "number" && m.value > 1000 ? m.value.toLocaleString("pt-BR") : m.value}
                  {key === "engajamento" ? "%" : ""}
                </p>
                <div className={`flex items-center gap-1 text-xs font-medium mt-1 ${m.growth > 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {m.growth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(m.growth)}% vs. mês anterior
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">Relatório ainda não disponível.</div>
      )}
    </div>
  );
}
