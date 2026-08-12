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

export function InlineCompanyPicker({
  onSelect,
  onNewClient,
}: {
  onSelect: (companyId: string, companyName: string | null) => void;
  onNewClient?: () => void;
}) {
  const { companies, loading } = useAuthorizedCompanies();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-white/50 py-2" data-testid="inline-company-picker-loading">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando empresas...
      </div>
    );
  }

  if (!companies || companies.length === 0) {
    return (
      <div className="space-y-2" data-testid="inline-company-picker-empty">
        <p className="text-xs text-white/50">Nenhuma empresa autorizada ainda.</p>
        {onNewClient && (
          <button
            type="button"
            onClick={onNewClient}
            className="text-xs font-bold text-indigo-300 hover:text-indigo-200"
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
          className="w-full flex items-center gap-2 text-left text-xs text-white/80 bg-white/5 hover:bg-white/10 rounded-lg px-3 py-2 transition-colors"
        >
          <Building2 className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
          {c.name ?? "Empresa"}
        </button>
      ))}
      {onNewClient && (
        <button
          type="button"
          onClick={onNewClient}
          className="w-full text-left text-xs font-bold text-indigo-300 hover:text-indigo-200 px-3 py-1.5"
        >
          + Novo cliente
        </button>
      )}
    </div>
  );
}
