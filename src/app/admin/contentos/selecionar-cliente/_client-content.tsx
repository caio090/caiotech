"use client";
import { useState, useEffect } from "react";
import { Building2, Search, Check, ArrowRight, Tag, User } from "lucide-react";
import { ACTIVE_CLIENT_KEY, ACTIVE_CLIENT_NAME_KEY, clearActiveClient } from "@/lib/active-client";
import type { AdminContentosClient } from "@/lib/admin-contentos-clients";

export type RealClient = AdminContentosClient;

interface Props {
  clients: RealClient[];
  isSupabaseActive: boolean;
}

export function AdminSelecionarClienteContent({ clients, isSupabaseActive }: Props) {
  const [search, setSearch]         = useState("");
  const [selectedId, setSelectedId] = useState<string>("");

  // Clear any stale active client the moment this selection screen mounts.
  // This prevents the purple bar from showing "Visualizando: X" while choosing.
  useEffect(() => {
    clearActiveClient();
  }, []);

  const filtered = clients.filter(
    (c) => !search || (c.company_name ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  function handleEnter() {
    const client = clients.find((c) => c.id === selectedId);
    if (!client) return;
    localStorage.setItem(ACTIVE_CLIENT_KEY, selectedId);
    localStorage.setItem(ACTIVE_CLIENT_NAME_KEY, client.company_name ?? "");
    window.location.href = `/admin/contentos/home?client=${selectedId}`;
  }

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-black text-gray-900 mb-1">Selecione um cliente</h1>
      <p className="text-sm text-gray-500 mb-8">
        Escolha para qual marca você quer trabalhar na ContentOS.
      </p>

      {!isSupabaseActive ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-6 h-6 text-purple-400" />
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">Modo demonstração ativo</p>
          <p className="text-xs text-gray-400 mb-6">
            ContentOS usa dados de exemplo — nenhum cliente real cadastrado.
          </p>
          <a
            href="/admin/contentos/home"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-2xl hover:bg-purple-700 transition-colors"
          >
            Ir para ContentOS
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      ) : (
        <>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400 bg-white"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 mb-6">
              <Building2 className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">
                {search
                  ? "Nenhum cliente encontrado."
                  : "Nenhum cliente real cadastrado ainda."}
              </p>
              {!search && (
                <p className="text-xs text-gray-300 mt-1">
                  Clientes precisam ter conta com role=cliente no sistema.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2 mb-6">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                    selectedId === c.id
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-100 bg-white hover:border-gray-200"
                  }`}
                >
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-purple-600">
                      {(c.company_name ?? "?")[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-semibold block truncate ${selectedId === c.id ? "text-purple-800" : "text-gray-800"}`}>
                      {c.company_name || "Sem nome"}
                    </span>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {c.responsible_name && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <User className="w-3 h-3" />{c.responsible_name}
                        </span>
                      )}
                      {c.segment && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Tag className="w-3 h-3" />{c.segment}
                        </span>
                      )}
                      {c.status && c.status !== "active" && (
                        <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                          {c.status}
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedId === c.id && (
                    <Check className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={handleEnter}
            disabled={!selectedId}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-purple-600 text-white font-semibold rounded-2xl hover:bg-purple-700 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Abrir ContentOS
            <ArrowRight className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
}
