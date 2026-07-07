"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { DbOperationalTask } from "@/lib/supabase/types";
import { ROLE_LABELS } from "@/lib/access-control";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { isTaskOverdue, fmtTaskDate, STATUS_LABELS } from "@/lib/operational-tasks";
import {
  hasDeliveryAttachment, getNextOperationalAction, FORMAT_LABELS,
  type TaskAttachment,
} from "@/lib/op-flow-rules";
import { DeliveryAttachmentModal } from "@/components/delivery-attachment-modal";
import { TaskDetailModal } from "@/components/task-detail-modal";
import {
  ScrollText, Calendar, Building2,
  Tag, AlertCircle, CheckCircle2, Loader2, Check,
  FileCheck, ArrowRight, AlertOctagon, Clock,
  List, KanbanSquare, Filter, X, Eye,
} from "lucide-react";

// ── Priority badge ────────────────────────────────────────────

const PRIORITY_COLOR: Record<string, string> = {
  urgente: "bg-red-100 text-red-700",
  alta:    "bg-orange-100 text-orange-700",
  media:   "bg-yellow-100 text-yellow-800",
  baixa:   "bg-gray-100 text-gray-500",
};

const PRIORITY_LABELS: Record<string, string> = {
  urgente: "Urgente", alta: "Alta", media: "Média", baixa: "Baixa",
};

// ── Kanban column config ──────────────────────────────────────

const KANBAN_COLUMNS = [
  { statuses: ["backlog", "briefing"],   label: "Backlog",  color: "bg-gray-50 border-gray-200",      header: "bg-gray-100 text-gray-600" },
  { statuses: ["em_producao"],           label: "Produção", color: "bg-blue-50 border-blue-200",      header: "bg-blue-100 text-blue-700" },
  { statuses: ["revisao_interna"],       label: "Revisão",  color: "bg-purple-50 border-purple-200",  header: "bg-purple-100 text-purple-700" },
  { statuses: ["ajuste"],                label: "Ajuste",   color: "bg-orange-50 border-orange-200",  header: "bg-orange-100 text-orange-700" },
  { statuses: ["aprovado", "agendado"],  label: "Aprovado", color: "bg-emerald-50 border-emerald-200",header: "bg-emerald-100 text-emerald-700" },
];

// ── Toast ─────────────────────────────────────────────────────

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2">
      <Check className="w-3.5 h-3.5 text-emerald-400" />
      {msg}
      <button onClick={onClose} className="ml-1 text-gray-400 hover:text-white text-base leading-none">×</button>
    </div>
  );
}

// ── Lista card ────────────────────────────────────────────────

interface CardProps {
  task: DbOperationalTask;
  primaryRole: string;
  attachments: TaskAttachment[];
  onAction: (taskId: string, newStatus: string, msg: string) => Promise<void>;
  onAttachSaved: (newAttachments: TaskAttachment[]) => void;
}

