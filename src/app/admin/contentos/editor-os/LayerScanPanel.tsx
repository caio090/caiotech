"use client";

import { Loader2, X, ScanText, AlertTriangle } from "lucide-react";
import { confidenceLabel } from "@/lib/editor-os/layer-scanner/confidence";
import type { DetectedTextLayer, LayerScanResult, LayerScanStage } from "@/lib/editor-os/layer-scanner/types";

export type ScanStatus = "idle" | "preparing" | "scanning_text" | "scanning_objects" | "review" | "converting" | "completed" | "cancelled" | "error" | "unsupported";

interface Props {
  status: ScanStatus;
  progress: number;
  result: LayerScanResult | null;
  errorMessage: string | null;
  selectedLayerIds: Set<string>;
  textOverrides: Record<string, string>;
  backgroundRemovalMode: "overlay_only" | "solid_background_cleanup";
  onToggleLayer: (id: string) => void;
  onTextOverrideChange: (id: string, text: string) => void;
  onBackgroundModeChange: (mode: "overlay_only" | "solid_background_cleanup") => void;
  onCancel: () => void;
  onConvert: () => void;
  onClose: () => void;
}

const STAGE_LABEL: Record<LayerScanStage, string> = {
  preparing: "Preparando imagem",
  scanning_text: "Identificando textos",
  scanning_objects: "Procurando elementos",
  done: "Concluído",
};

function stageForStatus(status: ScanStatus): LayerScanStage | null {
  if (status === "preparing") return "preparing";
  if (status === "scanning_text") return "scanning_text";
  if (status === "scanning_objects") return "scanning_objects";
  if (status === "review" || status === "converting" || status === "completed") return "done";
  return null;
}

export function LayerScanPanel(props: Props) {
  const { status, progress, result, errorMessage, selectedLayerIds, textOverrides, backgroundRemovalMode } = props;
  const stage = stageForStatus(status);
  const textLayers = (result?.layers ?? []).filter((l): l is DetectedTextLayer => l.kind === "text");
  const objectCapability = result?.capabilities.find((c) => c.id === "object_segmentation");
  const backgroundCapability = result?.capabilities.find((c) => c.id === "background_cleanup");

  const body = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <ScanText className="w-4 h-4 text-indigo-400" />
          <p className="text-xs font-bold text-zinc-100">Escanear camadas</p>
        </div>
        <button onClick={props.onClose} aria-label="Fechar painel de escaneamento" data-testid="editor-layer-scan-close" className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {(status === "preparing" || status === "scanning_text" || status === "scanning_objects") && (
          <div data-testid="editor-layer-scan-progress" className="space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              <p className="text-xs text-zinc-300">{stage ? STAGE_LABEL[stage] : "Processando"}</p>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            {status === "scanning_objects" && (
              <p className="text-[10px] text-zinc-500">
                Detecção de textos disponível. Separação automática de objetos ainda não está habilitada.
              </p>
            )}
            <button onClick={props.onCancel} data-testid="editor-layer-scan-cancel" className="text-[11px] font-bold text-zinc-400 hover:text-zinc-200">
              Cancelar
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-3 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-red-300">{errorMessage ?? "Não foi possível escanear esta imagem."}</p>
          </div>
        )}

        {status === "unsupported" && (
          <p className="text-[11px] text-zinc-400">Selecione exatamente uma imagem para escanear camadas.</p>
        )}

        {(status === "review" || status === "converting" || status === "completed") && result && (
          <>
            {objectCapability && (
              <p className="text-[10px] text-zinc-500 border-b border-zinc-800 pb-2">{objectCapability.reason}</p>
            )}

            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Elementos encontrados — {textLayers.length} texto{textLayers.length === 1 ? "" : "s"}
            </p>

            {textLayers.length === 0 && (
              <p className="text-xs text-zinc-500">Nenhum texto identificado nesta imagem.</p>
            )}

            <div className="space-y-2">
              {textLayers.map((layer) => (
                <div key={layer.id} data-testid={`editor-layer-scan-result-${layer.id}`} className="rounded-lg border border-zinc-800 bg-zinc-950 p-2.5 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selectedLayerIds.has(layer.id)}
                      onChange={() => props.onToggleLayer(layer.id)}
                      disabled={status !== "review"}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-bold uppercase tracking-wide text-indigo-400">Texto</span>
                        <span data-testid={`editor-layer-scan-confidence-${layer.id}`} className="text-[9px] text-zinc-500">{confidenceLabel(layer.confidence)}</span>
                      </div>
                      <textarea
                        value={textOverrides[layer.id] ?? layer.text}
                        onChange={(e) => props.onTextOverrideChange(layer.id, e.target.value)}
                        disabled={status !== "review"}
                        rows={2}
                        aria-label={`Texto identificado: ${layer.label}`}
                        className="w-full text-xs bg-zinc-900 border border-zinc-700 rounded-md px-2 py-1 mt-1 text-zinc-100 resize-none disabled:opacity-60"
                      />
                      <p className="text-[9px] text-zinc-600 mt-1">Fonte estimada: {layer.styleEstimate.fontFamily} · {layer.styleEstimate.fontSizePx}px · cor {layer.styleEstimate.color}</p>
                      <p className="text-[9px] text-zinc-600">{layer.limitations[0]}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {textLayers.length > 0 && status === "review" && (
              <div className="pt-2 border-t border-zinc-800 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Remoção do texto do fundo</p>
                <label className="flex items-start gap-2 text-[11px] text-zinc-300">
                  <input type="radio" name="bg-mode" checked={backgroundRemovalMode === "overlay_only"} onChange={() => props.onBackgroundModeChange("overlay_only")} className="mt-0.5" />
                  <span>Manter original — o texto da imagem original continua no fundo.</span>
                </label>
                <label className="flex items-start gap-2 text-[11px] text-zinc-300">
                  <input type="radio" name="bg-mode" checked={backgroundRemovalMode === "solid_background_cleanup"} onChange={() => props.onBackgroundModeChange("solid_background_cleanup")} className="mt-0.5" />
                  <span>Tentar limpar fundo uniforme (Experimental) — só funciona quando a área ao redor do texto for uma cor quase sólida.</span>
                </label>
                {backgroundCapability && <p className="text-[9px] text-zinc-600">{backgroundCapability.reason}</p>}
              </div>
            )}

            {status === "review" && (
              <button
                onClick={props.onConvert}
                disabled={selectedLayerIds.size === 0}
                data-testid="editor-layer-scan-convert"
                className="w-full text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg py-2 transition-colors"
              >
                Converter {selectedLayerIds.size} camada{selectedLayerIds.size === 1 ? "" : "s"} — Revisar antes de aplicar
              </button>
            )}
            {status === "converting" && (
              <div className="flex items-center justify-center gap-2 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <p className="text-xs text-zinc-300">Criando camadas...</p>
              </div>
            )}
            {status === "completed" && (
              <p className="text-[11px] text-emerald-400">Conversão estimada aplicada. Revise o resultado no canvas.</p>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside data-testid="editor-layer-scan-panel" className="hidden sm:flex w-80 shrink-0 border-l border-zinc-800 bg-zinc-900 flex-col">
        {body}
      </aside>
      <div className="sm:hidden fixed inset-x-0 bottom-0 z-50 max-h-[75vh] flex flex-col bg-zinc-900 border-t border-zinc-800 rounded-t-2xl shadow-2xl">
        <div className="w-10 h-1 rounded-full bg-zinc-700 mx-auto mt-2" />
        {body}
      </div>
    </>
  );
}
