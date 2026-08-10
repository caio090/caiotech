import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ExternalLink, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { CompanyContextHeader } from "@/components/company-context-header";
import { CompanyContextRequiredState } from "@/components/company-context-required-state";
import { resolveCompanyContext } from "@/lib/company-context/resolve";
import { createSupabaseAdminClient, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";
import { getProjectProjection } from "@/lib/project-projection/adapters";
import { ClipboardList } from "lucide-react";

/**
 * Sprint MVP Dogfood Spine V0.1 (Bloco C, Fase 17-18) — leitura operacional
 * do Project. NUNCA um formulário de edição (Fase 18: mutation continua no
 * domínio original, aqui é REC OS). "Work items" aparece honestamente vazio
 * -- nenhuma fonte real liga Work Items a rec_projects hoje (Fase 24: nunca
 * inventar projectId numa relação que não existe).
 */
export default async function AdminProjetoDetailPage({
  params, searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ client?: string }>;
}) {
  const { projectId } = await params;
  const { client: clientId } = await searchParams;
  const nextPath = `/admin/projetos/${encodeURIComponent(projectId)}${clientId ? `?client=${clientId}` : ""}`;

  const resolution = await resolveCompanyContext(clientId ?? null);
  if (!resolution.valid) {
    if (resolution.reason === "not_authenticated") redirect("/login");
    if (resolution.reason === "role_not_supported") redirect("/admin/dashboard");
    return (
      <>
        <PageHeader title="Projeto" />
        <CompanyContextRequiredState reason={resolution.reason ?? "company_required"} nextPath={nextPath} />
      </>
    );
  }
  const context = resolution.context!;

  if (!hasSupabaseServiceRoleKey()) {
    return (
      <>
        <PageHeader title="Projeto" />
        <CompanyContextHeader companyName={context.companyName} />
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          Este recurso está temporariamente indisponível. Sua sessão continua ativa.
        </div>
      </>
    );
  }

  const adminDb = createSupabaseAdminClient();
  const project = await getProjectProjection(adminDb, context.companyId, projectId);

  if (!project) {
    return (
      <>
        <PageHeader title="Projeto" />
        <CompanyContextHeader companyName={context.companyName} />
        <EmptyState
          icon={AlertTriangle}
          title="Projeto não encontrado."
          description="Este projeto não existe ou não pertence à empresa selecionada."
        />
        <Link href={`/admin/projetos?client=${context.companyId}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 mt-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Projetos
        </Link>
      </>
    );
  }

  return (
    <>
      <PageHeader title={project.title} description={project.description ?? undefined} />
      <CompanyContextHeader companyName={context.companyName} projectTitle={project.title} />

      <Link href={`/admin/projetos?client=${context.companyId}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-800 mb-4">
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Projetos
      </Link>

      <div className="grid gap-4 sm:grid-cols-2 mb-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase mb-1">Status</p>
          <p className="text-sm font-bold text-gray-900">{project.status}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase mb-1">Prazo</p>
          <p className="text-sm font-bold text-gray-900">
            {project.dueAt ? new Date(project.dueAt).toLocaleDateString("pt-BR") : "Sem data definida"}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
        <h2 className="text-xs font-black uppercase tracking-wide text-gray-500 mb-3">Work items</h2>
        <EmptyState
          icon={ClipboardList}
          title="Nenhum work item vinculado a este projeto ainda."
          description="A relação entre Work Items e Projetos de REC OS ainda não existe nas fontes reais -- ver Meu Escritório para pendências gerais da empresa."
        />
      </div>

      <Link
        href={project.sourceUrl}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"
      >
        <ExternalLink className="w-3.5 h-3.5" /> Abrir no REC OS (fonte real) <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </>
  );
}
