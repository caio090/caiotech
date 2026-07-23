/**
 * Fase 11 — report attachment validation. Pure, no file content is ever
 * executed or interpreted here — this only decides whether a file is safe
 * to send to the assistant at all. The actual interpretation happens in the
 * "report" assistant mode (a plain data-extraction prompt, never code
 * execution).
 */

import type { ResponseInput } from "openai/resources/responses/responses";
import { ALLOWED_REPORT_EXTENSIONS, ALLOWED_REPORT_TYPES, MAX_FILE_SIZE_BYTES, MAX_CONTEXT_CHARS, truncate } from "./cost-controls";
import type { ReportInterpretationResult } from "./types";

export interface ReportFileMeta {
  name: string;
  type: string;
  size: number;
}

export interface ReportValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateReportFile(file: ReportFileMeta): ReportValidationResult {
  if (!file.name || file.name.trim().length === 0) {
    return { valid: false, reason: "Nome de arquivo inválido." };
  }
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_REPORT_EXTENSIONS.includes(extension)) {
    return { valid: false, reason: `Extensão não suportada (${extension}). Use PDF, PNG, JPG, CSV ou TXT.` };
  }
  if (!ALLOWED_REPORT_TYPES.includes(file.type)) {
    return { valid: false, reason: `Tipo de arquivo não suportado (${file.type || "desconhecido"}).` };
  }
  if (file.size <= 0) {
    return { valid: false, reason: "Arquivo vazio." };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, reason: `Arquivo maior que o limite de ${Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))} MB.` };
  }
  return { valid: true };
}

export interface ReportAttachment extends ReportFileMeta {
  /** Base64-encoded file bytes, decoded server-side only — never executed. */
  dataBase64: string;
}

/**
 * Builds the multi-part Responses API input for a validated attachment.
 * CSV/TXT are decoded to plain text and inlined (cheaper, no vision needed).
 * PDF/PNG/JPG are sent as native file/image content parts.
 */
export function buildReportInput(attachment: ReportAttachment, promptText: string): ResponseInput {
  const isTextLike = attachment.type === "text/csv" || attachment.type === "text/plain";
  if (isTextLike) {
    const decoded = Buffer.from(attachment.dataBase64, "base64").toString("utf-8");
    const inlined = truncate(decoded, MAX_CONTEXT_CHARS);
    return [{ role: "user", content: [{ type: "input_text", text: `${promptText}\n\nConteúdo do arquivo (${attachment.name}):\n${inlined}` }] }];
  }
  if (attachment.type === "application/pdf") {
    return [{
      role: "user",
      content: [
        { type: "input_text", text: promptText },
        { type: "input_file", filename: attachment.name, file_data: `data:application/pdf;base64,${attachment.dataBase64}` },
      ],
    }];
  }
  return [{
    role: "user",
    content: [
      { type: "input_text", text: promptText },
      { type: "input_image", detail: "auto", image_url: `data:${attachment.type};base64,${attachment.dataBase64}` },
    ],
  }];
}

/** Fallback result returned when the assistant is unavailable — never a fabricated interpretation. */
export function unavailableReportInterpretation(): ReportInterpretationResult {
  return {
    period: "",
    source: "",
    metrics: [],
    proposedClassification: "",
    confidence: "insuficiente" as const,
    missingData: ["Assistente indisponível — interpretação não realizada."],
    warnings: ["Nenhum dado foi extraído automaticamente. Revise o relatório manualmente."],
    questions: [],
  };
}
