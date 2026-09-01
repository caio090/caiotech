/**
 * Sprint REC OS Studio Foundation V0.1/V0.2 — Studio Skill Registry.
 * Espelha AGENT_REGISTRY (neural-core/agents.ts): metadata apenas.
 * Permite novas skills futuramente sem reescrever o Studio -- a UI
 * consome getStudioSkills()/findStudioSkill(), nunca hardcoda "Vidigal
 * PNG" diretamente.
 *
 * Importa VIDIGAL_PNG_SKILL diretamente de ./skills/vidigal-png/manifest
 * (NUNCA do barrel ./skills/vidigal-png/index.ts) -- o barrel reexporta
 * neural-executor.ts, que importa o SDK do provider. Este arquivo
 * precisa continuar seguro de importar de qualquer lugar que só queira
 * LISTAR skills (ex.: a página do Studio) sem arrastar o SDK de IA para
 * dentro desse bundle. A execução de fato vive em ./execute.ts,
 * importado só pela rota da API.
 */
import type { StudioSkillDefinition } from "./types";
import { VIDIGAL_PNG_SKILL } from "./skills/vidigal-png/manifest";

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

/**
 * V0.2 — "roda de verdade AGORA" exige duas coisas: (1) a skill tem um
 * executor real ligado (`runtimeStatus === "connected"`, declarado no
 * manifesto) E (2) o provider está configurado neste ambiente (mesma
 * checagem de isVidigalTextRuntimeConfigured() em
 * ./skills/vidigal-png/neural-executor.ts -- duplicada aqui de
 * propósito, um `Boolean(process.env.OPENAI_API_KEY?.trim())` de uma
 * linha, só a PRESENÇA da env var, nunca o valor -- para este arquivo
 * não precisar importar o SDK do provider só para checar isso).
 */
export function isStudioSkillRuntimeAvailable(skill: StudioSkillDefinition): boolean {
  return skill.runtimeStatus === "connected" && Boolean(process.env.OPENAI_API_KEY?.trim());
}
