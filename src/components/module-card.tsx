import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color: string;
  iconColor: string;
  badge?: string;
}

export function ModuleCard({ title, description, icon: Icon, href, color, iconColor, badge }: ModuleCardProps) {
  return (
    <Link href={href} className="block bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all hover:-translate-y-0.5 group">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", color)}>
          <Icon className={cn("w-5 h-5", iconColor)} />
        </div>
        {badge && (
          <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">{badge}</span>
        )}
      </div>
      <h3 className="text-sm font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">{title}</h3>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    </Link>
  );
}
