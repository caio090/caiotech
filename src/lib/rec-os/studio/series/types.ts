/**
 * Prompt 13/16/18 (REC OS Core Experience / Persistence Completion /
 * Creative Series Control & Asset Link Repair) — Fase 20/21/29: Série
 * Visual.
 *
 * REGRA ABSOLUTA (Fase 20): N peças = N imagens/arquivos independentes.
 * NUNCA uma imagem contendo N layouts, NUNCA um mosaico, NUNCA uma
 * prancha como arquivo único. Cada `CreativeSeriesItem` gera sua PRÓPRIA
 * chamada ao pipeline completo do Studio (texto Vidigal + imagem +
 * compositor) -- o orquestrador (series-orchestrator.ts) nunca pede
 * "uma imagem com N variações" ao provider.
 *
 * PERSISTÊNCIA: `creative_series`/`creative_series_items` (SQL 92) e o
 * Storage privado de assets (SQL 93) estão live em Production desde o
 * Prompt 16 -- série e status sobrevivem a refresh. `visualAssetId`
 * (Prompt 18) é o vínculo real com `client_visual_assets`, nunca uma
 * URL assinada persistida (expira -- sempre regerada na hidratação).
 */
export type CreativeSeriesSize = 1 | 3 | 6 | 9;

export type CreativeSeriesItemStatus = "planned" | "generating" | "ready" | "error" | "canceled";

export interface CreativeSeriesItem {
  id: string;
  position: number;
  /** Rótulo de posição -- V1 é "Peça N" determinístico, nunca uma categoria fabricada (ver comentário em series-orchestrator.ts sobre CreativeSetPlan). */
  role: string;
  brief: string;
  headline?: string;
  cta?: string;
  status: CreativeSeriesItemStatus;
  /** Prompt 18 -- FK real pra client_visual_assets.id quando o item tem um asset persistido (Company-scoped); null em Free Mode ou antes da primeira geração bem-sucedida. */
  visualAssetId?: string | null;
  image: { url: string; width: number; height: number } | null;
  error: string | null;
}

export interface CreativeSeriesState {
  items: CreativeSeriesItem[];
  concurrency: 1;
}
