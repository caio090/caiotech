import type { ReportDataConnector, ReportFetchResult } from "../types";

/**
 * A connector with no live API to call — every fetch* returns
 * "connector_blocked" honestly, instead of a connector that pretends to
 * exist. Used for AiPede today (no official API/authorization — see
 * src/lib/motor-lokat/ai-pede-contract.ts, state "documentacao_pendente")
 * and for OlaClick when a client hasn't connected it: the only real path
 * for those providers this sprint is file import via
 * src/lib/reports/import/importer.ts, not this connector.
 */
export function createBlockedConnector(provider: string, clientId: string, sourceName: string, reason: string): ReportDataConnector {
  const blocked = <T>(): Promise<ReportFetchResult<T>> => Promise.resolve({ availability: { status: "connector_blocked", reason }, data: null });
  return {
    id: `${provider}:${clientId}`,
    provider,
    clientId,
    sourceName,
    sourceType: "connector",
    connected: false,
    lastSyncAt: null,
    capabilities: [],
    fetchSummary: blocked,
    fetchOrders: blocked,
    fetchProducts: blocked,
    fetchPayments: blocked,
    fetchChannels: blocked,
    fetchTimeDistribution: blocked,
    fetchCustomers: blocked,
    fetchRawExport: blocked,
  };
}
