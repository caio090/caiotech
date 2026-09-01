/**
 * Sprint REC OS Studio Foundation V0.1/V0.2 — contratos de execução do
 * Studio. Domínio puro (sem I/O, sem import de provider) -- a chamada
 * real ao provider fica isolada em ./skills/vidigal-png/neural-executor.ts,
 * o único arquivo do domínio Studio que sabe que OpenAI existe.
 *
 * V0.2 evolui StudioSkillExecutionResult (era só o caso "not_connected")
 * para o contrato completo de execução real. `createNotConnectedRuntime`
 * continua existindo -- agora é o fallback explícito quando o provider
 * não está configurado (runtimeStatus continua refletindo essa
 * distinção; "available_contract" nunca implicou "roda de verdade").
 */
import type { StudioBriefInput } from "./types";

export const STUDIO_SKILL_RUNTIME_NOT_CONNECTED = "STUDIO_SKILL_RUNTIME_NOT_CONNECTED" as const;

export type StudioSkillExecutionStatus =
  | "idle"
  | "executing"
  | "completed"
  | "failed"
  | "runtime_unavailable"
  | "invalid_input"
  | "unauthorized_context";

export type StudioSkillErrorCode =
  | "STUDIO_SKILL_NOT_FOUND"
  | "STUDIO_SKILL_RUNTIME_UNAVAILABLE"
  | "STUDIO_SKILL_INVALID_INPUT"
  | "STUDIO_SKILL_OUTPUT_INVALID"
  | "STUDIO_COMPANY_CONTEXT_REQUIRED"
  | "STUDIO_COMPANY_CONTEXT_UNAUTHORIZED"
  | "STUDIO_AI_PROVIDER_UNAVAILABLE";

/**
 * Fase 5 — nunca inventar dado ausente. Cada campo é só o que está
 * genuinamente disponível a partir do contexto canônico já resolvido
 * pelo caller (ResolvedCompanyContext/CanonicalBusinessContext) --
 * nunca preenchido com exemplo, nunca um cliente hardcoded. `brand`/
 * `initiative` (posicionamento, projeto, campanha) NÃO têm resolver
 * canônico identificado nesta auditoria -- omitidos aqui em vez de
 * inventados; ver riscos/dívida técnica do relatório desta sprint.
 */
export interface StudioSkillBusinessContext {
  company: { id: string; name: string | null } | null;
}

export interface StudioSkillExecutionRequest {
  skillId: string;
  input: StudioBriefInput;
  context: StudioSkillBusinessContext;
}

export interface StudioSkillExecutionResult<TOutput = unknown> {
  skillId: string;
  skillVersion: string | null;
  /** Rótulo do runtime que de fato respondeu -- dado de execução, nunca
   *  uma dependência estática do manifesto da skill (Fase "Vidigal PNG
   *  não conhece provider"). */
  runtime: "not_connected" | "openai_responses_api";
  status: StudioSkillExecutionStatus;
  output: TOutput | null;
  warnings: string[];
  error?: { code: StudioSkillErrorCode; message: string };
  generatedAt: string;
}

export interface StudioSkillRuntime {
  skillId: string;
  execute(request: StudioSkillExecutionRequest): Promise<StudioSkillExecutionResult>;
}

/** Espelha isAgentRuntimeAvailable() (neural-core/agents.ts): usado
 *  quando o provider configurável não está disponível (sem API key,
 *  etc.) -- nunca chama nenhum provider, sempre retorna o mesmo estado
 *  explícito. */
export function createNotConnectedRuntime(skillId: string): StudioSkillRuntime {
  return {
    skillId,
    async execute() {
      return {
        skillId,
        skillVersion: null,
        runtime: "not_connected",
        status: "runtime_unavailable",
        output: null,
        warnings: [],
        error: { code: "STUDIO_AI_PROVIDER_UNAVAILABLE", message: `A skill "${skillId}" não tem um provider de IA configurado no servidor.` },
        generatedAt: new Date().toISOString(),
      };
    },
  };
}
