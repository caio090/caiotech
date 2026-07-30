/**
 * EXEMPLO SIMULADO — dados fictícios de demonstração para "Meu Negócio" →
 * Financeiro. Nada aqui representa a situação financeira real de nenhum
 * cliente (Duh Lanches incluída). Nenhuma persistência, nenhum Supabase.
 *
 * Único objeto central (Fase 16): FINANCE_DEMO_STATE é a fonte de todas as
 * fixtures deste módulo — os componentes de UI leem daqui, nunca duplicam
 * valores em fixtures paralelas.
 */

import type {
  CashFlowEntry, CashReserveConfig, GoogleSheetConnection, SpreadsheetImportBatch,
} from "./types";

export const DEMO_DATA_LABEL = "EXEMPLO SIMULADO";

const ESSENTIAL_CATEGORIES: CashFlowEntry["category"][] = ["aluguel", "folha_pagamento", "energia_agua", "insumos", "impostos"];

function entry(partial: Omit<CashFlowEntry, "createdAt" | "updatedAt" | "notes" | "recurrence" | "paymentMethod" | "source"> & Partial<Pick<CashFlowEntry, "notes" | "recurrence" | "paymentMethod" | "source">>): CashFlowEntry {
  return {
    notes: "",
    recurrence: "none",
    paymentMethod: "pix",
    source: "manual",
    createdAt: "2026-06-01T09:00:00.000Z",
    updatedAt: "2026-06-01T09:00:00.000Z",
    ...partial,
  };
}

/**
 * ~30 lançamentos cobrindo junho–agosto/2026 (hoje = 27/07/2026), com
 * receita/despesa, planejado/realizado, atrasado, cancelado e teórico —
 * o suficiente para exercitar todos os cálculos do módulo.
 */
