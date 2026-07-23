import type { LayerScanCapability } from "./types";

/**
 * Fase 15 / Cenário D — no object segmentation exists in this repository
 * (confirmed by git history + working-tree audit: no SAM, ONNX, OpenCV,
 * rembg or equivalent). Reporting this honestly instead of faking it with
 * generic bounding boxes labeled as "objects".
 */
export function getLayerScanCapabilities(): LayerScanCapability[] {
  return [
    {
      id: "text_detection",
      available: true,
      status: "available",
      reason: "OCR local via tesseract.js (Apache-2.0), executado sobre os pixels da imagem selecionada.",
    },
    {
      id: "object_segmentation",
      available: false,
      status: "planned",
      reason: "Nenhuma biblioteca de segmentação (SAM, ONNX, OpenCV, rembg ou equivalente) está instalada ou implementada neste repositório. Recortes retangulares genéricos nunca são apresentados como objetos com certeza.",
    },
    {
      id: "background_cleanup",
      available: true,
      status: "experimental",
      reason: "Limpeza sólida experimental, disponível apenas para regiões de fundo com variação de cor muito baixa (aproximadamente uniformes). Fotos, gradientes, texturas e ilustrações exigem reconstrução avançada de fundo (requires_inpainting), não implementada nesta sprint.",
    },
  ];
}
