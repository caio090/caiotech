"use client";
import { useState } from "react";
import { CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ApprovalCardProps {
  id: string;
  contentTitle: string;
  client?: string;
  platform: string;
  preview: string;
  deadline: string;
  status: string;
  className?: string;
  onApprove?: () => Promise<void>;
  onReject?: () => Promise<void>;
}

export function ApprovalCard({
  contentTitle, client, platform, preview, deadline, status, className,
  onApprove, onReject,
}: ApprovalCardProps) {
  const [localStatus, setLocalStatus] = useState(status);
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  const parsedDate = deadline && deadline !== "—" ? new Date(deadline) : null;
  const validDate  = parsedDate && !isNaN(parsedDate.getTime());

  async function handleApprove() {
    setLoading("approve");
    try { if (onApprove) await onApprove(); } catch { /* handled by parent */ }
    setLocalStatus("approved");
    setLoading(null);
  }

  async function handleReject() {
    setLoading("reject");
    try { if (onReject) await onReject(); } catch { /* handled by parent */ }
    setLocalStatus("rejected");
    setLoading(null);
  }

  return (
    <div className={cn(
      "bg-white rounded-2xl border p-5",
      localStatus === "approved" ? "border-emerald-200" :
      localStatus === "rejected" ? "border-red-100" : "border-gray-100",
      className
    )}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-800 truncate">{contentTitle}</h3>
          <div className="flex items-center gap-2 mt-1">
            {client && <span className="text-xs text-gray-400 truncate">{client}</span>}
            <span className="text-xs font-medium text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full flex-shrink-0">{platform}</span>
          </div>
        </div>
        {validDate ? (
          <div className="flex items-center gap-1 text-xs text-amber-600 flex-shrink-0">
            <Clock className="w-3 h-3" />
            <span>{parsedDate!.toLocaleDateString("pt-BR")}</span>
          </div>
        ) : deadline && deadline !== "—" ? (
          <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
            <Clock className="w-3 h-3" />
            <span>{deadline}</span>
          </div>
        ) : null}
      </div>

      {preview && (
        <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 mb-4 line-clamp-3">{preview}</p>
      )}

      {localStatus === "pending" ? (
        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            disabled={!!loading}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition-colors disabled:opacity-60"
          >
            {loading === "approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Aprovar
          </button>
          <button
            onClick={handleReject}
            disabled={!!loading}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-60"
          >
            {loading === "reject" ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Reprovar
          </button>
        </div>
      ) : (
        <div className={cn(
          "flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium",
          localStatus === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
        )}>
          {localStatus === "approved" ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {localStatus === "approved" ? "Aprovado" : "Reprovado"}
        </div>
      )}
    </div>
  );
}
