/**
 * Prompt 13 (REC OS Core Experience) — Fase 20/21/29: Série Visual.
 *
 * REGRA ABSOLUTA (Fase 20): N peças = N imagens/arquivos independentes.
 * NUNCA uma imagem contendo N layouts, NUNCA um mosaico, NUNCA uma
 * prancha como arquivo único. Cada `CreativeSeriesItem` gera sua PRÓPRIA
 * chamada ao pipeline completo do Studio (texto Vidigal + imagem +
 * compositor) -- o orquestrador (series-orchestrator.ts) nunca pede
 * "uma imagem com N variações" ao provider.
 *
 * PERSISTÊNCIA (Fase 25): esta sprint mantém a série em memória de
 * sessão (estado React) -- a tabela `creative_series`/
 * `creative_series_items` está desenhada em
 * docs/supabase/92-feed-dna-and-creative-series.sql mas NÃO foi
 * executada (mesma razão do Feed DNA: fora do escopo seguro de
 * automação desta sprint). Documentado como débito não-bloqueante --
 * a série funciona de ponta a ponta durante a sessão, mas não
 * sobrevive a um refresh ainda.
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
  image: { url: string; width: number; height: number } | null;
  error: string | null;
}

export interface CreativeSeriesState {
  items: CreativeSeriesItem[];
  concurrency: 1;
}
