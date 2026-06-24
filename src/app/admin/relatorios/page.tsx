import { PageHeader } from "@/components/page-header";
import { mockReports, mockClients } from "@/data/mock-data";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Star } from "lucide-react";

function MetricRow({ label, value, growth }: { label: string; value: string | number; growth: number }) {
  const up = growth > 0;
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-gray-800">{value}</span>
        <div className={cn("flex items-center gap-0.5 text-xs font-medium", up ? "text-emerald-600" : "text-red-500")}>
          {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(growth)}%
        </div>
      </div>
    </div>
  );
}

export default function AdminRelatoriosPage() {
  return (
    <div>
      <PageHeader title="Relatórios" description="Performance por cliente — Maio 2025" />
      <div className="grid md:grid-cols-2 gap-5">
        {mockReports.map((r) => {
          const client = mockClients.find((c) => c.id === r.clientId);
          return (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className={cn("w-9 h-9 rounded-xl text-white text-xs font-bold flex items-center justify-center", client?.color)}>
                  {client?.avatar}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{r.clientName}</h3>
                  <p className="text-xs text-gray-400">{r.period}</p>
                </div>
                <button className="ml-auto text-xs text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors font-medium">
                  Exportar PDF
                </button>
              </div>
              <div className="bg-indigo-50 rounded-xl px-3 py-2 mb-3">
                <p className="text-xs text-indigo-700 font-medium flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-indigo-400 text-indigo-400" /> {r.topContent}</p>
              </div>
              <MetricRow label="Seguidores" value={r.metrics.seguidores.value.toLocaleString("pt-BR")} growth={r.metrics.seguidores.growth} />
              <MetricRow label="Alcance" value={r.metrics.alcance.value.toLocaleString("pt-BR")} growth={r.metrics.alcance.growth} />
              <MetricRow label="Engajamento" value={`${r.metrics.engajamento.value}%`} growth={r.metrics.engajamento.growth} />
              <MetricRow label="Impressões" value={r.metrics.impressoes.value.toLocaleString("pt-BR")} growth={r.metrics.impressoes.growth} />
              <MetricRow label="Cliques no perfil" value={r.metrics.cliques.value.toLocaleString("pt-BR")} growth={r.metrics.cliques.growth} />
            </div>
          );
        })}

        {/* Clientes sem relatório */}
        {mockClients.filter((c) => !mockReports.find((r) => r.clientId === c.id)).map((c) => (
          <div key={c.id} className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-5 flex items-center justify-center">
            <div className="text-center">
              <div className={cn("w-10 h-10 rounded-xl text-white text-sm font-bold flex items-center justify-center mx-auto mb-2", c.color)}>{c.avatar}</div>
              <p className="text-xs text-gray-500">{c.name} — relatório ainda não gerado</p>
              <button className="mt-2 text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
                Gerar relatório
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
