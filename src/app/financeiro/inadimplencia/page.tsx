import { PageHeader } from "@/components/page-header";
import { mockInvoices } from "@/data/mock-data";
import { formatCurrency } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

const TODAY_MS = new Date("2025-06-15").getTime();

export default function FinanceiroInadimplenciaPage() {
  const overdue = mockInvoices.filter((i) => i.status === "overdue");
  const total = overdue.reduce((s, i) => s + i.amount, 0);

  return (
    <div>
      <PageHeader title="Inadimplência" description="Faturas vencidas e em atraso" />
      {overdue.length === 0 ? (
        <div className="bg-emerald-50 rounded-2xl p-8 text-center">
          <p className="text-emerald-600 font-bold text-sm">Nenhuma inadimplência</p>
          <p className="text-emerald-500 text-xs mt-1">Todos os clientes estão em dia!</p>
        </div>
      ) : (
        <>
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5 mb-5 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-700">Total em atraso: {formatCurrency(total)}</p>
              <p className="text-xs text-red-500">{overdue.length} fatura{overdue.length > 1 ? "s" : ""} vencida{overdue.length > 1 ? "s" : ""}</p>
            </div>
          </div>
          <div className="space-y-2">
            {overdue.map((inv) => {
              const days = Math.floor((TODAY_MS - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
              return (
                <div key={inv.id} className="bg-white rounded-2xl border border-red-100 p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800">{inv.clientName}</p>
                    <p className="text-xs text-gray-400">{inv.description}</p>
                    <p className="text-xs text-red-500 font-medium mt-0.5">Venceu {new Date(inv.dueDate).toLocaleDateString("pt-BR")} · {days > 0 ? `${days} dias em atraso` : "Venceu hoje"}</p>
                  </div>
                  <p className="text-sm font-black text-red-600">{formatCurrency(inv.amount)}</p>
                  <button className="text-xs text-white bg-red-500 px-3 py-1.5 rounded-xl hover:bg-red-600 transition-colors font-medium">
                    Cobrar
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
