(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const m = require("../provider-status.ts") as typeof import("../provider-status");
let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("\n[test] DigitalMenuCapability / DigitalMenuConnectionStatus -- rótulos completos em pt-BR");
{
  const capabilities: string[] = ["ORDERS", "ORDER_ITEMS", "PRODUCTS", "ADDITIONS", "DISCOUNTS", "FEES", "PAYMENTS", "CANCELLATIONS", "MENU", "INVENTORY", "CUSTOMERS_ANONYMIZED", "OPENING_HOURS", "ORDER_STATUS"];
  assert(Object.keys(m.DIGITAL_MENU_CAPABILITY_LABEL).length === capabilities.length, "exatamente as 13 capacidades especificadas, sem mais nem menos");
  for (const capability of capabilities) assert(capability in m.DIGITAL_MENU_CAPABILITY_LABEL, `capacidade ${capability} tem rótulo`);

  const statuses: string[] = ["NOT_LINKED", "LINKING", "CONNECTED", "SYNCING", "UPDATED", "PARTIAL", "NO_DATA_FOR_PERIOD", "EXPIRED_CREDENTIAL", "INSUFFICIENT_PERMISSION", "CONNECTION_ERROR", "RUNTIME_NOT_VALIDATED"];
  assert(Object.keys(m.DIGITAL_MENU_CONNECTION_STATUS_LABEL).length === statuses.length, "exatamente os 11 status especificados, sem mais nem menos");
  for (const status of statuses) assert(status in m.DIGITAL_MENU_CONNECTION_STATUS_LABEL, `status ${status} tem rótulo`);
}

console.log("\n[test] resolveConnectionStatus -- nunca declara conectado sem prova de runtime (Fase 20)");
{
  assert(m.resolveConnectionStatus({ hasConnectionRow: false, runtimeValidated: false }) === "NOT_LINKED", "sem linha de conexão -> não vinculado");
  assert(m.resolveConnectionStatus({ hasConnectionRow: true, runtimeValidated: false }) === "RUNTIME_NOT_VALIDATED", "linha existe mas runtime não validado -> RUNTIME_NOT_VALIDATED, nunca CONNECTED");
  assert(m.resolveConnectionStatus({ hasConnectionRow: true, runtimeValidated: true }) === "UPDATED", "linha existe e runtime validado -> UPDATED (prova real)");
  assert(m.resolveConnectionStatus({ hasConnectionRow: true, runtimeValidated: true, hasDataForPeriod: false }) === "NO_DATA_FOR_PERIOD", "runtime validado mas sem dados no período -> estado específico, não \"conectado\" genérico");
  assert(m.resolveConnectionStatus({ hasConnectionRow: true, runtimeValidated: false, credentialExpired: true }) === "EXPIRED_CREDENTIAL", "credencial expirada tem prioridade sobre runtime genérico");
  assert(m.resolveConnectionStatus({ hasConnectionRow: true, runtimeValidated: false, permissionDenied: true }) === "INSUFFICIENT_PERMISSION", "permissão insuficiente reportada especificamente");
  assert(m.resolveConnectionStatus({ hasConnectionRow: true, runtimeValidated: false, connectionError: true }) === "CONNECTION_ERROR", "erro de conexão reportado especificamente");
}

console.log("\n[test] isConnectedStatus -- gate explícito de runtimeValidated (defesa em profundidade)");
{
  assert(m.isConnectedStatus("UPDATED", true) === true, "UPDATED + runtime validado = considerado conectado");
  assert(m.isConnectedStatus("UPDATED", false) === false, "UPDATED sem runtime validado nunca é tratado como conectado");
  assert(m.isConnectedStatus("RUNTIME_NOT_VALIDATED", true) === false, "RUNTIME_NOT_VALIDATED nunca é \"conectado\", mesmo passando true por engano");
  assert(m.isConnectedStatus("NOT_LINKED", true) === false, "NOT_LINKED nunca é conectado, independente do parâmetro");
}

console.log(`[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
