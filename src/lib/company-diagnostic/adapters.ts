/**
 * Sprint MVP Core Closure V2 (Fase 3/6) — leitura real do schema proposto
 * em docs/supabase/91-company-diagnostic-roadmap.sql. Nenhuma escrita
 * nesta sprint (o schema ainda não foi aplicado -- ver Fase 6 "schema
 * gate"): só as queries de leitura, que já funcionam corretamente nos
 * dois mundos (antes e depois da migration ser aplicada) sem precisar de
 * nenhuma mudança de código depois.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CompanyDiagnostic, DiagnosticChecklistItem, DiagnosticFinding, DiagnosticRecommendation,
  RoadmapItem, SourceFetchResult,
} from "./types";

interface CompanyDiagnosticRow {
  id: string; client_id: string; status: string;
  niche_category: string | null; niche_subcategory: string | null;
  operation_type: "b2b" | "b2c" | "both" | null;
  location_city: string | null; location_state: string | null;
  created_at: string; updated_at: string; completed_at: string | null;
}

function mapDiagnostic(row: CompanyDiagnosticRow): CompanyDiagnostic {
  return {
    id: row.id, companyId: row.client_id, status: row.status as CompanyDiagnostic["status"],
    nicheCategory: row.niche_category, nicheSubcategory: row.niche_subcategory,
    operationType: row.operation_type, locationCity: row.location_city, locationState: row.location_state,
    createdAt: row.created_at, updatedAt: row.updated_at, completedAt: row.completed_at,
  };
}

/**
 * Fase 27 — o Painel da Empresa precisa saber, de forma honesta, se deve
 * mostrar "Iniciar diagnóstico" (available, null) ou um estado de
 * indisponibilidade real (unavailable) -- nunca zero fabricado.
 */
export async function getLatestCompanyDiagnostic(
  adminDb: SupabaseClient,
  companyId: string,
): Promise<SourceFetchResult<CompanyDiagnostic | null>> {
  try {
    const { data, error } = await adminDb
      .from("company_diagnostics")
      .select("id, client_id, status, niche_category, niche_subcategory, operation_type, location_city, location_state, created_at, updated_at, completed_at")
      .eq("client_id", companyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return { status: "unavailable" };
    return { status: "available", data: data ? mapDiagnostic(data as CompanyDiagnosticRow) : null };
  } catch {
    return { status: "unavailable" };
  }
}

export async function getDiagnosticChecklist(
  adminDb: SupabaseClient,
  diagnosticId: string,
): Promise<SourceFetchResult<DiagnosticChecklistItem[]>> {
  try {
    const { data, error } = await adminDb
      .from("diagnostic_checklist_items")
      .select("id, diagnostic_id, category, label, status, notes, evidence_url")
      .eq("diagnostic_id", diagnosticId);
    if (error) return { status: "unavailable" };
    return {
      status: "available",
      data: (data ?? []).map((r) => ({
        id: r.id, diagnosticId: r.diagnostic_id, category: r.category, label: r.label,
        status: r.status, notes: r.notes, evidenceUrl: r.evidence_url,
      })),
    };
  } catch {
    return { status: "unavailable" };
  }
}

export async function getCompanyFindings(
  adminDb: SupabaseClient,
  companyId: string,
): Promise<SourceFetchResult<DiagnosticFinding[]>> {
  try {
    const { data, error } = await adminDb
      .from("diagnostic_findings")
      .select("id, diagnostic_id, client_id, category, title, description, evidence_url, severity, priority, status, source")
      .eq("client_id", companyId)
      .neq("status", "ignored")
      .order("priority", { ascending: false });
    if (error) return { status: "unavailable" };
    return {
      status: "available",
      data: (data ?? []).map((r) => ({
        id: r.id, diagnosticId: r.diagnostic_id, companyId: r.client_id, category: r.category,
        title: r.title, description: r.description, evidenceUrl: r.evidence_url,
        severity: r.severity, priority: r.priority, status: r.status, source: r.source,
      })),
    };
  } catch {
    return { status: "unavailable" };
  }
}

export async function getFindingRecommendations(
  adminDb: SupabaseClient,
  findingId: string,
): Promise<SourceFetchResult<DiagnosticRecommendation[]>> {
  try {
    const { data, error } = await adminDb
      .from("diagnostic_recommendations")
      .select("id, finding_id, title, description, capability")
      .eq("finding_id", findingId);
    if (error) return { status: "unavailable" };
    return {
      status: "available",
      data: (data ?? []).map((r) => ({ id: r.id, findingId: r.finding_id, title: r.title, description: r.description, capability: r.capability })),
    };
  } catch {
    return { status: "unavailable" };
  }
}

/** Fase 19/20 — Roadmap real e Company-scoped, nunca lista demonstrativa. */
export async function getCompanyRoadmap(
  adminDb: SupabaseClient,
  companyId: string,
): Promise<SourceFetchResult<RoadmapItem[]>> {
  try {
    const { data, error } = await adminDb
      .from("roadmap_items")
      .select("id, client_id, source_type, source_id, title, priority, status, destination_capability, due_date, project_id")
      .eq("client_id", companyId)
      .order("priority", { ascending: false });
    if (error) return { status: "unavailable" };
    return {
      status: "available",
      data: (data ?? []).map((r) => ({
        id: r.id, companyId: r.client_id, sourceType: r.source_type, sourceId: r.source_id,
        title: r.title, priority: r.priority, status: r.status,
        destinationCapability: r.destination_capability, dueDate: r.due_date, projectId: r.project_id,
      })),
    };
  } catch {
    return { status: "unavailable" };
  }
}
