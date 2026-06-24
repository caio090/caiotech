import Link from "next/link";
import { StatusBadge } from "./status-badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

interface ClientCardProps {
  id: string;
  name: string;
  company: string;
  segment: string;
  health: "healthy" | "attention" | "risk";
  status: "active" | "paused" | "churned";
  owner: string;
  mrr: number;
  avatar: string;
  color: string;
  href?: string;
}

export function ClientCard({ name, company, segment, health, owner, mrr, avatar, color, href }: ClientCardProps) {
  const Wrapper = href ? Link : "div";
  return (
    <Wrapper href={href ?? "#"} className="block bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-start gap-3 mb-4">
        <div className={cn("w-10 h-10 rounded-xl text-white text-sm font-bold flex items-center justify-center flex-shrink-0", color)}>
          {avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-gray-900 truncate">{name}</h3>
            <StatusBadge status={health} />
          </div>
          <p className="text-xs text-gray-400 truncate">{company}</p>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Segmento</span>
          <span className="font-medium text-gray-700">{segment}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">MRR</span>
          <span className="font-bold text-emerald-600">{formatCurrency(mrr)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Responsável</span>
          <span className="font-medium text-gray-700">{owner.split(" ")[0]}</span>
        </div>
      </div>
    </Wrapper>
  );
}
