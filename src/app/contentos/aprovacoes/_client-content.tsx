"use client";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { mockApprovals } from "@/data/mock-data";
import { cn } from "@/lib/utils";
import {
  CalendarDays, AlertTriangle, Copy, MessageCircle, CheckCircle, XCircle, Clock,
  X, Send, ArrowRight, ClipboardList,
} from "lucide-react";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import type { DbApprovalWithContent } from "@/lib/supabase/types";
import { dbApprovalStatusToUi, contentTypeEmoji } from "@/lib/supabase/types";
import { SendToProdModal, type SendToProdConfig } from "@/components/send-to-prod-modal";
import { CopyIdButton } from "@/components/copy-id-button";

type TabKey = "pending" | "change_requested" | "approved" | "rejected";

const TABS: Array<{ key: TabKey; label: string; emoji: string }> = [
  { key: "pending",          label: "Aguardando",  emoji: "⏳" },
  { key: "change_requested", label: "Alteração",   emoji: "✏️" },
  { key: "approved",         label: "Aprovado",    emoji: "✅" },
  { key: "rejected",         label: "Reprovado",   emoji: "❌" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:          { label: "Aguardando aprovação", color: "text-amber-600 bg-amber-50 border-amber-100",       icon: Clock },
  change_requested: { label: "Alteração solicitada", color: "text-blue-600 bg-blue-50 border-blue-100",         icon: AlertTriangle },
  approved:         { label: "Aprovado",             color: "text-emerald-600 bg-emerald-50 border-emerald-100", icon: CheckCircle },
  rejected:         { label: "Reprovado",            color: "text-red-600 bg-red-50 border-red-100",             icon: XCircle },
};

const PLATFORM_EMOJI: Record<string, string> = {
  Instagram: "📸", TikTok: "🎵", LinkedIn: "💼",
  Facebook: "📘", YouTube: "▶️", "X / Twitter": "🐦",
};

const CONTENT_THUMBNAILS = ["🍬", "🎂", "🍫", "🎁", "🌸", "✨", "🎉", "🍰", "💝", "🎀"];
const OBJECTIVE_LABELS: Record<string, string> = {
  vender: "💰 Vender", leads: "🎯 Leads", autoridade: "🏆 Autoridade",
  engajamento: "❤️ Engajamento", marketing: "📊 Marketing", atendimento: "💬 Atendimento",
};

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

// ── Timing helpers ────────────────────────────────────────────

function hoursAgo(iso: string | null | undefined, now: number): number | null {
  if (!iso) return null;
  return Math.floor((now - new Date(iso).getTime()) / 3600000);
}

const APPROVAL_TZ = "America/Fortaleza";

function formatDueDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: APPROVAL_TZ });
}

/** Formats a scheduled_date (YYYY-MM-DD, no time component) as DD/MM/YYYY without
 * going through `new Date()`, which would shift the day when server/browser timezones differ. */
function formatScheduledDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }
  return new Date(dateStr).toLocaleDateString("pt-BR", { timeZone: APPROVAL_TZ });
}

// ── UiApproval ────────────────────────────────────────────────

interface UiApproval {
  id: string;
  contentId: string | null;
  clientId: string | null;
  contentTitle: string;
  clientName: string;
  platform: string;
  type: string | null;
  status: TabKey;
  thumbnail: string;
  legenda: string | null;
  objetivo: string | null;
  dataPrevista: string;
  token: string | null;
  approvalSentAt: string | null;
  approvalDueAt: string | null;
  clientComment: string | null;
  operationalTaskId: string | null;
}

// ── ApprovalDetailModal ───────────────────────────────────────

