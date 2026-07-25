import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createServerSupabaseClient, createRequiredSupabaseAdminClient, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";
import { BLUEPRINT_AGENCY, BLUEPRINT_AGENCY_CLIENTS, BLUEPRINT_DIRECT_BUSINESS } from "@/lib/workspaces/blueprint-fixtures";
import type { WorkspaceRelationshipType, WorkspaceSurface } from "@/lib/workspaces/types";

export type WorkspaceOptionSource = "blueprint" | "real";

export interface WorkspaceOption {
  id: string;
  name: string;
  surface: WorkspaceSurface;
  source: WorkspaceOptionSource;
  isBlueprint: boolean;
  parentWorkspaceId: string | null;
  parentWorkspaceName: string | null;
  relationshipType: WorkspaceRelationshipType | null;
  status: string;
  readOnly: boolean;
}

/**
 * Fase 1-5 do hotfix 1.0.5 — causa raiz confirmada do P1 "Nenhum registro
 * encontrado" para os três blueprints: esta rota checava
 * hasSupabaseServiceRoleKey() e retornava 503 ANTES de sequer olhar para
 * surface/source, para TODA superfície — inclusive as que só retornam
 * fixtures locais e nunca tocam o Supabase. Sem SUPABASE_SERVICE_ROLE_KEY
 * configurada neste ambiente (confirmado: 0 ocorrências em .env.local), todo
 * GET batia nesse 503, e o switcher (fetchOptions()) convertia qualquer
 * ok:false em options:[] silenciosamente — indistinguível de uma lista
 * genuinamente vazia. Nenhuma fixture jamais teve chance de ser retornada.
 *
 * Contrato novo (Fase 4): ?source=blueprint (padrão) nunca consulta o
 * Supabase e nunca depende de service role key. ?source=real exige sessão
 * super_admin (já validada acima) MAIS a service role key, e é a única
 * combinação que consulta agency_workspaces/agency_clients/clients.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

  // Sessão normal (chave anon + RLS) — nunca exige service role key. Isto
  // basta para confirmar super_admin e servir qualquer resposta blueprint.
  const authClient = await createServerSupabaseClient();
  const { data: profile } = await authClient.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || profile.role !== "super_admin") return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });

  const surface = req.nextUrl.searchParams.get("surface") as WorkspaceSurface | null;
  // "source=blueprint" é o padrão explícito desta sprint — o modo real só
  // roda quando pedido de propósito (?source=real), nunca por omissão.
  const source: WorkspaceOptionSource = req.nextUrl.searchParams.get("source") === "real" ? "real" : "blueprint";

  if (surface === "agency") {
    if (source === "blueprint") {
      return NextResponse.json({
        ok: true,
        source: "blueprint",
        options: [{
          id: BLUEPRINT_AGENCY.id, name: BLUEPRINT_AGENCY.name, surface: "agency", source: "blueprint",
          isBlueprint: true, parentWorkspaceId: null, parentWorkspaceName: null, relationshipType: null,
          status: BLUEPRINT_AGENCY.connectionState, readOnly: true,
        } satisfies WorkspaceOption],
      });
    }
    if (!hasSupabaseServiceRoleKey()) return NextResponse.json({ ok: false, reason: "service_unavailable" }, { status: 503 });
    try {
      const adminDb = createRequiredSupabaseAdminClient();
      const { data } = await adminDb.from("agency_workspaces").select("id, name").eq("status", "active").limit(200);
      const rows: WorkspaceOption[] = (data ?? []).map((a) => ({
        id: a.id as string, name: a.name as string, surface: "agency", source: "real",
        isBlueprint: false, parentWorkspaceId: null, parentWorkspaceName: null, relationshipType: null,
        status: "active", readOnly: true,
      }));
      return NextResponse.json({ ok: true, source: "real", options: rows });
    } catch {
      return NextResponse.json({ ok: false, reason: "real_source_unavailable" }, { status: 503 });
    }
  }

  if (surface === "direct_business") {
    if (source === "blueprint") {
      return NextResponse.json({
        ok: true,
        source: "blueprint",
        options: [{
          id: BLUEPRINT_DIRECT_BUSINESS.id, name: BLUEPRINT_DIRECT_BUSINESS.name, surface: "direct_business", source: "blueprint",
          isBlueprint: true, parentWorkspaceId: null, parentWorkspaceName: null, relationshipType: null,
          status: BLUEPRINT_DIRECT_BUSINESS.connectionState, readOnly: true,
        } satisfies WorkspaceOption],
      });
    }
    // Fase 1/2 do hotfix 1.0.4, preservada: nenhuma classificação confiável
    // de "empresa direta real" existe hoje — recusa explícita, nunca uma
    // lista vazia silenciosa nem uma inferência a partir de clients.
    return NextResponse.json({ ok: false, reason: "direct_business_real_not_yet_classified" }, { status: 400 });
  }

  if (surface === "agency_client") {
    const agencyId = req.nextUrl.searchParams.get("agency_id");
    if (source === "blueprint" || !agencyId || agencyId === BLUEPRINT_AGENCY.id) {
      return NextResponse.json({
        ok: true,
        source: "blueprint",
        options: BLUEPRINT_AGENCY_CLIENTS.map((c): WorkspaceOption => ({
          id: c.id, name: c.name, surface: "agency_client", source: "blueprint",
          isBlueprint: true, parentWorkspaceId: BLUEPRINT_AGENCY.id, parentWorkspaceName: BLUEPRINT_AGENCY.name,
          relationshipType: "managed_client", status: c.connectionState, readOnly: true,
        })),
      });
    }
    if (!hasSupabaseServiceRoleKey()) return NextResponse.json({ ok: false, reason: "service_unavailable" }, { status: 503 });
    try {
      const adminDb = createRequiredSupabaseAdminClient();
      const { data: links } = await adminDb.from("agency_clients").select("client_id").eq("agency_id", agencyId).eq("status", "active").limit(500);
      const clientIds = (links ?? []).map((l) => l.client_id as string);
      if (clientIds.length === 0) return NextResponse.json({ ok: true, source: "real", options: [] });
      const { data: clients } = await adminDb.from("clients").select("id, company_name").in("id", clientIds);
      const rows: WorkspaceOption[] = (clients ?? []).map((c) => ({
        id: c.id as string, name: c.company_name as string, surface: "agency_client", source: "real",
        isBlueprint: false, parentWorkspaceId: agencyId, parentWorkspaceName: null, relationshipType: "managed_client",
        status: "active", readOnly: true,
      }));
      return NextResponse.json({ ok: true, source: "real", options: rows });
    } catch {
      return NextResponse.json({ ok: false, reason: "real_source_unavailable" }, { status: 503 });
    }
  }

  return NextResponse.json({ ok: false, reason: "invalid_surface" }, { status: 400 });
}
