"use client";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileBottomNav } from "@/components/mobile-nav";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { performSignOut } from "@/lib/sign-out";

interface Props {
  children: React.ReactNode;
}

export function AcademyLayoutShell({ children }: Props) {
  const [userName, setUserName] = useState("Aluno");
  const [initials, setInitials] = useState("A");

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;

    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", user.id)
          .maybeSingle();

        if (!profile || cancelled) return;

        const name = profile.name ?? user.email ?? "Aluno";
        const ini = name
          .split(/\s+/)
          .slice(0, 2)
          .map((w: string) => w[0] ?? "")
          .join("")
          .toUpperCase() || "A";

        setUserName(name);
        setInitials(ini);
      } catch {}
    })();

    return () => { cancelled = true; };
  }, []);

  const handleSignOut = async () => {
    await performSignOut();
    window.location.href = "/login";
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="hidden md:flex">
        <AppSidebar
          variant="academy"
          userName={userName}
          userRole="Aluno"
          onSignOut={handleSignOut}
        />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
          <span className="text-sm font-semibold text-gray-700 truncate">Academy — Aprendizado Interno</span>
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <button className="p-2 rounded-xl hover:bg-gray-50 transition-colors">
              <Bell className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={handleSignOut}
              className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center text-white text-xs font-bold hover:bg-amber-600 transition-colors"
              title={`${userName} — Clique para sair`}
            >
              {initials}
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">{children}</main>
      </div>
      <MobileBottomNav variant="academy" />
    </div>
  );
}
