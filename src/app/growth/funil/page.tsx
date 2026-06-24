import { PageHeader } from "@/components/page-header";
import { mockLeads } from "@/data/mock-data";
import { StatusBadge } from "@/components/status-badge";

const stages = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"] as const;
const stageLabel: Record<string, string> = {
  new: "Novo",
  contacted: "Contactado",
  qualified: "Qualificado",
  proposal: "Proposta",
  negotiation: "Negociação",
  won: "Ganho",
  lost: "Perdido",
};

export default function GrowthFunilPage() {
  return (
    <div>
      <PageHeader title="Funil de Clientes" description="Pipeline de novos clientes" />
      <div className="flex gap-3 overflow-x-auto pb-2">
        {stages.map((stage) => {
          const leads = mockLeads.filter((l) => l.stage === stage);
          return (
            <div key={stage} className="flex-shrink-0 w-52">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-700">{stageLabel[stage]}</span>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{leads.length}</span>
              </div>
              <div className="space-y-2">
                {leads.map((l) => (
                  <div key={l.id} className="bg-white rounded-xl border border-gray-100 p-3">
                    <p className="text-xs font-bold text-gray-800">{l.name}</p>
                    <p className="text-[10px] text-gray-400 mb-1.5">{l.company}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-600">R$ {l.estimatedValue.toLocaleString("pt-BR")}</span>
                      <StatusBadge status={l.stage} />
                    </div>
                  </div>
                ))}
                {leads.length === 0 && (
                  <div className="bg-gray-50 rounded-xl p-3 text-center text-[10px] text-gray-400">Vazio</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
