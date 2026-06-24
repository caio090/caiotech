import { StatusBadge } from "./status-badge";
import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";

interface ContentCardProps {
  title: string;
  client?: string;
  clientName?: string;
  platform: string;
  type: string;
  status: string;
  thumbnail: string;
  scheduledAt?: string | null;
  assignee?: string;
  className?: string;
}

const platformColors: Record<string, string> = {
  Instagram: "text-pink-600 bg-pink-50",
  LinkedIn: "text-blue-600 bg-blue-50",
  TikTok: "text-gray-700 bg-gray-100",
  Facebook: "text-blue-700 bg-blue-50",
};

export function ContentCard({ title, client, clientName, platform, status, thumbnail, scheduledAt, className }: ContentCardProps) {
  const displayClient = client ?? clientName;
  return (
    <div className={cn("bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-shadow cursor-pointer", className)}>
      <div className="flex gap-3">
        <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-2xl flex-shrink-0">
          {thumbnail}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-800 leading-snug truncate">{title}</h3>
            <StatusBadge status={status as "draft"} className="flex-shrink-0" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {displayClient && <span className="text-xs text-gray-400">{displayClient}</span>}
            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", platformColors[platform] || "text-gray-600 bg-gray-100")}>
              {platform}
            </span>
            {scheduledAt && (
              <span className="text-xs text-gray-400">
                <CalendarDays className="w-3.5 h-3.5 inline mr-0.5" strokeWidth={1.5} />{new Date(scheduledAt).toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
