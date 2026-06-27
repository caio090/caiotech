import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  dark?: boolean;
}

export function EmptyState({ icon: Icon, title, description, action, className, dark }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}>
      {Icon && (
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 animate-float-soft",
          dark ? "bg-white/5 border border-white/8" : "bg-gray-100"
        )}>
          <Icon className={cn("w-6 h-6", dark ? "text-white/30" : "text-gray-400")} />
        </div>
      )}
      <h3 className={cn("text-sm font-semibold", dark ? "text-white/50" : "text-gray-700")}>{title}</h3>
      {description && <p className={cn("text-sm mt-1 max-w-xs", dark ? "text-white/30" : "text-gray-400")}>{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
