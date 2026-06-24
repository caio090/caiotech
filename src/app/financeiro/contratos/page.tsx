import { PageHeader } from "@/components/page-header";
import { mockClients } from "@/data/mock-data";
import { formatCurrency } from "@/lib/utils";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FinanceiroContratosPage() {
  return (
    <div>
      <PageHeader title="Contratos" description="Contratos ativos por cliente" />
      <div className="space-y-2">
        {mockClients.map((c) => (
          <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
            <div className={cn("w-9 h-9 rounded-xl text-white text-xs font-bold flex items-center justify-center", c.color)}>{c.avatar}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800">{c.name}</p>
              <p className="text-xs text-gray-400">{c.segment} · Desde {c.since}</p>
            </div>
            <p className="text-sm font-black text-gray-900">{formatCurrency(c.mrr)}<span className="text-xs font-normal text-gray-400">/mês</span></p>
            <span className={cn("text-xs font-medium px-2.5 py-1 rounded-xl", c.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500")}>
              {c.status === "active" ? "Ativo" : "Pausado"}
            </span>
            <button className="flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition-colors">
              <FileText className="w-3.5 h-3.5" />
              Ver
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
