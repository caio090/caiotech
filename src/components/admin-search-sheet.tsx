"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { configs } from "@/components/app-sidebar";

/**
 * Sprint REC OS 3.0.1.1 (Fase 22) — auditoria encontrou que a caixa de
 * busca do header admin (`<input placeholder="Buscar..." />`) nunca teve
 * `value`/`onChange`/handler algum — era decorativa em QUALQUER viewport,
 * não só no mobile. Substituída por um botão real que abre uma sheet de
 * busca funcional. Escopo honesto: só pesquisa módulos/rotas já visíveis
 * para o usuário (`configs.admin.nav`, o mesmo catálogo real do sidebar) —
 * nenhuma busca de cliente/conteúdo é fingida aqui.
 */
export function AdminSearchSheet({ dark }: { dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function closeSheet() {
    setOpen(false);
    setQuery("");
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeSheet();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const q = query.trim().toLowerCase();
  const results = q
    ? configs.admin.nav.filter((item) => item.label.toLowerCase().includes(q))
    : configs.admin.nav;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="admin-search-trigger"
        aria-label="Buscar módulos e rotas"
        className={cn(
          "flex items-center gap-2 rounded-xl px-3 py-2 w-10 sm:w-32 md:w-72 justify-center sm:justify-start transition-colors",
          dark ? "bg-white/10 border border-white/15 text-white/60" : "bg-gray-50 border border-gray-200 text-gray-400",
        )}
      >
        <Search className="w-4 h-4 flex-shrink-0" />
        <span className="hidden sm:inline text-sm">Buscar...</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-label="Busca" data-testid="admin-search-sheet">
          <div className="absolute inset-0 bg-black/30" onClick={closeSheet} />
          <div className="absolute inset-x-0 top-0 sm:top-16 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg bg-white rounded-b-2xl sm:rounded-2xl shadow-2xl p-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-3">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar módulos e rotas..."
                className="flex-1 outline-none text-sm text-gray-800"
                data-testid="admin-search-input"
              />
              <button type="button" onClick={closeSheet} aria-label="Fechar busca">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {results.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">Nenhum módulo encontrado.</p>
            ) : (
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {results.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeSheet}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700"
                  >
                    <item.icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
            <p className="mt-3 text-[10px] text-gray-400">
              Busca cobre módulos e rotas disponíveis — clientes e conteúdos ainda não são pesquisáveis aqui.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
