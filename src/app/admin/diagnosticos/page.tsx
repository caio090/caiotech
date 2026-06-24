import { PageHeader } from "@/components/page-header";
import { mockDiagnostics, mockClients } from "@/data/mock-data";
import { cn } from "@/lib/utils";

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="font-bold text-gray-700">{value}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div className={cn("h-1.5 rounded-full", value >= 80 ? "bg-emerald-500" : value >= 65 ? "bg-amber-400" : "bg-red-400")} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function AdminDiagnosticosPage() {
  return (
    <div>
      <PageHeader title="Diagnósticos" description="Score de presença digital por cliente" />
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {mockDiagnostics.map((d) => {
          const client = mockClients.find((c) => c.id === d.clientId);
          return (
            <div key={d.id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className={cn("w-10 h-10 rounded-xl text-white text-sm font-bold flex items-center justify-center", client?.color)}>
                  {client?.avatar}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{d.clientName}</h3>
                  <p className="text-xs text-gray-400">{new Date(d.completedAt).toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="ml-auto text-center">
                  <div className={cn("text-2xl font-black", d.score >= 80 ? "text-emerald-600" : d.score >= 65 ? "text-amber-500" : "text-red-500")}>{d.score}</div>
                  <div className="text-xs text-gray-400">score</div>
                </div>
              </div>
              <div className="space-y-2.5 mb-4">
                <ScoreBar label="Presença Digital" value={d.areas.presencaDigital} />
                <ScoreBar label="Conteúdo" value={d.areas.conteudo} />
                <ScoreBar label="Engajamento" value={d.areas.engajamento} />
                <ScoreBar label="Consistência" value={d.areas.consistencia} />
                <ScoreBar label="Estratégia" value={d.areas.estrategia} />
              </div>
              <div className="border-t border-gray-50 pt-3">
                <p className="text-xs font-semibold text-gray-600 mb-2">Recomendações</p>
                <ul className="space-y-1">
                  {d.recommendations.map((r, i) => (
                    <li key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                      <span className="text-indigo-400 mt-0.5">→</span>{r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}

        {/* Clientes sem diagnóstico */}
        {mockClients.filter((c) => !mockDiagnostics.find((d) => d.clientId === c.id)).map((c) => (
          <div key={c.id} className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-5 flex flex-col items-center justify-center text-center">
            <div className={cn("w-10 h-10 rounded-xl text-white text-sm font-bold flex items-center justify-center mb-3", c.color)}>{c.avatar}</div>
            <h3 className="text-sm font-semibold text-gray-600 mb-1">{c.name}</h3>
            <p className="text-xs text-gray-400 mb-3">Diagnóstico ainda não realizado</p>
            <button className="text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
              Iniciar diagnóstico
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
