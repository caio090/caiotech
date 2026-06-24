import { PageHeader } from "@/components/page-header";
import { mockInvoices } from "@/data/mock-data";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency } from "@/lib/utils";
import { DashboardCard } from "@/components/dashboard-card";
import { DollarSign, AlertCircle, CheckCircle, Clock } from "lucide-react";

export default function FinanceiroPagamentosPage() {
  const paid = mockInvoices.filter((i) => i.status === "paid");
  const pending = mockInvoices.filter((i) => i.status === "pending");
  const overdue = mockInvoices.filter((i) => i.status === "overdue");

  const totalPaid = paid.reduce((s, i) => s + i.amount, 0);
  const totalPending = pending.reduce((s, i) => s + i.amount, 0);
  const totalOverdue = overdue.reduce((s, i) => s + i.amount, 0);

  return (
    <div>
      <PageHeader title="Pagamentos" description="Controle de recebimentos e inadimplência" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <DashboardCard title="Recebido" value={formatCurrency(totalPaid)} icon={CheckCircle} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
        <DashboardCard title="A receber" value={formatCurrency(totalPending)} icon={Clock} iconColor="text-blue-600" iconBg="bg-blue-50" />
        <DashboardCard title="Em atraso" value={formatCurrency(totalOverdue)} icon={AlertCircle} iconColor="text-red-600" iconBg="bg-red-50" alert={overdue.length > 0} />
        <DashboardCard title="Total faturas" value={mockInvoices.length} icon={DollarSign} iconColor="text-indigo-600" iconBg="bg-indigo-50" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-50">
          <h2 className="text-sm font-bold text-gray-800">Todas as faturas</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {mockInvoices.map((inv) => (
            <div key={inv.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{inv.clientName}</p>
                <p className="text-xs text-gray-400">{inv.description}</p>
              </div>
              <p className="text-xs text-gray-400">{new Date(inv.dueDate).toLocaleDateString("pt-BR")}</p>
              <p className="text-sm font-black text-gray-900">{formatCurrency(inv.amount)}</p>
              <StatusBadge status={inv.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
