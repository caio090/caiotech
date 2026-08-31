/**
 * Sprint REC OS Studio Foundation V0.1 — Runtime interface, NÃO executor.
 * Espelha isAgentRuntimeAvailable() (neural-core/agents.ts): nesta
 * Foundation nenhuma skill tem runtime real, então execute() SEMPRE
 * retorna o estado explícito STUDIO_SKILL_RUNTIME_NOT_CONNECTED --
 * nunca chama OpenAI, Responses API, provider de imagem, Jarvis ou
 * Gota Neural. Mantido como API real (não omitida) para que a sprint
 * que conectar um executor de verdade tenha um único ponto a
 * substituir, sem qualquer caller precisando mudar de forma.
 */
import type { StudioBriefInput } from "./types";

export const STUDIO_SKILL_RUNTIME_NOT_CONNECTED = "STUDIO_SKILL_RUNTIME_NOT_CONNECTED" as const;

export interface StudioSkillExecutionResult {
  status: "not_connected";
  code: typeof STUDIO_SKILL_RUNTIME_NOT_CONNECTED;
  message: string;
  output: null;
}

export interface StudioSkillRuntime {
  skillId: string;
  execute(input: StudioBriefInput): Promise<StudioSkillExecutionResult>;
}

export function createNotConnectedRuntime(skillId: string): StudioSkillRuntime {
  return {
    skillId,
    async execute() {
      return {
        status: "not_connected",
        code: STUDIO_SKILL_RUNTIME_NOT_CONNECTED,
        message: `A skill "${skillId}" ainda não tem runtime de IA conectado nesta Foundation.`,
        output: null,
      };
    },
  };
}
