/**
 * REC OS PAID TRAFFIC PLANNER V1 FOUNDATION — catálogo de canais pagos.
 * Só catálogo/rótulo -- nenhuma chamada de API, nenhuma credencial,
 * nenhum status de conexão real (isso é `conexoes`/`meta_publish`/
 * `google_ads` em platform-modules.ts, nunca duplicado aqui).
 */
import { PAID_TRAFFIC_CHANNELS, type PaidTrafficChannel } from "./types";

export const PAID_TRAFFIC_CHANNEL_LABEL: Record<PaidTrafficChannel, string> = {
  meta_ads: "Meta Ads",
  google_ads: "Google Ads",
  organic_support: "Suporte Orgânico",
};

export function isKnownPaidTrafficChannel(value: string): value is PaidTrafficChannel {
  return (PAID_TRAFFIC_CHANNELS as readonly string[]).includes(value);
}
