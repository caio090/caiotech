"use client";

/**
 * Prompt 13/16/18 (REC OS Core Experience / Persistence Completion /
 * Creative Series Control & Asset Link Repair) — Fase 20-24 (Série
 * Visual) + persistência real (Prompt 16) + controle explícito de
 * geração (Prompt 18).
 *
 * REGRA ABSOLUTA: cada item é um request independente a
 * /api/studio/images/generate (o MESMO endpoint da peça única) --
 * a orquestração sequencial (concorrência 1) vive em
 * series-orchestrator.ts, pura e testada ali, NUNCA reaberta aqui.
 *
 * Prompt 18 fecha os P1 reais de Production:
 *   P1-A (auto-generation): CRIAR SÉRIE agora só cria a estrutura (1
 *   creative_series + N creative_series_items, todos "planned") --
 *   NENHUMA chamada ao provider acontece na criação. Geração é sempre
 *   uma ação explícita depois: "Gerar" por card, ou "Gerar todas".
 *
 *   P1-B (cancel race / stuck generating): generateOneItemPersisted()
 *   agora PATCHa generating->[provider]->ready/error como uma cadeia
 *   ÚNICA e sempre AGUARDADA -- por construção, nenhum item pode ficar
 *   "preso" em generating no caminho normal (sucesso ou falha, ambos
 *   sempre terminam num status terminal antes do orquestrador seguir
 *   pro próximo item). "Cancelar pendentes" só toca items "planned" --
 *   nunca o item em voo, que segue até resolver sozinho.
 *
 *   P1-C (visual_asset_id nunca preenchido): resolvido no backend
 *   (asset-persistence.ts/repository.ts) -- regenerate aqui só troca a
 *   imagem localmente DEPOIS que o servidor confirma o atomic swap; em
 *   caso de falha, o item "ready" antigo NUNCA é tocado (nem local nem
 *   persistido) -- por isso regenerate de um item "ready" não passa
 *   pela máquina de status planned/generating antes do resultado.
 */
import { useEffect, useState } from "react";
import { Loader2, RefreshCw, XCircle, Sparkles, AlertTriangle, Grid3x3, RotateCcw, Wand2 } from "lucide-react";
import type { DesignFormat } from "@/lib/providers/shared/types";
import { runSeriesGeneration, cancelPendingItems } from "@/lib/rec-os/studio/series/series-orchestrator";
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
interface ItemPatchResponse {
  ok: boolean;
  error?: string;
  assetId?: string | null;
  signedUrl?: string | null;
}

async function callImageProvider(input: {
  skillId: string; clientId: string | null; format: DesignFormat; item: CreativeSeriesItem;
  references: { label: string; url: string }[]; protectedAssets: { label: string; url: string }[];
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
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
      return { ok: true, url: data.image.image.url };
    }
    return { ok: false, error: data?.image?.error?.message ?? data?.error ?? "Não foi possível gerar esta peça agora." };
  } catch {
    return { ok: false, error: "Não foi possível conectar ao servidor." };
  }
}

