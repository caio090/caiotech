"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

export interface InlineClientOption {
  id: string;
  name: string;
}

/**
 * Fase 7 do hotfix canônico 1.0.1 — seletor pesquisável inline para rotas
 * `client_required` (ex.: Criar). Nunca redireciona para outra rota: ao
 * escolher um cliente, navega para o MESMO pathname com `?client=<uuid>`
 * adicionado, preservando os demais parâmetros já presentes na URL.
 */
export function InlineClientPicker({ clientOptions }: { clientOptions: InlineClientOption[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clientOptions;
    return clientOptions.filter((c) => c.name.toLowerCase().includes(q));
  }, [clientOptions, query]);

  function select(clientId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("client", clientId);
    // window.location.assign(...) instead of setting .href directly — same
    // native full-page navigation (avoids the Next.js Router Cache bugs
    // documented in Sprint 3.1A.3), but a method call rather than a property
    // assignment on window.location, which the React Compiler ESLint plugin
    // flags as mutating an external value.
    window.location.assign(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar cliente..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400 bg-white"
        />
      </div>
      <div className="max-h-72 overflow-y-auto space-y-1.5">
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">Nenhum cliente encontrado</p>
        ) : (
          filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => select(c.id)}
              className="w-full text-left px-3.5 py-2.5 rounded-xl border border-gray-100 bg-white hover:border-purple-200 hover:bg-purple-50 text-sm font-medium text-gray-700 transition-colors"
            >
              {c.name}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
