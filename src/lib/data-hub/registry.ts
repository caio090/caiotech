import type { ModuleDataContract } from "./types";
import { PLATFORM_MODULES } from "@/config/platform-modules";

/** Deriva os contratos de dado direto do platform-modules.ts -- nenhuma fonte paralela de "quem consome o quê". */
export function buildModuleDataContracts(): ModuleDataContract[] {
  return PLATFORM_MODULES.map((module) => ({ moduleId: module.id, consumes: module.consumes, produces: module.produces }));
}

export function findProducersOf(dataKey: string): string[] {
  return PLATFORM_MODULES.filter((module) => module.produces.includes(dataKey)).map((module) => module.id);
}

export function findConsumersOf(dataKey: string): string[] {
  return PLATFORM_MODULES.filter((module) => module.consumes.includes(dataKey)).map((module) => module.id);
}
