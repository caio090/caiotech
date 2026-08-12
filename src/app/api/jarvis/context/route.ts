import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createSupabaseAdminClient, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";
import { resolveCompanyContext } from "@/lib/company-context/resolve";
import { getProjectProjections } from "@/lib/project-projection/adapters";
import { getWorkItemProjections } from "@/lib/work-item-projection/adapters";
import { buildCompanyCentralView } from "@/lib/company-central/builder";
import { officeCalendarHealth } from "@/lib/business-office/source-health";
import { getBusinessOfficeFeed } from "@/lib/business-office/data";
import { buildJarvisGlobalSummary } from "@/lib/jarvis/global-aggregate";

/**
 * Sprint MVP Experience Completion V0.1 (Parte C2) — resumo SEGURO para o
 * header do painel do Jarvis (nome da empresa, contagens). Nunca usado
 * como fonte de autorização para o chat -- o /api/jarvis/chat sempre
 * revalida a Company server-side de novo, independentemente do que esta
 * rota respondeu.
 *
 * Sprint Command Center + Jarvis Context V1 (Problema 6/7) — quando nenhuma
 * Company foi pedida (`reason === "company_required"` sem `?client=`), isso
 * não é mais um erro: devolve o resumo Global real (empresas autorizadas
 * agregadas). Qualquer OUTRO motivo de falha (company_not_found,
 * role_not_supported, preview sem company) continua fail closed com
 * `ok:false` -- essa distinção já é feita por resolveCompanyContext(), esta
 * rota nunca reimplementa a decisão de autorização.
 */
export async function GET(request: NextRequest) {
  const authClient = await createServerSupabaseClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const companyId = request.nextUrl.searchParams.get("client");
  const resolution = await resolveCompanyContext(companyId);

  if (!resolution.valid || !resolution.context) {
    if (resolution.reason !== "company_required" || companyId) {
      return NextResponse.json({ ok: false, reason: resolution.reason ?? "company_required" }, { status: 200 });
    }
    if (!hasSupabaseServiceRoleKey()) {
      return NextResponse.json({ ok: true, mode: "global", authorizedCompanyCount: 0, companies: [], omittedCompanyCount: 0, calendarAvailable: true });
    }
    const adminDb = createSupabaseAdminClient();
    const { data: profile } = await authClient.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const role = (profile as { role?: string } | null)?.role ?? "";
    const summary = await buildJarvisGlobalSummary(adminDb, user.id, role);
    return NextResponse.json({
      ok: true,
      mode: "global",
      authorizedCompanyCount: summary.authorizedCompanyCount,
      companies: summary.companies,
      omittedCompanyCount: summary.omittedCompanyCount,
      calendarAvailable: summary.calendarAvailable,
    });
  }
  const context = resolution.context;

  if (!hasSupabaseServiceRoleKey()) {
    return NextResponse.json({
      ok: true,
      mode: "company",
      companyId: context.companyId,
      companyName: context.companyName,
      surface: context.surface,
      office: null,
      activeProjectsCount: 0,
    });
  }

  const adminDb = createSupabaseAdminClient();
  const [officeResult, projects] = await Promise.all([
    getBusinessOfficeFeed(adminDb, { clientId: context.companyId }),
    getProjectProjections(adminDb, context.companyId),
  ]);
  const workItems = await getWorkItemProjections(adminDb, context.companyId);
  const view = buildCompanyCentralView(
    { companyId: context.companyId, companyName: context.companyName, surface: context.surface },
    projects, workItems, new Date().toISOString(),
  );

  return NextResponse.json({
    ok: true,
    mode: "company",
    companyId: context.companyId,
    companyName: context.companyName,
    surface: context.surface,
    office: {
      todayCount: view.workSummary.todayCount,
      overdueCount: view.workSummary.overdueCount,
      approvalsCount: view.workSummary.approvalsCount,
      calendarStatus: officeCalendarHealth(officeResult.sourceErrors),
    },
    activeProjectsCount: view.activeProjects.length,
  });
}
