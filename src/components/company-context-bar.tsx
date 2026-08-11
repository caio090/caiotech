"use client";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Building2, ChevronDown } from "lucide-react";
import { COMPANY_CONTEXT_QUERY_KEY } from "@/lib/company-context/navigation";

/**
 * Sprint MVP Dogfood Final — Company Context Transversal (Fase 4/5/34).
 * Barra global, montada uma única vez na shell autenticada (nunca dentro
 * do REC OS) -- resolve o gap real que o QA encontrou: cada módulo já
 * sabia ler `?client=` (resolveCompanyContext), mas nada mostrava QUAL
 * empresa está ativa fora das páginas que já incluíam CompanyContextHeader,
 * e trocar de módulo perdia o parâmetro.
 *
 * Não duplica a consulta de clientes nem cria um segundo resolver: só
 * chama GET /api/company-context (wrapper fino sobre resolveCompanyContext)
 * para saber o nome da Company ativa a partir do `?client=` da URL atual.
 */
export function CompanyContextBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const companyId = searchParams.get(COMPANY_CONTEXT_QUERY_KEY);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setLoading(true);
    fetch(`/api/company-context?${COMPANY_CONTEXT_QUERY_KEY}=${encodeURIComponent(companyId)}`)
      .then((r) => r.json())
      .then((data: { valid: boolean; companyName?: string | null }) => {
        if (cancelled) return;
        setCompanyName(data.valid ? (data.companyName ?? "Empresa") : null);
      })
      .catch(() => { if (!cancelled) setCompanyName(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [companyId]);

  // companyId ausente sempre renderiza o estado vazio, mesmo que
  // `companyName` guarde um valor obsoleto de uma Company anterior --
  // nunca depende de resetar state dentro do efeito.
  const displayName = companyId ? companyName : null;

  const pickerHref = `/contentos/selecionar-cliente?next=${encodeURIComponent(pathname)}`;

  if (companyId && displayName) {
    return (
      <Link
        href={pickerHref}
        data-testid="company-context-bar-active"
        className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-100 hover:border-purple-200 px-3 py-1.5 text-xs font-bold text-purple-700 transition-colors"
        title="Trocar empresa"
      >
        <Building2 className="w-3.5 h-3.5" />
        {displayName}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </Link>
    );
  }

  if (companyId && loading) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 border border-gray-100 px-3 py-1.5 text-xs font-medium text-gray-400">
        <Building2 className="w-3.5 h-3.5" />
        Carregando…
      </span>
    );
  }

  return (
    <Link
      href={pickerHref}
      data-testid="company-context-bar-empty"
      className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 border border-gray-100 hover:border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors"
    >
      <Building2 className="w-3.5 h-3.5" />
      Selecionar empresa
    </Link>
  );
}
