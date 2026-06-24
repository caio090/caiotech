"use client";
import { useState } from "react";
import {
  X, Paperclip, Check, Loader2, FileCheck, ArrowRight, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import type { DbOperationalTask } from "@/lib/supabase/types";
import {
  getRequiredAssetsForTask,
  getMissingRequiredAssets,
  FORMAT_LABELS,
  type TaskAttachment,
  type RequiredAsset,
} from "@/lib/op-flow-rules";
import { AttachmentUploader, type AttachmentValue } from "@/components/attachment-uploader";

// ── Asset key helper ──────────────────────────────────────────

function assetKey(req: RequiredAsset): string {
  return req.pageNumber != null ? `${req.variant}_p${req.pageNumber}` : req.variant;
}

// ── Props ─────────────────────────────────────────────────────

interface Props {
  task: DbOperationalTask;
  existingAttachments: TaskAttachment[];
  onClose: () => void;
  onSaved: (newAttachments: TaskAttachment[]) => void;
  onSendToReview?: () => Promise<void>;
}

// ── Component ─────────────────────────────────────────────────

export function DeliveryAttachmentModal({
  task,
  existingAttachments,
  onClose,
  onSaved,
  onSendToReview,
}: Props) {
  const storedPages =
    task.carousel_pages_count ??
    (task.brief?.carousel_pages_count as number | undefined);
  const isCarousel =
    (task.format ?? "").toLowerCase().includes("carousel") ||
    (task.format ?? "").toLowerCase().includes("carrossel");

  const [carouselPages,    setCarouselPages]    = useState<number>(storedPages ?? 3);
  const [askCarouselPages, setAskCarouselPages] = useState(!storedPages && isCarousel);

  const effectiveTask: DbOperationalTask = { ...task, carousel_pages_count: carouselPages };
  const requiredAssets = getRequiredAssetsForTask(effectiveTask);

  // attachment values per asset key
  const [attachValues, setAttachValues] = useState<Record<string, AttachmentValue>>({});
  const [notes,        setNotes]        = useState<Record<string, string>>({});

  const [saving,        setSaving]        = useState(false);
  const [sendingReview, setSendingReview] = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  const taskAttachments = existingAttachments.filter(
    (a) => a.task_id === task.id && a.is_final_file,
  );

  function isAlreadySatisfied(req: RequiredAsset): boolean {
    return taskAttachments.some((a) => {
      if (!a.attachment_url) return false;
      if (!a.asset_variant) return true;
      if (req.pageNumber != null) return a.asset_variant === req.variant && a.page_number === req.pageNumber;
      return a.asset_variant === req.variant;
    });
  }

  const allSatisfied =
    !askCarouselPages &&
    requiredAssets.every(
      (req) => isAlreadySatisfied(req) || !!attachValues[assetKey(req)],
    );

  const missingRequired = getMissingRequiredAssets(effectiveTask, existingAttachments);
  const missingAndUnfilled = missingRequired.filter(
    (req) => !attachValues[assetKey(req)],
  );

  async function handleSave(andSendToReview = false) {
    if (!isSupabaseConfigured) return;
    setError(null);

    if (andSendToReview) setSendingReview(true);
    else setSaving(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const toInsert = requiredAssets
        .filter((req) => !isAlreadySatisfied(req) && !!attachValues[assetKey(req)])
        .map((req) => {
          const av = attachValues[assetKey(req)];
          return {
            task_id:          task.id,
            content_item_id:  task.content_item_id,
            client_id:        task.client_id,
            attachment_url:   av.url,
            attachment_name:  av.name,
            attachment_type:  av.type,
            attachment_size:  av.size > 0 ? av.size : null,
            storage_path:     av.storagePath ?? null,
            upload_source:    av.source,
            notes:            notes[assetKey(req)]?.trim() || null,
            asset_variant:    req.variant,
            page_number:      req.pageNumber ?? null,
            is_final_file:    true,
            delivered_by:     user?.id ?? null,
          };
        });

      let newAttachments: TaskAttachment[] = [];

      if (toInsert.length > 0) {
        const { data, error: insertError } = await supabase
          .from("operational_attachments")
          .insert(toInsert)
          .select("task_id, attachment_url, is_final_file, asset_variant, page_number, attachment_name, attachment_type, upload_source, storage_path");

        if (insertError) {
          setError("Erro ao salvar os anexos. Tente novamente.");
          setSaving(false);
          setSendingReview(false);
          return;
        }

        newAttachments = (data ?? []) as TaskAttachment[];
      }

      onSaved(newAttachments);

      if (andSendToReview && onSendToReview) {
        await onSendToReview();
      } else {
        onClose();
      }
    } catch {
      setError("Ocorreu um erro inesperado.");
    }

    setSaving(false);
    setSendingReview(false);
  }

  const formatLabel = FORMAT_LABELS[task.format ?? ""] ?? task.format ?? "Formato não definido";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex-1 min-w-0 mr-3">
            <h2 className="text-base font-black text-gray-900">Anexar entrega da demanda</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Cole o link ou faça upload do arquivo. Todos os campos obrigatórios devem ser preenchidos.
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-0.5">
                {formatLabel}
              </span>
              {task.channel && (
                <span className="text-xs text-gray-500 bg-gray-100 rounded-lg px-2 py-0.5">
                  {task.channel}
                </span>
              )}
              <span className="text-xs text-gray-500 truncate max-w-[200px]">{task.title}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 flex-shrink-0">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Carousel: ask pages */}
          {isCarousel && askCarouselPages && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 space-y-3">
              <p className="text-xs font-semibold text-amber-800">Quantas páginas tem o carrossel?</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={carouselPages}
                  onChange={(e) => setCarouselPages(Math.max(1, Math.min(20, Number(e.target.value))))}
                  className="w-20 border border-amber-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-amber-400"
                />
                <span className="text-xs text-amber-700">páginas</span>
                <button
                  onClick={() => setAskCarouselPages(false)}
                  className="ml-auto text-xs font-bold text-white bg-amber-600 px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </div>
          )}

          {/* No required assets */}
          {!askCarouselPages && requiredAssets.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-400">
              <Paperclip className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              Este formato não exige arquivo de entrega específico.
            </div>
          )}

          {/* Required assets */}
          {!askCarouselPages && requiredAssets.map((req) => {
            const key       = assetKey(req);
            const satisfied = isAlreadySatisfied(req);

            return (
              <div
                key={key}
                className={cn(
                  "rounded-xl border p-3.5 space-y-2.5",
                  satisfied ? "bg-emerald-50 border-emerald-100" : "bg-white border-gray-200",
                )}
              >
                <div className="flex items-center gap-2">
                  {satisfied
                    ? <FileCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    : <Paperclip className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  }
                  <span className="text-xs font-semibold text-gray-800">{req.label}</span>
                  <span className={cn(
                    "ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                    satisfied ? "text-emerald-700 bg-emerald-100" : "text-amber-700 bg-amber-100",
                  )}>
                    {satisfied ? "Anexado" : "Pendente"}
                  </span>
                </div>

                {!satisfied && (
                  <>
                    <AttachmentUploader
                      value={attachValues[key] ?? null}
                      onChange={(val) =>
                        setAttachValues((prev) => {
                          if (val) return { ...prev, [key]: val };
                          const next = { ...prev };
                          delete next[key];
                          return next;
                        })
                      }
                      placeholder={req.placeholder ?? "Cole o link ou faça upload do arquivo…"}
                      taskId={task.id}
                      storagePathPrefix={`tasks/${task.id}`}
                    />
                    <input
                      type="text"
                      placeholder="Observação (opcional)"
                      value={notes[key] ?? ""}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-300 bg-white placeholder-gray-400"
                    />
                  </>
                )}
              </div>
            );
          })}

          {/* Summary */}
          {!askCarouselPages && requiredAssets.length > 0 && (
            <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-xs text-gray-500">
              <span className="text-emerald-600 font-semibold">
                {requiredAssets.filter((r) => isAlreadySatisfied(r) || !!attachValues[assetKey(r)]).length}
              </span>
              /{requiredAssets.length} entrega{requiredAssets.length !== 1 ? "s" : ""}
              {missingAndUnfilled.length > 0 && (
                <span className="ml-2 text-amber-600">
                  · {missingAndUnfilled.length} pendente{missingAndUnfilled.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {!allSatisfied && onSendToReview && (
            <p className="text-[10px] text-amber-600 text-center">
              Anexe todos os arquivos obrigatórios antes de enviar para revisão.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-2 flex-wrap">
          <button
            onClick={onClose}
            className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <div className="flex-1" />
          <button
            onClick={() => handleSave(false)}
            disabled={saving || sendingReview || askCarouselPages}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-2 rounded-xl hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Salvar anexos
          </button>
          {onSendToReview && (
            <button
              onClick={() => handleSave(true)}
              disabled={!allSatisfied || saving || sendingReview || askCarouselPages}
              title={!allSatisfied ? "Preencha todos os arquivos obrigatórios antes de enviar para revisão" : undefined}
              className={cn(
                "flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-colors",
                allSatisfied && !saving && !sendingReview
                  ? "bg-purple-600 text-white hover:bg-purple-700"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed",
              )}
            >
              {sendingReview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
              Salvar e enviar para revisão
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
