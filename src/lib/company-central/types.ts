/**
 * Sprint MVP Dogfood Spine V0.1 (Bloco D, Fase 28-34) — Company Central.
 * COCKPIT/PROJECTION -- agrega dados já buscados, nunca banco próprio,
 * nunca source-of-truth. `buildCompanyCentralView()` é um builder puro
 * (Fase 52: "sem fetch escondido em builder puro").
 */
import type { ProjectProjection } from "@/lib/project-projection/types";
import type { WorkItemProjection } from "@/lib/work-item-projection/types";
import type { WorkspaceSurface } from "@/lib/workspaces/types";

export interface CompanyCentralIdentity {
  companyId: string;
  companyName: string | null;
  surface: WorkspaceSurface;
}

export interface CompanyCentralModuleShortcut {
  label: string;
  href: string;
}

export interface CompanyCentralWorkSummary {
  pendingCount: number;
  approvalsCount: number;
  todayCount: number;
  overdueCount: number;
}

export interface CompanyCentralView {
  identity: CompanyCentralIdentity;
  /** Fase 31 — "Hoje / Precisa de atenção", já ordenado por urgência (overdue primeiro). */
  attention: WorkItemProjection[];
  /** Fase 32 — projetos com status considerado ativo. */
  activeProjects: ProjectProjection[];
  /** Fase 33 — só presente quando os dados existirem (nunca métrica inventada). */
  workSummary: CompanyCentralWorkSummary;
  moduleShortcuts: CompanyCentralModuleShortcut[];
  hasProjects: boolean;
  hasWork: boolean;
}
