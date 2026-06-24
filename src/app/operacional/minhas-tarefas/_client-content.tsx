"use client";
import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { DbOperationalTask } from "@/lib/supabase/types";
import { ROLE_LABELS } from "@/lib/access-control";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { isTaskOverdue, fmtTaskDate, STATUS_LABELS } from "@/lib/operational-tasks";
import {
  hasDeliveryAttachment, hasRequiredAttachments, canSendToReview,
  type TaskAttachment,
} from "@/lib/op-flow-rules";
import { DeliveryAttachmentModal } from "@/components/delivery-attachment-modal";
import {
  ClipboardList, AlertCircle, Calendar, User,
  Clock, CheckCircle2, ChevronDown, ChevronRight,
  Play, Send, RotateCcw, Check, Loader2,
  FileCheck, AlertOctagon,
} from "lucide-react";

// ── Status groups ─────────────────────────────────────────────

const STATUS_GROUPS = [
  { key: "em_producao",        color: "text-blue-600",   bg: "bg-blue-50" },
  { key: "revisao_interna",    color: "text-purple-600", bg: "bg-purple-50" },
  { key: "ajuste",             color: "text-orange-600", bg: "bg-orange-50" },
  { key: "aguardando_cliente", color: "text-amber-600",  bg: "bg-amber-50" },
  { key: "briefing",           color: "text-sky-600",    bg: "bg-sky-50" },
  { key: "backlog",            color: "text-slate-500",  bg: "bg-slate-50" },
  { key: "aprovado",           color: "text-teal-600",   bg: "bg-teal-50" },
  { key: "agendado",           color: "text-indigo-600", bg: "bg-indigo-50" },
];

const PRIORITY_BADGE: Record<string, string> = {
  urgente: "bg-red-100 text-red-700",
  alta:    "bg-orange-100 text-orange-700",
  media:   "bg-yellow-100 text-yellow-800",
  baixa:   "bg-gray-100 text-gray-600",
};

// ── Status action buttons ─────────────────────────────────────

const STATUS_ACTIONS: Record<string, { label: string; icon: React.ElementType; next: string; color: string }> = {
  briefing:        { label: "Li e entendi o briefing",  icon: Play,         next: "em_producao",     color: "bg-emerald-600 text-white hover:bg-emerald-700" },
  backlog:         { label: "Iniciar briefing",          icon: Play,         next: "briefing",        color: "bg-slate-600 text-white hover:bg-slate-700" },
  revisao_interna: { label: "Aprovado ✓",               icon: Check,        next: "aprovado",        color: "bg-teal-600 text-white hover:bg-teal-700" },
  ajuste:          { label: "Concluir ajuste",           icon: RotateCcw,    next: "em_producao",     color: "bg-blue-600 text-white hover:bg-blue-700" },
  aprovado:        { label: "Marcar como concluído",     icon: CheckCircle2, next: "concluido",       color: "bg-emerald-600 text-white hover:bg-emerald-700" },
  agendado:        { label: "Marcar como concluído",     icon: CheckCircle2, next: "concluido",       color: "bg-emerald-600 text-white hover:bg-emerald-700" },
};

// Secondary action: "Solicitar ajuste" from revisao_interna
const SECONDARY_ACTIONS: Record<string, { label: string; icon: React.ElementType; next: string; color: string }> = {
  revisao_interna: { label: "Solicitar ajuste", icon: AlertOctagon, next: "ajuste", color: "bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100" },
};

// Brief field labels
const BRIEF_LABELS: Record<string, string> = {
  objetivo: "Objetivo", objetivo_principal: "Objetivo", copy: "Copy",
  legenda: "Legenda", caption: "Legenda", cta: "CTA", cta_texto: "CTA",
  referencia_visual: "Referência visual", visual_reference: "Referência visual",
  referencia_url: "Link de referência", link_referencia: "Link de referência",
  formato: "Formato", canal: "Canal", publico: "Público",
  tom: "Tom de voz", roteiro: "Roteiro", script: "Roteiro",
  observacoes: "Observações",
};

// ── Toast ─────────────────────────────────────────────────────

function Toast({ msg, ok = true, onClose }: { msg: string; ok?: boolean; onClose: () => void }) {
  return (
    <div className={cn(
      "fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2",
      ok ? "bg-gray-900" : "bg-red-700",
    )}>
      {ok
        ? <Check className="w-3.5 h-3.5 text-emerald-400" />
        : <AlertCircle className="w-3.5 h-3.5 text-red-200" />
      }
      {msg}
      <button onClick={onClose} className="ml-1 text-white/60 hover:text-white text-base leading-none">×</button>
    </div>
  );
}

// ── Task card ─────────────────────────────────────────────────

