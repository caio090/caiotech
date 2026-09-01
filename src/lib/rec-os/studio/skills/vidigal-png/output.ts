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
}
