"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, AlertTriangle } from "lucide-react";
import { CompanySelectorDialog } from "@/components/company-selector-dialog";
import { withCompanyContext } from "@/lib/company-context/navigation";

/**
 * LOKAT OS — Company Selector Final UX. A página permanece na própria rota
 * (nunca navega para /contentos/selecionar-cliente) e mostra um estado de
 * fundo simples ("Selecione uma empresa"); a escolha real acontece no
 * CompanySelectorDialog (modal), aberto automaticamente e reabrível pelo
 * botão. Ao selecionar, router.replace troca só o `?client=` via
 * withCompanyContext (preserva os demais params) -- mesma página, mesmo
 * componente, contexto atualizado. "+ Novo cliente" aponta para a única
 * autoridade real de criação (/admin/clientes).
 */
export function CompanyContextRequiredState({
  reason, nextPath,
}: {
  reason: "company_required" | "company_not_found";
  nextPath: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const isNotFound = reason === "company_not_found";

  function handleSelect(companyId: string) {
    setOpen(false);
    router.replace(withCompanyContext(nextPath, companyId));
  }

  return (
    <>
      <div className="max-w-md mx-auto py-16 px-4 text-center" data-testid="company-context-required-state" data-reason={reason}>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isNotFound ? "bg-amber-50" : "bg-purple-50"}`}>
          {isNotFound ? <AlertTriangle className="w-6 h-6 text-amber-500" /> : <Building2 className="w-6 h-6 text-purple-500" />}
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-2">
          {isNotFound ? "Empresa não encontrada" : "Selecione uma empresa"}
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          {isNotFound
            ? "A empresa informada não existe ou você não tem acesso a ela. Escolha outra abaixo."
            : "Escolha para qual empresa você quer ver esta página."}
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-testid="company-context-open-selector"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-2xl hover:bg-purple-700 transition-colors"
        >
          Selecionar empresa
        </button>
      </div>

      <CompanySelectorDialog
        open={open}
        onClose={() => setOpen(false)}
        onSelect={handleSelect}
        onNewClient={() => { setOpen(false); router.push("/admin/clientes"); }}
      />
    </>
  );
}
