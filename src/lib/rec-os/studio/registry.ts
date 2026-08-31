/**
 * Sprint REC OS Studio Foundation V0.1 — Studio Skill Registry.
 * Espelha AGENT_REGISTRY (neural-core/agents.ts): metadata apenas,
 * nenhuma skill executa IA real. Permite novas skills futuramente sem
 * reescrever o Studio -- a UI consome getStudioSkills()/findStudioSkill(),
 * nunca hardcoda "Vidigal PNG" diretamente.
 */
import type { StudioSkillDefinition } from "./types";
import { VIDIGAL_PNG_SKILL } from "./skills/vidigal-png";

export const STUDIO_SKILL_REGISTRY: readonly StudioSkillDefinition[] = [
  VIDIGAL_PNG_SKILL,
] as const;

export function getStudioSkills(): readonly StudioSkillDefinition[] {
  return STUDIO_SKILL_REGISTRY;
}

export function findStudioSkill(id: string): StudioSkillDefinition | undefined {
  return STUDIO_SKILL_REGISTRY.find((skill) => skill.id === id);
}

/** "available_contract" significa só que a definição existe e pode ser
 *  referenciada -- nunca que roda de verdade. Ver isStudioSkillRuntimeAvailable(). */
export function isStudioSkillContractAvailable(skill: StudioSkillDefinition): boolean {
  return skill.status === "available_contract";
}

/** Nesta Foundation NENHUMA skill tem runtime real. Sempre retorna
 *  false; mantida como API explícita para que a sprint que conectar um
 *  runtime de verdade tenha um único ponto a atualizar. */
export function isStudioSkillRuntimeAvailable(skill: StudioSkillDefinition): boolean {
  void skill;
  return false;
}