export const CASH_FLOW_ENTRIES_FIXTURES: CashFlowEntry[] = [
  // Junho — encerrado, tudo realizado.
  entry({ id: "cf-1", description: "Vendas de junho (balcão + delivery)", direction: "inflow", category: "vendas", classification: "variable", status: "received", dataNature: "actual", amount: 4_820_000, dueDate: "2026-06-30", effectiveDate: "2026-06-30", competenceDate: "2026-06-30", isEssential: false }),
  entry({ id: "cf-2", description: "Aluguel do salão — junho", direction: "outflow", category: "aluguel", classification: "fixed", status: "paid", dataNature: "actual", amount: 320_000, dueDate: "2026-06-05", effectiveDate: "2026-06-05", competenceDate: "2026-06-01", isEssential: true, paymentMethod: "boleto" }),
  entry({ id: "cf-3", description: "Folha de pagamento — junho", direction: "outflow", category: "folha_pagamento", classification: "fixed", status: "paid", dataNature: "actual", amount: 980_000, dueDate: "2026-06-05", effectiveDate: "2026-06-05", competenceDate: "2026-06-01", isEssential: true, paymentMethod: "transferencia" }),
  entry({ id: "cf-4", description: "Compra de insumos — fornecedor principal", direction: "outflow", category: "insumos", classification: "variable", status: "paid", dataNature: "actual", amount: 1_150_000, dueDate: "2026-06-10", effectiveDate: "2026-06-10", competenceDate: "2026-06-10", isEssential: true, paymentMethod: "boleto" }),
  entry({ id: "cf-5", description: "Energia e água — junho", direction: "outflow", category: "energia_agua", classification: "fixed", status: "paid", dataNature: "actual", amount: 68_000, dueDate: "2026-06-15", effectiveDate: "2026-06-16", competenceDate: "2026-06-01", isEssential: true, paymentMethod: "boleto" }),
  entry({ id: "cf-6", description: "Taxas de maquininha — junho", direction: "outflow", category: "taxas_maquininha", classification: "financial", status: "paid", dataNature: "actual", amount: 96_000, dueDate: "2026-06-30", effectiveDate: "2026-06-30", competenceDate: "2026-06-30", isEssential: false, paymentMethod: "debito_automatico" }),

  // Julho — mês corrente, parte realizado / parte planejado / uma atrasada.
  entry({ id: "cf-7", description: "Vendas de julho até hoje", direction: "inflow", category: "vendas", classification: "variable", status: "received", dataNature: "actual", amount: 4_230_000, dueDate: "2026-07-27", effectiveDate: "2026-07-27", competenceDate: "2026-07-27", isEssential: false }),
  entry({ id: "cf-8", description: "Vendas de julho — meta planejada", direction: "inflow", category: "vendas", classification: "variable", status: "planned", dataNature: "planned", amount: 4_500_000, dueDate: "2026-07-31", effectiveDate: null, competenceDate: "2026-07-31", isEssential: false }),
  entry({ id: "cf-9", description: "Aluguel do salão — julho", direction: "outflow", category: "aluguel", classification: "fixed", status: "paid", dataNature: "actual", amount: 320_000, dueDate: "2026-07-05", effectiveDate: "2026-07-05", competenceDate: "2026-07-01", isEssential: true, paymentMethod: "boleto" }),
  entry({ id: "cf-10", description: "Folha de pagamento — julho", direction: "outflow", category: "folha_pagamento", classification: "fixed", status: "paid", dataNature: "actual", amount: 1_010_000, dueDate: "2026-07-05", effectiveDate: "2026-07-05", competenceDate: "2026-07-01", isEssential: true, paymentMethod: "transferencia" }),
  entry({ id: "cf-11", description: "Compra de insumos — fornecedor principal", direction: "outflow", category: "insumos", classification: "variable", status: "paid", dataNature: "actual", amount: 1_080_000, dueDate: "2026-07-10", effectiveDate: "2026-07-11", competenceDate: "2026-07-10", isEssential: true, paymentMethod: "boleto" }),
  entry({ id: "cf-12", description: "Energia e água — julho", direction: "outflow", category: "energia_agua", classification: "fixed", status: "paid", dataNature: "actual", amount: 71_000, dueDate: "2026-07-15", effectiveDate: "2026-07-16", competenceDate: "2026-07-01", isEssential: true, paymentMethod: "boleto" }),
  entry({ id: "cf-13", description: "Imposto Simples Nacional — julho", direction: "outflow", category: "impostos", classification: "tax", status: "overdue", dataNature: "planned", amount: 210_000, dueDate: "2026-07-20", effectiveDate: null, competenceDate: "2026-06-30", isEssential: true, paymentMethod: "boleto" }),
  entry({ id: "cf-14", description: "Marketing — impulsionamento de posts", direction: "outflow", category: "marketing", classification: "variable", status: "paid", dataNature: "actual", amount: 45_000, dueDate: "2026-07-08", effectiveDate: "2026-07-08", competenceDate: "2026-07-08", isEssential: false, paymentMethod: "cartao" }),
  entry({ id: "cf-15", description: "Manutenção da coifa", direction: "outflow", category: "manutencao", classification: "variable", status: "cancelled", dataNature: "planned", amount: 38_000, dueDate: "2026-07-12", effectiveDate: null, competenceDate: "2026-07-12", isEssential: false, notes: "Orçamento cancelado — fornecedor não confirmou disponibilidade." }),
  entry({ id: "cf-16", description: "Taxas de maquininha — julho até hoje", direction: "outflow", category: "taxas_maquininha", classification: "financial", status: "paid", dataNature: "actual", amount: 89_000, dueDate: "2026-07-27", effectiveDate: "2026-07-27", competenceDate: "2026-07-27", isEssential: false, paymentMethod: "debito_automatico" }),
  entry({ id: "cf-17", description: "Recebível de cartão — vendas parceladas", direction: "inflow", category: "recebiveis_cartao", classification: "variable", status: "pending", dataNature: "planned", amount: 310_000, dueDate: "2026-08-05", effectiveDate: null, competenceDate: "2026-07-20", isEssential: false }),
  entry({ id: "cf-18", description: "Aporte de sócio — capital de giro", direction: "inflow", category: "aporte_socio", classification: "investment", status: "received", dataNature: "actual", amount: 500_000, dueDate: "2026-07-02", effectiveDate: "2026-07-02", competenceDate: "2026-07-02", isEssential: false }),

  // Agosto — planejado à frente, para projeção 30/60/90 e calendário.
  entry({ id: "cf-19", description: "Aluguel do salão — agosto", direction: "outflow", category: "aluguel", classification: "fixed", status: "planned", dataNature: "planned", amount: 320_000, dueDate: "2026-08-05", effectiveDate: null, competenceDate: "2026-08-01", isEssential: true, paymentMethod: "boleto" }),
  entry({ id: "cf-20", description: "Folha de pagamento — agosto", direction: "outflow", category: "folha_pagamento", classification: "fixed", status: "planned", dataNature: "planned", amount: 1_010_000, dueDate: "2026-08-05", effectiveDate: null, competenceDate: "2026-08-01", isEssential: true, paymentMethod: "transferencia" }),
  entry({ id: "cf-21", description: "Compra de insumos programada", direction: "outflow", category: "insumos", classification: "variable", status: "planned", dataNature: "planned", amount: 1_120_000, dueDate: "2026-08-10", effectiveDate: null, competenceDate: "2026-08-10", isEssential: true, paymentMethod: "boleto" }),
  entry({ id: "cf-22", description: "Energia e água — agosto (estimado)", direction: "outflow", category: "energia_agua", classification: "fixed", status: "planned", dataNature: "estimated", amount: 72_000, dueDate: "2026-08-15", effectiveDate: null, competenceDate: "2026-08-01", isEssential: true, paymentMethod: "boleto" }),
  entry({ id: "cf-23", description: "Vendas de agosto — projeção", direction: "inflow", category: "vendas", classification: "variable", status: "planned", dataNature: "projected", amount: 4_600_000, dueDate: "2026-08-31", effectiveDate: null, competenceDate: "2026-08-31", isEssential: false }),
  entry({ id: "cf-24", description: "Empréstimo — parcela mensal", direction: "outflow", category: "emprestimo", classification: "financial", status: "planned", dataNature: "planned", amount: 150_000, dueDate: "2026-08-15", effectiveDate: null, competenceDate: "2026-08-15", isEssential: true, paymentMethod: "debito_automatico" }),
  entry({ id: "cf-25", description: "Imposto Simples Nacional — agosto", direction: "outflow", category: "impostos", classification: "tax", status: "planned", dataNature: "planned", amount: 215_000, dueDate: "2026-08-20", effectiveDate: null, competenceDate: "2026-07-31", isEssential: true, paymentMethod: "boleto" }),
  entry({ id: "cf-26", description: "Investimento — nova fritadeira", direction: "outflow", category: "investimento", classification: "investment", status: "planned", dataNature: "planned", amount: 480_000, dueDate: "2026-08-22", effectiveDate: null, competenceDate: "2026-08-22", isEssential: false, paymentMethod: "boleto" }),
];

