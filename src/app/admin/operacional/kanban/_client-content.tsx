"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import {
  X, ChevronRight, ChevronLeft, Loader2,
  Palette, Video, ScrollText, FileText, MousePointerClick, Send,
  CheckCircle2, ClipboardList, Target, Package, Clock3, UserCheck,
  Building2, Filter, RefreshCw, AlertCircle, Paperclip,
} from "lucide-react";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import type { DbOperationalTask } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { canSendToReview, type TaskAttachment } from "@/lib/op-flow-rules";
import { DeliveryAttachmentModal } from "@/components/delivery-attachment-modal";

// ── Column definitions ────────────────────────────────────────

const COLUMNS = [
  { id: "backlog",            label: "Backlog",             dotColor: "bg-gray-400",    headerBg: "bg-gray-50" },
  { id: "briefing",           label: "Briefing",            dotColor: "bg-blue-500",    headerBg: "bg-blue-50" },
  { id: "em_producao",        label: "Em Produção",         dotColor: "bg-indigo-500",  headerBg: "bg-indigo-50" },
  { id: "revisao_interna",    label: "Revisão Interna",     dotColor: "bg-amber-500",   headerBg: "bg-amber-50" },
  { id: "ajuste",             label: "Ajustes",             dotColor: "bg-orange-500",  headerBg: "bg-orange-50" },
  { id: "aguardando_cliente", label: "Aguardando Cliente",  dotColor: "bg-purple-500",  headerBg: "bg-purple-50" },
  { id: "aprovado",           label: "Aprovado",            dotColor: "bg-emerald-500", headerBg: "bg-emerald-50" },
  { id: "agendado",           label: "Agendado",            dotColor: "bg-teal-500",    headerBg: "bg-teal-50" },
  { id: "publicado",          label: "Publicado",           dotColor: "bg-green-500",   headerBg: "bg-green-50" },
  { id: "concluido",          label: "Concluído",           dotColor: "bg-slate-400",   headerBg: "bg-slate-50" },
];

const STATUS_ORDER = COLUMNS.map(c => c.id);

// ── Task type icons & labels ──────────────────────────────────

const TASK_TYPES: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  arte:        { icon: Palette,           label: "Arte",        color: "text-pink-500" },
  video:       { icon: Video,             label: "Vídeo",       color: "text-red-500" },
  roteiro:     { icon: ScrollText,        label: "Roteiro",     color: "text-purple-500" },
  legenda:     { icon: FileText,          label: "Legenda",     color: "text-blue-500" },
  trafego:     { icon: MousePointerClick, label: "Tráfego",     color: "text-orange-500" },
  publicacao:  { icon: Send,              label: "Publicação",  color: "text-teal-500" },
  revisao:     { icon: CheckCircle2,      label: "Revisão",     color: "text-emerald-500" },
  ajuste:      { icon: ClipboardList,     label: "Ajuste",      color: "text-amber-500" },
  planejamento:{ icon: Target,            label: "Planejamento",color: "text-indigo-500" },
  outro:       { icon: Package,           label: "Outro",       color: "text-gray-500" },
};

// ── Priority config ───────────────────────────────────────────

const PRIORITY: Record<string, { label: string; bg: string; text: string }> = {
  baixa:   { label: "Baixa",   bg: "bg-gray-100",   text: "text-gray-600" },
  media:   { label: "Média",   bg: "bg-blue-100",   text: "text-blue-700" },
  alta:    { label: "Alta",    bg: "bg-orange-100", text: "text-orange-700" },
  urgente: { label: "Urgente", bg: "bg-red-100",    text: "text-red-700" },
};

// ── Default checklists per task type ─────────────────────────

