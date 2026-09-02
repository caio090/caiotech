/**
 * Sprint REC OS Studio Foundation V0.2 — Studio Neural Executor da
 * skill Vidigal PNG. ÚNICO arquivo do domínio Studio que importa um
 * SDK de provider de IA -- manifest.ts/input.ts/output.ts/
 * instructions.ts/types.ts/registry.ts nunca sabem que OpenAI existe
 * (Fase "VIDIGAL PNG NÃO CONHECE PROVIDER").
 *
 * Reaproveita o padrão real já em produção
 * (src/lib/business-command-center/ai.ts, mesma forma de chamada --
 * client.responses.create com text.format.json_schema, strict:true --
 * já usada por src/lib/jarvis/client.ts para streaming) em vez de
 * inventar uma segunda abstração de "AI runtime". `store:false`
 * (nenhuma conversa persistida do lado do provider), mesmo princípio
 * de docs/product/... já adotado por Jarvis.
 */
import OpenAI from "openai";
import type { StudioSkillDefinition } from "../../types";
import { createNotConnectedRuntime } from "../../runtime";
import type { StudioSkillExecutionRequest, StudioSkillExecutionResult } from "../../runtime";
import { buildVidigalSystemInstructions } from "./instructions";
import type { VidigalPngOutputContract } from "./output";

const VIDIGAL_TEXT_MODEL = process.env.STUDIO_VIDIGAL_TEXT_MODEL?.trim() || "gpt-4o-mini";
const VIDIGAL_TEXT_TIMEOUT_MS = 20_000;
const MAX_FREEFORM_BRIEF_CHARS = 4000;

/** Fase 19 -- só presença, nunca o valor (mesmo princípio de isJarvisConfigured()). */
export function isVidigalTextRuntimeConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

let cachedClient: OpenAI | null = null;
function getClient(): OpenAI {
  if (!cachedClient) cachedClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: VIDIGAL_TEXT_TIMEOUT_MS });
  return cachedClient;
}

const stringArray = { type: "array", items: { type: "string" } } as const;
const VIDIGAL_PNG_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    briefReading: { type: "string" },
    creativeDirection: { type: "string" },
    conceptualBasis: { type: "string" },
    visualStructure: { type: "string" },
    visualGuidelines: { type: "string" },
    generationPrompt: { type: "string" },
    variations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { title: { type: "string" }, direction: { type: "string" }, promptDelta: { type: "string" } },
        required: ["title", "direction", "promptDelta"],
      },
    },
    adaptations: stringArray,
    suggestedHeadline: { type: "string" },
    suggestedCta: { type: ["string", "null"] },
  },
  required: ["briefReading", "creativeDirection", "conceptualBasis", "visualStructure", "visualGuidelines", "generationPrompt", "variations", "adaptations", "suggestedHeadline", "suggestedCta"],
} as const;

function isNonEmptyInput(request: StudioSkillExecutionRequest): boolean {
  const { input } = request;
  return Boolean(
    input.freeformBrief?.trim() || input.objective?.trim() || input.pieceType?.trim() ||
    input.headline?.trim() || input.notes?.trim()
  );
}

/** Fase 8 -- validação server-side estrita do output (o provider já é
 *  instruído com json_schema/strict:true, mas nunca confiamos cegamente
 *  numa resposta externa). Ausência de qualquer um dos 8 blocos invalida
 *  o output inteiro -- nunca devolvido parcialmente como sucesso. */