function ApprovalDetailModal({
  item,
  onClose,
  onSendToProd,
  serverNow,
}: {
  item: UiApproval;
  onClose: () => void;
  onSendToProd: (item: UiApproval) => void;
  serverNow: number;
}) {
  const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
  const StatusIcon = cfg.icon;
  const hAgo = hoursAgo(item.approvalSentAt, serverNow);
  const dueStr = formatDueDate(item.approvalDueAt);
  const isLate = item.approvalDueAt
    ? serverNow > new Date(item.approvalDueAt).getTime()
    : hAgo !== null && hAgo > 48;

  const [browserOrigin, setBrowserOrigin] = useState("");
  useEffect(() => {
    setBrowserOrigin(window.location.origin);
  }, []);

  function handleCopy() {
    const link = item.token && browserOrigin ? `${browserOrigin}/aprovar/${item.token}` : null;
    if (link) copyToClipboard(link);
  }

  const approvalLink = item.token && browserOrigin ? `${browserOrigin}/aprovar/${item.token}` : null;

  // History steps based on status
  const steps: { label: string; done: boolean; active: boolean }[] = [
    { label: "Criado",                done: true,                                                            active: false },
    { label: "Enviado ao cliente",    done: !!item.approvalSentAt || item.status !== "pending",              active: item.status === "pending" },
    { label: "Aprovado pelo cliente", done: item.status === "approved",                                      active: item.status === "change_requested" || item.status === "rejected" },
    { label: "Enviado para produção", done: false,                                                            active: item.status === "approved" },
    { label: "Produção concluída",    done: false,                                                            active: false },
    { label: "Agendado",              done: false,                                                            active: false },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span className="text-3xl">{item.thumbnail}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-gray-900 leading-tight">{item.contentTitle}</p>
              {item.clientName && <p className="text-xs text-gray-400 mt-0.5">{item.clientName}</p>}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-gray-500">{PLATFORM_EMOJI[item.platform] ?? "📱"} {item.platform}</span>
                {item.type && <span className="text-xs text-gray-400">· {item.type}</span>}
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1", cfg.color)}>
                  <StatusIcon className="w-2.5 h-2.5" />{cfg.label}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0 ml-2">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Timing badges */}
          {(hAgo !== null || dueStr) && (
            <div className="flex items-center gap-2 flex-wrap">
              {hAgo !== null && (
                <span className="text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">
                  <Clock className="w-3 h-3 inline mr-1 -mt-px" />
                  Enviado há {hAgo < 1 ? "menos de 1h" : `${hAgo}h`}
                </span>
              )}
              {dueStr && (
                <span className={cn(
                  "text-xs font-medium px-2.5 py-1 rounded-full border",
                  isLate
                    ? "bg-red-50 border-red-100 text-red-700"
                    : "bg-amber-50 border-amber-100 text-amber-700"
                )}>
                  {isLate ? "⚠️ Atrasado para aprovação" : `Prazo: até ${dueStr}`}
                </span>
              )}
            </div>
          )}

          {/* Client approved highlight */}
          {item.status === "approved" && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-emerald-800">Cliente aprovou este conteúdo</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  {item.operationalTaskId
                    ? "Tarefa de produção criada automaticamente."
                    : "Próximo passo: enviar para produção."}
                </p>
              </div>
            </div>
          )}

          {/* Badge tarefa criada automaticamente pelo trigger */}
          {item.status === "approved" && item.operationalTaskId && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-indigo-500 flex-shrink-0" strokeWidth={1.5} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-indigo-800">Produção automática ativada</p>
                <p className="text-xs text-indigo-500 mt-0.5 font-mono truncate">#{item.operationalTaskId.slice(0, 8)}</p>
              </div>
              <span className="text-[9px] font-black tracking-widest text-indigo-400 uppercase bg-indigo-100 px-2 py-0.5 rounded-full flex-shrink-0">
                AUTO
              </span>
            </div>
          )}

          {/* Client comment */}
          {item.clientComment && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
              <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">Comentário do cliente</p>
              <p className="text-xs text-blue-800 leading-relaxed">{item.clientComment}</p>
            </div>
          )}

          {/* Legenda / copy */}
          {item.legenda && (
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Legenda / copy</p>
              <p className="text-xs text-gray-700 leading-relaxed bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
                {item.legenda}
              </p>
            </div>
          )}

          {/* Date */}
          {item.dataPrevista !== "—" && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Data prevista</span>
              <span className="font-medium text-gray-800 flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.5} />{item.dataPrevista}</span>
            </div>
          )}

          {/* Approval link */}
          {approvalLink && (
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Link de aprovação</p>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                <span className="text-xs text-gray-500 truncate flex-1">{approvalLink}</span>
                <button
                  onClick={handleCopy}
                  className="text-[10px] text-purple-600 bg-purple-50 px-2 py-1 rounded-lg font-medium flex-shrink-0 hover:bg-purple-100 transition-colors"
                >
                  Copiar
                </button>
              </div>
            </div>
          )}

          {/* Technical IDs */}
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">IDs técnicos</p>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500">Aprovação:</span>
                <span className="font-mono text-gray-700 truncate">{item.id}</span>
                <CopyIdButton id={item.id} label="Copiar ID da aprovação" />
              </div>
              {item.contentId && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500">Conteúdo:</span>
                  <span className="font-mono text-gray-700 truncate">{item.contentId}</span>
                  <CopyIdButton id={item.contentId} label="Copiar ID do conteúdo" />
                </div>
              )}
            </div>
          </div>

          {/* History timeline */}
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Histórico do conteúdo</p>
            <div className="space-y-0">
              {steps.map((s, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                      s.done
                        ? "bg-emerald-500 border-emerald-500"
                        : s.active
                          ? "bg-white border-purple-500"
                          : "bg-white border-gray-200"
                    )}>
                      {s.done && <CheckCircle className="w-3 h-3 text-white" />}
                      {s.active && <div className="w-2 h-2 rounded-full bg-purple-500" />}
                    </div>
                    {i < steps.length - 1 && (
                      <div className={cn("w-0.5 h-5 mt-0.5", s.done ? "bg-emerald-200" : "bg-gray-100")} />
                    )}
                  </div>
                  <p className={cn(
                    "text-xs pb-4 mt-0.5",
                    s.done ? "text-emerald-700 font-medium" :
                    s.active ? "text-purple-700 font-bold" :
                    "text-gray-400"
                  )}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="flex gap-2 px-5 pb-5 pt-1 sticky bottom-0 bg-white border-t border-gray-50">
          {approvalLink && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              Copiar link
            </button>
          )}
          {item.status === "approved" && (
            <button
              onClick={() => { onClose(); onSendToProd(item); }}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              Enviar para produção
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-auto flex items-center gap-1 text-xs font-medium px-3 py-2.5 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────

interface Props {
  serverApprovals: DbApprovalWithContent[] | null;
  initialApprovalId?: string | null;
  /** Sprint 4.0A.1 — canonical content_items.status value(s), comma-separated,
   * arriving from the REC OS Hub cards. Mapped to the closest tab; the
   * underlying data model here is keyed by approval status (TabKey), not
   * content_items.status, so this is a best-effort initial selection, not
   * an exact filter. */
  initialStatusFilter?: string | null;
  activeClientId?: string | null;
  activeClientName?: string | null;
  serverNow: number;
}

function tabFromStatusFilter(statusFilter?: string | null): TabKey | null {
  if (!statusFilter) return null;
  const values = statusFilter.split(",");
  if (values.some((v) => v === "alteracao_solicitada" || v === "ajuste")) return "change_requested";
  if (values.some((v) => v === "enviado_aprovacao")) return "pending";
  return null;
}

export function ContentosAprovacoesContent({ serverApprovals, initialApprovalId, initialStatusFilter, activeClientId, activeClientName, serverNow }: Props) {
  const [activeTab,   setActiveTab]   = useState<TabKey>(() => tabFromStatusFilter(initialStatusFilter) ?? "pending");
  const [copiedId,    setCopiedId]    = useState<string | null>(null);
  const [openItem,    setOpenItem]    = useState<UiApproval | null>(null);
  const [prodItem,    setProdItem]    = useState<UiApproval | null>(null);
  const [sendingProd, setSendingProd] = useState(false);
  const [autoOpenDone, setAutoOpenDone] = useState(false);

  const serverHasReal = serverApprovals !== null;
  const [isFetching,          setIsFetching]          = useState(isSupabaseConfigured && !serverHasReal);
  const [clientSideApprovals, setClientSideApprovals] = useState<DbApprovalWithContent[] | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || serverHasReal) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) { setIsFetching(false); return; }

      const { data: clientRow } = await supabase
        .from("clients").select("id").eq("owner_id", user.id).single();
      if (!clientRow || cancelled) { setIsFetching(false); return; }

      const { data } = await supabase
        .from("approvals")
        .select("*, content_items(*)")
        .eq("client_id", clientRow.id)
        .order("created_at", { ascending: false });
      if (!cancelled) {
        setClientSideApprovals((data as DbApprovalWithContent[]) ?? []);
        setIsFetching(false);
      }
    })();
    return () => { cancelled = true; };
  }, [serverHasReal]);

  const resolvedApprovals = serverApprovals ?? clientSideApprovals;
  // When activeClientId is supplied (admin context), an empty real array is not demo mode
  const isDemo = !isFetching && resolvedApprovals === null && !activeClientId;

  // Build UI items
  let items: UiApproval[];
  if (resolvedApprovals) {
    items = resolvedApprovals.map((a, i) => {
      const c = a.content_items;
      return {
        id:             a.id,
        contentId:      a.content_id ?? null,
        clientId:       a.client_id ?? null,
        contentTitle:   c?.title ?? "Sem título",
        clientName:     "",
        platform:       c?.channel?.split(",")[0]?.trim() ?? "Instagram",
        type:           c?.type ?? null,
        status:         dbApprovalStatusToUi(a.status) as TabKey,
        thumbnail:      c ? contentTypeEmoji(c.type) : CONTENT_THUMBNAILS[i % CONTENT_THUMBNAILS.length],
        legenda:        c?.caption ?? null,
        objetivo:       c?.objective ?? null,
        dataPrevista:   formatScheduledDate(c?.scheduled_date),
        token:          a.public_token,
        approvalSentAt: a.approval_sent_at ?? a.created_at,
        approvalDueAt:  a.approval_due_at ?? null,
        clientComment:     a.client_comment ?? null,
        operationalTaskId: (a.metadata as Record<string, string> | null)?.operational_task_id ?? null,
      };
    });
  } else {
    items = mockApprovals.map((a, i) => ({
      id:             a.id,
      contentId:      null,
      clientId:       null,
      contentTitle:   a.contentTitle,
      clientName:     a.clientName,
      platform:       ["Instagram", "TikTok", "Facebook"][i % 3],
      type:           null,
      status:         a.status as TabKey,
      thumbnail:      CONTENT_THUMBNAILS[i % CONTENT_THUMBNAILS.length],
      legenda:        i % 2 === 0
        ? "✨ Novidade especial que você vai adorar! Conheça nossa linha exclusiva."
        : "🎉 Chegou a hora de celebrar! Peça pelo link na bio e receba em casa. 🍬",
      objetivo:       Object.keys(OBJECTIVE_LABELS)[i % 6],
      dataPrevista:   new Date(serverNow + (i + 1) * 2 * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza" }),
      token:          null,
      approvalSentAt: new Date(serverNow - i * 8 * 3600000).toISOString(),
      approvalDueAt:  new Date(serverNow + (48 - i * 8) * 3600000).toISOString(),
      clientComment:     null,
      operationalTaskId: null,
    }));
  }

  const handleCopy = (item: UiApproval) => {
    const link = item.token
      ? `${window.location.origin}/aprovar/${item.token}`
      : `https://lokat.app/aprovacao/${item.id}`;
    copyToClipboard(link);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleWhatsApp = (title: string, clientName: string, token: string | null) => {
    const link = token ? `${window.location.origin}/aprovar/${token}` : "https://lokat.app/aprovacao/demo";
    const msg = `Olá ${clientName || ""}! 👋 Seu conteúdo "${title}" está pronto para aprovação. Acesse: ${link}`;
    const url = `https://wa.me/55?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  async function handleSendToProd(cfg: SendToProdConfig) {
    if (!prodItem || !isSupabaseConfigured) return;
    setSendingProd(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("operational_tasks").insert({
        client_id:      prodItem.clientId,
        content_item_id: prodItem.contentId,
        title:          `Produção: ${prodItem.contentTitle}`,
        description:    `Canal: ${prodItem.platform}`,
        task_type:      cfg.task_type,
        department:     cfg.department,
        assigned_role:  cfg.assigned_role,
        status:         "briefing",
        priority:       cfg.priority,
        due_date:       cfg.due_date,
        internal_notes: cfg.notes || null,
        channel:        prodItem.platform,
        created_by:     user?.id ?? null,
      });

      if (prodItem.contentId) {
        await supabase.from("content_items").update({ status: "em_producao" }).eq("id", prodItem.contentId);
      }
    } catch (e) {
      console.error("[aprovacoes] sendToProd error:", e);
    } finally {
      setSendingProd(false);
      setProdItem(null);
    }
  }

  // Auto-open a specific approval when initialApprovalId is provided (from URL ?approval=)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!initialApprovalId || autoOpenDone || items.length === 0) return;
    const target = items.find((i) => i.id === initialApprovalId);
    if (target) {
      setActiveTab(target.status);
      setOpenItem(target);
      setAutoOpenDone(true);
    }
  }, [initialApprovalId, items.length, autoOpenDone]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const byStatus: Record<TabKey, UiApproval[]> = {
    pending:          items.filter((a) => a.status === "pending"),
    change_requested: items.filter((a) => a.status === "change_requested"),
    approved:         items.filter((a) => a.status === "approved"),
    rejected:         items.filter((a) => a.status === "rejected"),
  };
  if (isDemo && byStatus.change_requested.length === 0 && items.length > 0) {
    byStatus.change_requested = [{ ...items[0], status: "change_requested", id: "mock-cr-1" }];
  }

  const activeItems = byStatus[activeTab];

  // Count late items
  const lateCount = byStatus.pending.filter((a) =>
    a.approvalDueAt ? serverNow > new Date(a.approvalDueAt).getTime() : false
  ).length;

  return (
    <div>
      <PageHeader
        title="Aprovações"
        description={activeClientName ? `${activeClientName} — Conteúdos aguardando feedback` : "Conteúdos aguardando feedback dos clientes"}
      />

      {isFetching ? (
        <div className="mb-4 flex items-center gap-2 text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-pulse" /> Carregando…
        </div>
      ) : isDemo ? (
        <div className="mb-4 flex items-center gap-2 text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-300" /> Modo demonstração — dados fictícios
        </div>
      ) : null}

      {/* Late alert */}
      {lateCount > 0 && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-xs text-red-700">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span><strong>{lateCount}</strong> aprovação{lateCount > 1 ? "ões" : ""} atrasada{lateCount > 1 ? "s" : ""} (mais de 48h sem resposta)</span>
        </div>
      )}

      {/* Tab chips */}
      <div className="flex gap-2 flex-wrap mb-6">
        {TABS.map((tab) => {
          const count = byStatus[tab.key].length;
          const hasLate = tab.key === "pending" && lateCount > 0;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 text-xs font-medium transition-all",
                activeTab === tab.key
                  ? "border-purple-500 bg-purple-50 text-purple-700"
                  : "border-gray-100 bg-white text-gray-600 hover:border-gray-200"
              )}
            >
              {tab.emoji} {tab.label}
              {count > 0 && (
                <span className={cn(
                  "text-[10px] font-black px-1.5 py-0.5 rounded-full ml-0.5",
                  activeTab === tab.key ? "bg-purple-600 text-white" : hasLate ? "bg-red-500 text-white" : "bg-gray-100 text-gray-500"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Cards */}
      {activeItems.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">{TABS.find(t => t.key === activeTab)?.emoji}</div>
          <p className="text-sm text-gray-500">Nenhum conteúdo nesta categoria</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {activeItems.map((a) => {
            const cfg = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.pending;
            const StatusIcon = cfg.icon;
            const hAgo = hoursAgo(a.approvalSentAt, serverNow);
            const dueStr = formatDueDate(a.approvalDueAt);
            const isLate = a.approvalDueAt
              ? serverNow > new Date(a.approvalDueAt).getTime()
              : hAgo !== null && hAgo > 48;
            return (
              <div key={a.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Preview */}
                <div className="h-28 bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center relative">
                  <span className="text-5xl">{a.thumbnail}</span>
                  <div className="absolute top-2 right-2">
                    <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full border", cfg.color)}>
                      <StatusIcon className="w-2.5 h-2.5 inline mr-0.5" />{cfg.label}
                    </span>
                  </div>
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full">
                    <span className="text-xs">{PLATFORM_EMOJI[a.platform] ?? "📱"}</span>
                    <span className="text-[10px] font-medium text-gray-700">{a.platform}</span>
                  </div>
                  {isLate && (
                    <div className="absolute bottom-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      ⚠ Atrasado
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-bold text-gray-900 leading-tight">{a.contentTitle}</p>
                      {a.clientName && <p className="text-xs text-gray-400 mt-0.5">{a.clientName}</p>}
                    </div>
                    {a.objetivo && OBJECTIVE_LABELS[a.objetivo] && (
                      <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                        {OBJECTIVE_LABELS[a.objetivo]}
                      </span>
                    )}
                  </div>

                  {a.legenda && (
                    <p className="text-xs text-gray-600 leading-relaxed mb-3 line-clamp-2">{a.legenda}</p>
                  )}

                  {/* Timing row */}
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-4 flex-wrap">
                    {hAgo !== null && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {hAgo < 1 ? "Agora mesmo" : `${hAgo}h atrás`}
                      </span>
                    )}
                    {dueStr && (
                      <span className={cn("flex items-center gap-1", isLate ? "text-red-500 font-medium" : "")}>
                        {isLate ? <><AlertTriangle className="w-3 h-3" strokeWidth={1.5} />Prazo vencido</> : `Prazo: ${dueStr}`}
                      </span>
                    )}
                    {!hAgo && <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.5} />Previsão: {a.dataPrevista}</span>}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopy(a)}
                      className={cn(
                        "flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-xl border transition-all",
                        copiedId === a.id
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                      )}
                    >
                      <Copy className="w-3 h-3" />
                      {copiedId === a.id ? "Copiado!" : "Copiar"}
                    </button>

                    <button
                      onClick={() => handleWhatsApp(a.contentTitle, a.clientName, a.token)}
                      className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-xl border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors"
                    >
                      <MessageCircle className="w-3 h-3" />
                      WhatsApp
                    </button>

                    <button
                      onClick={() => setOpenItem(a)}
                      className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors ml-auto"
                    >
                      <ArrowRight className="w-3 h-3" />
                      Abrir
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Approval detail modal */}
      {openItem && (
        <ApprovalDetailModal
          item={openItem}
          onClose={() => setOpenItem(null)}
          onSendToProd={(item) => { setProdItem(item); }}
          serverNow={serverNow}
        />
      )}

      {/* Send to prod modal */}
      {prodItem && (
        <SendToProdModal
          contentTitle={prodItem.contentTitle}
          clientName={prodItem.clientName}
          sending={sendingProd}
          onClose={() => setProdItem(null)}
          onSubmit={handleSendToProd}
        />
      )}
    </div>
  );
}
