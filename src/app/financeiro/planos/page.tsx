import { PageHeader } from "@/components/page-header";
import { mockClients } from "@/data/mock-data";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function FinanceirosPlanosPage() {
  const total = mockClients.reduce((s, c) => s + c.mrr, 0);
  return (
    <div>
      <PageHeader title="Planos" description="MRR por cliente e distribuição de receita" />
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 flex items-center gap-4">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">MRR Total</p>
          <p className="text-2xl font-black text-indigo-600">{formatCurrency(total)}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-gray-500 mb-0.5">Clientes ativos</p>
          <p className="text-2xl font-black text-gray-900">{mockClients.filter((c) => c.status === "active").length}</p>
        </div>
      </div>
      <div className="space-y-2">
        {[...mockClients].sort((a, b) => b.mrr - a.mrr).map((c) => {
          const pct = Math.round((c.mrr / total) * 100);
          return (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={cn("w-8 h-8 rounded-xl text-white text-[10px] font-bold flex items-center justify-center", c.color)}>{c.avatar}</div>
                <span className="text-sm font-bold text-gray-800 flex-1">{c.name}</span>
                <span className="text-sm font-black text-gray-900">{formatCurrency(c.mrr)}</span>
                <span className="text-xs text-gray-400 w-10 text-right">{pct}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
