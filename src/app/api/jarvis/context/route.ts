import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createSupabaseAdminClient, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";
import { resolveCompanyContext } from "@/lib/company-context/resolve";
import { getProjectProjections } from "@/lib/project-projection/adapters";
import { getWorkItemProjections } from "@/lib/work-item-projection/adapters";
import { buildCompanyCentralView } from "@/lib/company-central/builder";
import { officeCalendarHealth } from "@/lib/business-office/source-health";
import { getBusinessOfficeFeed } from "@/lib/business-office/data";

/**
 * Sprint MVP Experience Completion V0.1 (Parte C2) — resumo SEGURO para o
 * header do painel do Jarvis (nome da empresa, contagens). Nunca usado
 * como fonte de autorização para o chat -- o /api/jarvis/chat sempre
 * revalida a Company server-side de novo, independentemente do que esta
 * rota respondeu.
 */
export async function GET(request: NextRequest) {
  const authClient = await createServerSupabaseClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const companyId = request.nextUrl.searchParams.get("client");
  const resolution = await resolveCompanyContext(companyId);
  if (!resolution.valid || !resolution.context) {
    return NextResponse.json({ ok: false, reason: resolution.reason ?? "company_required" }, { status: 200 });
  }
  const context = resolution.context;

  if (!hasSupabaseServiceRoleKey()) {
    return NextResponse.json({
      ok: true,
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
