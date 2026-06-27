"use client";
import { useState } from "react";
import { AlertCircle, ArrowRight, FileText, X } from "lucide-react";

interface Props {
  clientId: string;
  companyName: string | null;
}

export function BriefGate({ clientId, companyName }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-2xl relative">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-amber-400 hover:text-amber-600 transition-colors"
        aria-label="Fechar"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-amber-800 mb-0.5">
            Diagnóstico pendente para {companyName ?? "este cliente"}
          </p>
          <p className="text-xs text-amber-700 mb-3 leading-relaxed">
            Este cliente ainda não possui um contexto estratégico cadastrado.
            Preencher o diagnóstico/briefing melhora a qualidade das sugestões de conteúdo da IA.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/admin/contentos/base-estrategica?client=${clientId}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-xl transition-colors"
            >
              <FileText className="w-3.5 h-3.5" /> Criar base estratégica
            </a>
            <button
              onClick={() => setDismissed(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-xl transition-colors"
            >
              Continuar mesmo assim <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
