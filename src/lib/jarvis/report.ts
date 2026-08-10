/**
 * Sprint MVP Experience Completion V0.1 (Missão 4, Fase 38-40) — Anexar
 * relatório. Formatos herdados da implementação histórica (PDF/PNG/JPG/CSV),
 * sem expandir. Validação pura (testável sem rede); construção do input
 * multi-parte da Responses API isolada em uma função só.
 */
import { ALLOWED_REPORT_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "./cost-controls";
import type { JarvisReportAttachment } from "./types";

export interface ReportValidationResult {
  valid: boolean;
  reason?: "invalid_mime" | "oversized" | "empty";
}

export function validateReportAttachment(attachment: JarvisReportAttachment): ReportValidationResult {
  if (!ALLOWED_REPORT_MIME_TYPES.includes(attachment.type)) return { valid: false, reason: "invalid_mime" };
  if (attachment.size <= 0 || !attachment.dataBase64) return { valid: false, reason: "empty" };
  if (attachment.size > MAX_FILE_SIZE_BYTES) return { valid: false, reason: "oversized" };
  return { valid: true };
}

type ResponseInputContentPart =
  | { type: "input_text"; text: string }
  | { type: "input_file"; filename: string; file_data: string }
  | { type: "input_image"; image_url: string; detail: "auto" };

/**
 * Fase 38 — CSV/TXT entram como texto inline (o modelo lê melhor assim);
 * PDF/PNG/JPG entram como input_file/input_image nativos da Responses API.
 * Nunca grava em disco, nunca chama Supabase Storage.
 */
export function buildReportContentParts(attachment: JarvisReportAttachment): ResponseInputContentPart[] {
  const buffer = Buffer.from(attachment.dataBase64, "base64");

  if (attachment.type === "text/csv" || attachment.type === "text/plain") {
    return [{ type: "input_text", text: `Arquivo anexado (${attachment.name}):\n${buffer.toString("utf8").slice(0, 20_000)}` }];
  }
  if (attachment.type === "application/pdf") {
    return [{ type: "input_file", filename: attachment.name, file_data: `data:application/pdf;base64,${attachment.dataBase64}` }];
  }
  // image/png ou image/jpeg
  return [{ type: "input_image", image_url: `data:${attachment.type};base64,${attachment.dataBase64}`, detail: "auto" }];
}
