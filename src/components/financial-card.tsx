import { cn, formatCurrency } from "@/lib/utils";
import { StatusBadge } from "./status-badge";
import { CheckCircle2, AlertTriangle, Clock } from "lucide-react";

interface FinancialCardProps {
  description: string;
  client: string;
  amount: number;
  dueDate: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  className?: string;
}

export function FinancialCard({ description, client, amount, dueDate, status, className }: FinancialCardProps) {
  return (
    <div className={cn(
      "bg-white rounded-2xl border p-4 flex items-center gap-4",
      status === "overdue" ? "border-red-200" : "border-gray-100",
      className
    )}>
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0",
        status === "paid" ? "bg-emerald-50" : status === "overdue" ? "bg-red-50" : "bg-amber-50"
      )}>
        {status === "paid"
          ? <CheckCircle2 className="w-5 h-5 text-emerald-500" strokeWidth={1.5} />
          : status === "overdue"
          ? <AlertTriangle className="w-5 h-5 text-red-500" strokeWidth={1.5} />
          : <Clock className="w-5 h-5 text-amber-500" strokeWidth={1.5} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{description}</p>
        <p className="text-xs text-gray-400">{client} · {new Date(dueDate).toLocaleDateString("pt-BR")}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-gray-900">{formatCurrency(amount)}</p>
        <StatusBadge status={status} />
      </div>
    </div>
  );
}
