/**
 * Sprint REC OS Studio Foundation V0.1/V0.2 — contrato de saída da
 * skill Vidigal PNG. As 8 etapas oficiais do prompt mestre
 * (docs/product-roadmap/vidigal-png-master-prompt.txt, seção 12).
 *
 * V0.2 (Fase 14): `variations` evoluiu de string[] para uma coleção
 * estruturada -- cada variação precisa ser reconhecível pela UI
 * (título, direção, delta de prompt), nunca texto solto concatenado.
 * `generationPrompt` continua APENAS TEXTO nesta sprint -- nunca
 * enviado a nenhum provider de imagem (Fase 13/17).
 *
 * Prompt 01 (Studio Visual Engine) — `suggestedHeadline`/`suggestedCta`
 * são NOVOS: o texto renderizado de verdade na peça final precisa ser
 * determinístico (compositor, não o modelo de imagem), então a Vidigal
 * passa a propor o texto curto pronto para renderizar. Quando o
 * usuário já informou headline/cta no briefing, o orquestrador
 * (create-studio-visual.ts) SEMPRE usa o texto exato do usuário em vez
 * deste campo -- ele existe para o caso (mais comum) em que só há um
 * briefing livre, sem headline/cta explícitos. `suggestedCta` pode ser
 * `null`: nem toda peça precisa de CTA.
 */

export interface VidigalPngVariation {
  title: string;
  direction: string;
  promptDelta: string;
}

/**
 * Prompt 20 (Studio Visual Quality) — gramática pequena e reutilizável
 * de arquétipos visuais (Fase 16/17). Archetype define LÓGICA visual
 * (o que domina a composição, como o texto se relaciona com a cena),
 * nunca um template fixo -- duas peças do mesmo arquétipo continuam
 * visualmente diferentes.
 */
export type VidigalLayoutArchetype =
  | "EDITORIAL_HERO" | "PRODUCT_FOCUS" | "LIFESTYLE_HERO" | "BOLD_PROMO"
  | "MINIMAL_POSTER" | "INFORMATIONAL" | "BRAND_STATEMENT";

/** Fase 19/20 -- onde a headline vai pousar. Usado tanto pra reservar negative space no prompt do provider quanto pra posicionar a faixa de texto de verdade no render-plan (Prompt 20: V1 cobre TOP/BOTTOM com geometria real). */
export type VidigalHeadlineZone = "TOP" | "BOTTOM";

/** Fase 27 -- nunca só "caixa preta genérica sempre". Vidigal escolhe conforme a complexidade visual esperada da cena. */
export type VidigalContrastTreatment = "SCRIM" | "GRADIENT" | "PANEL";

/** Fase 28 -- CTA nunca compete com a headline; o TIPO visual também varia, não só o tamanho. */
export type VidigalCtaStyle = "PILL" | "LABEL" | "UNDERLINE" | "SMALL_BLOCK";

export interface VidigalPngOutputContract {
  briefReading: string;
  creativeDirection: string;
  conceptualBasis: string;
  visualStructure: string;
  visualGuidelines: string;
  generationPrompt: string;
  variations: VidigalPngVariation[];
  adaptations: string[];
  suggestedHeadline: string;
  suggestedCta: string | null;
  /** Prompt 20 -- plano de composição operacional (nunca só "texto bonito"): consumido de verdade por image-runtime.ts (negative space) e render-plan.ts (posição/tratamento reais). */
  layoutArchetype: VidigalLayoutArchetype;
  headlineZone: VidigalHeadlineZone;
  contrastTreatment: VidigalContrastTreatment;
  ctaStyle: VidigalCtaStyle;
}
