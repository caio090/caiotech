/**
 * Fase 3 — strict JSON Schema for MotorLokatAssistantResponse, used with
 * OpenAI's structured outputs (response_format: json_schema, strict: true)
 * so the model can never return free-form prose where a form-fill proposal
 * is expected.
 */

export const ASSISTANT_RESPONSE_JSON_SCHEMA = {
  type: "json_schema",
  name: "motor_lokat_assistant_response",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "answerSimple", "answerTechnical", "summary", "insights", "questions",
      "proposedUpdates", "warnings", "nextActions", "confidence", "sources", "calculationRequests",
    ],
    properties: {
      answerSimple: { type: "string", description: "Explicação em linguagem simples, sem jargão financeiro." },
      answerTechnical: { type: "string", description: "Explicação técnica, com os termos corretos (CMV, CSV, margem de contribuição, etc.)." },
      summary: { type: "string" },
      insights: { type: "array", items: { type: "string" } },
      questions: { type: "array", items: { type: "string" } },
      proposedUpdates: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["path", "label", "oldValue", "proposedValue", "reason", "confidence", "source", "requiresConfirmation"],
          properties: {
            path: { type: "string" },
            label: { type: "string" },
            oldValue: { type: ["string", "number", "null"] },
            proposedValue: { type: ["string", "number"] },
            reason: { type: "string" },
            confidence: { type: "string", enum: ["alta", "media", "baixa", "insuficiente"] },
            source: { type: "string", enum: ["real", "manual", "estimated", "missing", "example"] },
            requiresConfirmation: { type: "boolean", enum: [true] },
          },
        },
      },
      warnings: { type: "array", items: { type: "string" } },
      nextActions: { type: "array", items: { type: "string" } },
      confidence: { type: "string", enum: ["alta", "media", "baixa", "insuficiente"] },
      sources: { type: "array", items: { type: "string" } },
      calculationRequests: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["tool", "summary"],
          properties: {
            tool: { type: "string" },
            summary: { type: "string" },
          },
        },
      },
    },
  },
} as const;

/** Report interpretation result (Fase 11) — separate from the general assistant response because it always carries a period/source pair. */
export const REPORT_INTERPRETATION_JSON_SCHEMA = {
  type: "json_schema",
  name: "motor_lokat_report_interpretation",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["period", "source", "metrics", "proposedClassification", "confidence", "missingData", "warnings", "questions"],
    properties: {
      period: { type: "string" },
      source: { type: "string" },
      metrics: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["label", "value", "unit"],
          properties: {
            label: { type: "string" },
            value: { type: "string" },
            unit: { type: "string" },
          },
        },
      },
      proposedClassification: { type: "string" },
      confidence: { type: "string", enum: ["alta", "media", "baixa", "insuficiente"] },
      missingData: { type: "array", items: { type: "string" } },
      warnings: { type: "array", items: { type: "string" } },
      questions: { type: "array", items: { type: "string" } },
    },
  },
} as const;
