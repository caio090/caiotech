"use client";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { ClientCard } from "@/components/client-card";
import { mockClients } from "@/data/mock-data";
import Link from "next/link";
import { Plus, Search, X } from "lucide-react";

type HealthFilter = "todos" | "healthy" | "attention" | "risk";

export default function AdminClientesPage() {
  const [search,       setSearch]       = useState("");
  const [healthFilter, setHealthFilter] = useState<HealthFilter>("todos");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mockClients.filter((c) => {
      if (healthFilter !== "todos" && c.health !== healthFilter) return false;
      if (!q) return true;
      const name      = (c.name ?? "").toLowerCase();
      const company   = (c.company ?? "").toLowerCase();
      const segment   = (c.segment ?? "").toLowerCase();
      return name.includes(q) || company.includes(q) || segment.includes(q);
    });
  }, [search, healthFilter]);

  const counts = useMemo(() => ({
    todos:     mockClients.length,
    healthy:   mockClients.filter((c) => c.health === "healthy").length,
    attention: mockClients.filter((c) => c.health === "attention").length,
    risk:      mockClients.filter((c) => c.health === "risk").length,
  }), []);

  const healthOptions: { value: HealthFilter; label: string; color: string }[] = [
    { value: "todos",     label: "Todos",    color: "text-gray-500" },
    { value: "healthy",   label: "Saudavel", color: "text-emerald-500" },
    { value: "attention", label: "Atencao",  color: "text-amber-400" },
    { value: "risk",      label: "Risco",    color: "text-red-500" },
  ];

  return (
    <div>
      <PageHeader title="Clientes" description={`${mockClients.length} clientes ativos`}>
        <Link
          href="#"
          className="flex items-center gap-2 text-sm font-medium text-white bg-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo cliente
        </Link>
      </PageHeader>

      {/* Barra de busca + filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Busca */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, empresa ou segmento..."
            className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 transition"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtros de saude */}
        <div className="flex gap-2 flex-wrap">
          {healthOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setHealthFilter(opt.value)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                healthFilter === opt.value
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {opt.value !== "todos" && (
                <span className={`w-2 h-2 rounded-full ${
                  opt.value === "healthy"   ? "bg-emerald-500" :
                  opt.value === "attention" ? "bg-amber-400" : "bg-red-500"
                }`} />
              )}
              {opt.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                healthFilter === opt.value
                  ? "bg-white/20 text-white"
                  : "bg-gray-100 text-gray-500"
              }`}>
                {counts[opt.value]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Resultados */}
      {filtered.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((client) => (
            <ClientCard key={client.id} {...client} href={`/admin/clientes/${client.id}`} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center text-gray-400">
          <Search className="w-8 h-8 mx-auto mb-3 text-gray-200" />
          <p className="text-sm font-medium text-gray-500">Nenhum cliente encontrado</p>
          <p className="text-xs mt-1">Tente outro termo ou remova os filtros.</p>
          <button
            onClick={() => { setSearch(""); setHealthFilter("todos"); }}
            className="mt-4 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Limpar filtros
          </button>
        </div>
      )}
    </div>
  );
}
