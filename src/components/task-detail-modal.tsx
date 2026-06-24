"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { isTaskOverdue, fmtTaskDate, STATUS_LABELS } from "@/lib/operational-tasks";
import {
  getNextOperationalAction, getRequiredAssetsForTask, hasDeliveryAttachment,
  getMissingRequiredAssets, FORMAT_LABELS,
  type TaskAttachment,
} from "@/lib/op-flow-rules";
import type { DbOperationalTask } from "@/lib/supabase/types";
import { DeliveryAttachmentModal } from "@/components/delivery-attachment-modal";
import {
  X, Building2, Calendar, Tag, AlertCircle, CheckCircle2,
  Loader2, ArrowRight, ArrowLeft, FileCheck, Paperclip,
  AlertOctagon, ChevronDown, ChevronRight, RotateCcw,
  ClipboardList,
} from "lucide-react";

// ── Brief field display ───────────────────────────────────────

const BRIEF_LABELS: Record<string, string> = {
  objetivo: "Objetivo", objetivo_principal: "Objetivo", copy: "Copy",
  legenda: "Legenda", caption: "Legenda", cta: "CTA", cta_texto: "CTA",
  referencia_visual: "Referência visual", visual_reference: "Referência visual",
  referencia_url: "Link de referência", link_referencia: "Link de referência",
  formato: "Formato", canal: "Canal", publico: "Público",
  tom: "Tom de voz", roteiro: "Roteiro", script: "Roteiro",
  observacoes: "Observações",
};

const PRIORITY_COLOR: Record<string, string> = {
  urgente: "bg-red-100 text-red-700",
  alta:    "bg-orange-100 text-orange-700",
  media:   "bg-yellow-100 text-yellow-800",
  baixa:   "bg-gray-100 text-gray-500",
};

const PRIORITY_LABELS: Record<string, string> = {
  urgente: "Urgente", alta: "Alta", media: "Média", baixa: "Baixa",
};

const STATUS_COLOR: Record<string, string> = {
  backlog:          "bg-gray-100 text-gray-600",
  briefing:         "bg-emerald-50 text-emerald-700",
  em_producao:      "bg-blue-100 text-blue-700",
  revisao_interna:  "bg-purple-100 text-purple-700",
  ajuste:           "bg-orange-100 text-orange-700",
  aguardando_cliente: "bg-yellow-100 text-yellow-700",
  aprovado:         "bg-emerald-100 text-emerald-700",
  agendado:         "bg-teal-100 text-teal-700",
  concluido:        "bg-gray-200 text-gray-600",
  cancelado:        "bg-red-100 text-red-600",
};

// ── Step back logic ───────────────────────────────────────────

const PREVIOUS_STATUS: Record<string, string> = {
  briefing:         "backlog",
  em_producao:      "briefing",
  revisao_interna:  "em_producao",
  ajuste:           "em_producao",
  aprovado:         "revisao_interna",
  agendado:         "aprovado",
};

const ADMIN_ROLES = new Set(["admin", "head", "estrategista"]);

function canGoBack(status: string, role: string): boolean {
  const prev = PREVIOUS_STATUS[status];
  if (!prev) return false;
  if (["aprovado", "agendado"].includes(status)) return ADMIN_ROLES.has(role);
  return true;
}

// ── Props ─────────────────────────────────────────────────────

interface Props {
  task: DbOperationalTask;
  attachments: TaskAttachment[];
  primaryRole: string;
  onClose: () => void;
  onAction: (taskId: string, newStatus: string, msg: string) => Promise<void>;
  onAttachSaved: (attachments: TaskAttachment[]) => void;
}

// ── Component ─────────────────────────────────────────────────

