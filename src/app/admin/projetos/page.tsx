import { redirect } from "next/navigation";
import Link from "next/link";
import { FolderKanban, ArrowRight, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { CompanyContextHeader } from "@/components/company-context-header";
import { CompanyContextRequiredState } from "@/components/company-context-required-state";
import { resolveCompanyContext } from "@/lib/company-context/resolve";
import { createSupabaseAdminClient, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";
import { getProjectProjections } from "@/lib/project-projection/adapters";

/**
 * Sprint MVP Dogfood Spine V0.1 (Bloco C, Fase 11/16) — antes desta sprint,
 * esta rota renderizava `mockProjects` (dados fictícios, ver histórico de
 * git) com um aviso explícito de que não representava projetos reais.
 * Substituída por ProjectProjection real sobre `rec_projects`, escopada
 * pela Company resolvida em resolveCompanyContext() -- nenhum mock
 * restante na experiência principal.
 */
export default async function AdminProjetosPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const params = await searchParams;
  const clientId = params.client ?? null;
  const nextPath = clientId ? `/admin/projetos?client=${clientId}` : "/admin/projetos";

  const resolution = await resolveCompanyContext(clientId);
  if (!resolution.valid) {
    if (resolution.reason === "not_authenticated") redirect("/login");
    if (resolution.reason === "role_not_supported") redirect("/admin/dashboard");
    return (
      <>
        <PageHeader title="Projetos" description="Projetos reais da empresa selecionada." />
        <CompanyContextRequiredState reason={resolution.reason ?? "company_required"} nextPath={nextPath} />
      </>
    );
  }
  const context = resolution.context!;

  if (!hasSupabaseServiceRoleKey()) {
    return (
      <>
        <PageHeader title="Projetos" description="Projetos reais da empresa selecionada." />
        <CompanyContextHeader companyName={context.companyName} />
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          Este recurso está temporariamente indisponível. Sua sessão continua ativa.
        </div>
      </>
    );
  }

  const adminDb = createSupabaseAdminClient();
  const projects = await getProjectProjections(adminDb, context.companyId);

  return (
    <>
      <PageHeader
        title="Projetos"
        description={projects.length > 0 ? `${projects.length} projeto(s) reais` : "Projetos reais da empresa selecionada."}
      />
      <CompanyContextHeader companyName={context.companyName} />
      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Nenhum projeto estruturado ainda."
          description="Os projetos de audiovisual aparecem aqui assim que forem criados no REC OS."
        />
      ) : (
        <div className="space-y-3" data-testid="projetos-list">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/admin/projetos/${encodeURIComponent(project.sourceEntityId)}?client=${context.companyId}`}
              data-testid="project-card"
              className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-indigo-200 transition-all"
            >
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <FolderKanban className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-gray-900 truncate">{project.title}</h3>
                <p className="text-xs text-gray-400">
                  {project.status}
                  {project.dueAt && ` · prazo ${new Date(project.dueAt).toLocaleDateString("pt-BR")}`}
                  {project.owner && ` · ${project.owner}`}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
