"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, KanbanSquare, CalendarDays, FileText, Clock } from "lucide-react";

const NAV = [
  { href: "/operacional/comercial",              label: "Dashboard",  icon: LayoutDashboard, exact: true },
  { href: "/operacional/comercial/leads",        label: "Leads",      icon: Users },
  { href: "/operacional/comercial/pipeline",     label: "Pipeline",   icon: KanbanSquare },
  { href: "/operacional/comercial/reunioes",     label: "Reuniões",   icon: CalendarDays },
  { href: "/operacional/comercial/propostas",    label: "Propostas",  icon: FileText },
  { href: "/operacional/comercial/follow-ups",   label: "Follow-ups", icon: Clock },
];

export default function ComercialLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      {/* Sub-nav */}
      <nav className="flex items-center gap-1 mb-6 overflow-x-auto pb-1 scrollbar-none">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors",
                active
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
