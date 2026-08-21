/**
 * REC OS GROWTH PLANNER V1 FOUNDATION — contrato futuro do
 * rec_os_projection_engine ("qual projeção e cenário esperado?").
 * Explicitamente SÓ contrato nesta missão: "NÃO implementar cálculo
 * real" -- estimateProjection() nunca calcula nada, sempre retorna
 * status not_implemented, nunca um número inventado.
 *
 * Motor compartilhado por Growth Planner e Paid Traffic Planner quando
 * ambos existirem de verdade -- nunca uma fórmula duplicada por
 * submódulo (mesmo princípio já registrado em platform-modules.ts,
 * rec_os_projection_engine).
 */
import type { GrowthObjective } from "./types";

export interface ProjectionEngineInput {
  investment: number;
  averageTicket: number;
  objective: GrowthObjective;
}

/** Forma final ainda não decidida -- placeholder de shape, nunca preenchido nesta fundação. */
export interface ProjectionScenario {
  label: string;
  estimatedReach: number | null;
  estimatedResult: number | null;
}

export type ProjectionEngineStatus = "not_implemented";

export interface ProjectionEngineOutput {
  scenarios: ProjectionScenario[];
  status: ProjectionEngineStatus;
  honestNotice: string;
}

/**
 * Sempre retorna not_implemented -- nunca simula um cálculo. Existe só
 * para que os chamadores (Growth Planner) já tenham o contrato real para
 * integrar quando o motor for construído, sem precisar mudar a
 * assinatura depois.
 */
export function estimateProjection(_input: ProjectionEngineInput): ProjectionEngineOutput {
  return {
    scenarios: [],
    status: "not_implemented",
    honestNotice: "Projection Engine ainda não foi implementado -- nenhuma estimativa numérica é gerada nesta fundação.",
  };
}
