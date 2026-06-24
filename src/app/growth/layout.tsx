import { AppSidebar } from "@/components/app-sidebar";
import { MobileBottomNav } from "@/components/mobile-nav";
import { Bell } from "lucide-react";

export default function GrowthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="hidden md:flex">
        <AppSidebar variant="growth" userName="Rafael Lima" userRole="Admin" />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
          <span className="text-sm font-semibold text-gray-700 truncate">GrowthOS — Diagnóstico e Estratégia</span>
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <button className="p-2 rounded-xl hover:bg-gray-50 transition-colors">
              <Bell className="w-4 h-4 text-gray-500" />
            </button>
            <div className="w-8 h-8 bg-emerald-600 rounded-xl flex items-center justify-center text-white text-xs font-bold">RL</div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">{children}</main>
      </div>
      <MobileBottomNav variant="growth" />
    </div>
  );
}