const DEFAULT_CHECKLISTS: Record<string, { label: string; done: boolean }[]> = {
  arte: [
    { label: "Briefing lido", done: false },
    { label: "Referência conferida", done: false },
    { label: "Arte criada", done: false },
    { label: "Revisão interna", done: false },
    { label: "Ajustes aplicados", done: false },
    { label: "Enviado para aprovação", done: false },
  ],
  video: [
    { label: "Roteiro conferido", done: false },
    { label: "Captação feita", done: false },
    { label: "Edição inicial", done: false },
    { label: "Legenda / textos aplicados", done: false },
    { label: "Revisão interna", done: false },
    { label: "Ajustes aplicados", done: false },
    { label: "Enviado para aprovação", done: false },
  ],
  roteiro: [
    { label: "Diagnóstico conferido", done: false },
    { label: "Gancho definido", done: false },
    { label: "Estrutura criada", done: false },
    { label: "CTA definido", done: false },
    { label: "Revisão interna", done: false },
    { label: "Aprovado para produção", done: false },
  ],
  legenda: [
    { label: "Legenda revisada", done: false },
    { label: "Data definida", done: false },
    { label: "Canal confirmado", done: false },
    { label: "Conteúdo aprovado", done: false },
    { label: "Postagem agendada", done: false },
    { label: "Publicado", done: false },
  ],
  trafego: [
    { label: "Objetivo definido", done: false },
    { label: "Criativo aprovado", done: false },
    { label: "Copy revisada", done: false },
    { label: "Campanha criada", done: false },
    { label: "Campanha revisada", done: false },
    { label: "Campanha ativa", done: false },
  ],
};

function getDefaultChecklist(taskType: string | null) {
  return DEFAULT_CHECKLISTS[taskType ?? ""] ?? DEFAULT_CHECKLISTS["arte"];
}

// ── Helper: format date ───────────────────────────────────────

