"use client";

import { useEffect, useState } from "react";
import { Building2, Loader2 } from "lucide-react";

export interface AuthorizedCompanyOption {
  id: string;
  name: string | null;
}

/**
 * Sprint Command Center + Jarvis Context V1 — seletor de Company reusável,
 * carrega SOMENTE Companies que o usuário realmente pode acessar (via
 * /api/command-center/authorized-companies, que reaproveita
 * listAuthorizedCompanies()). Nunca usa nome/texto livre -- sempre
 * client_id real. Usado pelo Command Center (ações que exigem Company) e
 * pelo seletor de contexto do Jarvis.
 */
export function useAuthorizedCompanies() {
  const [companies, setCompanies] = useState<AuthorizedCompanyOption[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/command-center/authorized-companies")
      .then((r) => r.json())
      .then((data: { ok: boolean; companies?: AuthorizedCompanyOption[] }) => {
        if (cancelled) return;
        setCompanies(data.ok ? (data.companies ?? []) : []);
      })
      .catch(() => { if (!cancelled) setCompanies([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { companies, loading };
}

/**
 * `theme` (LOKAT OS — Company Context Selector + Local Preview Audit) —
 * "dark" preserva exatamente o visual original (painel escuro do Command
 * Center/Jarvis, único consumidor até então). "light" é usado pelos novos
 * consumidores sobre fundo branco (CompanyContextRequiredState, header) --
 * mesma lógica/estado (useAuthorizedCompanies), só a apresentação muda, para
 * nunca duplicar o carregamento/autorização por tema.
 */
export function InlineCompanyPicker({
  onSelect,
  onNewClient,
  theme = "dark",
}: {
  onSelect: (companyId: string, companyName: string | null) => void;
  onNewClient?: () => void;
  theme?: "dark" | "light";
}) {
  const { companies, loading } = useAuthorizedCompanies();
  const isLight = theme === "light";

  if (loading) {
    return (
      <div
        className={`flex items-center gap-2 text-xs py-2 ${isLight ? "text-gray-400" : "text-white/50"}`}
        data-testid="inline-company-picker-loading"
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando empresas...
      </div>
    );
  }

  if (!companies || companies.length === 0) {
    return (
      <div className="space-y-2" data-testid="inline-company-picker-empty">
        <p className={`text-xs ${isLight ? "text-gray-400" : "text-white/50"}`}>Nenhuma empresa autorizada ainda.</p>
        {onNewClient && (
          <button
            type="button"
            onClick={onNewClient}
            className={`text-xs font-bold ${isLight ? "text-purple-600 hover:text-purple-700" : "text-indigo-300 hover:text-indigo-200"}`}
          >
            + Novo cliente
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5" data-testid="inline-company-picker">
      {companies.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onSelect(c.id, c.name)}
          data-testid="inline-company-picker-option"
          className={
            isLight
              ? "w-full flex items-center gap-2 text-left text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-lg px-3 py-2 transition-colors"
              : "w-full flex items-center gap-2 text-left text-xs text-white/80 bg-white/5 hover:bg-white/10 rounded-lg px-3 py-2 transition-colors"
          }
        >
          <Building2 className={`w-3.5 h-3.5 flex-shrink-0 ${isLight ? "text-gray-400" : "text-white/40"}`} />
          {c.name ?? "Empresa"}
        </button>
      ))}
      {onNewClient && (
        <button
          type="button"
          onClick={onNewClient}
          className={`w-full text-left text-xs font-bold px-3 py-1.5 ${isLight ? "text-purple-600 hover:text-purple-700" : "text-indigo-300 hover:text-indigo-200"}`}
        >
          + Novo cliente
        </button>
      )}
    </div>
  );
}
