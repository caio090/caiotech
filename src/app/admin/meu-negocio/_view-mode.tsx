"use client";

import { useEffect, useState } from "react";
import { Eye, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BusinessViewMode } from "@/lib/finance/types";

const STORAGE_KEY = "lokat_meu_negocio_view_mode";

/**
 * Visão simples / Modo Gestor — controla SOMENTE densidade, explicação e
 * profundidade de dados exibidos. Nunca liberar ação, ocultar dado por
 * segurança, trocar workspace, alterar role, contornar capability ou
 * autorizar escrita a partir deste estado. Persistido em sessionStorage
 * (não localStorage, não cookie) — dura só a aba/sessão atual, nunca é lido
 * por lógica de permissão.
 */
export function useBusinessViewMode(): [BusinessViewMode, (mode: BusinessViewMode) => void] {
  const [mode, setModeState] = useState<BusinessViewMode>("simple");

  useEffect(() => {
    let active = true;
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored === "simple" || stored === "manager") {
        queueMicrotask(() => {
          if (active) setModeState(stored);
        });
      }
    } catch {
      // sessionStorage indisponível (ex.: modo privado) — mantém o padrão "simple".
    }
    return () => { active = false; };
  }, []);

  function setMode(next: BusinessViewMode) {
    setModeState(next);
    try {
      sessionStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Persistência é apenas conveniência — falha silenciosa é aceitável.
    }
  }

  return [mode, setMode];
}

export function ViewModeToggle({ mode, onChange }: { mode: BusinessViewMode; onChange: (mode: BusinessViewMode) => void }) {
  return (
    <div role="tablist" aria-label="Modo de visualização" className="inline-flex items-center gap-1 bg-gray-100 rounded-xl p-1">
      <button
        type="button"
        role="tab"
        aria-selected={mode === "simple"}
        data-testid="view-mode-simple"
        onClick={() => onChange("simple")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-colors",
          mode === "simple" ? "bg-white text-purple-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
        )}
      >
        <Eye className="w-3.5 h-3.5" /> Visão simples
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "manager"}
        data-testid="view-mode-manager"
        onClick={() => onChange("manager")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-colors",
          mode === "manager" ? "bg-white text-purple-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
        )}
      >
        <SlidersHorizontal className="w-3.5 h-3.5" /> Modo Gestor
      </button>
    </div>
  );
}
