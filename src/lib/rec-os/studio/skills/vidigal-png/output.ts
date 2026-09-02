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
}
