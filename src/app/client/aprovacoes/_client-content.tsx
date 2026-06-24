"use client";
import { useState, useCallback } from "react";
import { ApprovalCard } from "@/components/approval-card";
import { PageHeader } from "@/components/page-header";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { CheckCircle, FileCheck } from "lucide-react";

export interface UiApproval {
  id: string;
  contentId?: string;
  contentTitle: string;
  platform: string;
  preview: string;
  deadline: string;
  status: "pending" | "approved" | "rejected";
  token?: string;
}

interface Props {
  initialApprovals: UiApproval[];
  isDemo: boolean;
}

export function ClientAprovacoesContent({ initialApprovals, isDemo }: Props) {
  const [approvals, setApprovals] = useState<UiApproval[]>(initialApprovals);
  const [toast, setToast]         = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  const handleAction = useCallback(async (
    approvalId: string,
    contentId: string | undefined,
    action: "approved" | "rejected"
  ) => {
    // Optimistic UI update first
    setApprovals((prev) =>
      prev.map((a) => a.id === approvalId ? { ...a, status: action } : a)
    );

    if (!isSupabaseConfigured) {
      showToast("Resposta enviada para a equipe.");
      return;
    }

    try {
      const supabase    = createClient();
      const dbStatus    = action === "approved" ? "aprovado" : "reprovado";

      await supabase
        .from("approvals")
        .update({
          status:      dbStatus,
          approved_at: action === "approved" ? new Date().toISOString() : null,
        })
        .eq("id", approvalId);

      if (contentId) {
        await supabase
          .from("content_items")
          .update({ status: dbStatus })
          .eq("id", contentId);
      }

      // Non-critical activity log — fire and forget
      void supabase.from("activity_logs").insert({
        action:      `approval_${action}`,
        entity_type: "approvals",
        entity_id:   approvalId,
        metadata:    { action },
      });

      showToast("Resposta enviada para a equipe.");
    } catch {
      // Revert optimistic update on error
      setApprovals((prev) =>
        prev.map((a) => a.id === approvalId ? { ...a, status: "pending" } : a)
      );
      showToast("Erro ao enviar. Tente novamente.");
    }
  }, []);

  const pending = approvals.filter((a) => a.status === "pending");
  const done    = approvals.filter((a) => a.status !== "pending");

  return (
    <div>
      <PageHeader title="Aprovações" description="Revise e aprove os conteúdos criados para você" />

      {isDemo && (
        <div className="mb-4 flex items-center gap-2 text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
          Modo demonstração — dados fictícios
        </div>
      )}

      {toast && (
        <div className="mb-4 flex items-center gap-2 text-sm bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {toast}
        </div>
      )}

      {pending.length === 0 && done.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <FileCheck className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-sm font-medium text-gray-500">Nenhuma aprovação no momento.</p>
          <p className="text-xs text-gray-400 mt-1">
            Novos conteúdos aparecerão aqui quando forem enviados pela equipe.
          </p>
        </div>
      )}

      {pending.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
            Aguardando sua aprovação ({pending.length})
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {pending.map((a) => (
              <ApprovalCard
                key={a.id}
                {...a}
                onApprove={() => handleAction(a.id, a.contentId, "approved")}
                onReject={() => handleAction(a.id, a.contentId, "rejected")}
              />
            ))}
          </div>
        </div>
      )}

      {done.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-700 mb-3">Histórico</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {done.map((a) => <ApprovalCard key={a.id} {...a} />)}
          </div>
        </div>
      )}
    </div>
  );
}
