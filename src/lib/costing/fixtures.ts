import type { TechnicalSheet } from "./types";

export const SMASH_EXAMPLE_SHEET_ID = "example-smash";

/**
 * EXEMPLO SIMULADO — não são os custos reais da Duh Lanches. Os valores dos
 * ingredientes somam exatamente R$ 8,62 e, contra o preço praticado de
 * R$ 25,00, resultam em CMV de 34,48% — os mesmos números do ticket,
 * verificados por teste (não reafirmados manualmente na UI).
 */
export const SMASH_EXAMPLE_SHEET: TechnicalSheet = {
  id: SMASH_EXAMPLE_SHEET_ID,
  isExample: true,
  product: "Smash de Exemplo",
  category: "Lanches",
  yieldQuantity: 1,
  portionSize: "1 unidade (~220 g)",
  ingredients: [
    { id: "pao", name: "Pão", purchaseUnit: "unidade", quantity: 1, unit: "unidade", cost: 1.80 },
    {
      id: "carne", name: "Carne", purchaseUnit: "kg", quantity: 100, unit: "g", cost: 3.80,
      // Exemplo ilustrativo de fator de correção/rendimento de cocção — não altera o custo acima.
      breakdown: { grossWeight: 130, netWeight: 100, weightAfterPreparation: 78 },
    },
    { id: "queijo", name: "Queijo (2 fatias)", purchaseUnit: "kg", quantity: 2, unit: "fatia", cost: 1.30 },
    { id: "cebola", name: "Cebola preparada", purchaseUnit: "kg", quantity: 40, unit: "g", cost: 0.72 },
    { id: "molho", name: "Molho", purchaseUnit: "kg", quantity: 25, unit: "g", cost: 0.55 },
    { id: "salada", name: "Salada", purchaseUnit: "porção", quantity: 1, unit: "porção", cost: 0.45 },
  ],
  packagingCost: null,
  practicedPrice: 25.00,
  suggestedPrice: null,
  status: "active",
  notes: "Ficha de exemplo para demonstrar o cálculo de CMV — não representa um produto real do cardápio.",
  version: 1,
  lastUpdatedLabel: "Simulação — sem data real",
};

export const TECHNICAL_SHEET_FIXTURES: TechnicalSheet[] = [SMASH_EXAMPLE_SHEET];
