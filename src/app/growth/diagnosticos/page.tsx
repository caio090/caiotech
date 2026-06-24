import { PageHeader } from "@/components/page-header";
import { mockDiagnostics, mockClients } from "@/data/mock-data";
import { cn } from "@/lib/utils";

export default function GrowthDiagnosticosPage() {
  return (
    <div>
      <PageHeader title="Diagnósticos" description="Saúde estratégica das marcas" />
      <div className="space-y-5">
        {mockDiagnostics.map((d) => {
          const client = mockClients.find((c) => c.id === d.clientId);
          return (
            <div key={d.id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-4">
                {client && (
                  <div className={cn("w-9 h-9 rounded-xl text-white text-xs font-bold flex items-center justify-center", client.color)}>{client.avatar}</div>
                )}
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{d.clientName}</h3>
                  <p className="text-xs text-gray-400">Score geral: {d.score}/10</p>
                </div>
                <div className={cn("ml-auto text-lg font-black", d.score >= 7 ? "text-emerald-600" : d.score >= 5 ? "text-amber-500" : "text-red-500")}>
                  {d.score}/10
                </div>
              </div>
              <div className="space-y-2.5 mb-4">
                {Object.entries(d.areas).map(([area, score]) => (
                  <div key={area}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600 capitalize">{area}</span>
                      <span className="text-xs font-bold text-gray-800">{score}/10</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", score >= 7 ? "bg-emerald-500" : score >= 5 ? "bg-amber-400" : "bg-red-400")} style={{ width: `${score * 10}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-700 mb-2">Recomendações</p>
                <ul className="space-y-1.5">
                  {d.recommendations.map((rec, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                      <span className="text-indigo-500 mt-0.5">→</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
