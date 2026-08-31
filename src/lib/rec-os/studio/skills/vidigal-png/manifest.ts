/**
 * Sprint REC OS Studio Foundation V0.1 — manifesto da skill Vidigal PNG.
 * status: "available_contract" -- o contrato existe e pode ser
 * referenciado pelo Registry/UI. NUNCA significa runtime disponível
 * (ver runtimeStatus abaixo, sempre "not_connected" nesta Foundation,
 * e isStudioSkillRuntimeAvailable() em ../../registry.ts, que retorna
 * false para toda skill).
 */
import type { StudioSkillDefinition, StudioSkillModule } from "../../types";
import { VIDIGAL_PNG_DELIVERY_STEPS } from "./instructions";

export const VIDIGAL_PNG_MODULES: readonly StudioSkillModule[] = [
  {
    id: "core",
    label: "Core",
    status: "documented",
    description: "Regras universais de direção visual, entradas obrigatórias, processo de raciocínio visual, formato do prompt de geração, restrições e critérios de qualidade.",
  },
  {
    id: "wollner_system",
    label: "Wollner System",
    status: "documented",
    description: "Engenharia de identidade visual -- sistema, grid, proporção, redução, longevidade.",
  },
  {
    id: "kimura_identity",
    label: "Kimura Identity",
    status: "documented",
    description: "Conceito e universo de marca -- briefing, personalidade, território visual, tipografia como voz.",
  },
  {
    id: "gretel_content_system",
    label: "Gretel Content System",
    status: "documented",
    description: "Sistemas de comunicação recorrente e escalável -- famílias de conteúdo, receitas, brand volume, motion identity.",
  },
  {
    id: "alencar_social_art_direction",
    label: "Alencar Social Art Direction",
    status: "documented",
    description: "Direção de arte para peças de social media -- hero visual, quebra de clichê, percepção de valor, performance sem parecer barato.",
  },
  {
    id: "behance_radar",
    label: "Behance Radar",
    status: "documented",
    description: "Repertório contemporâneo informativo. Nunca tem poder de decisão sobre os demais módulos.",
  },
  {
    id: "motion",
    label: "Motion",
    status: "placeholder_contract",
    description: "Comportamento em movimento (Reels, Stories animados, motion identity). Regras internas ainda não definidas -- não inventadas aqui.",
  },
  {
    id: "quality_control",
    label: "Quality Control",
    status: "placeholder_contract",
    description: "Auditoria visual final antes da entrega. Checklist específico ainda não definido -- não inventado aqui.",
  },
] as const;

export const VIDIGAL_PNG_SKILL: StudioSkillDefinition = {
  id: "vidigal_png",
  name: "Vidigal PNG",
  description: "Direção de arte para campanhas, social media, branding e peças visuais.",
  version: "2.0.0",
  category: "visual_direction",
  status: "available_contract",
  runtimeStatus: "not_connected",
  supportedInputs: [
    "companyId", "projectId", "campaignId", "objective", "pieceType", "format",
    "headline", "supportingCopy", "cta", "references", "brandContext", "assets",
    "restrictions", "variationCount", "notes", "freeformBrief",
  ],
  produces: VIDIGAL_PNG_DELIVERY_STEPS.map((step) => step.id),
  modules: VIDIGAL_PNG_MODULES,
  futureCapabilities: [
    "neural_context_integration",
    "image_generation_provider_connection",
    "motion_module_activation",
    "quality_control_module_activation",
    "weighted_module_activation_engine",
  ],
};
