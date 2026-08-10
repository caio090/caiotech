/**
 * Sprint MVP Dogfood Spine V0.1 (Bloco C, Fase 13) — Project Projection.
 * READ MODEL sobre fontes reais existentes -- nunca uma tabela nova, nunca
 * source-of-truth. `rec_projects` (produção audiovisual) é a única fonte
 * real com vínculo de company + status confirmada pela auditoria (Fase 4);
 * outras fontes podem ser adaptadas no futuro sem quebrar este contrato.
 */
import type { PlanningLevel } from "@/lib/neural-core/planning";

export type ProjectSourceModule = "rec_projects";

export interface ProjectProjection {
  /** Projection-safe id, derivado da identidade da source (Fase 13) -- nunca um id inventado. */
  id: string;
  companyId: string;
  title: string;
  description: string | null;
  status: string;
  planningLevel: PlanningLevel | null;
  startAt: string | null;
  dueAt: string | null;
  owner: string | null;
  sourceModule: ProjectSourceModule;
  sourceEntityType: "rec_project";
  sourceEntityId: string;
  sourceUrl: string;
  metrics: null;
  workSummary: null;
  updatedAt: string;
}
