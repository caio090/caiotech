/**
 * Sprint REC OS Studio Visual Engine (Prompt 01) — StudioReferenceAnalysis.
 * Único arquivo do domínio Studio (fora de skills/vidigal-png/) que
 * importa o SDK da OpenAI -- reaproveita a MESMA Responses API já em
 * produção (mesmo padrão de neural-executor.ts), nunca um segundo
 * "AI runtime" paralelo. Roda ANTES da Vidigal e só quando existem
 * referências anexadas (nunca gasta uma chamada extra à toa).
 *
 * Extrai REGRAS de composição/atmosfera da referência -- nunca copia
 * marca, texto, produto ou layout exclusivo dela (mesma regra já
 * aplicada à Vidigal em instructions.ts, reforçada aqui na origem).
 * Best-effort: falha aqui nunca bloqueia a geração -- degrada para
 * warning e a Vidigal segue sem as regras de referência.
 */
import OpenAI from "openai";

const REFERENCE_MODEL = process.env.STUDIO_REFERENCE_VISION_MODEL?.trim() || "gpt-4o-mini";
// Prompt 09 -- reduzido de 15s pra 10s (até MAX_REFERENCES_ANALYZED=2
// referências, nunca mais que 20s aqui): a rota inteira tem um teto
// real de 60s (route.ts maxDuration, limite do plano Hobby da
// Vercel), e esta etapa roda ANTES do texto e da imagem no pipeline
// (create-studio-visual.ts) -- precisa deixar espaço real pras etapas
// que vêm depois, sobretudo a geração de imagem em si.
const REFERENCE_TIMEOUT_MS = 10_000;
const MAX_REFERENCES_ANALYZED = 2;

let cachedClient: OpenAI | null = null;
function getClient(): OpenAI {
  if (!cachedClient) cachedClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: REFERENCE_TIMEOUT_MS });
  return cachedClient;
}

export function isReferenceAnalysisConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

const REFERENCE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    composition: { type: "string" },
    density: { type: "string" },
    contrast: { type: "string" },
    lighting: { type: "string" },
    mood: { type: "string" },
    spatialRelations: { type: "string" },
    typographicBehavior: { type: "string" },
    negativeSpaceUsage: { type: "string" },
    rhythm: { type: "string" },
    approximatePalette: { type: "array", items: { type: "string" } },
    photographicTreatment: { type: "string" },
  },
  required: [
    "composition", "density", "contrast", "lighting", "mood", "spatialRelations",
    "typographicBehavior", "negativeSpaceUsage", "rhythm", "approximatePalette", "photographicTreatment",
  ],
} as const;

interface ReferenceAnalysisFields {
  composition: string;
  density: string;
  contrast: string;
  lighting: string;
  mood: string;
  spatialRelations: string;
  typographicBehavior: string;
  negativeSpaceUsage: string;
  rhythm: string;
  approximatePalette: string[];
  photographicTreatment: string;
}

const SYSTEM_INSTRUCTIONS = [
  "Você analisa UMA imagem de referência visual para uso em direção de arte.",
  "Extraia apenas REGRAS reutilizáveis de composição/atmosfera -- nunca descreva ou copie marca, logotipo, texto de marca, produto exclusivo ou layout literal presente na imagem.",
  "Responda estritamente no formato JSON do schema fornecido, em português do Brasil, com frases curtas e objetivas.",
].join("\n");

function flattenAnalysis(fields: ReferenceAnalysisFields): string {
  const parts = [
    `composição: ${fields.composition}`,
    `densidade: ${fields.density}`,
    `contraste: ${fields.contrast}`,
    `iluminação: ${fields.lighting}`,
    `mood: ${fields.mood}`,
    `relações espaciais: ${fields.spatialRelations}`,
    `comportamento tipográfico: ${fields.typographicBehavior}`,
    `uso de espaço negativo: ${fields.negativeSpaceUsage}`,
    `ritmo: ${fields.rhythm}`,
    fields.approximatePalette.length ? `paleta aproximada: ${fields.approximatePalette.join(", ")}` : null,
    `tratamento fotográfico: ${fields.photographicTreatment}`,
  ].filter((p): p is string => Boolean(p));
  return parts.join("; ");
}

export interface ReferenceAnalysisResult {
  rules: string[];
  warnings: string[];
}

/**
 * Analisa até MAX_REFERENCES_ANALYZED imagens de referência. Nunca
 * lança -- indisponibilidade/erro vira warning e `rules: []`.
 */
export async function analyzeStudioReferences(references: { url: string; label: string }[]): Promise<ReferenceAnalysisResult> {
  if (references.length === 0) return { rules: [], warnings: [] };
  if (!isReferenceAnalysisConfigured()) {
    return { rules: [], warnings: ["Referências anexadas, mas a análise visual de referência não está configurada no servidor -- as referências não influenciaram esta geração."] };
  }

  const toAnalyze = references.slice(0, MAX_REFERENCES_ANALYZED);
  const warnings: string[] = [];
  if (references.length > MAX_REFERENCES_ANALYZED) {
    warnings.push(`Apenas as ${MAX_REFERENCES_ANALYZED} primeiras referências foram analisadas nesta geração.`);
  }

  const rules: string[] = [];
  for (const ref of toAnalyze) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REFERENCE_TIMEOUT_MS);
    try {
      const response = await getClient().responses.create({
        model: REFERENCE_MODEL,
        store: false,
        instructions: SYSTEM_INSTRUCTIONS,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: `Referência: "${ref.label}". Extraia as regras visuais reutilizáveis desta imagem.` },
              { type: "input_image", image_url: ref.url, detail: "low" },
            ],
          },
        ],
        text: { format: { type: "json_schema", name: "studio_reference_analysis", strict: true, schema: REFERENCE_JSON_SCHEMA } },
      }, { signal: controller.signal });

      const parsed = JSON.parse(response.output_text) as ReferenceAnalysisFields;
      rules.push(flattenAnalysis(parsed));
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "AbortError";
      console.warn("[studio/reference-analysis] falha ao analisar referência", { timedOut });
      warnings.push(`Não foi possível analisar a referência "${ref.label}" -- ela não influenciou esta geração.`);
    } finally {
      clearTimeout(timer);
    }
  }

  return { rules, warnings };
}