function fmtDate(d: string | null): string | null {
  if (!d) return null;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function isOverdue(d: string | null): boolean {
  if (!d) return false;
  return new Date(d) < new Date(new Date().toDateString());
}

// ── Props ─────────────────────────────────────────────────────

interface Client { id: string; company_name: string | null }

export interface KanbanClientProps {
  initialTasks: DbOperationalTask[];
  clients: Client[];
  isAdmin: boolean;
  currentUserId?: string;
  currentUserRole?: string; // reserved for future role-based filtering
}

// ── Task Detail Modal ─────────────────────────────────────────

interface TaskModalProps {
  task: DbOperationalTask;
  clients: Client[];
  attachments: TaskAttachment[];
  isAdmin: boolean;
  onClose: () => void;
  onStatusChange: (taskId: string, newStatus: string) => Promise<void>;
  onAttachmentsSaved: (newA: TaskAttachment[]) => void;
}

function TaskModal({ task, clients, attachments, isAdmin, onClose, onStatusChange, onAttachmentsSaved }: TaskModalProps) {
  const [saving,       setSaving]       = useState(false);
  const [blockMsg,     setBlockMsg]     = useState<string | null>(null);
  const [showAttach,   setShowAttach]   = useState(false);
  const [checklist, setChecklist] = useState<{ label: string; done: boolean }[]>(
    (task.checklist as { label: string; done: boolean }[] | null) ?? getDefaultChecklist(task.task_type)
  );

  const statusIdx = STATUS_ORDER.indexOf(task.status);
  const canAdvance = statusIdx < STATUS_ORDER.length - 1;
  const canGoBack  = statusIdx > 0;

  const colCurrent = COLUMNS.find(c => c.id === task.status);
  const taskType   = TASK_TYPES[task.task_type ?? "outro"] ?? TASK_TYPES["outro"];
  const pri        = PRIORITY[task.priority ?? "media"] ?? PRIORITY["media"];
  const clientName = clients.find(c => c.id === task.client_id)?.company_name ?? task.clients?.[0]?.company_name ?? "—";

  async function advance() {
    if (!canAdvance) return;
    const nextStatus = STATUS_ORDER[statusIdx + 1];

    // Block non-admins from advancing to revisao_interna without required attachments
    if (nextStatus === "revisao_interna" && !isAdmin) {
      const check = canSendToReview(task, attachments);
      if (!check.ok) {
        setBlockMsg(check.reason ?? "Anexe a entrega antes de enviar para revisão.");
        setShowAttach(true); // auto-open the attachment modal
        return;
      }
    }

    setSaving(true);
    await onStatusChange(task.id, nextStatus);
    setSaving(false);
    onClose();
  }

  async function goBack() {
    if (!canGoBack) return;
    setSaving(true);
    await onStatusChange(task.id, STATUS_ORDER[statusIdx - 1]);
    setSaving(false);
    onClose();
  }

  function toggleCheckItem(idx: number) {
    setChecklist(prev => prev.map((item, i) => i === idx ? { ...item, done: !item.done } : item));
  }

  const doneCount = checklist.filter(c => c.done).length;
  const progress  = checklist.length > 0 ? Math.round((doneCount / checklist.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex-1 min-w-0 mr-4">
            <div className="flex items-center gap-2 mb-1">
              <taskType.icon className={cn("w-4 h-4 flex-shrink-0", taskType.color)} />
              <span className="text-xs text-gray-400">{taskType.label}</span>
              {task.department && <span className="text-xs text-gray-300">· {task.department}</span>}
            </div>
            <h2 className="text-base font-black text-gray-900 leading-snug">{task.title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 flex-shrink-0">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Meta grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-gray-400 mb-0.5">Status</p>
              <div className="flex items-center gap-1.5">
                <span className={cn("w-2 h-2 rounded-full flex-shrink-0", colCurrent?.dotColor ?? "bg-gray-300")} />
                <span className="text-xs font-semibold text-gray-800">{colCurrent?.label ?? task.status}</span>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-gray-400 mb-0.5">Prioridade</p>
              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", pri.bg, pri.text)}>{pri.label}</span>
            </div>
            <div className="bg-gray-50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-gray-400 mb-0.5">Cliente</p>
              <span className="text-xs font-semibold text-gray-800 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-gray-400" />
                {clientName}
              </span>
            </div>
            {task.due_date && (
              <div className={cn("rounded-xl px-3 py-2.5", isOverdue(task.due_date) ? "bg-red-50" : "bg-gray-50")}>
                <p className="text-[10px] text-gray-400 mb-0.5">Prazo</p>
                <span className={cn("text-xs font-semibold flex items-center gap-1", isOverdue(task.due_date) ? "text-red-600" : "text-gray-800")}>
                  <Clock3 className="w-3 h-3" />
                  {fmtDate(task.due_date) ?? task.due_date}
                  {isOverdue(task.due_date) && " · Atrasado"}
                </span>
              </div>
            )}
            {task.channel && (
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-gray-400 mb-0.5">Canal</p>
                <span className="text-xs font-semibold text-gray-800">{task.channel}</span>
              </div>
            )}
            {(task.assigned_role || task.profiles?.[0]?.name) && (
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-gray-400 mb-0.5">Responsável</p>
                <span className="text-xs font-semibold text-gray-800 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-gray-400" />
                  {task.profiles?.[0]?.name ?? task.assigned_role ?? "—"}
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <p className="text-xs font-bold text-gray-700 mb-1.5">Descrição</p>
              <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-xl p-3">{task.description}</p>
            </div>
          )}

          {/* Brief */}
          {task.brief && Object.keys(task.brief).length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-700 mb-1.5">Briefing</p>
              <div className="space-y-1.5 bg-gray-50 rounded-xl p-3">
                {Object.entries(task.brief as Record<string, string>).map(([k, v]) => v ? (
                  <div key={k} className="flex gap-2 text-xs">
                    <span className="text-gray-400 capitalize flex-shrink-0 w-24">{k.replace(/_/g, " ")}</span>
                    <span className="text-gray-700 flex-1">{v}</span>
                  </div>
                ) : null)}
              </div>
            </div>
          )}

          {/* Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-gray-700">Checklist — {doneCount}/{checklist.length}</p>
              <span className="text-[10px] text-gray-400">{progress}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1 mb-3">
              <div className="bg-emerald-500 h-1 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="space-y-1.5">
              {checklist.map((item, idx) => (
                <label key={idx} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => toggleCheckItem(idx)}
                    className="w-4 h-4 rounded accent-emerald-500"
                  />
                  <span className={cn("text-xs transition-colors", item.done ? "line-through text-gray-400" : "text-gray-700 group-hover:text-gray-900")}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Internal notes */}
          {task.internal_notes && (
            <div>
              <p className="text-xs font-bold text-gray-700 mb-1.5">Notas internas</p>
              <p className="text-xs text-gray-600 leading-relaxed bg-amber-50 border border-amber-100 rounded-xl p-3">{task.internal_notes}</p>
            </div>
          )}
        </div>

        {/* Block message */}
        {blockMsg && !showAttach && (
          <div className="mx-6 mb-2 flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-xs text-amber-800">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="flex-1">{blockMsg}</span>
            <button
              onClick={() => setShowAttach(true)}
              className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 flex-shrink-0"
            >
              <Paperclip className="w-3 h-3" /> Anexar
            </button>
          </div>
        )}

        {/* Footer — status navigation */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3">
          <button
            onClick={goBack}
            disabled={!canGoBack || saving}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 px-3 py-2 rounded-xl hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Voltar etapa
          </button>
          <div className="flex-1 text-center text-xs text-gray-400">
            {COLUMNS[statusIdx]?.label}
          </div>
          <button
            onClick={advance}
            disabled={!canAdvance || saving}
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Avançar etapa
            {!saving && <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Format-aware delivery modal */}
      {showAttach && (
        <DeliveryAttachmentModal
          task={task}
          existingAttachments={attachments}
          onClose={() => { setShowAttach(false); setBlockMsg(null); }}
          onSaved={(newA) => { onAttachmentsSaved(newA); setShowAttach(false); setBlockMsg(null); }}
          onSendToReview={async () => {
            await onStatusChange(task.id, "revisao_interna");
            setShowAttach(false);
            onClose();
          }}
        />
      )}
    </div>
  );
}

// ── Main kanban content ───────────────────────────────────────

export function KanbanClientContent({ initialTasks, clients, isAdmin }: KanbanClientProps) {
  const [tasks,         setTasks]         = useState<DbOperationalTask[]>(initialTasks);
  const [attachments,   setAttachments]   = useState<TaskAttachment[]>([]);
  const [selectedTask,  setSelectedTask]  = useState<DbOperationalTask | null>(null);
  const [filterClient,  setFilterClient]  = useState("");
  const [filterDept,    setFilterDept]    = useState("");
  const [filterPrio,    setFilterPrio]    = useState("");
  const [showFilters,   setShowFilters]   = useState(false);

  // Fetch attachments for all tasks on mount
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

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (filterClient && t.client_id !== filterClient) return false;
      if (filterDept   && t.department !== filterDept)  return false;
      if (filterPrio   && t.priority   !== filterPrio)  return false;
      return true;
    });
  }, [tasks, filterClient, filterDept, filterPrio]);

  const grouped = useMemo(() => {
    const map: Record<string, DbOperationalTask[]> = {};
    STATUS_ORDER.forEach(s => { map[s] = []; });
    filtered.forEach(t => {
      const col = STATUS_ORDER.includes(t.status) ? t.status : "backlog";
      map[col].push(t);
    });
    return map;
  }, [filtered]);

  const handleStatusChange = useCallback(async (taskId: string, newStatus: string) => {
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    if (!isSupabaseConfigured) return;
    try {
      const supabase = createClient();
      await supabase.from("operational_tasks")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", taskId);

      const task = tasks.find(t => t.id === taskId);
      if (task?.content_item_id) {
        const ciStatus =
          newStatus === "revisao_interna" ? "revisao_interna" :
          newStatus === "aprovado"        ? "pronto_para_aprovacao" :
          newStatus === "concluido"       ? "pronto_para_agendar" :
          null;
        if (ciStatus) {
          await supabase.from("content_items").update({ status: ciStatus }).eq("id", task.content_item_id);
        }
      }
    } catch {
      // Supabase might not have the table yet — silent fail is OK
    }
  }, [tasks]);

  const openTask = useCallback((t: DbOperationalTask) => setSelectedTask(t), []);

  const handleAttachmentsSaved = useCallback((newA: TaskAttachment[]) => {
    if (newA.length === 0) return;
    setAttachments((prev) => {
      const withoutReplaced = prev.filter(
        (a) => !newA.some(
          (na) => na.task_id === a.task_id &&
                  na.asset_variant === a.asset_variant &&
                  na.page_number === a.page_number,
        ),
      );
      return [...withoutReplaced, ...newA];
    });
  }, []);

  const clientName = (id: string | null) =>
    clients.find(c => c.id === id)?.company_name ?? "—";

  const depts = [...new Set(tasks.map(t => t.department).filter(Boolean))];
  const activeFilters = [filterClient, filterDept, filterPrio].filter(Boolean).length;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <h1 className="text-lg font-black text-gray-900">Kanban Operacional</h1>
        <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{filtered.length} tarefas</span>
        <button
          onClick={() => setShowFilters(v => !v)}
          className={cn(
            "ml-auto flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border transition-colors",
            showFilters ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
          )}
        >
          <Filter className="w-3.5 h-3.5" />
          Filtros
          {activeFilters > 0 && (
            <span className="bg-indigo-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {activeFilters}
            </span>
          )}
        </button>
        {isAdmin && (
          <a
            href="/admin/operacional/tarefas/nova"
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 px-3 py-1.5 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            + Nova tarefa
          </a>
        )}
      </div>

      {/* Filters row */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-white rounded-2xl border border-gray-100">
          {isAdmin && clients.length > 0 && (
            <select
              value={filterClient}
              onChange={e => setFilterClient(e.target.value)}
              className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 outline-none focus:border-indigo-300 bg-white"
            >
              <option value="">Todos os clientes</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.company_name}</option>
              ))}
            </select>
          )}
          {depts.length > 0 && (
            <select
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 outline-none focus:border-indigo-300 bg-white"
            >
              <option value="">Todos os departamentos</option>
              {depts.map(d => <option key={d} value={d!}>{d}</option>)}
            </select>
          )}
          <select
            value={filterPrio}
            onChange={e => setFilterPrio(e.target.value)}
            className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 outline-none focus:border-indigo-300 bg-white"
          >
            <option value="">Todas as prioridades</option>
            {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {activeFilters > 0 && (
            <button
              onClick={() => { setFilterClient(""); setFilterDept(""); setFilterPrio(""); }}
              className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Limpar
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {tasks.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-16">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p className="text-sm font-medium text-gray-500">Nenhuma tarefa operacional criada ainda.</p>
            <p className="text-xs text-gray-400 mt-1">
              Crie conteúdos na REC OS e envie para produção.
            </p>
          </div>
        </div>
      )}

      {/* Kanban scroll */}
      {tasks.length > 0 && (
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {COLUMNS.map(col => {
            const colTasks = grouped[col.id] ?? [];
            return (
              <div key={col.id} className="flex-shrink-0 w-64">
                {/* Column header */}
                <div className={cn("flex items-center gap-2 px-3 py-2 rounded-t-xl", col.headerBg)}>
                  <span className={cn("w-2 h-2 rounded-full flex-shrink-0", col.dotColor)} />
                  <span className="text-xs font-bold text-gray-700 flex-1 truncate">{col.label}</span>
                  <span className="text-[10px] text-gray-400 bg-white/70 rounded-full px-1.5 py-0.5">{colTasks.length}</span>
                </div>

                {/* Cards */}
                <div className="bg-gray-50/50 rounded-b-xl border border-gray-100 border-t-0 min-h-[120px] p-2 space-y-2">
                  {colTasks.map(task => {
                    const tt    = TASK_TYPES[task.task_type ?? "outro"] ?? TASK_TYPES["outro"];
                    const prio  = PRIORITY[task.priority ?? "media"] ?? PRIORITY["media"];
                    const overdue = isOverdue(task.due_date);
                    return (
                      <div
                        key={task.id}
                        className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
                        onClick={() => openTask(task)}
                      >
                        {/* Type + priority */}
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <tt.icon className={cn("w-3 h-3 flex-shrink-0", tt.color)} />
                          <span className="text-[10px] text-gray-400 flex-1 truncate">{tt.label}</span>
                          <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full", prio.bg, prio.text)}>
                            {prio.label}
                          </span>
                        </div>

                        {/* Title */}
                        <p className="text-xs font-semibold text-gray-800 leading-snug mb-2 line-clamp-2">{task.title}</p>

                        {/* Footer */}
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                          {isAdmin && (
                            <span className="flex items-center gap-0.5 truncate flex-1">
                              <Building2 className="w-2.5 h-2.5 flex-shrink-0" />
                              {clientName(task.client_id)}
                            </span>
                          )}
                          {task.due_date && (
                            <span className={cn("flex items-center gap-0.5 flex-shrink-0", overdue ? "text-red-500" : "text-gray-400")}>
                              <Clock3 className="w-2.5 h-2.5" />
                              {fmtDate(task.due_date)}
                            </span>
                          )}
                          {task.assigned_role && !task.assigned_to && (
                            <span className="flex items-center gap-0.5 flex-shrink-0">
                              <UserCheck className="w-2.5 h-2.5" />
                              {task.assigned_role}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {colTasks.length === 0 && (
                    <div className="rounded-xl border-2 border-dashed border-gray-100 p-4 text-center">
                      <p className="text-[10px] text-gray-300">Vazio</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task detail modal */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          clients={clients}
          attachments={attachments}
          isAdmin={isAdmin}
          onClose={() => setSelectedTask(null)}
          onStatusChange={handleStatusChange}
          onAttachmentsSaved={handleAttachmentsSaved}
        />
      )}
    </div>
  );
}
