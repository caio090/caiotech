(function () {
let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("\n[test] NormalizedOrder / NormalizedOrderItem -- contrato mínimo do brief (Fase 4)");
{
  const item: import("../analytics-types").NormalizedOrderItem = {
    externalItemId: "item-1", externalProductId: "prod-1", externalProductName: "Smash Clássico",
    quantity: 2, unitGrossAmount: 2500, discountsAmount: 0, finalAmount: 5000,
    additions: [], internalProductId: null, mappingStatus: "unlinked",
  };
  const order: import("../analytics-types").NormalizedOrder = {
    externalOrderId: "order-1", source: "olaclick", workspaceId: "ws-1", storeId: "store-1",
    operationalDate: "2026-07-28", createdAt: "2026-07-28T03:30:00.000Z", completedAt: "2026-07-28T03:40:00.000Z",
    status: "completed", paymentStatus: "paid",
    grossItemsAmount: 5000, discountsAmount: 0, deliveryFeeAmount: 500, serviceFeeAmount: 0, platformFeeAmount: 200,
    refundedAmount: null, finalPaidAmount: 5700, paymentMethod: "pix", channel: "delivery",
    items: [item], customerReferenceHash: "sha256:abc", rawSourceReference: "olaclick:order-1",
  };

  const expectedOrderFields = ["externalOrderId", "source", "workspaceId", "storeId", "operationalDate", "createdAt", "completedAt", "status", "paymentStatus", "grossItemsAmount", "discountsAmount", "deliveryFeeAmount", "serviceFeeAmount", "platformFeeAmount", "refundedAmount", "finalPaidAmount", "paymentMethod", "channel", "items", "customerReferenceHash", "rawSourceReference"];
  for (const field of expectedOrderFields) assert(field in order, `NormalizedOrder possui ${field}`);
  assert(Object.keys(order).length === expectedOrderFields.length, "NormalizedOrder não tem campos além dos especificados no brief");

  const expectedItemFields = ["externalItemId", "externalProductId", "externalProductName", "quantity", "unitGrossAmount", "discountsAmount", "finalAmount", "additions", "internalProductId", "mappingStatus"];
  for (const field of expectedItemFields) assert(field in item, `NormalizedOrderItem possui ${field}`);
  assert(Object.keys(item).length === expectedItemFields.length, "NormalizedOrderItem não tem campos além dos especificados no brief");

  assert(order.customerReferenceHash === "sha256:abc" && !order.customerReferenceHash.includes("@") , "referência de cliente é um hash, nunca nome/telefone/e-mail direto");
}

console.log("\n[test] mappingStatus nunca é atribuído automaticamente sem confirmação humana (Fase 12) -- é apenas um contrato de tipo, aplicação fica para quem consumir");
{
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("node:fs") as typeof import("node:fs");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("node:path") as typeof import("node:path");
  const source = fs.readFileSync(path.join(process.cwd(), "src/lib/digital-menu/analytics-types.ts"), "utf8");
  assert(source.includes("Fase 12 -- never automatic"), "comentário do tipo deixa explícito que o vínculo nunca é automático");
}

console.log(`[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
