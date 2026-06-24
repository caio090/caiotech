import { PageHeader } from "@/components/page-header";
import { mockInvoices } from "@/data/mock-data";
import { formatCurrency } from "@/lib/utils";
import { Download } from "lucide-react";

export default function FinanceiroRecibosPage() {
  const paid = mockInvoices.filter((i) => i.status === "paid");
  return (
    <div>
      <PageHeader title="Recibos" description="Faturas pagas e recibos emitidos" />
      <div className="space-y-2">
        {paid.map((inv) => (
          <div key={inv.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 flex-shrink-0">
              <Download className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800">{inv.clientName}</p>
              <p className="text-xs text-gray-400">{inv.description}</p>
            </div>
            <p className="text-xs text-gray-400">{new Date(inv.dueDate).toLocaleDateString("pt-BR")}</p>
            <p className="text-sm font-black text-emerald-600">{formatCurrency(inv.amount)}</p>
            <button className="text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors font-medium">
              Baixar PDF
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
