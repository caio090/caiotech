/** Pure in-memory stock model — no persistence, no Supabase. */

export type StockLocationId = "central" | "kitchen";

export interface StockLocation {
  id: StockLocationId;
  label: string;
  description: string;
}

export interface StockItem {
  id: string;
  name: string;
  unit: string;
  /** Average daily consumption, in `unit`, used for replenishment/coverage math. */
  averageDailyConsumption: number;
  /** Lead time in days between placing a purchase order and receiving it. */
  supplierLeadTimeDays: number;
  /** Extra buffer stock, in `unit`, kept beyond what lead-time demand requires. */
  safetyStock: number;
  lastUnitCost: number;
  averageUnitCost: number;
  supplierName: string;
}

export interface StockBalance {
  itemId: string;
  locationId: StockLocationId;
  theoreticalQuantity: number;
  physicalQuantity: number | null;
  unitValue: number;
}

export type StockMovementType =
  | "purchase"
  | "transfer_in"
  | "transfer_out"
  | "production_consumption"
  | "waste"
  | "expiration"
  | "staff_meal"
  | "courtesy"
  | "correction"
  | "return_to_supplier"
  | "manual_adjustment";

export interface StockMovement {
  id: string;
  itemId: string;
  locationId: StockLocationId;
  type: StockMovementType;
  quantity: number;
  unit: string;
  unitValue: number;
  occurredAtLabel: string;
  responsible: string;
  reason: string;
  origin: string;
  status: "confirmed" | "pending";
}

export interface StockTransfer {
  id: string;
  itemId: string;
  quantity: number;
  fromLocationId: StockLocationId;
  toLocationId: StockLocationId;
  occurredAtLabel: string;
  responsible: string;
}

export interface StockCount {
  id: string;
  itemId: string;
  locationId: StockLocationId;
  theoreticalQuantity: number;
  countedQuantity: number;
  unitValue: number;
  responsible: string;
  occurredAtLabel: string;
  justification: string;
}

export interface ReplenishmentRule {
  itemId: string;
  averageDailyConsumption: number;
  supplierLeadTimeDays: number;
  safetyStock: number;
}

export interface StockLoss {
  id: string;
  itemId: string;
  quantity: number;
  unitValue: number;
  reason: "waste" | "expiration" | "correction" | "staff_meal" | "courtesy";
  occurredAtLabel: string;
}

export interface PurchaseDraft {
  itemId: string;
  supplierName: string;
  suggestedQuantity: number;
  unit: string;
  lastUnitCost: number;
  averageUnitCost: number;
  leadTimeDays: number;
  safetyStock: number;
  status: "below_replenishment_point" | "ok";
}