function TaskCard({
  task,
  primaryRole: _primaryRole,
  attachments,
  onStatusChange,
  onAttachSaved,
}: {
  task: DbOperationalTask;
  primaryRole: string;
  attachments: TaskAttachment[];
  onStatusChange: (id: string, newStatus: string, msg: string) => Promise<void>;
  onAttachSaved: (newAttachments: TaskAttachment[]) => void;
}) {
  const [expanded,   setExpanded]   = useState(false);
  const [updating,   setUpdating]   = useState(false);
  const [showModal,  setShowModal]  = useState(false);

  const client    = task.clients?.[0]?.company_name;
  const assigned  = task.profiles?.[0]?.name;
  const due       = fmtTaskDate(task.due_date);
  const over      = isTaskOverdue(task.due_date);
  const checklist = Array.isArray(task.checklist)
    ? (task.checklist as { label: string; done: boolean }[])
    : [];
  const doneCount = checklist.filter((c) => c.done).length;

  const taskHasAttachment  = hasDeliveryAttachment(task.id, attachments);
  const taskHasAllRequired = hasRequiredAttachments(task, attachments);
  const action             = STATUS_ACTIONS[task.status];
  const secondaryAction    = SECONDARY_ACTIONS[task.status];

  // Brief JSONB entries
  const briefEntries = task.brief
    ? Object.entries(task.brief).filter(([, v]) => v != null && v !== "" && typeof v !== "object")
    : [];

  async function handleAction() {
    if (!action || updating) return;

    // If going to revisao_interna and missing required attachments → open modal
    if (action.next === "revisao_interna") {
      const check = canSendToReview(task, attachments);
      if (!check.ok) {
        setShowModal(true);
        return;
      }
    }

    setUpdating(true);
    await onStatusChange(
      task.id,
      action.next,
      `"${task.title}" → ${STATUS_LABELS[action.next] ?? action.next}`,
    );
    setUpdating(false);
  }

  async function handleSecondaryAction() {
    if (!secondaryAction || updating) return;
    setUpdating(true);
    await onStatusChange(
      task.id,
      secondaryAction.next,
      `"${task.title}" marcado para ajuste`,
    );
    setUpdating(false);
  }

  async function handleSendToReview() {
    await onStatusChange(task.id, "revisao_interna", `"${task.title}" → Revisão interna`);
    setShowModal(false);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-4 py-3.5 flex items-start gap-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-gray-900 truncate">{task.title}</span>
            {task.priority && task.priority !== "media" && (
              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize", PRIORITY_BADGE[task.priority] ?? "bg-gray-100 text-gray-600")}>
                {task.priority}
              </span>
            )}
            {taskHasAttachment && (
              <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                <FileCheck className="w-2.5 h-2.5" /> entrega
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
            {client && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />{client}
              </span>
            )}
            {task.due_date && (
              <span className={cn("flex items-center gap-1", over ? "text-red-500 font-medium" : "")}>
                <Calendar className="w-3 h-3" />{due}
              </span>
            )}
            {checklist.length > 0 && (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {doneCount}/{checklist.length}
              </span>
            )}
            {assigned && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />{assigned}
              </span>
            )}
          </div>
        </div>
        {expanded
          ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
          : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
        }
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-3">
          {task.description && (
            <p className="text-xs text-gray-500 leading-relaxed">{task.description}</p>
          )}

          {/* Brief fields */}
          {briefEntries.length > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-2">
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Briefing</p>
              {briefEntries.map(([key, value]) => (
                <div key={key}>
                  <p className="text-[10px] font-semibold text-blue-500 mb-0.5">
                    {BRIEF_LABELS[key] ?? key}
                  </p>
                  <p className="text-xs text-blue-900 leading-relaxed">{String(value)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Ajuste notes */}
          {task.status === "ajuste" && task.client_notes && (
            <div className="bg-orange-50 border border-orange-100 rounded-xl px-3 py-2 text-xs text-orange-800">
              <p className="font-semibold mb-0.5 flex items-center gap-1">
                <AlertOctagon className="w-3 h-3" /> Ajuste solicitado:
              </p>
              <p className="leading-relaxed">{task.client_notes}</p>
            </div>
          )}

          {/* Checklist */}
          {checklist.length > 0 && (
            <div className="space-y-1.5">
              {checklist.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className={cn(
                    "w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0",
                    item.done ? "bg-emerald-500 border-emerald-500" : "border-gray-300"
                  )}>
                    {item.done && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className={item.done ? "line-through text-gray-400" : "text-gray-600"}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Task metadata */}
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
            {task.task_type  && <span><span className="font-medium">Tipo:</span> {task.task_type}</span>}
            {task.department && <span><span className="font-medium">Depto:</span> {task.department}</span>}
            {task.channel    && <span><span className="font-medium">Canal:</span> {task.channel}</span>}
            {task.format     && <span><span className="font-medium">Formato:</span> {task.format}</span>}
          </div>

          {task.internal_notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-xs text-amber-700">
              <span className="font-medium">Notas:</span> {task.internal_notes}
            </div>
          )}

          {/* Attachment section */}
          {["em_producao", "ajuste", "revisao_interna"].includes(task.status) && (
            <div className={cn(
              "border rounded-xl p-3 flex items-center gap-2 text-xs",
              taskHasAllRequired
                ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                : "border-dashed border-gray-200 text-gray-500",
            )}>
              <FileCheck className={cn("w-3.5 h-3.5 flex-shrink-0", taskHasAllRequired ? "text-emerald-500" : "text-gray-400")} />
              {taskHasAllRequired
                ? "Entrega anexada — pronta para revisão."
                : (
                  <div className="flex items-center gap-2 flex-1">
                    <span>Entrega pendente para este formato.</span>
                    <button
                      onClick={() => setShowModal(true)}
                      className="ml-auto text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline"
                    >
                      Anexar
                    </button>
                  </div>
                )
              }
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            {/* em_producao: "Enviar para revisão" — opens modal if missing required attachments */}
            {task.status === "em_producao" && (
              <button
                onClick={handleAction}
                disabled={updating || !isSupabaseConfigured}
                className={cn(
                  "flex-1 flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-colors justify-center mt-1",
                  taskHasAllRequired
                    ? "bg-purple-600 text-white hover:bg-purple-700"
                    : "bg-indigo-600 text-white hover:bg-indigo-700",
                  updating && "opacity-60",
                )}
              >
                {updating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                {taskHasAllRequired ? "Enviar para revisão" : "Anexar e enviar para revisão"}
              </button>
            )}

            {/* Other primary actions (not em_producao) */}
            {action && task.status !== "em_producao" && (
              <button
                onClick={handleAction}
                disabled={updating || !isSupabaseConfigured}
                className={cn(
                  "flex-1 flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-colors justify-center mt-1",
                  action.color,
                  (updating || !isSupabaseConfigured) && "opacity-60 cursor-not-allowed",
                )}
              >
                {updating
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <action.icon className="w-3 h-3" />
                }
                {action.label}
              </button>
            )}

            {/* Secondary action */}
            {secondaryAction && !updating && (
              <button
                onClick={handleSecondaryAction}
                disabled={updating || !isSupabaseConfigured}
                className={cn(
                  "flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-colors mt-1",
                  secondaryAction.color,
                  (updating || !isSupabaseConfigured) && "opacity-60 cursor-not-allowed",
                )}
              >
                <secondaryAction.icon className="w-3 h-3" />
                {secondaryAction.label}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Format-aware attachment modal */}
      {showModal && (
        <DeliveryAttachmentModal
          task={task}
          existingAttachments={attachments}
          onClose={() => setShowModal(false)}
          onSaved={(newA) => onAttachSaved(newA)}
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

// ── Main content ──────────────────────────────────────────────

interface Props {
  tasks: DbOperationalTask[];
  userRole: string;
  roleDisplay?: string;
}

export function MinhasTarefasContent({ tasks: initialTasks, userRole, roleDisplay }: Props) {
  const [tasks,        setTasks]        = useState<DbOperationalTask[]>(initialTasks);
  const [attachments,  setAttachments]  = useState<TaskAttachment[]>([]);
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [toast,        setToast]        = useState<{ msg: string; ok: boolean } | null>(null);

  // Fetch existing attachments on mount
  useEffect(() => {
    if (!isSupabaseConfigured || initialTasks.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("operational_attachments")
          .select("task_id, attachment_url, is_final_file, asset_variant, page_number")
          .in("task_id", initialTasks.map((t) => t.id))
          .eq("is_final_file", true);
        if (!cancelled && data) setAttachments(data as TaskAttachment[]);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [initialTasks]);

  const handleAttachSaved = useCallback((newAttachments: TaskAttachment[]) => {
    if (newAttachments.length === 0) return;
    setAttachments((prev) => {
      const withoutReplaced = prev.filter(
        (a) => !newAttachments.some(
          (na) => na.task_id === a.task_id &&
                  na.asset_variant === a.asset_variant &&
                  na.page_number === a.page_number,
        ),
      );
      return [...withoutReplaced, ...newAttachments];
    });
  }, []);

  const handleStatusChange = useCallback(async (id: string, newStatus: string, msg: string) => {
    if (!isSupabaseConfigured) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("operational_tasks")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (!error) {
        setTasks((prev) => {
          const updated = prev.map((t) => t.id === id ? { ...t, status: newStatus } : t);

          const task = prev.find((t) => t.id === id);
          if (task?.content_item_id) {
            const ciStatus =
              newStatus === "revisao_interna" ? "revisao_interna" :
              newStatus === "aprovado"        ? "pronto_para_aprovacao" :
              newStatus === "concluido"       ? "pronto_para_agendar" :
              null;
            if (ciStatus) {
              supabase.from("content_items").update({ status: ciStatus })
                .eq("id", task.content_item_id).then(() => {});
            }
          }

          return updated;
        });
        setToast({ msg, ok: true });
        setTimeout(() => setToast(null), 3500);
      }
    } catch {}
  }, []);

  const activeTasks = tasks.filter(
    (t) => !["concluido", "cancelado", "publicado"].includes(t.status),
  );

  const activeGroups = STATUS_GROUPS.filter((g) =>
    activeTasks.some((t) => t.status === g.key),
  );

  const visibleGroups = activeStatus
    ? activeGroups.filter((g) => g.key === activeStatus)
    : activeGroups;

  const lateCount      = activeTasks.filter((t) => isTaskOverdue(t.due_date)).length;
  const completedCount = tasks.filter(
    (t) => ["aprovado", "agendado", "publicado", "concluido"].includes(t.status),
  ).length;

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-slate-600" />
          Minhas Tarefas
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {roleDisplay ?? ROLE_LABELS[userRole] ?? userRole}
          {" · "}
          {activeTasks.length} tarefa{activeTasks.length !== 1 ? "s" : ""} ativa{activeTasks.length !== 1 ? "s" : ""}
          {lateCount > 0 && (
            <span className="ml-2 text-red-600 font-medium">
              · {lateCount} atrasada{lateCount > 1 ? "s" : ""}
            </span>
          )}
        </p>
      </div>

      {/* Quick stats */}
      {activeTasks.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 text-center">
            <div className="text-2xl font-black text-gray-900">{activeTasks.length}</div>
            <div className="text-xs text-gray-500">Ativas</div>
          </div>
          <div className={cn("border rounded-2xl px-4 py-3 text-center", lateCount > 0 ? "bg-red-50 border-red-100" : "bg-white border-gray-100")}>
            <div className={cn("text-2xl font-black", lateCount > 0 ? "text-red-600" : "text-gray-900")}>{lateCount}</div>
            <div className="text-xs text-gray-500">Atrasadas</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 text-center">
            <div className="text-2xl font-black text-emerald-600">{completedCount}</div>
            <div className="text-xs text-gray-500">Concluídas</div>
          </div>
        </div>
      )}

      {/* Status filter chips */}
      {activeGroups.length > 1 && (
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <button
            onClick={() => setActiveStatus(null)}
            className={cn(
              "text-xs font-medium px-3 py-1.5 rounded-full transition-colors",
              activeStatus === null ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            )}
          >
            Todas ({activeTasks.length})
          </button>
          {activeGroups.map((g) => {
            const count = activeTasks.filter((t) => t.status === g.key).length;
            return (
              <button
                key={g.key}
                onClick={() => setActiveStatus(activeStatus === g.key ? null : g.key)}
                className={cn(
                  "text-xs font-medium px-3 py-1.5 rounded-full transition-colors",
                  activeStatus === g.key
                    ? `${g.bg} ${g.color} font-bold`
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                )}
              >
                {STATUS_LABELS[g.key] ?? g.key} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Task groups */}
      {activeTasks.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Nenhuma tarefa no momento</p>
          <p className="text-xs text-gray-400">Novas tarefas aparecerão aqui quando forem atribuídas a você.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {visibleGroups.map((group) => {
            const groupTasks = activeTasks.filter((t) => t.status === group.key);
            if (groupTasks.length === 0) return null;
            return (
              <div key={group.key}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", group.bg, group.color)}>
                    {STATUS_LABELS[group.key] ?? group.key}
                  </span>
                  <span className="text-xs text-gray-400">{groupTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {groupTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      primaryRole={userRole}
                      attachments={attachments}
                      onStatusChange={handleStatusChange}
                      onAttachSaved={handleAttachSaved}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Overdue alert */}
      {lateCount > 0 && (
        <div className="mt-6 flex items-center gap-2 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-xs text-red-700">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            Você tem <strong>{lateCount}</strong> tarefa{lateCount > 1 ? "s" : ""} atrasada{lateCount > 1 ? "s" : ""}.
            Atualize o status ou notifique o gestor.
          </span>
        </div>
      )}

      {/* Upcoming */}
      {(() => {
        const soon = activeTasks.filter((t) => {
          if (!t.due_date) return false;
          const d   = new Date(t.due_date + "T00:00:00");
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          const diff = Math.round((d.getTime() - now.getTime()) / 86400000);
          return diff >= 0 && diff <= 3;
        });
        if (soon.length === 0) return null;
        return (
          <div className="mt-4 flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 text-xs text-amber-700">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              <strong>{soon.length}</strong> tarefa{soon.length > 1 ? "s" : ""} com prazo nos próximos 3 dias.
            </span>
          </div>
        );
      })()}

      {toast && (
        <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
