/**
 * Prompt 13 (REC OS Core Experience) — Fase 16/17/18: lógica pura do
 * grid do FeedPreview, extraída de feed-preview.tsx (nenhum JSX aqui)
 * pra ficar testável com o test runner .ts padrão do projeto.
 */
import type { FeedTemporalContext, FeedTimelineItem } from "@/lib/rec-os/social-profile/feed-timeline";

export type FeedPreviewGridSize = 6 | 9;
export type FeedPreviewMode = "now" | "with_new_piece";

/**
 * Monta os N itens do grid (mais recente primeiro, como o Instagram
 * real) -- pura, testável sem React. `with_new_piece` insere o que está
 * "em criação" no início (Fase 18: a peça nova ocupa o próximo slot
 * simulado); `now` mostra só o que já está publicado. Sempre completa
 * com `future_slot` vazio até `gridSize` -- nunca menos células do que
 * o grid pede.
 */
export function buildFeedGridItems(context: FeedTemporalContext, gridSize: FeedPreviewGridSize, mode: FeedPreviewMode): FeedTimelineItem[] {
  const publishedSorted = [...context.published].sort((a, b) => {
    const at = a.occurredAt ? Date.parse(a.occurredAt) : 0;
    const bt = b.occurredAt ? Date.parse(b.occurredAt) : 0;
    return bt - at;
  });
  const lead = mode === "with_new_piece" ? context.inCreation : [];
  const combined = [...lead, ...publishedSorted];
  const trimmed = combined.slice(0, gridSize);
  const missing = gridSize - trimmed.length;
  const placeholders: FeedTimelineItem[] = Array.from({ length: Math.max(missing, 0) }, (_, i) => ({
    id: `future-slot-${i}`, status: "future_slot", thumbnailUrl: null, label: null, occurredAt: null,
  }));
  return [...trimmed, ...placeholders];
}