async function patchItem(seriesId: string, itemId: string, body: { status: string; imageDataUrl?: string; errorMessage?: string }): Promise<ItemPatchResponse> {
  try {
    const res = await fetch(`/api/rec-os/series/${seriesId}/items/${itemId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as ItemPatchResponse | null;
    return data ?? { ok: false };
  } catch {
    return { ok: false };
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
  const [creating, setCreating] = useState(false);
  const [queueRunning, setQueueRunning] = useState(false);
  const [confirmingGenerateAll, setConfirmingGenerateAll] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [regenerateError, setRegenerateError] = useState<{ id: string; message: string } | null>(null);
  const [showFeedPreview, setShowFeedPreview] = useState(false);
  const [recent, setRecent] = useState<CreativeSeriesWithItems | null>(null);
  const canceledIds = useState(() => new Set<string>())[0];

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

  /**
   * Fase "GERAR ITEM" -- cadeia única e SEMPRE AGUARDADA: (reativa se
   * necessário ->) generating (persistido) -> chamada real ao
   * provider -> ready/error (persistido, com asset real quando
   * Company-scoped). Usada tanto por "Gerar" (item único) quanto por
   * "Gerar todas" (via runSeriesGeneration) -- nunca duas
   * implementações divergentes.
   */
  async function generateOneItemPersisted(item: CreativeSeriesItem): Promise<{ ok: true; image: { url: string; width: number; height: number } } | { ok: false; error: string }> {
    if (!seriesId) return { ok: false, error: "Série não inicializada." };

    let working = item;
    if (working.status === "canceled" || working.status === "error") {
      const reactivated = await patchItem(seriesId, working.id, { status: "planned" });
      if (!reactivated.ok) return { ok: false, error: "Não foi possível reativar este item." };
      working = { ...working, status: "planned", error: null };
      applyUpdate(working);
    }

    const startedGenerating = await patchItem(seriesId, working.id, { status: "generating" });
    if (!startedGenerating.ok) return { ok: false, error: "Não foi possível iniciar a geração deste item." };
    applyUpdate({ ...working, status: "generating", error: null });

    const providerResult = await callImageProvider({ skillId, clientId, format, item: working, references, protectedAssets });
    if (!providerResult.ok) {
      await patchItem(seriesId, working.id, { status: "error", errorMessage: providerResult.error });
      applyUpdate({ ...working, status: "error", error: providerResult.error });
      return { ok: false, error: providerResult.error };
    }

    const readyResult = await patchItem(seriesId, working.id, { status: "ready", imageDataUrl: providerResult.url });
    if (!readyResult.ok) {
      const message = readyResult.error ?? "A imagem foi gerada, mas não foi possível salvá-la.";
      applyUpdate({ ...working, status: "error", error: message });
      return { ok: false, error: message };
    }
    const image = { url: providerResult.url, width: 1080, height: 1080 };
    const finalItem: CreativeSeriesItem = { ...working, status: "ready", error: null, image, visualAssetId: readyResult.assetId ?? working.visualAssetId };
    applyUpdate(finalItem);
    return { ok: true, image };
  }

  async function continueRecent() {
    if (!recent) return;
    setSeriesId(recent.series.id);
    setItems(recent.items);
    setRecent(null);
  }

  /** Fase "CRIAR SÉRIE" -- só cria a estrutura. Nenhum request ao provider aqui. */
  async function createSeries() {
    setCreating(true);
    const created = await fetch("/api/rec-os/series", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: clientId ?? undefined, contentId: contentId ?? undefined, format, freeformBrief: freeformBrief.trim(), count: quantity }),
    }).then((r) => r.json()).catch(() => null);
    setCreating(false);
    if (!created?.ok) return;
    setSeriesId(created.series.series.id as string);
    setItems(created.series.items as CreativeSeriesItem[]);
  }

  async function handleGenerateOne(itemId: string) {
    if (!items) return;
    const item = items.find((i) => i.id === itemId);
    if (!item || item.status === "generating") return;
    await generateOneItemPersisted(item);
  }

  /** Fase "GERAR TODAS" -- fila explícita, concorrência 1 (series-orchestrator.ts, inalterado). Só processa items "planned". */
  async function handleGenerateAll() {
    if (!items) return;
    setConfirmingGenerateAll(false);
    setQueueRunning(true);
    const finalItems = await runSeriesGeneration(items, {
      generate: (item) => generateOneItemPersisted(item),
      onItemUpdate: () => {}, // generateOneItemPersisted já chama applyUpdate a cada transição real.
      isCanceled: (id) => canceledIds.has(id),
    });
    setItems(finalItems);
    setQueueRunning(false);
  }

  /** Fase "REGRA DE CANCELAMENTO" -- só itens "planned" (ainda não iniciados). O item em voo (generating) NUNCA é tocado, segue até resolver sozinho via generateOneItemPersisted. */
  function cancelPending() {
    if (!items || !seriesId) return;
    const pendingIds = new Set(items.filter((i) => i.status === "planned").map((i) => i.id));
    pendingIds.forEach((id) => canceledIds.add(id));
    setItems((prev) => (prev ? cancelPendingItems(prev, pendingIds) : prev));
    pendingIds.forEach((id) => {
      void patchItem(seriesId, id, { status: "canceled" }).then((res) => {
        if (!res.ok) setItems((prev) => (prev ? prev.map((i) => (i.id === id ? { ...i, status: "planned" as const } : i)) : prev));
      });
    });
  }

  /** Fase "REACTIVATE CANCELLED" -- volta pra planned, NUNCA gera sozinho. */
  async function reactivate(itemId: string) {
    if (!seriesId || !items) return;
    const res = await patchItem(seriesId, itemId, { status: "planned" });
    if (res.ok) applyUpdate({ ...items.find((i) => i.id === itemId)!, status: "planned", error: null });
  }

  /**
   * Fase "REGENERATE ASSET STRATEGY"/"REGENERATE FAILURE" -- item
   * "ready" NUNCA passa pela máquina de status planned/generating
   * antes do resultado: mostra um overlay local (regeneratingId,
   * nunca persistido) sobre a imagem ATUAL, chama o provider
   * diretamente, e só toca o banco/estado real em caso de SUCESSO
   * (atomic swap no servidor). Falha nunca apaga/marca error a imagem
   * antiga -- ela continua exatamente como estava.
   */
  async function regenerateReady(item: CreativeSeriesItem) {
    if (!seriesId) return;
    setRegenerateError(null);
    setRegeneratingId(item.id);
    const providerResult = await callImageProvider({ skillId, clientId, format, item, references, protectedAssets });
    if (!providerResult.ok) {
      setRegeneratingId(null);
      setRegenerateError({ id: item.id, message: providerResult.error });
      return; // item "ready" antigo intocado, local e persistido.
    }
    const readyResult = await patchItem(seriesId, item.id, { status: "ready", imageDataUrl: providerResult.url });
    setRegeneratingId(null);
    if (!readyResult.ok) {
      setRegenerateError({ id: item.id, message: readyResult.error ?? "Não foi possível salvar a nova versão." });
      return; // atomic swap não confirmado -> imagem antiga continua válida.
    }
    applyUpdate({ ...item, status: "ready", error: null, image: { url: providerResult.url, width: 1080, height: 1080 }, visualAssetId: readyResult.assetId ?? item.visualAssetId });
  }

  async function handleRegenerate(itemId: string) {
    if (!items) return;
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    if (item.status === "ready") { void regenerateReady(item); return; }
    // "Tentar novamente" (error) -- reativa e gera normalmente, sem asset antigo a proteger.
    void generateOneItemPersisted(item);
  }

  const plannedCount = items?.filter((i) => i.status === "planned").length ?? 0;
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
            {quantity === 1 ? "Cria a estrutura da peça." : `Cria a estrutura da série com ${quantity} peças (nenhuma geração começa ainda).`}
          </p>
          <button type="button" onClick={() => void createSeries()} disabled={!freeformBrief.trim() || creating}
            className="text-xs font-bold bg-purple-600 text-white px-4 py-2 rounded-xl disabled:bg-gray-200 disabled:text-gray-400 flex items-center gap-1.5 shrink-0">
            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {quantity === 1 ? "Criar peça" : "Criar série"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
          {items.filter((i) => i.status === "ready").length}/{items.length} prontas
        </p>
        <div className="flex items-center gap-3">
          {queueRunning && items.some((i) => i.status === "planned") && (
            <button type="button" onClick={cancelPending} className="text-[10px] font-bold text-gray-500 hover:text-red-600 flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Cancelar pendentes
            </button>
          )}
          {!queueRunning && plannedCount > 0 && !confirmingGenerateAll && (
            <button type="button" onClick={() => setConfirmingGenerateAll(true)} className="text-[10px] font-bold text-purple-600 flex items-center gap-1">
              <Wand2 className="w-3 h-3" /> Gerar todas
            </button>
          )}
          {items.length > 1 && (
            <button type="button" onClick={() => setShowFeedPreview((v) => !v)} className="text-[10px] font-bold text-purple-600 flex items-center gap-1">
              <Grid3x3 className="w-3 h-3" /> Simular no feed
            </button>
          )}
        </div>
      </div>

      {confirmingGenerateAll && (
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-2.5 flex items-center justify-between gap-3">
          <p className="text-[11px] text-purple-700">Isso vai gerar {plannedCount} {plannedCount === 1 ? "imagem" : "imagens"}.</p>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => void handleGenerateAll()} className="text-[10px] font-bold bg-purple-600 text-white px-2.5 py-1 rounded-lg">Confirmar</button>
            <button type="button" onClick={() => setConfirmingGenerateAll(false)} className="text-[10px] font-bold text-gray-400">Cancelar</button>
          </div>
        </div>
      )}
      {queueRunning && items.some((i) => i.status === "generating") && (
        <p className="text-[10px] text-gray-400">Finalizando peça atual antes de considerar cancelamento…</p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => {
          const isRegeneratingThis = regeneratingId === item.id;
          return (
            <div key={item.id} className="rounded-xl border border-gray-100 overflow-hidden bg-gray-50">
              <div className="aspect-square flex items-center justify-center relative">
                {item.image ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- data: URL ou signed URL dinâmica */}
                    <img src={item.image.url} alt={item.role} className="w-full h-full object-cover" />
                    {isRegeneratingThis && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      </div>
                    )}
                  </>
                ) : item.status === "generating" ? (
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                ) : item.status === "error" ? (
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                ) : (
                  <span className="text-[10px] text-gray-300">{item.status === "canceled" ? "Cancelada" : "Planejada"}</span>
                )}
              </div>
              <div className="p-1.5 space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[9px] font-bold text-gray-500 truncate">{item.role}</span>
                  {item.status === "planned" && (
                    <button type="button" onClick={() => void handleGenerateOne(item.id)} title="Gerar esta peça" className="text-purple-500 hover:text-purple-700">
                      <Sparkles className="w-3 h-3" />
                    </button>
                  )}
                  {(item.status === "ready" || item.status === "error") && (
                    <button type="button" onClick={() => void handleRegenerate(item.id)} disabled={isRegeneratingThis} title={item.status === "ready" ? "Regenerar esta peça" : "Tentar novamente"} className="text-gray-400 hover:text-purple-600 disabled:opacity-40">
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  )}
                  {item.status === "canceled" && (
                    <button type="button" onClick={() => void reactivate(item.id)} title="Reativar" className="text-gray-400 hover:text-purple-600">
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {regenerateError?.id === item.id && (
                  <p className="text-[8px] text-red-500 leading-tight">{regenerateError.message}</p>
                )}
              </div>
            </div>
          );
        })}
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
