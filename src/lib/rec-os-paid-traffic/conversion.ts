/**
 * REC OS PAID TRAFFIC PLANNER V1 FOUNDATION — catálogo de eventos de
 * conversão. Apenas definição/vocabulário -- nenhum pixel, nenhum
 * rastreamento real, nenhuma integração.
 */
import { CONVERSION_GOALS, type ConversionGoal } from "./types";

export const CONVERSION_GOAL_LABEL: Record<ConversionGoal, string> = {
  whatsapp_message: "Mensagem no WhatsApp",
  lead_capture: "Captura de lead",
  purchase: "Compra",
  store_visit: "Visita à loja",
};

export function isKnownConversionGoal(value: string): value is ConversionGoal {
  return (CONVERSION_GOALS as readonly string[]).includes(value);
}
