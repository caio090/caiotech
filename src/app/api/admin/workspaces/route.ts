import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createServerSupabaseClient, createRequiredSupabaseAdminClient, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";
import { BLUEPRINT_AGENCY, BLUEPRINT_AGENCY_CLIENTS, BLUEPRINT_DIRECT_BUSINESS } from "@/lib/workspaces/blueprint-fixtures";

export interface WorkspaceOption {
  id: string;
  name: string;
  isBlueprint: boolean;
  parentId?: string;
  parentName?: string;
}

/**
 * Lists real entities for the "Visualizar como" entity selector, per
 * surface. Falls back to blueprint fixtures (clearly flagged isBlueprint)
 * only when the real query returns zero rows or the underlying table isn't
 * applied yet — never mixed silently with real data.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });
  if (!hasSupabaseServiceRoleKey()) return NextResponse.json({ ok: false, reason: "service_unavailable" }, { status: 503 });

  const authClient = await createServerSupabaseClient();
  const { data: profile } = await authClient.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || profile.role !== "super_admin") return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });

  const surface = req.nextUrl.searchParams.get("surface");
  const adminDb = createRequiredSupabaseAdminClient();

  if (surface === "agency") {
    try {
      const { data } = await adminDb.from("agency_workspaces").select("id, name").eq("status", "active").limit(200);
      const rows: WorkspaceOption[] = (data ?? []).map((a) => ({ id: a.id as string, name: a.name as string, isBlueprint: false }));
      if (rows.length > 0) return NextResponse.json({ ok: true, options: rows });
    } catch { /* agency_workspaces pode não existir ainda */ }
    return NextResponse.json({ ok: true, options: [{ id: BLUEPRINT_AGENCY.id, name: BLUEPRINT_AGENCY.name, isBlueprint: true }] });
  }

  if (surface === "direct_business") {
    // Fase 1/2 do hotfix 1.0.4 — este ramo ANTES listava toda linha de
    // `clients` sem vínculo em `agency_clients` como "empresa direta". Isso
    // é uma inferência, não uma classificação: um cliente real pode não ter
    // vínculo simplesmente porque agency_clients ainda não foi populada (é
    // exatamente o caso hoje), não porque ele É uma empresa direta de
    // verdade. Resultado real em QA: Duh Lanches e O Pedreirão (clientes
    // reais de produção) apareceram no seletor demonstrativo, e o blueprint
    // nunca era alcançado porque `directRows.length > 0` sempre vencia.
    //
    // Não existe hoje nenhum campo confiável de classificação "isto é uma
    // empresa direta" (profiles.account_type, quando aplicado, classifica o
    // dono da conta, não a linha de clients, e sua aplicação real no banco
    // não está confirmada — ver docs/workspace-provisioning-plan.md). Sem
    // essa classificação, e sem poder rodar SQL nesta sprint, a única opção
    // segura é nunca listar clients reais aqui — somente o blueprint.
    return NextResponse.json({ ok: true, options: [{ id: BLUEPRINT_DIRECT_BUSINESS.id, name: BLUEPRINT_DIRECT_BUSINESS.name, isBlueprint: true }] });
  }

  if (surface === "agency_client") {
    const agencyId = req.nextUrl.searchParams.get("agency_id");
    if (!agencyId || agencyId === BLUEPRINT_AGENCY.id) {
      return NextResponse.json({
        ok: true,
        options: BLUEPRINT_AGENCY_CLIENTS.map((c) => ({ id: c.id, name: c.name, isBlueprint: true, parentName: c.parentName })),
      });
    }
    try {
      const { data: links } = await adminDb.from("agency_clients").select("client_id").eq("agency_id", agencyId).eq("status", "active").limit(500);
      const clientIds = (links ?? []).map((l) => l.client_id as string);
      if (clientIds.length === 0) return NextResponse.json({ ok: true, options: [] });
      const { data: clients } = await adminDb.from("clients").select("id, company_name").in("id", clientIds);
      const rows: WorkspaceOption[] = (clients ?? []).map((c) => ({ id: c.id as string, name: c.company_name as string, isBlueprint: false, parentId: agencyId }));
      return NextResponse.json({ ok: true, options: rows });
    } catch {
      return NextResponse.json({ ok: true, options: [] });
    }
  }

  return NextResponse.json({ ok: false, reason: "invalid_surface" }, { status: 400 });
}
