import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: number;
  trendLabel?: string;
  className?: string;
  alert?: boolean;
  premium?: boolean;
}

export function DashboardCard({
  title, value, subtitle, icon: Icon, iconColor = "text-indigo-600",
  iconBg = "bg-indigo-50", trend, trendLabel, className, alert, premium,
}: DashboardCardProps) {
  const isPositive = trend !== undefined && trend > 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  if (premium) {
    return (
      <div className={cn("dashboard-card-premium reveal-up flex flex-col gap-3", className)}>
        <div className="flex items-start justify-between">
          <span className="text-sm font-medium" style={{ color: "#8888a0" }}>{title}</span>
          {Icon && (
            <div className="p-2 rounded-xl" style={{ background: "rgba(123,110,246,0.12)", border: "1px solid rgba(123,110,246,0.2)" }}>
              <Icon className="w-4 h-4" style={{ color: "#7b6ef6" }} />
            </div>
          )}
        </div>
        <div>
          <div className="text-2xl font-bold" style={{ color: alert ? "#f87171" : "#eeeef0" }}>
            {value}
          </div>
          {subtitle && <p className="text-xs mt-0.5" style={{ color: "#555568" }}>{subtitle}</p>}
        </div>
        {trend !== undefined && (
          <div className={cn("flex items-center gap-1 text-xs font-medium", isPositive ? "text-emerald-400" : "text-red-400")}>
            <TrendIcon className="w-3 h-3" />
            <span>{Math.abs(trend)}%</span>
            {trendLabel && <span className="font-normal" style={{ color: "#555568" }}>{trendLabel}</span>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-white rounded-2xl border p-5 flex flex-col gap-3 transition-shadow hover:shadow-md",
      alert ? "border-red-200" : "border-gray-100",
      className
    )}>
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        {Icon && (
          <div className={cn("p-2 rounded-xl", iconBg)}>
            <Icon className={cn("w-4 h-4", iconColor)} />
          </div>
        )}
      </div>
      <div>
        <div className={cn("text-2xl font-bold", alert ? "text-red-600" : "text-gray-900")}>
          {value}
        </div>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {trend !== undefined && (
        <div className={cn("flex items-center gap-1 text-xs font-medium", isPositive ? "text-emerald-600" : "text-red-600")}>
          <TrendIcon className="w-3 h-3" />
          <span>{Math.abs(trend)}%</span>
          {trendLabel && <span className="text-gray-400 font-normal">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}
