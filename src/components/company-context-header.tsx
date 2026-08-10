import { Building2, FolderKanban } from "lucide-react";

/**
 * Sprint MVP Dogfood Spine V0.1 (Bloco B, Fase 10) — indicador discreto de
 * contexto. Mostra nome, nunca ID técnico. Reaproveitado em Projetos,
 * Detalhe de Projeto e Company Central para nunca perder o contexto ao
 * navegar entre módulos (Fase 40).
 */
export function CompanyContextHeader({
  companyName, projectTitle,
}: {
  companyName: string | null;
  projectTitle?: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4" data-testid="company-context-header">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
        <Building2 className="w-3.5 h-3.5" />
        {companyName ?? "Empresa"}
      </span>
      {projectTitle && (
        <>
          <span className="text-gray-300 text-xs">/</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 border border-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
            <FolderKanban className="w-3.5 h-3.5" />
            {projectTitle}
          </span>
        </>
      )}
    </div>
  );
}
