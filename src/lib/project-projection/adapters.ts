/**
 * Sprint MVP Dogfood Spine V0.1 (Bloco C, Fase 14-15) — Project adapters.
 * Padrão: Domain Source -> Adapter -> ProjectProjection. `rec_projects`
 * continua sendo a source-of-truth (nenhuma mutação passa por aqui) --
 * `getProjectProjections()` só lê, nunca escreve.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DbRecProject } from "@/lib/supabase/types";
import type { ProjectProjection } from "./types";

/** Fase 15 — adapter puro, testável sem banco. */
export function projectFromRecProject(row: DbRecProject): ProjectProjection {
  return {
    id: `rec_projects:${row.id}`,
    companyId: row.client_id ?? "",
    title: row.title,
    description: row.objective,
    status: row.status,
    planningLevel: null, // rec_projects não carrega planning level -- nunca inventado (Fase 35).
    startAt: null,
    dueAt: row.recording_date,
    owner: row.team && row.team.length > 0 ? row.team[0] : null,
    sourceModule: "rec_projects",
    sourceEntityType: "rec_project",
    sourceEntityId: row.id,
    sourceUrl: `/admin/recos/${row.id}`,
    metrics: null,
    workSummary: null,
    updatedAt: row.updated_at,
  };
}

/**
 * Fase 14 — só adapta rec_projects que de fato pertencem à Company pedida.
 * Nunca retorna projeto sem companyId (Fase 24/48: isolamento entre
 * companies vale também aqui -- um rec_project sem client_id não pertence
 * a nenhuma Company e não pode ser exibido como se pertencesse).
 */
export async function getProjectProjections(
  adminDb: SupabaseClient,
  companyId: string,
): Promise<ProjectProjection[]> {
  const { data, error } = await adminDb
    .from("rec_projects")
    .select("id, client_id, title, project_type, objective, style, duration_estimate, location, status, team, recording_date, notes, created_by, created_at, updated_at, metadata")
    .eq("client_id", companyId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as DbRecProject[])
    .filter((row) => row.client_id === companyId)
    .map(projectFromRecProject);
}

export async function getProjectProjection(
  adminDb: SupabaseClient,
  companyId: string,
  projectId: string,
): Promise<ProjectProjection | null> {
  const projects = await getProjectProjections(adminDb, companyId);
  return projects.find((p) => p.id === projectId || p.sourceEntityId === projectId) ?? null;
}
