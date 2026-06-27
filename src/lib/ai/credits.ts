/**
 * Créditos internos da LOKAT OS.
 * Estes valores NÃO equivalem diretamente ao custo do fornecedor (Google, OpenAI etc.).
 * São a moeda interna da plataforma. O preço ao cliente e a margem são definidos comercialmente.
 */

export interface AiPlan {
  key: string;
  label: string;
  monthlyCredits: number;
  maxConcurrentJobs: number;
}

export const AI_PLANS: Record<string, AiPlan> = {
  basic: {
    key: "basic",
    label: "Básico",
    monthlyCredits: 50,
    maxConcurrentJobs: 1,
  },
  pro: {
    key: "pro",
    label: "Pro",
    monthlyCredits: 150,
    maxConcurrentJobs: 3,
  },
  agency: {
    key: "agency",
    label: "Agência",
    monthlyCredits: 500,
    maxConcurrentJobs: 10,
  },
};

/**
 * Custo interno por modo de geração (em créditos LOKAT OS).
 * Ajustável conforme custo real do fornecedor + margem da agência.
 */
export const CREDIT_COSTS: Record<string, number> = {
  /** Apenas estratégia / prompt sem geração de imagem */
  prompt_strategy_only: 0,
  /** Imagem simples, sem referência */
  image_simple_1x: 1,
  /** Imagem com referência visual (style transfer) */
  image_with_reference: 2,
  /** Imagem com pessoa, produto ou logo preservado */
  image_with_person_or_product: 3,
  /** Lote de 4 variações base */
  batch_4_variations: 4,
  /** Alta resolução / 4K — multiplicador adicional */
  image_high_res_multiplier: 2,
};

/** Retorna custo estimado em créditos para um modo */
export function estimateCredits(
  mode: keyof typeof CREDIT_COSTS,
  highRes = false,
  variations = 1
): number {
  const base = CREDIT_COSTS[mode] ?? 1;
  const resMult = highRes ? CREDIT_COSTS.image_high_res_multiplier : 1;
  return base * resMult * variations;
}

/** Verifica se o saldo é suficiente */
export function hasSufficientCredits(
  remaining: number,
  mode: keyof typeof CREDIT_COSTS,
  highRes = false,
  variations = 1
): boolean {
  return remaining >= estimateCredits(mode, highRes, variations);
}
