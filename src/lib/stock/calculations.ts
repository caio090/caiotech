import type { StockBalance, StockItem, StockLocationId } from "./types";

/**
 * ponto de reposição = consumo médio diário × prazo de entrega + estoque de segurança
 */
export function calculateReplenishmentPoint(input: {
  averageDailyConsumption: number;
  supplierLeadTimeDays: number;
  safetyStock: number;
}): number {
  const consumption = Math.max(0, input.averageDailyConsumption);
  const leadTime = Math.max(0, input.supplierLeadTimeDays);
  const safety = Math.max(0, input.safetyStock);
  return consumption * leadTime + safety;
}

export interface CoverageResult {
  /** Days of coverage, or null when average daily consumption is zero (no meaningful coverage — never a divide-by-zero). */
  days: number | null;
  label: string;
}

/**
 * cobertura = estoque disponível ÷ consumo médio diário
 */
export function calculateStockCoverageDays(input: {
  availableQuantity: number;
  averageDailyConsumption: number;
}): CoverageResult {
  const available = Math.max(0, input.availableQuantity);
  if (input.averageDailyConsumption <= 0) {
    return { days: null, label: "Sem consumo médio registrado — cobertura não pode ser calculada." };
  }
  const days = available / input.averageDailyConsumption;
  const rounded = Math.round(days * 10) / 10;
  const daysLabel = rounded === 1 ? "1 dia" : `${rounded} dias`;
  return { days: rounded, label: `Estoque suficiente para aproximadamente ${daysLabel}.` };
}

export function isBelowReplenishmentPoint(availableQuantity: number, replenishmentPoint: number): boolean {
  return availableQuantity < replenishmentPoint;
}

// ── Transfers (central → cozinha) ──────────────────────────────

export interface TransferApplication {
  ok: boolean;
  reason?: "insufficient_balance" | "invalid_quantity" | "same_location";
  updatedBalances?: { from: StockBalance; to: StockBalance };
}

/**
 * Applies a transfer in memory: decreases `from`, increases `to`. Never
 * allows the source balance to go negative — an insufficient-balance
 * transfer is rejected outright, not clamped to zero (clamping would
 * silently under-transfer and desync the two locations' totals).
 */
export function applyStockTransfer(input: {
  quantity: number;
  from: StockBalance;
  to: StockBalance;
}): TransferApplication {
  if (input.from.locationId === input.to.locationId) {
    return { ok: false, reason: "same_location" };
  }
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    return { ok: false, reason: "invalid_quantity" };
  }
  if (input.from.theoreticalQuantity < input.quantity) {
    return { ok: false, reason: "insufficient_balance" };
  }
  return {
    ok: true,
    updatedBalances: {
      from: { ...input.from, theoreticalQuantity: input.from.theoreticalQuantity - input.quantity },
      to: { ...input.to, theoreticalQuantity: input.to.theoreticalQuantity + input.quantity },
    },
  };
}

/** Total quantity across both locations must be identical before and after a transfer — proves no quantity is created or destroyed in memory. */
export function totalAcrossLocations(balances: StockBalance[], itemId: string): number {
  return balances.filter((b) => b.itemId === itemId).reduce((sum, b) => sum + b.theoreticalQuantity, 0);
}

// ── Inventory count precision ──────────────────────────────────

export interface InventoryCountResult {
  valid: boolean;
  invalidReason?: "negative_theoretical" | "negative_counted" | "unit_mismatch";
  differenceQuantity: number;
  differenceValue: number;
  precisionPercent: number | null;
}

export function calculateInventoryCount(input: {
  theoreticalQuantity: number;
  countedQuantity: number;
  unitValue: number;
  theoreticalUnit: string;
  countedUnit: string;
}): InventoryCountResult {
  if (input.theoreticalQuantity < 0) {
    return { valid: false, invalidReason: "negative_theoretical", differenceQuantity: 0, differenceValue: 0, precisionPercent: null };
  }
  if (input.countedQuantity < 0) {
    return { valid: false, invalidReason: "negative_counted", differenceQuantity: 0, differenceValue: 0, precisionPercent: null };
  }
  if (input.theoreticalUnit.trim().toLowerCase() !== input.countedUnit.trim().toLowerCase()) {
    return { valid: false, invalidReason: "unit_mismatch", differenceQuantity: 0, differenceValue: 0, precisionPercent: null };
  }

  const differenceQuantity = input.countedQuantity - input.theoreticalQuantity;
  const differenceValue = differenceQuantity * input.unitValue;

  let precisionPercent: number;
  if (input.theoreticalQuantity === 0 && input.countedQuantity === 0) {
    precisionPercent = 100;
  } else if (input.theoreticalQuantity === 0) {
    // Nothing was expected, but something was counted — fully divergent, not a division by zero.
    precisionPercent = 0;
  } else {
    const raw = 1 - Math.abs(differenceQuantity) / input.theoreticalQuantity;
    precisionPercent = Math.round(Math.max(0, Math.min(1, raw)) * 1000) / 10;
  }

  return { valid: true, differenceQuantity, differenceValue, precisionPercent };
}

export const STOCK_LOCATIONS: Record<StockLocationId, { label: string; description: string }> = {
  central: { label: "Estoque central", description: "Recebe compras, armazena matéria-prima e envia para a cozinha." },
  kitchen: { label: "Cozinha", description: "Recebe transferências, consome na produção e registra perdas." },
};

export function findItemById(items: StockItem[], id: string): StockItem | undefined {
  return items.find((i) => i.id === id);
}
