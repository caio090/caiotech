"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { configs, SidebarVariant } from "@/components/app-sidebar";

const accentColor: Record<SidebarVariant, string> = {
  admin:       "text-indigo-600",
  client:      "text-pink-500",
  contentos:   "text-purple-600",
  growth:      "text-emerald-600",
  financeiro:  "text-emerald-600",
  academy:     "text-amber-500",
  operacional: "text-slate-600",
};

interface MobileBottomNavProps {
  variant: SidebarVariant;
}

export function MobileBottomNav({ variant }: MobileBottomNavProps) {
  const pathname = usePathname();
  const items = configs[variant].nav.slice(0, 5);
  const color = accentColor[variant];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-100 safe-area-pb">
      <div className="flex items-stretch">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 flex-1 min-w-0 transition-colors",
                active ? color : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-[10px] font-medium truncate px-0.5 max-w-full">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
