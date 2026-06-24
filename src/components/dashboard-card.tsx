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
}

export function DashboardCard({
  title, value, subtitle, icon: Icon, iconColor = "text-indigo-600",
  iconBg = "bg-indigo-50", trend, trendLabel, className, alert,
}: DashboardCardProps) {
  const isPositive = trend !== undefined && trend > 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

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
