"use client";

/**
 * Prompt 13/16 (REC OS Core Experience / Persistence Completion) —
 * Fase 20-24 (Série Visual) + Fase 18-30/39-42 (persistência real).
 *
 * REGRA ABSOLUTA: cada item é um request independente a
 * /api/studio/images/generate (o MESMO endpoint da peça única) --
 * a orquestração sequencial (concorrência 1) vive em
 * series-orchestrator.ts, pura e testada ali, NUNCA reaberta aqui.
 *
 * Prompt 16 fecha o P1-B do QA do Prompt 13 (série só existia em React
 * state): a série e cada item agora são criados/atualizados de verdade
 * via /api/rec-os/series (creative_series/creative_series_items, RLS
 * real) -- um refresh de página reidrata a partir do Supabase, nunca
 * de sessionStorage/localStorage (Fase "PERSISTENCE DEFINITION": React
 * state != persistência).
 */
import { useEffect, useState } from "react";
import { Loader2, RefreshCw, XCircle, Sparkles, AlertTriangle, Grid3x3, RotateCcw } from "lucide-react";
import type { DesignFormat } from "@/lib/providers/shared/types";
import {
  runSeriesGeneration, markItemForRegeneration, cancelPendingItems,
} from "@/lib/rec-os/studio/series/series-orchestrator";
import type { CreativeSeriesItem, CreativeSeriesSize } from "@/lib/rec-os/studio/series/types";
import type { CreativeSeriesWithItems } from "@/lib/rec-os/studio/series/repository";
import { FeedPreview } from "@/components/rec-os/feed-preview";
import { resolveFeedTemporalContext } from "@/lib/rec-os/social-profile/feed-timeline";
import type { FeedTimelineItem } from "@/lib/rec-os/social-profile/feed-timeline";

interface GenerateApiResponse {
  ok: boolean;
  error?: string;
  image?: { status: string; image: { url: string; width: number; height: number } | null; error?: { message: string } };
}

async function generateOneItem(input: {
  skillId: string; clientId: string | null; format: DesignFormat; item: CreativeSeriesItem;
  references: { label: string; url: string }[]; protectedAssets: { label: string; url: string }[];
}): Promise<{ ok: true; image: { url: string; width: number; height: number } } | { ok: false; error: string }> {
  try {
    const response = await fetch("/api/studio/images/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        skillId: input.skillId,
        input: {
          freeformBrief: input.item.brief.trim(), format: input.format,
          companyId: input.clientId ?? undefined,
          headline: input.item.headline?.trim() || undefined, cta: input.item.cta?.trim() || undefined,
        },
        assets: { references: input.references, protectedAssets: input.protectedAssets },
      }),
    });
    const data = (await response.json().catch(() => null)) as GenerateApiResponse | null;
    if (data?.image?.status === "completed" && data.image.image) {
      return { ok: true, image: data.image.image };
    }
    return { ok: false, error: data?.image?.error?.message ?? data?.error ?? "Não foi possível gerar esta peça agora." };
  } catch {
    return { ok: false, error: "Não foi possível conectar ao servidor." };
  }
}

