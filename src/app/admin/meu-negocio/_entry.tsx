"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { findCompanyById } from "@/lib/business-archetypes/company-selection";
import { CompanySelector } from "./_company-selector";
import { RestaurantWorkspace } from "./_restaurant-workspace";
import { ActivationPlaceholder } from "./_activation-placeholder";

/**
 * Vertical slice Restaurante (hotfix feat/meu-negocio-stock-restaurant-v1).
 * Ponto de entrada de /admin/meu-negocio: seleção de empresa primeiro,
 * depois a experiência correspondente ao arquétipo de negócio. 100% em
 * memória — nenhuma consulta ou mutação real ao Supabase acontece aqui.
 */
export function MeuNegocioEntry() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const company = selectedCompanyId ? findCompanyById(selectedCompanyId) : undefined;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Meu Negócio</h1>
          <p className="text-xs text-gray-400">Estoque, fichas técnicas, CMV e relatórios em um só lugar.</p>
        </div>
      </div>

      {!company && <CompanySelector onOpen={setSelectedCompanyId} />}

      {company && company.archetype === "food_service" && (
        <RestaurantWorkspace companyName={company.name} onBack={() => setSelectedCompanyId(null)} />
      )}

      {company && company.archetype !== "food_service" && (
        <ActivationPlaceholder card={company} onBack={() => setSelectedCompanyId(null)} />
      )}
    </div>
  );
}