/** Saldo inicial em 01/06/2026, para fechar o histórico antes das entradas acima. */
export const CASH_FLOW_OPENING_BALANCE = 1_650_000;

export const CASH_RESERVE_CONFIG_FIXTURE: CashReserveConfig = {
  currentReserve: 2_100_000,
  desiredCoverageMonths: 3,
  essentialCategories: ESSENTIAL_CATEGORIES,
};

export const IMPORT_HISTORY_FIXTURES: SpreadsheetImportBatch[] = [
  {
    id: "import-1",
    fileName: "fluxo-caixa-julho-2026.xlsx",
    origin: "upload_local",
    importedAt: "2026-07-20T14:32:00.000Z",
    companyName: "Duh Lanches",
    sheetsFound: 3,
    rowsFound: 64,
    rowsAccepted: 58,
    rowsWithWarning: 5,
    rowsRejected: 1,
    classification: "actual",
    responsible: "Equipe Duh Lanches",
    status: "confirmed",
  },
  {
    id: "import-2",
    fileName: "custos-fixos-agosto-2026.xlsx",
    origin: "upload_local",
    importedAt: "2026-07-24T09:10:00.000Z",
    companyName: "Duh Lanches",
    sheetsFound: 1,
    rowsFound: 12,
    rowsAccepted: 10,
    rowsWithWarning: 2,
    rowsRejected: 0,
    classification: "planned",
    responsible: "Equipe Duh Lanches",
    status: "partially_confirmed",
  },
  {
    id: "import-3",
    fileName: "planilha-antiga-contador.xls",
    origin: "upload_local",
    importedAt: "2026-07-25T18:05:00.000Z",
    companyName: "Duh Lanches",
    sheetsFound: 2,
    rowsFound: 30,
    rowsAccepted: 0,
    rowsWithWarning: 0,
    rowsRejected: 30,
    classification: "unknown",
    responsible: "Equipe Duh Lanches",
    status: "rejected",
  },
];

/** Contrato futuro (Fase 14) — sem OAuth, sem token, sem sincronização real. */
export const GOOGLE_SHEET_CONNECTION_FIXTURE: GoogleSheetConnection = {
  id: "gsheet-demo-1",
  workspaceId: "duh-lanches",
  spreadsheetId: null,
  spreadsheetName: null,
  status: "not_connected",
  syncDirection: "import_only",
  sourceOfTruth: "lokat",
  sheetMappings: [],
  lastSyncedAt: null,
  lastRevision: null,
  lastError: null,
  conflictPolicy: "manual_review",
  createdBy: "demonstracao",
  createdAt: "2026-07-27T00:00:00.000Z",
};

/** "Hoje", fixo na demonstração para tornar os cálculos determinísticos. */
export const DEMO_TODAY_ISO = "2026-07-27";
