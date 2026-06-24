"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Check, X, MessageSquare, Loader2, CheckCircle2, XCircle, AlertCircle, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const SUPABASE_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON   = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

interface ContentInfo {
  title: string;
  type:  string | null;
  channel: string | null;
  caption: string | null;
  script:  string | null;
  scheduled_date: string | null;
}

interface ApprovalInfo {
  id: string;
  public_token: string;
  status: string;
  client_comment: string | null;
  content_id: string;
}

interface Props {
  token:    string;
  approval: ApprovalInfo;
  content:  ContentInfo;
}

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: "📸", tiktok: "🎵", linkedin: "💼",
  facebook: "📘", youtube: "▶️", twitter: "🐦", x: "🐦", whatsapp: "💬",
};

const TYPE_EMOJI: Record<string, string> = {
  feed: "📸", story: "📱", reels: "🎬", reel: "🎬",
  carousel: "📚", carrossel: "📚", legenda: "✍️",
  roteiro: "🎭", campanha: "🚀", whatsapp: "💬",
};

function channelEmoji(channel: string | null) {
  const key = (channel ?? "").toLowerCase().split(/[,\s]/)[0].trim();
  return PLATFORM_EMOJI[key] ?? "📱";
}

function typeEmoji(type: string | null) {
  return TYPE_EMOJI[(type ?? "").toLowerCase()] ?? "📄";
}