function isValidVidigalOutput(value: unknown): value is VidigalPngOutputContract {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const stringFields = ["briefReading", "creativeDirection", "conceptualBasis", "visualStructure", "visualGuidelines", "generationPrompt"];
  if (!stringFields.every((f) => typeof v[f] === "string" && (v[f] as string).length > 0)) return false;
  if (!Array.isArray(v.variations)) return false;
  if (!v.variations.every((item) => item && typeof item === "object" && typeof (item as Record<string, unknown>).title === "string" && typeof (item as Record<string, unknown>).direction === "string" && typeof (item as Record<string, unknown>).promptDelta === "string")) return false;
  if (!Array.isArray(v.adaptations) || !v.adaptations.every((a) => typeof a === "string")) return false;
  if (typeof v.suggestedHeadline !== "string" || v.suggestedHeadline.length === 0) return false;
  if (v.suggestedCta !== null && typeof v.suggestedCta !== "string") return false;
  return true;
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Ponto único de execução da Vidigal PNG. Nunca lança -- toda falha vira
 * um StudioSkillExecutionResult com status/error explícitos (Fase 19:
 * nunca stack trace ao cliente).
 */
export async function executeVidigalPng(
  skill: StudioSkillDefinition,
  request: StudioSkillExecutionRequest,
): Promise<StudioSkillExecutionResult<VidigalPngOutputContract>> {
  if (!isNonEmptyInput(request)) {
    return {
      skillId: skill.id, skillVersion: skill.version, runtime: "not_connected", status: "invalid_input",
      output: null, warnings: [],
      error: { code: "STUDIO_SKILL_INVALID_INPUT", message: "Informe ao menos um briefing livre ou um objetivo/tipo de peça/headline." },
      generatedAt: nowIso(),
    };
  }

  if (!isVidigalTextRuntimeConfigured()) {
    return createNotConnectedRuntime(skill.id).execute(request) as Promise<StudioSkillExecutionResult<VidigalPngOutputContract>>;
  }

  const freeformBrief = request.input.freeformBrief?.trim().slice(0, MAX_FREEFORM_BRIEF_CHARS);
  const warnings: string[] = [];
  if (request.input.freeformBrief && request.input.freeformBrief.length > MAX_FREEFORM_BRIEF_CHARS) {
    warnings.push(`Briefing livre truncado em ${MAX_FREEFORM_BRIEF_CHARS} caracteres.`);
  }

  const systemInstructions = buildVidigalSystemInstructions(skill.modules);

  // SKILL CONTRACT (schema, enviado à parte via text.format) + BUSINESS
  // CONTEXT + USER BRIEF -- claramente separados como duas chaves de um
  // único objeto JSON, nunca concatenados como texto livre com as
  // instruções de sistema (Fase 9).
  const requestPayload = {
    business_context: request.context,
    reference_analysis: request.referenceVisualRules ?? null,
    user_brief: {
      freeformBrief: freeformBrief ?? null,
      objective: request.input.objective ?? null,
      pieceType: request.input.pieceType ?? null,
      format: request.input.format ?? null,
      headline: request.input.headline ?? null,
      supportingCopy: request.input.supportingCopy ?? null,
      cta: request.input.cta ?? null,
      references: request.input.references ?? null,
      brandContext: request.input.brandContext ?? null,
      restrictions: request.input.restrictions ?? null,
      variationCount: request.input.variationCount ?? null,
      notes: request.input.notes ?? null,
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VIDIGAL_TEXT_TIMEOUT_MS);
  try {
    const response = await getClient().responses.create({
      model: VIDIGAL_TEXT_MODEL,
      store: false,
      instructions: systemInstructions,
      input: JSON.stringify(requestPayload),
      text: { format: { type: "json_schema", name: "vidigal_png_output", strict: true, schema: VIDIGAL_PNG_JSON_SCHEMA } },
    }, { signal: controller.signal });

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.output_text);
    } catch {
      return {
        skillId: skill.id, skillVersion: skill.version, runtime: "openai_responses_api", status: "failed",
        output: null, warnings,
        error: { code: "STUDIO_SKILL_OUTPUT_INVALID", message: "A resposta do provider não pôde ser interpretada como JSON válido." },
        generatedAt: nowIso(),
      };
    }

    if (!isValidVidigalOutput(parsed)) {
      return {
        skillId: skill.id, skillVersion: skill.version, runtime: "openai_responses_api", status: "failed",
        output: null, warnings,
        error: { code: "STUDIO_SKILL_OUTPUT_INVALID", message: "A resposta do provider não contém os 8 blocos obrigatórios no formato esperado." },
        generatedAt: nowIso(),
      };
    }

    return {
      skillId: skill.id, skillVersion: skill.version, runtime: "openai_responses_api", status: "completed",
      output: parsed, warnings, generatedAt: nowIso(),
    };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    console.warn("[studio/vidigal-png] execução indisponível", { timedOut });
    return {
      skillId: skill.id, skillVersion: skill.version, runtime: "openai_responses_api", status: "failed",
      output: null, warnings,
      error: { code: "STUDIO_AI_PROVIDER_UNAVAILABLE", message: timedOut ? "O provider de IA excedeu o tempo limite." : "O provider de IA está indisponível no momento." },
      generatedAt: nowIso(),
    };
  } finally {
    clearTimeout(timer);
  }
}
