"use client";
import { useState, useEffect, useMemo } from "react";
import { Building2, Search, Check, ArrowRight, Tag, User, ChevronLeft, ChevronRight, AtSign, Globe, Clock } from "lucide-react";
import { ACTIVE_CLIENT_KEY, ACTIVE_CLIENT_NAME_KEY, clearActiveClient } from "@/lib/active-client";
import type { AdminContentosClient } from "@/lib/admin-contentos-clients";

export type RealClient = AdminContentosClient;

interface Props {
  clients: RealClient[];
  isSupabaseActive: boolean;
}

const PAGE_SIZE = 12;

const STATUS_LABELS: Record<string, string> = {
  active:   "Ativo",
  inactive: "Inativo",
  paused:   "Pausado",
};

export function AdminSelecionarClienteContent({ clients, isSupabaseActive }: Props) {
  const [search,      setSearch]      = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "active" | "inactive" | "paused">("todos");
  const [selectedId,  setSelectedId]  = useState<string>("");
  const [page,        setPage]        = useState(1);

  useEffect(() => {
    clearActiveClient();
  }, []);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      const matchesSearch = !search ||
        (c.company_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (c.responsible_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (c.segment ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "todos" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [clients, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleEnter() {
    const client = clients.find((c) => c.id === selectedId);
    if (!client) return;
    localStorage.setItem(ACTIVE_CLIENT_KEY, selectedId);
    localStorage.setItem(ACTIVE_CLIENT_NAME_KEY, client.company_name ?? "");
    window.location.href = `/admin/contentos/home?client=${selectedId}`;
  }

  function statusColor(status: string | null) {
    if (status === "active")   return "text-emerald-600 bg-emerald-50";
    if (status === "inactive") return "text-gray-400 bg-gray-50";
    if (status === "paused")   return "text-amber-600 bg-amber-50";
    return "text-gray-400 bg-gray-50";
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
          {/* Busca */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, responsável ou segmento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400 bg-white"
            />
          </div>

          {/* Filtro de status */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {(["todos", "active", "inactive", "paused"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {s === "todos" ? "Todos" : STATUS_LABELS[s] ?? s}
                {s !== "todos" && (
                  <span className="ml-1 opacity-70">
                    ({clients.filter((c) => c.status === s).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {paginated.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 mb-6">
              <Building2 className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">
                {search || statusFilter !== "todos"
                  ? "Nenhum cliente encontrado com esses filtros."
                  : "Nenhum cliente real cadastrado ainda."}
              </p>
              {!search && statusFilter === "todos" && (
                <p className="text-xs text-gray-300 mt-1">
                  Clientes precisam ter conta com role=cliente no sistema.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2 mb-4">
              {paginated.map((c) => (
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
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
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
                      {c.has_meta && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-indigo-700 bg-indigo-50">
                          <Globe className="w-2.5 h-2.5" />Meta
                        </span>
                      )}
                      {c.has_instagram && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-pink-700 bg-pink-50">
                          <AtSign className="w-2.5 h-2.5" />IG
                        </span>
                      )}
                      {c.has_brief === false && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-amber-700 bg-amber-50">
                          <Clock className="w-2.5 h-2.5" />Brief pendente
                        </span>
                      )}
                      {c.status && c.status !== "active" && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusColor(c.status)}`}>
                          {STATUS_LABELS[c.status] ?? c.status}
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

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <span className="text-xs text-gray-400">
                {page} / {totalPages} · {filtered.length} clientes
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
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