async function patchSeriesItem(seriesId: string, itemId: string, body: { status: string; imageDataUrl?: string; errorMessage?: string }): Promise<boolean> {
  try {
    const res = await fetch(`/api/rec-os/series/${seriesId}/items/${itemId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const SIZES: CreativeSeriesSize[] = [1, 3, 6, 9];

export function SeriesQuantityPicker({ value, onChange }: { value: CreativeSeriesSize; onChange: (v: CreativeSeriesSize) => void }) {
  return (
    <div>
      <p className="text-xs font-bold text-gray-600 mb-1.5">Quantidade</p>
      <div className="flex gap-2">
        {SIZES.map((size) => (
          <button key={size} type="button" onClick={() => onChange(size)}
            className={`text-xs font-bold px-3 py-2 rounded-xl ${value === size ? "bg-purple-600 text-white" : "bg-gray-50 text-gray-500"}`}>
            {size === 1 ? "Peça única" : `Série de ${size}`}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SeriesPanel({
  skillId, clientId, contentId, format, freeformBrief, references, protectedAssets, quantity,
}: {
  skillId: string; clientId: string | null; contentId: string | null; format: DesignFormat; freeformBrief: string;
  references: { label: string; url: string }[]; protectedAssets: { label: string; url: string }[];
  quantity: CreativeSeriesSize;
}) {
  const [seriesId, setSeriesId] = useState<string | null>(null);
  const [items, setItems] = useState<CreativeSeriesItem[] | null>(null);
  const [running, setRunning] = useState(false);
  const [showFeedPreview, setShowFeedPreview] = useState(false);
  const [recent, setRecent] = useState<CreativeSeriesWithItems | null>(null);
  const canceledIds = useState(() => new Set<string>())[0];

  // Fase 25 -- não inicia uma série nova automaticamente a cada mount;
  // só verifica se existe uma recente pra oferecer "continuar".
  useEffect(() => {
    if (seriesId) return;
    const params = new URLSearchParams();
    if (clientId) params.set("client_id", clientId);
    if (contentId) params.set("content_id", contentId);
    fetch(`/api/rec-os/series?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => { if (data?.ok && data.series) setRecent(data.series as CreativeSeriesWithItems); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, contentId]);

  function applyUpdate(next: CreativeSeriesItem) {
    setItems((prev) => (prev ? prev.map((i) => (i.id === next.id ? next : i)) : prev));
  }

  function persistItemUpdate(sid: string, item: CreativeSeriesItem) {
    // Fase 27/28/29 -- persiste a transição real (nunca aguarda o PATCH
    // pra seguir pro próximo item -- a sequência de geração não depende
    // da confirmação de escrita, só a sobrevivência ao refresh depende).
    void patchSeriesItem(sid, item.id, {
      status: item.status,
      imageDataUrl: item.status === "ready" && item.image ? item.image.url : undefined,
      errorMessage: item.status === "error" && item.error ? item.error : undefined,
    });
  }

  async function continueRecent() {
    if (!recent) return;
    setSeriesId(recent.series.id);
    setItems(recent.items);
    setRecent(null);
  }

  async function start() {
    setRunning(true);
    const created = await fetch("/api/rec-os/series", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: clientId ?? undefined, contentId: contentId ?? undefined, format, freeformBrief: freeformBrief.trim(), count: quantity }),
    }).then((r) => r.json()).catch(() => null);

    if (!created?.ok) {
      setRunning(false);
      return;
    }
    const sid = created.series.series.id as string;
    const initial = created.series.items as CreativeSeriesItem[];
    setSeriesId(sid);
    setItems(initial);

    const finalItems = await runSeriesGeneration(initial, {
      generate: (item) => generateOneItem({ skillId, clientId, format, item, references, protectedAssets }),
      onItemUpdate: (item) => { applyUpdate(item); persistItemUpdate(sid, item); },
      isCanceled: (id) => canceledIds.has(id),
    });
    setItems(finalItems);
    setRunning(false);
  }

  async function regenerate(itemId: string) {
    if (!items || !seriesId) return;
    const marked = markItemForRegeneration(items, itemId);
    setItems(marked);
    await patchSeriesItem(seriesId, itemId, { status: "planned" });
    setRunning(true);
    const finalItems = await runSeriesGeneration(marked, {
      generate: (item) => generateOneItem({ skillId, clientId, format, item, references, protectedAssets }),
      onItemUpdate: (item) => { applyUpdate(item); persistItemUpdate(seriesId, item); },
      isCanceled: (id) => canceledIds.has(id),
    });
    setItems(finalItems);
    setRunning(false);
  }

  function cancelNotStarted() {
    if (!items || !seriesId) return;
    const pendingIds = new Set(items.filter((i) => i.status === "planned").map((i) => i.id));
    pendingIds.forEach((id) => canceledIds.add(id));
    setItems((prev) => (prev ? cancelPendingItems(prev, pendingIds) : prev));
    // Fase 48 -- otimista; se a persistência falhar, reverte só aquele item.
    pendingIds.forEach((id) => {
      void patchSeriesItem(seriesId, id, { status: "canceled" }).then((ok) => {
        if (!ok) setItems((prev) => (prev ? prev.map((i) => (i.id === id ? { ...i, status: "planned" as const } : i)) : prev));
      });
    });
  }

  const inCreation: FeedTimelineItem[] = (items ?? [])
    .filter((i) => i.image)
    .map((i) => ({ id: i.id, status: "in_creation" as const, thumbnailUrl: i.image!.url, label: i.role, occurredAt: null }));
  const feedContext = resolveFeedTemporalContext(inCreation);
  const gridSize = quantity === 1 ? 6 : (quantity === 9 ? 9 : 6);

  if (!items) {
    return (
      <div className="space-y-2">
        {recent && recent.items.length > 0 && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-center justify-between gap-3">
            <p className="text-xs text-gray-600">
              Série recente: {recent.items.filter((i) => i.status === "ready").length}/{recent.items.length} prontas
            </p>
            <button type="button" onClick={() => void continueRecent()} className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1 shrink-0">
              <RotateCcw className="w-3 h-3" /> Continuar
            </button>
          </div>
        )}
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 flex items-center justify-between gap-3">
          <p className="text-xs text-purple-700">
            {quantity === 1 ? "Vai gerar 1 imagem." : `Esta série vai gerar ${quantity} imagens independentes.`}
          </p>
          <button type="button" onClick={() => void start()} disabled={!freeformBrief.trim() || running}
            className="text-xs font-bold bg-purple-600 text-white px-4 py-2 rounded-xl disabled:bg-gray-200 disabled:text-gray-400 flex items-center gap-1.5 shrink-0">
            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Criar {quantity === 1 ? "arte" : "série"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
          {items.filter((i) => i.status === "ready").length}/{items.length} prontas
        </p>
        <div className="flex items-center gap-3">
          {running && items.some((i) => i.status === "planned") && (
            <button type="button" onClick={cancelNotStarted} className="text-[10px] font-bold text-gray-500 hover:text-red-600 flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Cancelar pendentes
            </button>
          )}
          {items.length > 1 && (
            <button type="button" onClick={() => setShowFeedPreview((v) => !v)} className="text-[10px] font-bold text-purple-600 flex items-center gap-1">
              <Grid3x3 className="w-3 h-3" /> Simular no feed
            </button>
          )}
        </div>
      </div>

      <div className={`grid gap-2 ${items.length <= 3 ? "grid-cols-3" : "grid-cols-3"}`}>
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-gray-100 overflow-hidden bg-gray-50">
            <div className="aspect-square flex items-center justify-center relative">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- data: URL ou signed URL dinâmica
                <img src={item.image.url} alt={item.role} className="w-full h-full object-cover" />
              ) : item.status === "generating" ? (
                <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
              ) : item.status === "error" ? (
                <AlertTriangle className="w-4 h-4 text-red-400" />
              ) : (
                <span className="text-[10px] text-gray-300">{item.status === "canceled" ? "Cancelada" : "Planejada"}</span>
              )}
            </div>
            <div className="p-1.5 flex items-center justify-between gap-1">
              <span className="text-[9px] font-bold text-gray-500 truncate">{item.role}</span>
              {(item.status === "ready" || item.status === "error") && (
                <button type="button" onClick={() => void regenerate(item.id)} disabled={running} title="Regenerar esta peça" className="text-gray-400 hover:text-purple-600 disabled:opacity-40">
                  <RefreshCw className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showFeedPreview && (
        <div className="bg-white border border-gray-100 rounded-xl p-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-gray-400 mb-2">Prévia no feed (simulação)</p>
          <FeedPreview context={feedContext} gridSize={gridSize} mode="with_new_piece" />
        </div>
      )}
    </div>
  );
}
