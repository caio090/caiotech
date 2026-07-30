import type { PurchaseDraft, StockBalance, StockItem, StockMovement } from "./types";
import { calculateReplenishmentPoint, isBelowReplenishmentPoint } from "./calculations";

/** EXEMPLO SIMULADO — dados de demonstração para Duh Lanches, não os números reais do negócio. */

export const STOCK_ITEM_FIXTURES: StockItem[] = [
  { id: "pao-brioche", name: "Pão brioche", unit: "unidade", averageDailyConsumption: 45, supplierLeadTimeDays: 2, safetyStock: 40, lastUnitCost: 1.75, averageUnitCost: 1.80, supplierName: "Padaria Central (exemplo)" },
  { id: "carne-bovina", name: "Carne bovina (blend)", unit: "kg", averageDailyConsumption: 6.5, supplierLeadTimeDays: 3, safetyStock: 10, lastUnitCost: 38.00, averageUnitCost: 37.20, supplierName: "Frigorífico Exemplo" },
  { id: "queijo-cheddar", name: "Queijo cheddar fatiado", unit: "kg", averageDailyConsumption: 3.2, supplierLeadTimeDays: 4, safetyStock: 5, lastUnitCost: 32.50, averageUnitCost: 31.80, supplierName: "Laticínios Exemplo" },
  { id: "batata-congelada", name: "Batata congelada", unit: "kg", averageDailyConsumption: 18, supplierLeadTimeDays: 5, safetyStock: 30, lastUnitCost: 9.90, averageUnitCost: 9.60, supplierName: "Distribuidora Exemplo" },
  { id: "refrigerante-lata", name: "Refrigerante lata", unit: "unidade", averageDailyConsumption: 60, supplierLeadTimeDays: 3, safetyStock: 80, lastUnitCost: 3.20, averageUnitCost: 3.10, supplierName: "Bebidas Exemplo" },
];

export const STOCK_BALANCE_FIXTURES: StockBalance[] = [
  { itemId: "pao-brioche", locationId: "central", theoreticalQuantity: 320, physicalQuantity: 312, unitValue: 1.80 },
  { itemId: "pao-brioche", locationId: "kitchen", theoreticalQuantity: 60, physicalQuantity: 58, unitValue: 1.80 },
  { itemId: "carne-bovina", locationId: "central", theoreticalQuantity: 28, physicalQuantity: 28, unitValue: 37.20 },
  { itemId: "carne-bovina", locationId: "kitchen", theoreticalQuantity: 8, physicalQuantity: 6.5, unitValue: 37.20 },
  { itemId: "queijo-cheddar", locationId: "central", theoreticalQuantity: 9, physicalQuantity: 9, unitValue: 31.80 },
  { itemId: "queijo-cheddar", locationId: "kitchen", theoreticalQuantity: 3.5, physicalQuantity: 3.1, unitValue: 31.80 },
  { itemId: "batata-congelada", locationId: "central", theoreticalQuantity: 40, physicalQuantity: 40, unitValue: 9.60 },
  { itemId: "batata-congelada", locationId: "kitchen", theoreticalQuantity: 22, physicalQuantity: 21, unitValue: 9.60 },
  { itemId: "refrigerante-lata", locationId: "central", theoreticalQuantity: 240, physicalQuantity: 236, unitValue: 3.10 },
  { itemId: "refrigerante-lata", locationId: "kitchen", theoreticalQuantity: 48, physicalQuantity: 48, unitValue: 3.10 },
];

export const STOCK_MOVEMENT_FIXTURES: StockMovement[] = [
  { id: "mov-1", itemId: "carne-bovina", locationId: "central", type: "purchase", quantity: 20, unit: "kg", unitValue: 38.00, occurredAtLabel: "Simulação — dia 1", responsible: "Equipe de compras (exemplo)", reason: "Reposição semanal", origin: "Fornecedor Exemplo", status: "confirmed" },
  { id: "mov-2", itemId: "carne-bovina", locationId: "kitchen", type: "transfer_in", quantity: 8, unit: "kg", unitValue: 37.20, occurredAtLabel: "Simulação — dia 2", responsible: "Cozinha (exemplo)", reason: "Reposição da cozinha", origin: "Estoque central", status: "confirmed" },
  { id: "mov-3", itemId: "pao-brioche", locationId: "kitchen", type: "production_consumption", quantity: 180, unit: "unidade", unitValue: 1.80, occurredAtLabel: "Simulação — dia 3", responsible: "Cozinha (exemplo)", reason: "Produção do dia", origin: "Cozinha", status: "confirmed" },
  { id: "mov-4", itemId: "queijo-cheddar", locationId: "kitchen", type: "waste", quantity: 0.4, unit: "kg", unitValue: 31.80, occurredAtLabel: "Simulação — dia 3", responsible: "Cozinha (exemplo)", reason: "Validade vencida", origin: "Cozinha", status: "confirmed" },
  { id: "mov-5", itemId: "batata-congelada", locationId: "kitchen", type: "staff_meal", quantity: 3, unit: "kg", unitValue: 9.60, occurredAtLabel: "Simulação — dia 4", responsible: "Cozinha (exemplo)", reason: "Refeição da equipe", origin: "Cozinha", status: "confirmed" },
  { id: "mov-6", itemId: "refrigerante-lata", locationId: "central", type: "correction", quantity: -4, unit: "unidade", unitValue: 3.10, occurredAtLabel: "Simulação — dia 5", responsible: "Super Admin (exemplo)", reason: "Ajuste de contagem", origin: "Estoque central", status: "confirmed" },
];

export function buildPurchaseDrafts(): PurchaseDraft[] {
  return STOCK_ITEM_FIXTURES.map((item) => {
    const centralBalance = STOCK_BALANCE_FIXTURES.find((b) => b.itemId === item.id && b.locationId === "central");
    const available = centralBalance?.theoreticalQuantity ?? 0;
    const replenishmentPoint = calculateReplenishmentPoint({
      averageDailyConsumption: item.averageDailyConsumption,
      supplierLeadTimeDays: item.supplierLeadTimeDays,
      safetyStock: item.safetyStock,
    });
    const below = isBelowReplenishmentPoint(available, replenishmentPoint);
    const suggestedQuantity = below ? Math.max(0, Math.round((replenishmentPoint - available) * 10) / 10) : 0;
    return {
      itemId: item.id,
      supplierName: item.supplierName,
      suggestedQuantity,
      unit: item.unit,
      lastUnitCost: item.lastUnitCost,
      averageUnitCost: item.averageUnitCost,
      leadTimeDays: item.supplierLeadTimeDays,
      safetyStock: item.safetyStock,
      status: below ? "below_replenishment_point" : "ok",
    };
  });
}

/** EXEMPLO SIMULADO — números do relatório de CMV real vs. teórico, idênticos aos do ticket. */
export const CMV_REPORT_FIXTURE = {
  openingInventoryValue: 12_000,
  purchasesValue: 35_000,
  closingInventoryValue: 10_000,
  sales: 100_000,
  theoreticalConsumption: 33_000,
  periodLabel: "Período simulado (30 dias)",
};
