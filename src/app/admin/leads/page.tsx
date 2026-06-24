import { PageHeader } from "@/components/page-header";
import { KanbanBoard } from "@/components/kanban-board";
import { StatusBadge } from "@/components/status-badge";
import { mockLeads } from "@/data/mock-data";
import { formatCurrency } from "@/lib/utils";
import { Plus } from "lucide-react";

export default function AdminLeadsPage() {
  const stages = [
    { id: "new", title: "Novo", color: "bg-gray-400" },
    { id: "contacted", title: "Contatado", color: "bg-blue-400" },
    { id: "qualified", title: "Qualificado", color: "bg-indigo-400" },
    { id: "proposal", title: "Proposta", color: "bg-purple-400" },
    { id: "negotiation", title: "Negociação", color: "bg-amber-400" },
    { id: "won", title: "Ganho ✓", color: "bg-emerald-400" },
  ];

  const columns = stages.map((s) => ({
    ...s,
    cards: mockLeads
      .filter((l) => l.stage === s.id)
      .map((l) => ({
        id: l.id,
        title: l.name,
        subtitle: `${l.company} · ${l.daysInStage}d neste estágio`,
        badge: <StatusBadge status={l.source as "referral"} />,
        footer: (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">{l.owner.split(" ")[0]}</span>
            <span className="font-bold text-emerald-600">{formatCurrency(l.estimatedValue)}</span>
          </div>
        ),
      })),
  }));

  const totalValue = mockLeads.reduce((sum, l) => sum + l.estimatedValue, 0);

  return (
    <div>
      <PageHeader title="Leads — Pipeline de Vendas" description={`${mockLeads.length} leads · ${formatCurrency(totalValue)} em pipeline`}>
        <button className="flex items-center gap-2 text-sm font-medium text-white bg-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" />
          Novo lead
        </button>
      </PageHeader>
      <KanbanBoard columns={columns} />
    </div>
  );
}
