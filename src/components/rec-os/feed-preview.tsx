"use client";

/**
 * Prompt 13 (REC OS Core Experience) — Fase 16/17/18: FeedPreview.
 *
 * Simulação do grid do Instagram (3 colunas, 6 ou 9 itens). Nunca finge
 * pinned posts (a integração atual não fornece essa informação -- Fase
 * 17) e sempre expõe a limitação quando published/planned não vêm de
 * sincronização real (feed-timeline.ts já cuida disso no resolver).
 *
 * Estados por item tratados com indicação discreta (borda/etiqueta
 * pequena, nunca badge poluindo cada thumbnail) -- detalhe completo só
 * no título (`title`, tooltip nativo) e no rodapé quando `showLegend`.
 */
import { ImageIcon, Sparkles, CalendarClock } from "lucide-react";
import type { FeedTimelineItemStatus } from "@/lib/rec-os/social-profile/feed-timeline";
import type { FeedTemporalContext } from "@/lib/rec-os/social-profile/feed-timeline";
import { buildFeedGridItems } from "./feed-preview-grid";
import type { FeedPreviewGridSize, FeedPreviewMode } from "./feed-preview-grid";

export type { FeedPreviewGridSize, FeedPreviewMode } from "./feed-preview-grid";
export { buildFeedGridItems } from "./feed-preview-grid";

const STATUS_LABEL: Record<FeedTimelineItemStatus, string> = {
  published: "Publicado", planned: "Planejado", in_creation: "Em criação", future_slot: "Slot futuro",
};
const STATUS_BORDER: Record<FeedTimelineItemStatus, string> = {
  published: "border-gray-200", planned: "border-amber-300", in_creation: "border-purple-400", future_slot: "border-dashed border-gray-200",
};

export function FeedPreview({
  context, gridSize, mode, showLegend = true,
}: { context: FeedTemporalContext; gridSize: FeedPreviewGridSize; mode: FeedPreviewMode; showLegend?: boolean }) {
  const items = buildFeedGridItems(context, gridSize, mode);
  const cols = "grid-cols-3";

  return (
    <div className="space-y-2">
      <div className={`grid ${cols} gap-1.5`}>
        {items.map((item) => (
          <div
            key={item.id}
            title={`${STATUS_LABEL[item.status]}${item.label ? ` — ${item.label}` : ""}`}
            className={`relative aspect-square rounded-lg border overflow-hidden bg-gray-50 flex items-center justify-center ${STATUS_BORDER[item.status]}`}
          >
            {item.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.thumbnailUrl} alt={item.label ?? STATUS_LABEL[item.status]} className="w-full h-full object-cover" />
            ) : item.status === "in_creation" ? (
              <Sparkles className="w-4 h-4 text-purple-400" />
            ) : item.status === "planned" ? (
              <CalendarClock className="w-4 h-4 text-amber-400" />
            ) : (
              <ImageIcon className="w-4 h-4 text-gray-300" />
            )}
          </div>
        ))}
      </div>
      {context.limitation && (
        <p className="text-[10px] text-gray-400">{context.limitation}</p>
      )}
      {showLegend && (
        <div className="flex flex-wrap gap-2 text-[10px] text-gray-400">
          <span className="flex items-center gap-1"><span className={`w-2 h-2 rounded-sm border ${STATUS_BORDER.published}`} /> Publicado</span>
          <span className="flex items-center gap-1"><span className={`w-2 h-2 rounded-sm border ${STATUS_BORDER.planned}`} /> Planejado</span>
          <span className="flex items-center gap-1"><span className={`w-2 h-2 rounded-sm border ${STATUS_BORDER.in_creation}`} /> Em criação</span>
          <span className="flex items-center gap-1"><span className={`w-2 h-2 rounded-sm border border-dashed ${STATUS_BORDER.future_slot}`} /> Slot futuro</span>
        </div>
      )}
    </div>
  );
}
