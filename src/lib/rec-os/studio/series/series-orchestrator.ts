/**
 * Prompt 13 (REC OS Core Experience) — Fase 21/22/23/24: orquestração
 * de Série Visual, extraída como lógica pura (sem React, sem fetch
 * direto) pra ficar testável com o test runner .ts padrão do projeto.
 *
 * Fase 22 -- CONCURRENCY: nunca dispara N chamadas ao GPT-Image-2 em
 * paralelo (rate limit/custo/previsibilidade). V1 usa concorrência 1
 * (um item de cada vez, sequencial) -- também a única opção segura dado
 * que o servidor já tem seu próprio teto de 60s por request
 * (maxDuration, route.ts): uma série de N peças precisa ser N REQUESTS
 * HTTP distintos (um por item, ao endpoint /api/studio/images/generate
 * já existente), nunca um único request de 60s tentando gerar N
 * imagens.
 *
 * Fase 21 -- CreativeSetPlan: o prompt pede papéis temáticos por
 * posição (ex.: "01 posicionamento, 02 produto..."). Esta sprint NÃO
 * fabrica essa taxonomia -- inventar categorias fixas seria pior do que
 * a alternativa honesta: cada posição recebe um rótulo neutro ("Peça
 * N") e o MESMO brief base do usuário, com direção real e distinta
 * decidida pela própria Vidigal em cada chamada independente (ela já
 * varia composição/enquadramento por chamada, mesmo brief). Um
 * planejador de papéis via IA fica documentado como débito/fast-follow
 * -- nunca fingido aqui como já implementado.
 *
 * Fase 24 -- CANCEL: só itens "planned" (ainda não iniciados) podem ser
 * cancelados -- nunca aborta um request já em voo de forma insegura.
 */
import type { CreativeSeriesItem, CreativeSeriesSize } from "./types";

/** Fase 20/21 -- N itens = N posições independentes, rótulo neutro determinístico (nunca categoria fabricada). */
export function buildInitialSeriesItems(baseBrief: string, size: CreativeSeriesSize): CreativeSeriesItem[] {
  return Array.from({ length: size }, (_, i) => ({
    id: `series-item-${i + 1}`,
    position: i + 1,
    role: `Peça ${i + 1}`,
    brief: baseBrief,
    status: "planned" as const,
    image: null,
    error: null,
  }));
}

export type SeriesItemGenerateFn = (item: CreativeSeriesItem) => Promise<
  { ok: true; image: { url: string; width: number; height: number } } | { ok: false; error: string }
>;

export interface RunSeriesGenerationOptions {
  generate: SeriesItemGenerateFn;
  onItemUpdate: (item: CreativeSeriesItem) => void;
  /** Fase 24 -- checado antes de CADA item ainda não iniciado; nunca interrompe um item já "generating". */
  isCanceled?: (itemId: string) => boolean;
}

/**
 * Processa os itens "planned" sequencialmente (concorrência 1, Fase
 * 22). Itens que já estão "ready"/"error"/"canceled" são ignorados --
 * isso é o que permite "regenerar só a peça 04" (Fase 24): basta marcar
 * só aquele item como "planned" antes de chamar de novo.
 */
export async function runSeriesGeneration(items: CreativeSeriesItem[], options: RunSeriesGenerationOptions): Promise<CreativeSeriesItem[]> {
  const result = [...items];
  for (let i = 0; i < result.length; i++) {
    const item = result[i];
    if (item.status !== "planned") continue;
    if (options.isCanceled?.(item.id)) {
      const canceled: CreativeSeriesItem = { ...item, status: "canceled" };
      result[i] = canceled;
      options.onItemUpdate(canceled);
      continue;
    }

    const generating: CreativeSeriesItem = { ...item, status: "generating", error: null };
    result[i] = generating;
    options.onItemUpdate(generating);

    const outcome = await options.generate(generating);
    const settled: CreativeSeriesItem = outcome.ok
      ? { ...generating, status: "ready", image: outcome.image, error: null }
      : { ...generating, status: "error", image: null, error: outcome.error };
    result[i] = settled;
    options.onItemUpdate(settled);
  }
  return result;
}

/** Fase 24 -- marca um item específico de volta pra "planned" pra reentrar na fila, sem tocar nos demais. */
export function markItemForRegeneration(items: CreativeSeriesItem[], itemId: string): CreativeSeriesItem[] {
  return items.map((item) => (item.id === itemId ? { ...item, status: "planned" as const, error: null } : item));
}

/** Fase 24 -- cancela só itens ainda não iniciados; itens "generating"/"ready"/"error" nunca são afetados. */
export function cancelPendingItems(items: CreativeSeriesItem[], itemIds: Set<string>): CreativeSeriesItem[] {
  return items.map((item) => (itemIds.has(item.id) && item.status === "planned" ? { ...item, status: "canceled" as const } : item));
}
