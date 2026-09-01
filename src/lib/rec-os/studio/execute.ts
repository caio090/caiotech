/**
 * Sprint REC OS Studio Foundation V0.2 — dispatcher de execução do
 * Studio. Importa o executor real da Vidigal PNG diretamente (não via
 * ./skills/vidigal-png/index.ts) -- mesmo cuidado de registry.ts, para
 * que só quem realmente PRECISA executar (a rota da API) arraste o SDK
 * do provider para o bundle. Nunca importado por ./index.ts (barrel de
 * listagem) nem pela UI que só lista skills.
 */
import { findStudioSkill } from "./registry";
import type { StudioSkillExecutionRequest, StudioSkillExecutionResult } from "./runtime";
import { executeVidigalPng } from "./skills/vidigal-png/neural-executor";

export async function executeStudioSkill(request: StudioSkillExecutionRequest): Promise<StudioSkillExecutionResult> {
  const skill = findStudioSkill(request.skillId);
  if (!skill) {
    return {
      skillId: request.skillId, skillVersion: null, runtime: "not_connected", status: "failed",
      output: null, warnings: [],
      error: { code: "STUDIO_SKILL_NOT_FOUND", message: `Skill "${request.skillId}" não encontrada no Studio Skill Registry.` },
      generatedAt: new Date().toISOString(),
    };
  }

  // Único dispatch real hoje -- extensível sem reescrever o Studio: uma
  // skill nova só precisa de um novo `case` aqui, nunca uma nova rota.
  switch (skill.id) {
    case "vidigal_png":
      return executeVidigalPng(skill, request);
    default:
      return {
        skillId: skill.id, skillVersion: skill.version, runtime: "not_connected", status: "runtime_unavailable",
        output: null, warnings: [],
        error: { code: "STUDIO_SKILL_RUNTIME_UNAVAILABLE", message: `Skill "${skill.id}" ainda não tem executor implementado.` },
        generatedAt: new Date().toISOString(),
      };
  }
}
