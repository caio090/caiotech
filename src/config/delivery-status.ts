/**
 * Sprint Recovery 2.1.3 — camada de execução sobre `project-status.ts`:
 * prioridade, prazo, bloqueio de release e estágios de validação
 * obrigatórios por módulo. Nenhuma dessas dimensões substitui `readiness`
 * (estado do código) — elas descrevem o PROCESSO de entrega, não o estado
 * técnico. "Código pronto" e "produto validado" são coisas diferentes.
 *
 * `resolveDeliveryStatus()` é o único lugar que decide se uma área está
 * atrasada — nunca marcar `overdue` manualmente. Recebe a data de
 * referência como parâmetro (nunca `Date.now()` internamente) para nunca
 * divergir entre servidor e cliente (Fase 8 — nunca reintroduzir o
 * mismatch de hidratação React #418 já corrigido em sprints anteriores).
 */

export type DeliveryPriority = "P0" | "P1" | "P2" | "P3";

export type DeliveryStatus =
  | "completed"
  | "on_track"
  | "at_risk"
  | "overdue"
  | "blocked"
  | "waiting_validation"
  | "planned";

export type ValidationStage =
  | "code_review"
  | "unit_test"
  | "structural_test"
  | "local_smoke"
  | "authenticated_local_qa"
  | "production_build"
  | "official_domain_qa"
  | "real_data_validation"
  | "integration_validation";

export const VALIDATION_STAGE_LABEL: Record<ValidationStage, string> = {
  code_review: "Revisão de código",
  unit_test: "Teste unitário",
  structural_test: "Teste estrutural",
  local_smoke: "Smoke local",
  authenticated_local_qa: "QA autenticado local",
  production_build: "Build de produção",
  official_domain_qa: "QA no domínio oficial",
  real_data_validation: "Validação com dado real",
  integration_validation: "Validação de integração",
};

/** Interface mínima que uma entrada de project-status.ts precisa expor para o resolver — evita import circular. */
export interface DeliveryExecutionFields {
  readiness: string;
  targetDate?: string;
  statusDate?: string;
  releaseBlocker?: boolean;
  blockers?: string[];
  validationRequired?: ValidationStage[];
  validationEvidence?: string;
}

/**
 * Dias de atraso — nunca negativo (Fase 28: "não mostrar atraso
 * negativo"). Retorna `null` quando não há `targetDate` ou quando a área
 * já está no prazo.
 */
export function computeOverdueDays(targetDate: string | undefined, referenceDateIso: string): number | null {
  if (!targetDate) return null;
  const target = new Date(`${targetDate}T00:00:00Z`).getTime();
  const reference = new Date(`${referenceDateIso}T00:00:00Z`).getTime();
  if (!Number.isFinite(target) || !Number.isFinite(reference)) return null;
  const diffDays = Math.floor((reference - target) / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : null;
}

const AT_RISK_WINDOW_DAYS = 2;

/**
 * Único resolvedor de status de entrega. `referenceDateIso` deve vir de
 * uma data explícita (nunca `Date.now()` direto durante render) — Fase 8.
 */
export function resolveDeliveryStatus(area: DeliveryExecutionFields, referenceDateIso: string): DeliveryStatus {
  if (area.readiness === "validated") return "completed";
  if (area.releaseBlocker || (area.blockers && area.blockers.length > 0)) return "blocked";

  if (area.validationRequired && area.validationRequired.length > 0 && !area.validationEvidence) {
    return "waiting_validation";
  }

  const overdueDays = computeOverdueDays(area.targetDate, referenceDateIso);
  if (overdueDays !== null) return "overdue";

  if (area.targetDate) {
    const target = new Date(`${area.targetDate}T00:00:00Z`).getTime();
    const reference = new Date(`${referenceDateIso}T00:00:00Z`).getTime();
    const daysUntilTarget = Math.floor((target - reference) / (1000 * 60 * 60 * 24));
    if (Number.isFinite(daysUntilTarget) && daysUntilTarget >= 0 && daysUntilTarget <= AT_RISK_WINDOW_DAYS) return "at_risk";
    return "on_track";
  }

  return "planned";
}

/** Ordenação recomendada do painel de status (Fase 27) — P0 bloqueado primeiro, concluídos por último. */
const PRIORITY_ORDER: Record<DeliveryPriority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
const STATUS_ORDER: Record<DeliveryStatus, number> = {
  blocked: 0, overdue: 1, waiting_validation: 2, at_risk: 3, planned: 4, on_track: 5, completed: 6,
};

export function compareForStatusPanel(
  a: { priority?: DeliveryPriority; status: DeliveryStatus },
  b: { priority?: DeliveryPriority; status: DeliveryStatus }
): number {
  const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
  if (statusDiff !== 0) return statusDiff;
  const priorityDiff = PRIORITY_ORDER[a.priority ?? "P3"] - PRIORITY_ORDER[b.priority ?? "P3"];
  return priorityDiff;
}

// ── Marco de recuperação do MVP (Fase 9) ────────────────────────────────────

export interface MvpRecoveryCheckpoint {
  date: string; // YYYY-MM-DD
  label: string;
  description: string;
  completed: false; // nunca nasce concluído — Fase 9: "Não marcá-las concluídas antes de evidência."
}

export const MVP_INTERNO_AGOSTO_2026 = {
  id: "MVP_INTERNO_AGOSTO_2026",
  targetDate: "2026-08-07",
  objective:
    "Iniciar o uso diário interno da LokatOS em ambiente oficial, com Super ADM, Meu Negócio, REC OS, Workspaces e módulos essenciais navegáveis e validados.",
} as const;

export const MVP_RECOVERY_CHECKPOINTS: MvpRecoveryCheckpoint[] = [
  { date: "2026-08-01", label: "QA autenticado local completo", description: "QA autenticado local completo.", completed: false },
  { date: "2026-08-02", label: "Correção P0/P1", description: "Correção dos problemas P0 e P1.", completed: false },
  { date: "2026-08-03", label: "Reexecução do QA local", description: "Reexecução do QA local e fechamento dos problemas críticos.", completed: false },
  { date: "2026-08-04", label: "Integração final", description: "Integração final e push exclusivo da main.", completed: false },
  { date: "2026-08-05", label: "Deployment Production", description: "Deployment Production e QA no domínio www.lokat.com.br.", completed: false },
  { date: "2026-08-06", label: "Provisionamento controlado", description: "Provisionamento controlado dos ambientes de teste.", completed: false },
  { date: "2026-08-07", label: "Início do uso diário interno", description: "Início do uso diário interno do MVP.", completed: false },
];

// ── Matriz de validação por módulo (Fase 10) ────────────────────────────────

export interface ModuleValidationRequirement {
  moduleId: string;
  moduleName: string;
  requiredStages: ValidationStage[];
}

export const MODULE_VALIDATION_REQUIREMENTS: ModuleValidationRequirement[] = [
  { moduleId: "workspaces_core", moduleName: "Workspaces", requiredStages: ["unit_test", "local_smoke", "authenticated_local_qa", "official_domain_qa"] },
  { moduleId: "business_strategy_workspace", moduleName: "DNA & Estratégia", requiredStages: ["structural_test", "authenticated_local_qa", "official_domain_qa"] },
  { moduleId: "global_calendar_google", moduleName: "Google Calendar", requiredStages: ["integration_validation", "official_domain_qa", "real_data_validation"] },
];
