"use client";

import Link from "next/link";
import { Clapperboard, Flag, ArrowRight } from "lucide-react";
import { InlineCompanyPicker } from "./inline-company-picker";

/**
 * Sprint Command Center + Jarvis Context V1 (Problema 4) — "criar projeto"
 * nunca inventa uma segunda tabela de projetos. As únicas autoridades reais
 * hoje são: projeto audiovisual (INSERT direto em rec_projects via
 * /admin/audiovisual/criar) e campanha (/admin/contentos/campanhas). Não existe
 * autoridade real para "outro tipo de projeto" -- omitido honestamente em
 * vez de fingir uma ação (Fase "Botão sem ação real: PROIBIDO").
 */
export function InlineProjectCreation({
  companyId,
  companyName,
  onSelectCompany,
}: {
  companyId: string | null;
  companyName: string | null;
  onSelectCompany: (id: string, name: string | null) => void;
}) {
  if (!companyId) {
    return (
      <div className="p-4 space-y-3" data-testid="inline-project-creation-company-step">
        <p className="text-sm font-bold text-white">Iniciar projeto</p>
        <p className="text-xs text-white/60">Para qual empresa?</p>
        <InlineCompanyPicker onSelect={onSelectCompany} />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3" data-testid="inline-project-creation-type-step">
      <p className="text-sm font-bold text-white">O que você quer criar{companyName ? ` para ${companyName}` : ""}?</p>
      <div className="flex flex-col gap-2">
        <Link
          href={`/admin/audiovisual/criar?client=${companyId}`}
          data-testid="inline-project-creation-audiovisual"
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition-colors"
        >
          <Clapperboard className="w-3.5 h-3.5" /> Projeto audiovisual <ArrowRight className="w-3.5 h-3.5 ml-auto" />
        </Link>
        <Link
          href={`/admin/contentos/campanhas?client=${companyId}`}
          data-testid="inline-project-creation-campaign"
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition-colors"
        >
          <Flag className="w-3.5 h-3.5" /> Campanha <ArrowRight className="w-3.5 h-3.5 ml-auto" />
        </Link>
      </div>
    </div>
  );
}