export function ApprovalClientContent({ token, approval, content }: Props) {
  const [comment, setComment] = useState(approval.client_comment ?? "");
  const [status, setStatus] = useState(approval.status);
  const [submitting, setSubmitting] = useState<"approve" | "change" | "reject" | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDone = done || ["aprovado", "reprovado", "alteracao_solicitada"].includes(status);

  async function submit(action: "approve" | "change" | "reject") {
    setSubmitting(action);
    setError(null);

    const newApprovalStatus =
      action === "approve" ? "aprovado" :
      action === "reject"  ? "reprovado" :
      "alteracao_solicitada";

    const newContentStatus =
      action === "approve" ? "aprovado" :
      action === "reject"  ? "reprovado" :
      "alteracao_solicitada";

    try {
      if (!SUPABASE_URL || !SUPABASE_ANON) throw new Error("Supabase não configurado");

      const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON);

      // Update content_item FIRST so it's already set when the DB trigger fires on approval update
      const { error: contentErr } = await supabase
        .from("content_items")
        .update({ status: newContentStatus })
        .eq("id", approval.content_id);

      if (contentErr) throw contentErr;

      // Update approval SECOND — this fires the auto_create_task_on_approval trigger
      // The trigger (SECURITY DEFINER) reads content_items.metadata.production_after_approval
      // and creates the operational_task, then overrides status to 'em_producao' if enabled
      const { error: approvalErr } = await supabase
        .from("approvals")
        .update({
          status:         newApprovalStatus,
          client_comment: comment || null,
          approved_at:    action === "approve" ? new Date().toISOString() : null,
        })
        .eq("public_token", token);

      if (approvalErr) throw approvalErr;

      await supabase.from("activity_logs").insert({
        action:      `approval_${action}`,
        entity_type: "approvals",
        entity_id:   approval.id,
        metadata:    { token, comment: comment || null, action },
      });

      setStatus(newApprovalStatus);
      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao processar. Tente novamente.");
    } finally {
      setSubmitting(null);
    }
  }

  if (isDone) {
    const isApproved = status === "aprovado";
    const isRejected = status === "reprovado";
    const isChange   = status === "alteracao_solicitada";

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center">
          {isApproved && (
            <>
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h1 className="text-2xl font-black text-gray-900 mb-2">Conteúdo aprovado!</h1>
              <p className="text-sm text-gray-500">Obrigado pela aprovação. A equipe já foi notificada.</p>
            </>
          )}
          {isRejected && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h1 className="text-2xl font-black text-gray-900 mb-2">Conteúdo reprovado</h1>
              <p className="text-sm text-gray-500">Recebemos sua reprovação. A equipe irá revisar e entrar em contato.</p>
            </>
          )}
          {isChange && (
            <>
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-amber-500" />
              </div>
              <h1 className="text-2xl font-black text-gray-900 mb-2">Alteração solicitada</h1>
              <p className="text-sm text-gray-500">Sua solicitação foi enviada. A equipe fará os ajustes em breve.</p>
            </>
          )}
          {comment && (
            <div className="mt-4 bg-gray-50 rounded-xl p-3 text-left">
              <p className="text-xs font-bold text-gray-500 mb-1">Seu comentário:</p>
              <p className="text-xs text-gray-700">{comment}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const scheduledDate = content.scheduled_date
    ? new Date(content.scheduled_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-sm font-black">L</div>
          <div>
            <p className="text-xs font-bold text-gray-900">Lokat OS</p>
            <p className="text-[10px] text-gray-400">Aprovação de conteúdo</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 py-8 space-y-4">
        {/* Content card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Content header */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 border-b border-gray-100">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-2xl flex-shrink-0">
                {typeEmoji(content.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-black text-gray-900 leading-snug">{content.title}</h1>
                <div className="flex flex-wrap gap-2 mt-2">
                  {content.type && (
                    <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2.5 py-1 rounded-xl uppercase tracking-wide">
                      {content.type}
                    </span>
                  )}
                  {content.channel && (
                    <span className="text-[10px] font-medium bg-white text-gray-600 border border-gray-100 px-2.5 py-1 rounded-xl">
                      {channelEmoji(content.channel)} {content.channel}
                    </span>
                  )}
                  {scheduledDate && (
                    <span className="text-[10px] font-medium bg-white text-gray-600 border border-gray-100 px-2.5 py-1 rounded-xl">
                      <CalendarDays className="w-3 h-3 inline mr-0.5" strokeWidth={1.5} />{scheduledDate}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Caption */}
          {content.caption && (
            <div className="p-5 border-b border-gray-50">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Legenda</p>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{content.caption}</p>
              </div>
            </div>
          )}

          {/* Script */}
          {content.script && (
            <div className="p-5 border-b border-gray-50">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Roteiro</p>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{content.script}</p>
              </div>
            </div>
          )}

          {!content.caption && !content.script && (
            <div className="p-5 text-center text-gray-400 text-sm">
              Sem prévia de conteúdo disponível.
            </div>
          )}
        </div>

        {/* Action card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-black text-gray-900">Sua avaliação</h2>

          {/* Comment */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">
              Comentário <span className="font-normal text-gray-400">(opcional para aprovação, recomendado para alteração/reprovação)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Descreva sua avaliação, ajustes necessários ou qualquer observação..."
              className="w-full h-28 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-purple-400 resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-600">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => submit("approve")}
              disabled={!!submitting}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-colors",
                submitting === "approve"
                  ? "bg-emerald-400 text-white"
                  : "bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60"
              )}
            >
              {submitting === "approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Aprovar
            </button>
            <button
              onClick={() => submit("change")}
              disabled={!!submitting}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-colors border",
                submitting === "change"
                  ? "bg-amber-100 text-amber-700 border-amber-200"
                  : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 disabled:opacity-60"
              )}
            >
              {submitting === "change" ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
              Pedir alteração
            </button>
            <button
              onClick={() => submit("reject")}
              disabled={!!submitting}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-colors border",
                submitting === "reject"
                  ? "bg-red-100 text-red-700 border-red-200"
                  : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 disabled:opacity-60"
              )}
            >
              {submitting === "reject" ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              Reprovar
            </button>
          </div>

          <p className="text-[10px] text-gray-400 text-center">
            Ao clicar em Aprovar, você confirma que o conteúdo está correto e pode ser publicado.
          </p>
        </div>
      </div>
    </div>
  );
}
