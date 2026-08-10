import Link from "next/link";
import { Building2, AlertTriangle } from "lucide-react";

/**
 * Sprint MVP Dogfood Spine V0.1 (Bloco B, Fase 38) — estado honesto quando
 * nenhuma Company pôde ser resolvida (nunca tela branca). Reaproveita a
 * rota real /contentos/selecionar-cliente (Regra de Ouro: nenhuma tela
 * paralela de seleção de empresa).
 */
export function CompanyContextRequiredState({
  reason, nextPath,
}: {
  reason: "company_required" | "company_not_found";
  nextPath: string;
}) {
  const isNotFound = reason === "company_not_found";
  return (
    <div className="max-w-md mx-auto py-16 px-4 text-center" data-testid="company-context-required-state" data-reason={reason}>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isNotFound ? "bg-amber-50" : "bg-purple-50"}`}>
        {isNotFound ? <AlertTriangle className="w-6 h-6 text-amber-500" /> : <Building2 className="w-6 h-6 text-purple-500" />}
      </div>
      <h1 className="text-lg font-bold text-gray-900 mb-2">
        {isNotFound ? "Empresa não encontrada" : "Selecione uma empresa"}
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        {isNotFound
          ? "A empresa informada não existe ou você não tem acesso a ela."
          : "Escolha para qual empresa você quer ver esta página."}
      </p>
      <Link
        href={`/contentos/selecionar-cliente?next=${encodeURIComponent(nextPath)}`}
        className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-2xl hover:bg-purple-700 transition-colors"
      >
        Selecionar empresa
      </Link>
    </div>
  );
}
