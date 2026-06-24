import { PageHeader } from "@/components/page-header";
import { ClientCard } from "@/components/client-card";
import { mockClients } from "@/data/mock-data";
import Link from "next/link";
import { Plus, Circle } from "lucide-react";

export default function AdminClientesPage() {
  const healthy = mockClients.filter((c) => c.health === "healthy");
  const attention = mockClients.filter((c) => c.health === "attention");
  const risk = mockClients.filter((c) => c.health === "risk");

  return (
    <div>
      <PageHeader title="Clientes" description={`${mockClients.length} clientes ativos`}>
        <Link href="#" className="flex items-center gap-2 text-sm font-medium text-white bg-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" />
          Novo cliente
        </Link>
      </PageHeader>

      {/* Filtros */}
      <div className="flex gap-2 mb-6">
        {[
          { label: "Saudável",  count: healthy.length,    color: "text-emerald-500" },
          { label: "Atenção",   count: attention.length,  color: "text-amber-400" },
          { label: "Risco",     count: risk.length,       color: "text-red-500" },
        ].map((f) => (
          <button key={f.label} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Circle className={`w-3 h-3 fill-current ${f.color}`} />
            {f.label}
            <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">{f.count}</span>
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockClients.map((client) => (
          <ClientCard key={client.id} {...client} href={`/admin/clientes/${client.id}`} />
        ))}
      </div>
    </div>
  );
}
