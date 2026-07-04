"use client";
import { useState, useEffect } from "react";
import { Building2, Search, Check, ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { ACTIVE_CLIENT_KEY, ACTIVE_CLIENT_NAME_KEY } from "@/lib/active-client";

interface Client {
  id: string;
  company_name: string | null;
}

interface Props {
  clients: Client[];
  userRole: string;
  isSupabaseActive: boolean;
}

export function SelecionarClienteContent({ clients, userRole, isSupabaseActive }: Props) {
  const [search, setSearch]       = useState("");
  const [selectedId, setSelectedId] = useState<string>("");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const stored = localStorage.getItem(ACTIVE_CLIENT_KEY);
    if (stored && clients.some((c) => c.id === stored)) setSelectedId(stored);
  }, [clients]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const filtered = clients.filter(
    (c) => !search || (c.company_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  function handleEnter() {
    const client = clients.find((c) => c.id === selectedId);
    if (!client) return;
    localStorage.setItem(ACTIVE_CLIENT_KEY, selectedId);
    localStorage.setItem(ACTIVE_CLIENT_NAME_KEY, client.company_name ?? "");
    window.location.href = `/contentos/home?client=${selectedId}`;
  }

  const isAdmin = userRole === "admin";

  return (
    <div className="max-w-xl mx-auto py-12 px-6">

      {/* Back link (admin only) */}
      {isAdmin && (
        <div className="mb-6">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Admin
          </Link>
        </div>
      )}

      {/* Title */}
      <h1 className="text-2xl font-black text-gray-900 mb-1">Selecione um cliente</h1>
      <p className="text-sm text-gray-500 mb-8">
        Escolha para qual marca você quer trabalhar no REC OS.
      </p>

      {!isSupabaseActive ? (
        /* Demo mode */
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-6 h-6 text-purple-400" />
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">Modo demonstração ativo</p>
          <p className="text-xs text-gray-400 mb-6">
            REC OS usa dados de exemplo — nenhum cliente real cadastrado.
          </p>
          <a
            href="/contentos/home"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-2xl hover:bg-purple-700 transition-colors"
          >
            Ir para REC OS
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      ) : (
        <>
          {/* Search */}
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

          {/* Client list */}
          {filtered.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 mb-6">
              <Building2 className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">
                {search ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado."}
              </p>
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
                  <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-purple-600">
                      {(c.company_name ?? "?")[0]?.toUpperCase()}
                    </span>
                  </div>
                  <span
                    className={`text-sm font-medium flex-1 ${
                      selectedId === c.id ? "text-purple-800" : "text-gray-800"
                    }`}
                  >
                    {c.company_name || "Sem nome"}
                  </span>
                  {selectedId === c.id && (
                    <Check className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleEnter}
            disabled={!selectedId}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-purple-600 text-white font-semibold rounded-2xl hover:bg-purple-700 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Entrar no REC OS
            <ArrowRight className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
}
