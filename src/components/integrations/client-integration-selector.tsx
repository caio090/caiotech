"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { X, Search, CheckCircle2, AlertCircle, Loader2, Clock } from "lucide-react";

export type SelectorClientOption = {
  id: string;
  company_name: string;
  email?: string | null;
  meta_status?: "complete" | "partial" | "not_connected" | "unknown";
  has_olaclick?: boolean;
};

type FilterStatus = "all" | "unconnected_meta" | "unconnected_olaclick";

type ClientIntegrationSelectorProps = {
  clients: SelectorClientOption[];
  loading?: boolean;
  title: string;
  description?: string;
  filterStatus?: FilterStatus;
  onSelect: (client: SelectorClientOption) => void;
  onClose: () => void;
};

export function ClientIntegrationSelector({
  clients,
  loading,
  title,
  description,
  filterStatus = "all",
  onSelect,
  onClose,
}: ClientIntegrationSelectorProps) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const baseList = useMemo(() => {
    if (filterStatus === "unconnected_meta") {
      return clients.filter(
        (c) => c.meta_status !== "complete" && c.meta_status !== "partial",
      );
    }
    if (filterStatus === "unconnected_olaclick") {
      return clients.filter((c) => !c.has_olaclick);
    }
    return clients;
  }, [clients, filterStatus]);

  const filtered = useMemo(() => {
    if (!search.trim()) return baseList;
    const q = search.trim().toLowerCase();
    return baseList.filter(
      (c) =>
        c.company_name.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q),
    );
  }, [baseList, search]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-sm font-bold text-gray-900">{title}</p>
            {description && (
              <p className="text-xs text-gray-400 mt-0.5">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou e-mail…"
              className="w-full text-xs border border-gray-200 rounded-xl pl-8 pr-7 py-2.5 focus:outline-none focus:border-indigo-400"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-xs text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando clientes…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-xs text-gray-400">
              {search
                ? `Nenhum cliente encontrado para "${search}".`
                : "Nenhum cliente disponível."}
            </div>
          ) : (
            filtered.map((client) => (
              <button
                key={client.id}
                onClick={() => onSelect(client)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between gap-3 group"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-indigo-700 transition-colors">
                    {client.company_name}
                  </p>
                  {client.email && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {client.email}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {client.meta_status === "complete" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Completo
                    </span>
                  ) : client.meta_status === "partial" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full">
                      <AlertCircle className="w-2.5 h-2.5" /> Parcial
                    </span>
                  ) : client.has_olaclick ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Ativo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded-full">
                      <Clock className="w-2.5 h-2.5" /> Pendente
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {filtered.length} cliente{filtered.length !== 1 ? "s" : ""}
          </p>
          <button
            onClick={onClose}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
