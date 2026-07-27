/**
 * Pure in-memory cash flow / reserve / spreadsheet-bridge model for "Meu
 * Negócio" — Financeiro. No persistence, no Supabase. All amounts are
 * integer cents (see src/lib/motor-lokat/money.ts), consistent with the
 * rest of the project.
 */

// ── View modes (Fase 2) — density/explanation only, NEVER authorization ────

export type BusinessViewMode = "simple" | "manager";

// ── Cash flow entries (Fase 3) ──────────────────────────────────────────────

export type CashFlowDirection = "inflow" | "outflow";

export type CashFlowCategory =
  | "vendas"
  | "recebiveis_cartao"
  | "aporte_socio"
  | "outras_receitas"
  | "insumos"
  | "folha_pagamento"
  | "aluguel"
  | "energia_agua"
  | "marketing"
  | "impostos"
  | "taxas_maquininha"
  | "manutencao"
  | "emprestimo"
  | "investimento"
  | "outras_despesas";

export type CashFlowClassification = "fixed" | "variable" | "financial" | "investment" | "tax";

export type CashFlowStatus = "planned" | "pending" | "paid" | "received" | "overdue" | "cancelled";

/**
 * Where a value actually stands, distinct from `status`: a `planned` entry
 * is always `planned` data-nature; once money moves it becomes `actual`.
 * Kept as its own field because import batches can also mark rows
 * `theoretical`, `projected` or `estimated` before any status exists.
 */
export type CashDataNature = "actual" | "planned" | "theoretical" | "projected" | "estimated";

export type CashDataSource = "manual" | "imported" | "estimated" | "system";

export interface CashFlowEntry {
  id: string;
  description: string;
  direction: CashFlowDirection;
  category: CashFlowCategory;
  classification: CashFlowClassification;
  status: CashFlowStatus;
  dataNature: CashDataNature;
  /** Integer cents, always positive — `direction` carries the sign. */
  amount: number;
  /** ISO date the obligation is due. */
  dueDate: string;
  /** ISO date the money actually moved — null until it does. */
  effectiveDate: string | null;
  /** ISO date the entry belongs to for accrual/competência purposes. */
  competenceDate: string;
  paymentMethod: string;
  source: CashDataSource;
  notes: string;
  isEssential: boolean;
  recurrence: "none" | "weekly" | "monthly" | "yearly";
  createdAt: string;
  updatedAt: string;
}

export interface CashFlowPeriod {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
}

export interface CashFlowSummary {
  period: CashFlowPeriod;
  openingBalance: number;
  actualInflows: number;
  actualOutflows: number;
  plannedInflows: number;
  plannedOutflows: number;
  netCashFlow: number;
  closingBalance: number;
  receivables: number;
  payables: number;
}

export interface CashFlowProjectionPoint {
  /** ISO date for this projection point. */
  date: string;
  /** Days from "today" (0, 30, 60, 90 — Fase 8). */
  horizonDays: number;
  projectedBalance: number;
  /** True once we're extrapolating beyond entries we actually have data for. */
  isEstimated: boolean;
}

export interface CashFlowProjection {
  startingBalance: number;
  points: CashFlowProjectionPoint[];
  firstNegativeDate: string | null;
}

// ── Reserve (Fase 6) ─────────────────────────────────────────────────────

export interface CashReserveConfig {
  currentReserve: number;
  desiredCoverageMonths: number;
  /** Category ids treated as essential outflow for reserve/runway math. */
  essentialCategories: CashFlowCategory[];
}

export type CashReserveScenario = "conservador" | "provavel" | "otimista";

export interface CashReserveSummary {
  availableBalance: number;
  currentReserve: number;
  recommendedReserve: number;
  desiredCoverageMonths: number;
  essentialMonthlyOutflow: number;
  goalPercent: number | null;
  gapToGoal: number;
  coverageMonths: number | null;
  scenario: CashReserveScenario;
  alertLevel: "ok" | "atencao" | "critico" | "insuficiente";
  recommendation: string;
}

export interface CashRunwayScenario {
  scenario: CashReserveScenario;
  monthlyBurnMultiplier: number;
  coverageMonths: number | null;
  label: string;
}

// ── Planejado vs realizado (Fase 5) ─────────────────────────────────────

export type VarianceStatus = "favorable" | "attention" | "unfavorable" | "inconclusive";

export interface VarianceResult {
  plannedAmount: number;
  actualAmount: number;
  varianceAmount: number;
  variancePercentage: number | null;
  direction: CashFlowDirection;
  interpretation: string;
  status: VarianceStatus;
  explanation: string;
}