export function TaskDetailModal({
  task,
  attachments,
  primaryRole,
  onClose,
  onAction,
  onAttachSaved,
}: Props) {
  const [tab,            setTab]            = useState<"briefing" | "producao">("briefing");
  const [acting,         setActing]         = useState(false);
  const [showAttach,     setShowAttach]     = useState(false);
  const [confirmBack,    setConfirmBack]    = useState(false);
  const [backNote,       setBackNote]       = useState("");
  const [briefExpanded,  setBriefExpanded]  = useState(true);

  const client    = task.clients?.[0]?.company_name;
  const over      = isTaskOverdue(task.due_date);
  const due       = fmtTaskDate(task.due_date);
  const brief     = task.brief as Record<string, unknown> | null ?? {};
  const nextAction = getNextOperationalAction(task, attachments);
  const required   = getRequiredAssetsForTask(task);
  const missing    = getMissingRequiredAssets(task, attachments);
  const taskAttachments = attachments.filter((a) => a.task_id === task.id && a.is_final_file);
  const hasAttach  = hasDeliveryAttachment(task.id, attachments);

  const prevStatus = PREVIOUS_STATUS[task.status];
  const showBack   = canGoBack(task.status, primaryRole);

  // Brief entries (filtered: skip objects, nulls, and internal format/carousel keys already shown)
  const SKIP_KEYS = new Set(["tipo", "formats", "is_hybrid", "required_assets", "carousel_pages_count", "visual_structure"]);
  const briefEntries = Object.entries(brief).filter(
    ([k, v]) => !SKIP_KEYS.has(k) && v != null && v !== "" && typeof v !== "object"
  );

  // Visual structure (art/design briefing)
  const visualStructure = brief.visual_structure as Record<string, string> | undefined;

  // Hybrid formats from brief
  const hybridFormats = brief.formats as string[] | undefined;

  async function doAction(newStatus: string) {
    if (acting) return;
    setActing(true);
    await onAction(task.id, newStatus, `"${task.title}" → ${STATUS_LABELS[newStatus] ?? newStatus}`);
    setActing(false);
  }

  async function doGoBack() {
    if (!prevStatus || acting) return;
    setActing(true);
    try {
      if (isSupabaseConfigured) {
        const supabase = createClient();
        await supabase
          .from("operational_tasks")
          .update({
            status:     prevStatus,
            updated_at: new Date().toISOString(),
            ...(backNote.trim() ? { internal_notes: (task.internal_notes ? task.internal_notes + "\n" : "") + `[Voltou etapa] ${backNote.trim()}` } : {}),
          })
          .eq("id", task.id);
      }
      await onAction(task.id, prevStatus, `"${task.title}" voltou para ${STATUS_LABELS[prevStatus] ?? prevStatus}`);
    } catch {}
    setActing(false);
    setConfirmBack(false);
    setBackNote("");
  }

  async function handleSendToReview() {
    await doAction("revisao_interna");
    setShowAttach(false);
  }

  const formatLabel = hybridFormats && hybridFormats.length > 1
    ? hybridFormats.map((f) => FORMAT_LABELS[f] ?? f).join(" + ")
    : FORMAT_LABELS[task.format ?? ""] ?? task.format ?? "";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-2 sm:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <ClipboardList className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-black text-gray-900 leading-snug">{task.title}</h2>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", STATUS_COLOR[task.status] ?? "bg-gray-100 text-gray-600")}>
                  {STATUS_LABELS[task.status] ?? task.status}
                </span>
                {task.priority && (
                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", PRIORITY_COLOR[task.priority] ?? "bg-gray-100")}>
                    {PRIORITY_LABELS[task.priority] ?? task.priority}
                  </span>
                )}
                {hasAttach && (
                  <span className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                    <FileCheck className="w-3 h-3" /> Entrega anexada
                  </span>
                )}
                {over && (
                  <span className="text-[10px] text-red-600 font-medium flex items-center gap-0.5">
                    <AlertCircle className="w-3 h-3" /> Atrasada
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 flex-shrink-0">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 flex-wrap mt-2.5 text-xs text-gray-400">
            {client && (
              <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{client}</span>
            )}
            {task.due_date && (
              <span className={cn("flex items-center gap-1", over ? "text-red-500 font-medium" : "")}>
                <Calendar className="w-3 h-3" />{due}
              </span>
            )}
            {formatLabel && (
              <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{formatLabel}</span>
            )}
            {task.channel && <span className="text-gray-300">{task.channel}</span>}
            {task.department && <span className="capitalize text-gray-400">{task.department}</span>}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-3 bg-gray-100 rounded-xl p-0.5 w-fit">
            {(["briefing", "producao"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "text-xs font-medium px-3 py-1.5 rounded-lg transition-all capitalize",
                  tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700",
                )}
              >
                {t === "briefing" ? "Briefing" : "Produção"}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ── BRIEFING TAB ── */}
          {tab === "briefing" && (
            <>
              {/* Hybrid formats */}
              {hybridFormats && hybridFormats.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider self-center">Formatos:</span>
                  {hybridFormats.map((f) => (
                    <span key={f} className="text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-lg">
                      {FORMAT_LABELS[f] ?? f}
                    </span>
                  ))}
                </div>
              )}

              {task.description && (
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Descrição</p>
                  <p className="text-xs text-gray-700 leading-relaxed">{task.description}</p>
                </div>
              )}

              {briefEntries.length > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5">
                  <button
                    onClick={() => setBriefExpanded((v) => !v)}
                    className="flex items-center gap-2 w-full text-left mb-2"
                  >
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider flex-1">Briefing</p>
                    {briefExpanded
                      ? <ChevronDown className="w-3.5 h-3.5 text-blue-400" />
                      : <ChevronRight className="w-3.5 h-3.5 text-blue-400" />
                    }
                  </button>
                  {briefExpanded && (
                    <div className="space-y-2.5">
                      {briefEntries.map(([key, value]) => (
                        <div key={key}>
                          <p className="text-[10px] font-semibold text-blue-500 mb-0.5">
                            {BRIEF_LABELS[key] ?? key}
                          </p>
                          <p className="text-xs text-blue-900 leading-relaxed whitespace-pre-wrap">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Visual structure / art briefing */}
              {visualStructure && Object.keys(visualStructure).length > 0 && (
                <div className="bg-purple-50 border border-purple-100 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] font-black text-purple-600 uppercase tracking-wider mb-2.5">Briefing de arte</p>
                  <div className="space-y-2">
                    {[
                      { key: "headline",           label: "Headline" },
                      { key: "support_text",        label: "Texto de apoio" },
                      { key: "complementary_text",  label: "Texto complementar" },
                      { key: "cta",                 label: "CTA" },
                      { key: "badge_text",          label: "Selo / destaque" },
                      { key: "visual_notes",        label: "Observações visuais" },
                      { key: "required_elements",   label: "Elementos obrigatórios" },
                      { key: "optional_elements",   label: "Elementos opcionais" },
                    ].filter(({ key }) => visualStructure[key]).map(({ key, label }) => (
                      <div key={key}>
                        <p className="text-[10px] font-semibold text-purple-500 mb-0.5">{label}</p>
                        <p className="text-xs text-purple-900 leading-relaxed whitespace-pre-wrap">{visualStructure[key]}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {task.internal_notes && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider mb-1">Nota interna</p>
                  <p className="text-xs text-amber-800 whitespace-pre-wrap leading-relaxed">{task.internal_notes}</p>
                </div>
              )}

              {task.status === "ajuste" && task.client_notes && (
                <div className="bg-orange-50 border border-orange-100 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] font-black text-orange-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <AlertOctagon className="w-3 h-3" /> Ajuste solicitado
                  </p>
                  <p className="text-xs text-orange-800 leading-relaxed">{task.client_notes}</p>
                </div>
              )}

              {briefEntries.length === 0 && !task.description && !task.internal_notes && (
                <div className="text-center py-8 text-sm text-gray-400">
                  <ClipboardList className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                  Nenhum briefing registrado nesta demanda.
                </div>
              )}
            </>
          )}

          {/* ── PRODUÇÃO TAB ── */}
          {tab === "producao" && (
            <>
              {/* Next action */}
              <div className={cn(
                "rounded-xl border px-3.5 py-3",
                nextAction.blocked      ? "bg-gray-50 border-gray-100" :
                nextAction.needsAttachment ? "bg-indigo-50 border-indigo-100" :
                ["briefing","backlog"].includes(task.status) ? "bg-emerald-50 border-emerald-100" :
                task.status === "ajuste" ? "bg-orange-50 border-orange-100" :
                "bg-purple-50 border-purple-100",
              )}>
                <p className="text-[10px] font-black uppercase tracking-wider mb-1 text-gray-500">Próxima ação</p>
                <p className="text-xs text-gray-700 leading-snug">{nextAction.description}</p>
              </div>

              {/* Required attachments */}
              {required.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Anexos obrigatórios</p>
                  <div className="space-y-1.5">
                    {required.map((req) => {
                      const key = req.pageNumber != null ? `${req.variant}_p${req.pageNumber}` : req.variant;
                      const done = taskAttachments.some((a) => {
                        if (!a.attachment_url) return false;
                        if (!a.asset_variant) return true;
                        if (req.pageNumber != null) return a.asset_variant === req.variant && a.page_number === req.pageNumber;
                        return a.asset_variant === req.variant;
                      });
                      return (
                        <div key={key} className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg text-xs",
                          done ? "bg-emerald-50 border border-emerald-100" : "bg-gray-50 border border-gray-200",
                        )}>
                          {done
                            ? <FileCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                            : <Paperclip className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          }
                          <span className={done ? "text-emerald-700 font-medium" : "text-gray-600"}>{req.label}</span>
                          <span className={cn(
                            "ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                            done ? "text-emerald-700 bg-emerald-100" : "text-amber-600 bg-amber-100",
                          )}>
                            {done ? "Anexado" : "Pendente"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {missing.length > 0 && (
                    <p className="text-[10px] text-amber-600 mt-1.5">
                      {missing.length} entrega{missing.length > 1 ? "s" : ""} pendente{missing.length > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              )}

              {/* Sent attachments detail */}
              {taskAttachments.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Entregas enviadas</p>
                  <div className="space-y-1.5">
                    {taskAttachments.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-xs">
                        <FileCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span className="flex-1 truncate text-gray-600">{a.attachment_name ?? a.attachment_url ?? "Arquivo"}</span>
                        {a.attachment_url && (
                          <a href={a.attachment_url} target="_blank" rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline flex-shrink-0">Ver</a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Checklist */}
              {task.checklist && task.checklist.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Checklist</p>
                  <div className="space-y-1.5">
                    {task.checklist.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className={cn("w-3.5 h-3.5 flex-shrink-0", item.done ? "text-emerald-500" : "text-gray-300")} />
                        <span className={item.done ? "text-gray-600 line-through" : "text-gray-700"}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer — actions */}
        <div className="flex-shrink-0 px-5 pb-5 pt-3 border-t border-gray-100 space-y-3">

          {/* Confirm go-back */}
          {confirmBack && (
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-orange-800">
                Voltar para <strong>{STATUS_LABELS[prevStatus!] ?? prevStatus}</strong>?
              </p>
              <p className="text-[10px] text-orange-600">
                Isso não exclui a tarefa, o briefing ou os anexos.
              </p>
              <input
                type="text"
                placeholder="Motivo (opcional)"
                value={backNote}
                onChange={(e) => setBackNote(e.target.value)}
                className="w-full text-xs border border-orange-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-orange-400 bg-white"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setConfirmBack(false); setBackNote(""); }}
                  className="flex-1 text-xs text-gray-600 border border-gray-200 rounded-xl py-2 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={doGoBack}
                  disabled={acting}
                  className="flex-1 text-xs font-bold text-white bg-orange-600 rounded-xl py-2 hover:bg-orange-700 disabled:opacity-60 flex items-center justify-center gap-1"
                >
                  {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  Confirmar
                </button>
              </div>
            </div>
          )}

          {!confirmBack && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Go back */}
              {showBack && (
                <button
                  onClick={() => setConfirmBack(true)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" /> Voltar etapa
                </button>
              )}

              <div className="flex-1" />

              {/* Attach button */}
              {(nextAction.needsAttachment || (hasAttach && ["em_producao","ajuste"].includes(task.status))) && (
                <button
                  onClick={() => setShowAttach(true)}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  {nextAction.needsAttachment ? "Anexar entrega" : "Ver / atualizar anexo"}
                </button>
              )}

              {/* Main action button */}
              {nextAction.next && !nextAction.needsAttachment && (
                <button
                  onClick={() => doAction(nextAction.next!)}
                  disabled={acting}
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-colors disabled:opacity-60",
                    ["briefing","backlog"].includes(task.status) ? "bg-emerald-600 text-white hover:bg-emerald-700" :
                    task.status === "ajuste" ? "bg-orange-600 text-white hover:bg-orange-700" :
                    "bg-purple-600 text-white hover:bg-purple-700",
                  )}
                >
                  {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                  {nextAction.label}
                </button>
              )}

              <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-2">
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delivery attachment modal — stacked on top */}
      {showAttach && (
        <DeliveryAttachmentModal
          task={task}
          existingAttachments={attachments}
          onClose={() => setShowAttach(false)}
          onSaved={(newA) => { onAttachSaved(newA); }}
          onSendToReview={
            task.status === "em_producao" || task.status === "ajuste"
              ? handleSendToReview
              : undefined
          }
        />
      )}
    </div>
  );
}
