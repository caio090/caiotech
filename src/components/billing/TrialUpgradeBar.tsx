"use client";
import Link from "next/link";
import { Clock, Zap, ChevronRight } from "lucide-react";

interface Props {
  daysLeft?: number | null;
  planName?: string;
  planSlug?: string;
  /** Pass "active" when subscription is paid/active */
  subscriptionStatus?: "trialing" | "active" | "beta_free" | "past_due" | "canceled" | null;
  renewalDate?: string | null;
}

export function TrialUpgradeBar({
  daysLeft,
  planName = "Start · Beta",
  planSlug = "start",
  subscriptionStatus = "trialing",
  renewalDate,
}: Props) {
  if (subscriptionStatus === "active" && renewalDate) {
    return (
      <div className="w-full bg-emerald-50 border-b border-emerald-100 px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-emerald-700">
          <Zap className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Plano <strong>{planName}</strong> ativo · Próxima renovação: {renewalDate}</span>
        </div>
        <Link href="/planos" className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 whitespace-nowrap">
          Gerenciar plano <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    );
  }

  if (subscriptionStatus === "beta_free") {
    return (
      <div className="w-full bg-purple-50 border-b border-purple-100 px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-purple-700">
          <Zap className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Acesso beta liberado · Plano <strong>{planName}</strong></span>
        </div>
        <Link href="/planos" className="text-xs font-bold text-purple-700 hover:underline flex items-center gap-1 whitespace-nowrap">
          Ver upgrade <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    );
  }

  // trialing (default)
  const urgent = typeof daysLeft === "number" && daysLeft <= 3;
  return (
    <div className={`w-full border-b px-4 py-2 flex items-center justify-between gap-4 ${urgent ? "bg-amber-50 border-amber-200" : "bg-indigo-50 border-indigo-100"}`}>
      <div className={`flex items-center gap-2 text-xs ${urgent ? "text-amber-700" : "text-indigo-700"}`}>
        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
        <span>
          {typeof daysLeft === "number"
            ? <>Você está no teste grátis · <strong>Faltam {daysLeft} dia{daysLeft !== 1 ? "s" : ""}</strong></>
            : "Você está no teste grátis"
          }
          {" · "}Plano <strong>{planName}</strong>
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/planos" className={`text-xs font-bold hover:underline flex items-center gap-1 whitespace-nowrap ${urgent ? "text-amber-700" : "text-indigo-600"}`}>
          Fazer upgrade <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