function BriefingCard({ task, primaryRole, attachments, onAction, onAttachSaved }: CardProps) {
  const [acting,     setActing]     = useState(false);
  const [showModal,  setShowModal]  = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const client   = task.clients?.[0]?.company_name;
  const due      = fmtTaskDate(task.due_date);
  const over     = isTaskOverdue(task.due_date);
  const brief    = task.brief as Record<string, unknown> | null ?? {};

  const hybridFormats = brief.formats as string[] | undefined;
  const formatLabel   = hybridFormats && hybridFormats.length > 1
    ? hybridFormats.map((f) => FORMAT_LABELS[f] ?? f).join(" + ")
    : FORMAT_LABELS[task.format ?? ""] ?? task.format;

  const taskHasAttachment = hasDeliveryAttachment(task.id, attachments);
  const nextAction        = getNextOperationalAction(task, attachments);

  async function handleAction() {
    if (!nextAction.next || acting || !isSupabaseConfigured) return;
    setActing(true);
    await onAction(
      task.id,
      nextAction.next,
      `"${task.title}" → ${STATUS_LABELS[nextAction.next] ?? nextAction.next}`,
    );
    setActing(false);
  }

  async function handleSendToReview() {
    await onAction(task.id, "revisao_interna", `"${task.title}" → Revisão interna`);
    setShowModal(false);
  }

  const ctaColor = nextAction.blocked
    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
    : nextAction.needsAttachment
    ? "bg-indigo-600 text-white hover:bg-indigo-700"
    : task.status === "briefing" || task.status === "backlog"
    ? "bg-emerald-600 text-white hover:bg-emerald-700"
    : task.status === "ajuste"
    ? "bg-orange-600 text-white hover:bg-orange-700"
    : "bg-purple-600 text-white hover:bg-purple-700";

  return (
    <>
      <div className={cn(
        "bg-white rounded-2xl border overflow-hidden",
        over ? "border-red-200" : "border-gray-100",
      )}>
        {/* Compact header — click title opens modal */}
        <div
          className="px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setShowDetail(true)}
        >
          <ScrollText className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-sm font-semibold text-gray-900 truncate">{task.title}</span>
              {task.priority && task.priority !== "media" && (
                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", PRIORITY_COLOR[task.priority] ?? "bg-gray-100 text-gray-500")}>
                  {PRIORITY_LABELS[task.priority] ?? task.priority}
                </span>
              )}
              {taskHasAttachment && (
                <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <FileCheck className="w-2.5 h-2.5" /> Entrega
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
              {client && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{client}</span>}
              {task.due_date && (
                <span className={cn("flex items-center gap-1", over ? "text-red-500 font-medium" : "")}>
                  <Calendar className="w-3 h-3" />{due}
                </span>
              )}
              {formatLabel && <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{formatLabel}</span>}
              {task.channel && <span className="text-gray-300">{task.channel}</span>}
            </div>
          </div>
          <Eye className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mt-0.5" />
        </div>

        {/* Action bar */}
        <div className={cn(
          "mx-3 mb-3 rounded-xl px-3 py-2.5 border",
          nextAction.blocked          ? "bg-gray-50 border-gray-100" :
          nextAction.needsAttachment  ? "bg-indigo-50 border-indigo-100" :
          ["briefing","backlog"].includes(task.status) ? "bg-emerald-50 border-emerald-100" :
          task.status === "ajuste"    ? "bg-orange-50 border-orange-100" :
          "bg-purple-50 border-purple-100",
        )}>
          <p className="text-xs text-gray-600 mb-2 leading-snug">{nextAction.description}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowDetail(true)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <Eye className="w-3 h-3" /> Ver demanda
            </button>

            {nextAction.needsAttachment && (
              <button onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
                <FileCheck className="w-3 h-3" /> {nextAction.label}
              </button>
            )}

            {!nextAction.needsAttachment && nextAction.next && (
              <button
                onClick={handleAction}
                disabled={!!nextAction.blocked || acting || !isSupabaseConfigured}
                className={cn("flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-colors", ctaColor, acting && "opacity-60")}
              >
                {acting ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
                {nextAction.label}
              </button>
            )}

            {taskHasAttachment && ["em_producao","ajuste"].includes(task.status) && (
              <button onClick={handleAction} disabled={acting}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors">
                {acting ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
                {task.status === "ajuste" ? "Reenviar para revisão" : "Enviar para revisão"}
              </button>
            )}

            {task.status === "ajuste" && task.client_notes && (
              <span className="flex items-center gap-1 text-[10px] text-orange-600">
                <AlertOctagon className="w-3 h-3" /> Ajuste
              </span>
            )}
          </div>
        </div>
      </div>

      {showDetail && (
        <TaskDetailModal
          task={task}
          attachments={attachments}
          primaryRole={primaryRole}
          onClose={() => setShowDetail(false)}
          onAction={onAction}
          onAttachSaved={onAttachSaved}
        />
      )}

      {showModal && (
        <DeliveryAttachmentModal
          task={task}
          existingAttachments={attachments}
          onClose={() => setShowModal(false)}
          onSaved={(newA) => { onAttachSaved(newA); }}
          onSendToReview={["em_producao","ajuste"].includes(task.status) ? handleSendToReview : undefined}
        />
      )}
    </>
  );
}

// ── Kanban mini-card ──────────────────────────────────────────

function KanbanCard({ task, primaryRole, attachments, onAction, onAttachSaved }: CardProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [acting,     setActing]     = useState(false);
  const [showAttach, setShowAttach] = useState(false);

  const client  = task.clients?.[0]?.company_name;
  const due     = fmtTaskDate(task.due_date);
  const over    = isTaskOverdue(task.due_date);
  const brief   = task.brief as Record<string, unknown> | null ?? {};
  const hybridFormats = brief.formats as string[] | undefined;
  const formatLabel   = hybridFormats && hybridFormats.length > 1
    ? hybridFormats.map((f) => FORMAT_LABELS[f] ?? f).join("+")
    : FORMAT_LABELS[task.format ?? ""] ?? task.format;

  const nextAction = getNextOperationalAction(task, attachments);

  async function handleAction() {
    if (!nextAction.next || acting || !isSupabaseConfigured) return;
    setActing(true);
    await onAction(task.id, nextAction.next, `"${task.title}" → ${STATUS_LABELS[nextAction.next] ?? nextAction.next}`);
    setActing(false);
  }

  async function handleSendToReview() {
    await onAction(task.id, "revisao_interna", `"${task.title}" → Revisão interna`);
    setShowAttach(false);
  }

  return (
    <>
      <div
        className={cn(
          "bg-white rounded-xl border p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow",
          over ? "border-red-200" : "border-gray-200",
        )}
        onClick={() => setShowDetail(true)}
      >
        {/* Title + priority */}
        <div className="flex items-start justify-between gap-1 mb-2">
          <p className="text-xs font-semibold text-gray-900 leading-snug line-clamp-2 flex-1">{task.title}</p>
          {task.priority && task.priority !== "media" && (
            <span className={cn("text-[9px] font-bold px-1 py-0.5 rounded-full flex-shrink-0 ml-1", PRIORITY_COLOR[task.priority])}>
              {PRIORITY_LABELS[task.priority]?.[0]}
            </span>
          )}
        </div>

        {/* Meta */}
        <div className="space-y-0.5 mb-2.5">
          {client && (
            <div className="flex items-center gap-1 text-[10px] text-gray-500">
              <Building2 className="w-2.5 h-2.5" />{client}
            </div>
          )}
          {formatLabel && (
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <Tag className="w-2.5 h-2.5" />{formatLabel}
            </div>
          )}
          {task.due_date && (
            <div className={cn("flex items-center gap-1 text-[10px]", over ? "text-red-500 font-medium" : "text-gray-400")}>
              <Calendar className="w-2.5 h-2.5" />{due}
            </div>
          )}
        </div>

        {/* Quick actions (stop propagation so click doesn't open modal) */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setShowDetail(true)}
            className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-0.5 border border-gray-200 rounded-lg px-2 py-1"
          >
            <Eye className="w-2.5 h-2.5" /> Ver
          </button>

          {nextAction.needsAttachment ? (
            <button
              onClick={() => setShowAttach(true)}
              className="flex-1 text-[10px] font-bold py-1 px-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors text-center"
            >
              Anexar
            </button>
          ) : nextAction.next && !nextAction.blocked ? (
            <button
              onClick={handleAction}
              disabled={acting}
              className="flex-1 text-[10px] font-bold py-1 px-2 rounded-lg bg-slate-700 text-white hover:bg-slate-800 transition-colors flex items-center justify-center gap-0.5"
            >
              {acting ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <ArrowRight className="w-2.5 h-2.5" />}
              {nextAction.label.slice(0, 14)}
            </button>
          ) : (
            <span className="text-[10px] text-gray-400 truncate flex-1">{STATUS_LABELS[task.status] ?? task.status}</span>
          )}
        </div>
      </div>

      {showDetail && (
        <TaskDetailModal
          task={task}
          attachments={attachments}
          primaryRole={primaryRole}
          onClose={() => setShowDetail(false)}
          onAction={onAction}
          onAttachSaved={onAttachSaved}
        />
      )}

      {showAttach && (
        <DeliveryAttachmentModal
          task={task}
          existingAttachments={attachments}
          onClose={() => setShowAttach(false)}
          onSaved={(newA) => { onAttachSaved(newA); }}
          onSendToReview={["em_producao","ajuste"].includes(task.status) ? handleSendToReview : undefined}
        />
      )}
    </>
  );
}

// ── Section header (lista) ────────────────────────────────────

function SectionHeader({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full", color)}>{label}</span>
      <span className="text-xs text-gray-400">{count}</span>
      <div className="flex-1 border-t border-gray-100" />
    </div>
  );
}

// ── Filter bar ────────────────────────────────────────────────

interface Filters { client: string; status: string; priority: string; format: string; }

function FilterBar({ filters, onChange, clientOptions, statusOptions, priorityOptions, formatOptions }: {
  filters: Filters; onChange: (f: Filters) => void;
  clientOptions: string[]; statusOptions: string[]; priorityOptions: string[]; formatOptions: string[];
}) {
  const hasAny = filters.client || filters.status || filters.priority || filters.format;
  function set(key: keyof Filters, val: string) { onChange({ ...filters, [key]: val }); }
  const sc = "text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-300";
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Filter className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      {clientOptions.length > 0 && (
        <select className={sc} value={filters.client} onChange={(e) => set("client", e.target.value)}>
          <option value="">Todos os clientes</option>
          {clientOptions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      )}
      {statusOptions.length > 1 && (
        <select className={sc} value={filters.status} onChange={(e) => set("status", e.target.value)}>
          <option value="">Todos os status</option>
          {statusOptions.map((s) => <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>)}
        </select>
      )}
      {priorityOptions.length > 1 && (
        <select className={sc} value={filters.priority} onChange={(e) => set("priority", e.target.value)}>
          <option value="">Toda prioridade</option>
          {["urgente","alta","media","baixa"].filter((p) => priorityOptions.includes(p)).map((p) => (
            <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
          ))}
        </select>
      )}
      {formatOptions.length > 1 && (
        <select className={sc} value={filters.format} onChange={(e) => set("format", e.target.value)}>
          <option value="">Todos os formatos</option>
          {formatOptions.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      )}
      {hasAny && (
        <button onClick={() => onChange({ client:"", status:"", priority:"", format:"" })}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
          <X className="w-3 h-3" /> Limpar
        </button>
      )}
    </div>
  );
}

// ── Main content ──────────────────────────────────────────────

interface Props {
  tasks: DbOperationalTask[];
  primaryRole: string;
  allRoles: string[];
  initialTaskId?: string | null;
}

export function BriefingsContent({ tasks, primaryRole, allRoles, initialTaskId }: Props) {
  const [localTasks,  setLocalTasks]  = useState<DbOperationalTask[]>(tasks);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [toast,       setToast]       = useState<string | null>(null);
  const [view,        setView]        = useState<"lista" | "kanban">("lista");
  const [filters,     setFilters]     = useState<Filters>({ client: "", status: "", priority: "", format: "" });
  const [quickTask,   setQuickTask]   = useState<DbOperationalTask | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || tasks.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const taskIds  = tasks.map((t) => t.id);
        const { data } = await supabase
          .from("operational_attachments")
          .select("task_id, attachment_url, is_final_file, asset_variant, page_number, attachment_name, attachment_type, upload_source, storage_path")
          .in("task_id", taskIds)
          .eq("is_final_file", true);
        if (!cancelled && data) setAttachments(data as TaskAttachment[]);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [tasks]);

  // Auto-open task modal when navigated from ContentOS "Ver demanda operacional"
  useEffect(() => {
    if (!initialTaskId || localTasks.length === 0) return;
    const found = localTasks.find((t) => t.id === initialTaskId);
    if (found) setQuickTask(found);
  }, [initialTaskId, localTasks]);

  const handleAction = useCallback(async (taskId: string, newStatus: string, msg: string) => {
    if (!isSupabaseConfigured) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("operational_tasks")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", taskId);
      if (!error) {
        setLocalTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));
        const task = localTasks.find((t) => t.id === taskId);
        if (task?.content_item_id) {
          const supabase2 = createClient();
          if (newStatus === "revisao_interna") {
            supabase2.from("content_items").update({ status: "revisao_interna" }).eq("id", task.content_item_id).then(() => {});
          } else if (newStatus === "aprovado") {
            supabase2.from("content_items").update({ status: "pronto_para_aprovacao" }).eq("id", task.content_item_id).then(() => {});
          } else if (newStatus === "concluido") {
            supabase2.from("content_items").update({ status: "pronto_para_agendar" }).eq("id", task.content_item_id).then(() => {});
          }
        }
        setToast(msg);
        setTimeout(() => setToast(null), 3500);
      }
    } catch {}
  }, [localTasks]);

  const handleAttachSaved = useCallback((newAttachments: TaskAttachment[]) => {
    if (newAttachments.length === 0) return;
    setAttachments((prev) => {
      const withoutReplaced = prev.filter(
        (a) => !newAttachments.some(
          (na) => na.task_id === a.task_id && na.asset_variant === a.asset_variant && na.page_number === a.page_number,
        ),
      );
      return [...withoutReplaced, ...newAttachments];
    });
  }, []);

  const roleDisplay = ROLE_LABELS[primaryRole] ?? primaryRole;

  const clientOptions   = useMemo(() => [...new Set(localTasks.map((t) => t.clients?.[0]?.company_name).filter(Boolean) as string[])].sort(), [localTasks]);
  const statusOptions   = useMemo(() => [...new Set(localTasks.map((t) => t.status).filter(Boolean))], [localTasks]);
  const priorityOptions = useMemo(() => [...new Set(localTasks.map((t) => t.priority).filter(Boolean) as string[])], [localTasks]);
  const formatOptions   = useMemo(() => [...new Set(localTasks.map((t) => t.format).filter(Boolean) as string[])].sort(), [localTasks]);

  const filteredTasks = useMemo(() => localTasks.filter((t) => {
    if (filters.client   && t.clients?.[0]?.company_name !== filters.client) return false;
    if (filters.status   && t.status !== filters.status)                      return false;
    if (filters.priority && t.priority !== filters.priority)                  return false;
    if (filters.format   && t.format !== filters.format)                      return false;
    return true;
  }), [localTasks, filters]);

  const activeTasks = filteredTasks.filter((t) => !["concluido","cancelado","publicado"].includes(t.status));
  const allActiveTasks = localTasks.filter((t) => !["concluido","cancelado","publicado"].includes(t.status));

  const needsReading  = activeTasks.filter((t) => ["briefing","backlog"].includes(t.status));
  const inProduction  = activeTasks.filter((t) => t.status === "em_producao");
  const needsAdjust   = activeTasks.filter((t) => t.status === "ajuste");
  const waitingReview = activeTasks.filter((t) => t.status === "revisao_interna");

  const lateCount = allActiveTasks.filter((t) => isTaskOverdue(t.due_date)).length;

  const cardProps = { primaryRole, attachments, onAction: handleAction, onAttachSaved: handleAttachSaved };

  return (
    <div className={cn("h-full flex flex-col", view === "kanban" ? "overflow-hidden" : "")}>
      {/* Header */}
      <div className="flex-shrink-0 mb-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <ScrollText className="w-5 h-5 text-slate-600" />
              Briefings & Demandas
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {roleDisplay}
              {allRoles.length > 1 && <> · {allRoles.slice(1).map((r) => ROLE_LABELS[r] ?? r).join(", ")}</>}
              {" · "}{allActiveTasks.length} ativa{allActiveTasks.length !== 1 ? "s" : ""}
              {lateCount > 0 && <span className="ml-2 text-red-600 font-medium">· {lateCount} atrasada{lateCount !== 1 ? "s" : ""}</span>}
            </p>
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-gray-100 rounded-xl p-0.5 flex-shrink-0">
            {(["lista","kanban"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={cn("flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all",
                  view === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
                {v === "lista" ? <List className="w-3.5 h-3.5" /> : <KanbanSquare className="w-3.5 h-3.5" />}
                {v === "lista" ? "Lista" : "Kanban"}
              </button>
            ))}
          </div>
        </div>

        <FilterBar filters={filters} onChange={setFilters}
          clientOptions={clientOptions} statusOptions={statusOptions}
          priorityOptions={priorityOptions} formatOptions={formatOptions} />
      </div>

      {/* LISTA VIEW */}
      {view === "lista" && (
        <div className="max-w-2xl">
          {activeTasks.length === 0 && (
            <div className="text-center py-16">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                {filters.client || filters.status || filters.priority || filters.format
                  ? "Nenhuma demanda com esses filtros"
                  : "Nenhuma demanda no momento"}
              </p>
              <p className="text-xs text-gray-400">As demandas enviadas pelo ContentOS aparecerão aqui.</p>
            </div>
          )}

          {needsReading.length > 0 && (
            <div className="mb-7">
              <SectionHeader label="Aguardando leitura" count={needsReading.length} color="bg-emerald-50 text-emerald-700" />
              <div className="space-y-3">
                {needsReading.map((t) => <BriefingCard key={t.id} task={t} {...cardProps} />)}
              </div>
            </div>
          )}

          {inProduction.length > 0 && (
            <div className="mb-7">
              <SectionHeader label="Em produção" count={inProduction.length} color="bg-blue-50 text-blue-700" />
              <div className="space-y-3">
                {inProduction.map((t) => <BriefingCard key={t.id} task={t} {...cardProps} />)}
              </div>
            </div>
          )}

          {needsAdjust.length > 0 && (
            <div className="mb-7">
              <SectionHeader label="Ajustes solicitados" count={needsAdjust.length} color="bg-orange-50 text-orange-700" />
              <div className="space-y-3">
                {needsAdjust.map((t) => <BriefingCard key={t.id} task={t} {...cardProps} />)}
              </div>
            </div>
          )}

          {waitingReview.length > 0 && (
            <div className="mt-2">
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs text-gray-500">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                <span><strong>{waitingReview.length}</strong> demanda{waitingReview.length !== 1 ? "s" : ""} aguardando revisão interna.</span>
              </div>
            </div>
          )}

          {lateCount > 0 && (
            <div className="mt-6 flex items-center gap-2 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-xs text-red-700">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span><strong>{lateCount}</strong> demanda{lateCount !== 1 ? "s" : ""} com prazo vencido.</span>
            </div>
          )}

          {(() => {
            const soon = allActiveTasks.filter((t) => {
              if (!t.due_date) return false;
              const d = new Date(t.due_date + "T00:00:00");
              const now = new Date(); now.setHours(0,0,0,0);
              const diff = Math.round((d.getTime() - now.getTime()) / 86400000);
              return diff >= 0 && diff <= 3;
            });
            if (soon.length === 0) return null;
            return (
              <div className="mt-4 flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 text-xs text-amber-700">
                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                <span><strong>{soon.length}</strong> demanda{soon.length !== 1 ? "s" : ""} com entrega nos próximos 3 dias.</span>
              </div>
            );
          })()}
        </div>
      )}

      {/* KANBAN VIEW */}
      {view === "kanban" && (
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-3 h-full min-w-max pb-4">
            {KANBAN_COLUMNS.map((col) => {
              const colTasks = activeTasks.filter((t) => col.statuses.includes(t.status));
              return (
                <div key={col.label} className={cn("w-64 flex-shrink-0 rounded-2xl border flex flex-col", col.color)}>
                  <div className={cn("px-3 py-2.5 rounded-t-2xl flex items-center justify-between flex-shrink-0", col.header)}>
                    <span className="text-xs font-bold">{col.label}</span>
                    <span className="text-xs opacity-60">{colTasks.length}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {colTasks.length === 0 && (
                      <div className="text-center py-6 text-[10px] text-gray-400">Vazio</div>
                    )}
                    {colTasks.map((t) => (
                      <KanbanCard key={t.id} task={t} {...cardProps} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      {/* Quick-open modal when navigated via ?task= param */}
      {quickTask && (
        <TaskDetailModal
          task={quickTask}
          attachments={attachments.filter((a) => a.task_id === quickTask.id)}
          primaryRole={primaryRole}
          onClose={() => setQuickTask(null)}
          onAction={async (taskId, newStatus, msg) => {
            await handleAction(taskId, newStatus, msg);
            setQuickTask((prev) => prev ? { ...prev, status: newStatus } : null);
          }}
          onAttachSaved={() => {}}
        />
      )}
    </div>
  );
}