// ── Working capital / calendar (Fase 7) ─────────────────────────────────

export interface DailyCashPoint {
  date: string;
  receivables: number;
  payables: number;
  projectedBalance: number;
}

export interface WorkingCapitalSummary {
  dailyPoints: DailyCashPoint[];
  firstNegativeDate: string | null;
  minimumBalanceNeeded: number;
  averageReceivablePayableGapDays: number | null;
}

// ── Composition / breakdown helpers (Fase 4/8) ──────────────────────────

export interface ExpenseCompositionSlice {
  category: CashFlowCategory | "outros";
  label: string;
  amount: number;
  percentage: number;
}

export interface TopOutflowEntry {
  label: string;
  amount: number;
  category: CashFlowCategory;
}

// ── Spreadsheet bridge (Fase 10/11) ─────────────────────────────────────

export type SpreadsheetSheetType =
  | "cash_flow"
  | "fixed_costs"
  | "variable_costs"
  | "revenues"
  | "accounts_receivable"
  | "accounts_payable"
  | "inventory"
  | "ingredients"
  | "products"
  | "technical_sheets"
  | "pricing"
  | "unknown";

export type SpreadsheetDataClassification = "actual" | "planned" | "theoretical" | "projected" | "estimated" | "unknown";

export interface SpreadsheetColumn {
  index: number;
  headerLabel: string;
  suggestedField: string | null;
  /** 0–1 confidence that `suggestedField` is correct. */
  confidence: number;
  sampleValues: string[];
}

export interface SpreadsheetSheet {
  name: string;
  headerRowIndex: number | null;
  suggestedType: SpreadsheetSheetType;
  typeConfidence: number;
  suggestedClassification: SpreadsheetDataClassification;
  columns: SpreadsheetColumn[];
  rowCount: number;
  previewRows: string[][];
}

export interface SpreadsheetImportFile {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  format: "xlsx" | "xls" | "csv";
  sheets: SpreadsheetSheet[];
  uploadedAt: string;
}

export interface SpreadsheetMapping {
  sheetName: string;
  columnIndex: number;
  targetField: string;
  confirmedByUser: boolean;
}

export type SpreadsheetIssueSeverity = "info" | "warning" | "error";

export interface SpreadsheetImportIssue {
  sheetName: string;
  rowIndex: number | null;
  columnIndex: number | null;
  severity: SpreadsheetIssueSeverity;
  message: string;
}

export interface SpreadsheetImportProposal {
  file: SpreadsheetImportFile;
  mappings: SpreadsheetMapping[];
  issues: SpreadsheetImportIssue[];
  rowsAccepted: number;
  rowsWithWarning: number;
  rowsRejected: number;
}

export type SpreadsheetImportStatus =
  | "uploaded"
  | "analyzing"
  | "review_required"
  | "confirmed"
  | "partially_confirmed"
  | "rejected"
  | "failed";

export interface SpreadsheetImportBatch {
  id: string;
  fileName: string;
  origin: "upload_local" | "google_sheets";
  importedAt: string;
  companyName: string;
  sheetsFound: number;
  rowsFound: number;
  rowsAccepted: number;
  rowsWithWarning: number;
  rowsRejected: number;
  classification: SpreadsheetDataClassification;
  responsible: string;
  status: SpreadsheetImportStatus;
}

// ── Google Sheets — future contract only (Fase 14) ──────────────────────

export type GoogleSheetSyncDirection = "import_only" | "export_only" | "bidirectional";
export type GoogleSheetSourceOfTruth = "lokat" | "google_sheet" | "review_required";
export type GoogleSheetConflictPolicy = "lokat_wins" | "sheet_wins" | "manual_review";
export type GoogleSheetConnectionStatus = "not_connected" | "pending_authorization" | "connected" | "error";

export interface GoogleSheetConnection {
  id: string;
  workspaceId: string;
  spreadsheetId: string | null;
  spreadsheetName: string | null;
  status: GoogleSheetConnectionStatus;
  syncDirection: GoogleSheetSyncDirection;
  sourceOfTruth: GoogleSheetSourceOfTruth;
  sheetMappings: SpreadsheetMapping[];
  lastSyncedAt: string | null;
  lastRevision: string | null;
  lastError: string | null;
  conflictPolicy: GoogleSheetConflictPolicy;
  createdBy: string;
  createdAt: string;
}
