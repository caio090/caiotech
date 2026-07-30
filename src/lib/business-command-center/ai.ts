import OpenAI from "openai";
import type { BusinessInsightAIProvider, BusinessInsightResponse, BusinessInsightSnapshot } from "./types";

const stringArray = { type: "array", items: { type: "string" } } as const;
export const BUSINESS_INSIGHT_JSON_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: {
    summary: { type: "string" }, situation: { type: "string" },
    findings: { type: "array", items: { type: "object", additionalProperties: false, properties: { title: { type: "string" }, explanation: { type: "string" }, impact: { type: "string" }, severity: { type: "string", enum: ["high", "medium", "low"] }, metricIds: stringArray }, required: ["title", "explanation", "impact", "severity", "metricIds"] } },
    evidence: stringArray,
    hypotheses: { type: "array", items: { type: "object", additionalProperties: false, properties: { title: { type: "string" }, reason: { type: "string" }, evidenceMetricIds: stringArray, missingEvidence: stringArray, confidence: { type: "string", enum: ["high", "medium", "low", "insufficient"] }, checks: stringArray }, required: ["title", "reason", "evidenceMetricIds", "missingEvidence", "confidence", "checks"] } },
    missingData: stringArray, recommendedChecks: stringArray,
    recommendedActions: { type: "array", items: { type: "object", additionalProperties: false, properties: { title: { type: "string" }, sector: { type: "string" }, priority: { type: "string", enum: ["high", "medium", "low"] }, reason: { type: "string" }, destination: { type: "string" }, requiresConfirmation: { type: "boolean" } }, required: ["title", "sector", "priority", "reason", "destination", "requiresConfirmation"] } },
    questionsForTeam: stringArray, metricReferences: stringArray, confidence: { type: "string", enum: ["high", "medium", "low", "insufficient"] }, limitations: stringArray, disclaimer: { type: "string" },
  },
  required: ["summary", "situation", "findings", "evidence", "hypotheses", "missingData", "recommendedChecks", "recommendedActions", "questionsForTeam", "metricReferences", "confidence", "limitations", "disclaimer"],
} as const;

const SYSTEM_POLICY = `Responda em português do Brasil. Comece em linguagem simples e coloque termos técnicos entre parênteses. Use apenas os números já calculados no snapshot; não recalcule nem invente valores. Separe evidência de hipótese. Nunca afirme fraude ou desperdício como fato. Declare limitações e recomende verificações. Referencie somente metricIds recebidos. Não recomende ação destrutiva, alteração automática ou aconselhamento contábil definitivo. Toda ação requer confirmação humana.`;

export class OpenAIBusinessInsightProvider implements BusinessInsightAIProvider {
  private readonly client: OpenAI;
  constructor(private readonly model: string, apiKey: string) { this.client = new OpenAI({ apiKey }); }
  async analyze(snapshot: BusinessInsightSnapshot, signal?: AbortSignal): Promise<BusinessInsightResponse> {
    const response = await this.client.responses.create({ model: this.model, store: false, instructions: SYSTEM_POLICY, input: JSON.stringify(snapshot), text: { format: { type: "json_schema", name: "business_insight_response", strict: true, schema: BUSINESS_INSIGHT_JSON_SCHEMA } } }, { signal });
    return JSON.parse(response.output_text) as BusinessInsightResponse;
  }
}

export class MockBusinessInsightProvider implements BusinessInsightAIProvider {
  async analyze(snapshot: BusinessInsightSnapshot): Promise<BusinessInsightResponse> { return { summary: "Resposta demonstrativa baseada somente nos indicadores locais.", situation: "Há uma lacuna de CMV a conferir.", findings: [{ title: "CMV pede atenção", explanation: "O indicador calculado está acima da referência simulada.", impact: "Pode reduzir a margem.", severity: "medium", metricIds: ["cmv_gap"] }], evidence: ["O indicador cmv_gap foi fornecido pelo motor determinístico."], hypotheses: [{ title: "Cobertura parcial", reason: "Existem dados ausentes.", evidenceMetricIds: ["cmv_gap"], missingEvidence: snapshot.missingData, confidence: "low", checks: ["Conferir inventário e compras."] }], missingData: snapshot.missingData, recommendedChecks: ["Conferir inventário e compras."], recommendedActions: [{ title: "Abrir CMV", sector: "CMV", priority: "medium", reason: "Validar a base", destination: "cmv_menu", requiresConfirmation: true }], questionsForTeam: ["O inventário do período foi fechado?"], metricReferences: ["cmv_gap"], confidence: "low", limitations: ["Dados demonstrativos."], disclaimer: "A análise não substitui o contador ou o gestor financeiro." }; }
}
