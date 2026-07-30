export interface TechnicalSheetIngredient {
  id: string;
  name: string;
  purchaseUnit: string;
  quantity: number;
  unit: string;
  cost: number;
  /** Optional worked-example breakdown (cleaning + cooking loss) — informational only, never changes `cost` above. */
  breakdown?: {
    grossWeight: number;
    netWeight: number;
    weightAfterPreparation: number | null;
  };
}

export type TechnicalSheetStatus = "draft" | "active" | "outdated" | "archived";

export interface TechnicalSheet {
  id: string;
  isExample: boolean;
  product: string;
  category: string;
  yieldQuantity: number;
  portionSize: string;
  ingredients: TechnicalSheetIngredient[];
  packagingCost: number | null;
  practicedPrice: number;
  suggestedPrice: number | null;
  status: TechnicalSheetStatus;
  notes: string;
  version: number;
  lastUpdatedLabel: string;
}
