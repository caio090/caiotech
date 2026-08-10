import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { CompanyContextHeader } from "@/components/company-context-header";
import { CompanyContextRequiredState } from "@/components/company-context-required-state";
import { resolveCompanyContext } from "@/lib/company-context/resolve";
import { createSupabaseAdminClient, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";
import { getBusinessOfficeFeed, GLOBAL_CALENDAR_TIMEZONE } from "@/lib/business-office/data";
import { getProjectProjections } from "@/lib/project-projection/adapters";
import { EscritorioClient } from "./_escritorio-client";

/**
 * Sprint MVP Experience Completion V0.1 (Parte B) — Meu Escritório passa a
 * usar o mesmo Company Context resolver das demais páginas do Spine
 * (antes, esta página só sabia o `?client=` cru, sem nome/validação real).
 * A rota continua restrita a admin/agência (nunca ao portal do cliente,
 * que tem sua própria área em /client/*) -- resolveCompanyContext também
 * aceita role "cliente", então isso é checado explicitamente abaixo.
 */
export default async function AdminEscritorioPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const params = await searchParams;
  const clientId = params.client ?? null;
  const nextPath = clientId ? `/admin/escritorio?client=${clientId}` : "/admin/escritorio";

  const resolution = await resolveCompanyContext(clientId);
  if (!resolution.valid) {
    if (resolution.reason === "not_authenticated") redirect("/login");
    if (resolution.reason === "role_not_supported") redirect("/admin/dashboard");
    return (
      <>
        <PageHeader title="Meu Escritório" description="O que fazer hoje, esta semana e como foi este mês — a partir dos módulos reais." />
        <CompanyContextRequiredState reason={resolution.reason ?? "company_required"} nextPath={nextPath} />
      </>
    );
  }
  const context = resolution.context!;
  if (context.role === "cliente") redirect("/client/home");

  if (!hasSupabaseServiceRoleKey()) {
    return (
      <>
        <PageHeader title="Meu Escritório" description="O que fazer hoje, esta semana e como foi este mês — a partir dos módulos reais." />
        <CompanyContextHeader companyName={context.companyName} />
        <div className="mb-4 bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          Este recurso está temporariamente indisponível. Não foi possível carregar os dados agora — tente novamente em instantes. Sua sessão continua ativa.
        </div>
      </>
    );
  }

  const adminDb = createSupabaseAdminClient();
  const [officeResult, projects] = await Promise.all([
    getBusinessOfficeFeed(adminDb, { clientId: context.companyId }),
    getProjectProjections(adminDb, context.companyId),
  ]);

  return (
    <>
      <PageHeader
        title="Meu Escritório"
        description="O que fazer hoje, esta semana e como foi este mês — a partir dos módulos reais."
      />
      <EscritorioClient
        items={officeResult.items}
        todayKey={officeResult.todayKey}
        timezone={GLOBAL_CALENDAR_TIMEZONE}
        sourceErrors={officeResult.sourceErrors}
        companyName={context.companyName}
        companyId={context.companyId}
        activeProjects={projects}
      />
    </>
  );
}
