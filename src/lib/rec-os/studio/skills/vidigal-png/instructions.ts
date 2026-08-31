/**
 * Sprint REC OS Studio Foundation V0.1 — referência de instruções da
 * skill Vidigal PNG. NÃO duplica a prosa completa do prompt mestre
 * (evita duas cópias divergindo com o tempo) -- só referencia o
 * documento fonte e estrutura os 8 passos de entrega como dado
 * consumível pelo Registry/UI.
 */

/** Documento fonte com a arquitetura completa (CORE + 8 módulos + regras). */
export const VIDIGAL_PNG_MASTER_PROMPT_DOC = "docs/product-roadmap/vidigal-png-master-prompt.txt";

export interface VidigalPngDeliveryStep {
  id: string;
  order: number;
  label: string;
}

/** Espelha "MODELO DE RESPOSTA ESPERADA" do prompt mestre -- fonte única
 *  também para VidigalPngOutputContract (output.ts) e para a UI. */
export const VIDIGAL_PNG_DELIVERY_STEPS: readonly VidigalPngDeliveryStep[] = [
  { id: "briefReading", order: 1, label: "Leitura do briefing" },
  { id: "creativeDirection", order: 2, label: "Direção criativa" },
  { id: "conceptualBasis", order: 3, label: "Base conceitual aplicada" },
  { id: "visualStructure", order: 4, label: "Estrutura visual sugerida" },
  { id: "visualGuidelines", order: 5, label: "Diretrizes visuais" },
  { id: "generationPrompt", order: 6, label: "Prompt de geração" },
  { id: "variations", order: 7, label: "Variações" },
  { id: "adaptations", order: 8, label: "Adaptações" },
] as const;
