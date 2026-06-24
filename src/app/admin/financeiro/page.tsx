"use client";
import { PageHeader } from "@/components/page-header";
import { DashboardCard } from "@/components/dashboard-card";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { mockInvoices, mockExpenses, adminMetrics } from "@/data/mock-data";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, TrendingUp, AlertTriangle, CreditCard } from "lucide-react";

export default function AdminFinanceiroPage() {
  const received = mockInvoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const pending = mockInvoices.filter((i) => i.status === "pending").reduce((s, i) => s + i.amount, 0);
  const overdue = mockInvoices.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  const expenses = mockExpenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <PageHeader title="Financeiro" description="Visão geral financeira do mês" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <DashboardCard title="MRR" value={formatCurrency(adminMetrics.mrr)} trend={adminMetrics.mrrGrowth} icon={TrendingUp} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
        <DashboardCard title="Recebido no mês" value={formatCurrency(received)} icon={DollarSign} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
        <DashboardCard title="Pendente" value={formatCurrency(pending)} icon={CreditCard} iconColor="text-amber-600" iconBg="bg-amber-50" />
        <DashboardCard title="Inadimplência" value={formatCurrency(overdue)} icon={AlertTriangle} iconColor="text-red-600" iconBg="bg-red-50" alert />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-bold text-gray-800 mb-3">Cobranças</h2>
          <DataTable
            data={mockInvoices}
            columns={[
              { key: "clientName", header: "Cliente" },
              { key: "description", header: "Descrição", render: (r) => <span className="text-gray-600">{r.description}</span> },
              { key: "amount", header: "Valor", render: (r) => <span className="font-bold">{formatCurrency(r.amount)}</span> },
              { key: "dueDate", header: "Vencimento", render: (r) => new Date(r.dueDate).toLocaleDateString("pt-BR") },
              { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            ]}
          />
        </div>
        <div>
          <h2 className="text-sm font-bold text-gray-800 mb-3">Despesas do Mês</h2>
          <DataTable
            data={mockExpenses}
            columns={[
              { key: "description", header: "Despesa" },
              { key: "category", header: "Categoria" },
              { key: "amount", header: "Valor", render: (r) => <span className="font-bold text-red-600">{formatCurrency(r.amount)}</span> },
              { key: "occurredAt", header: "Data", render: (r) => new Date(r.occurredAt).toLocaleDateString("pt-BR") },
            ]}
          />
          <div className="mt-3 bg-white rounded-xl border border-gray-100 px-4 py-3 flex justify-between">
            <span className="text-sm text-gray-600 font-medium">Total de despesas</span>
            <span className="text-sm font-black text-red-600">{formatCurrency(expenses)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
