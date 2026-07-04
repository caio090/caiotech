"use client";
import { useEffect, useState } from "react";
import { Bell, ArrowLeft } from "lucide-react";
import { RecDropIcon } from "@/components/icons/RecDropIcon";
import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileBottomNav } from "@/components/mobile-nav";
import { ContentOSBrandChip } from "@/components/contentos-brand-chip";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { performSignOut } from "@/lib/sign-out";
import { ACTIVE_CLIENT_KEY, ACTIVE_CLIENT_NAME_KEY } from "@/lib/active-client";
import { CLIENT_VISIBLE_STATUSES } from "@/lib/client-visibility";

// Roles that must select an active client before using ContentOS
const STAFF_ROLES = new Set([
  "admin", "operacional", "social_media", "designer",
  "editor", "videomaker", "gestor_trafego",
]);

interface Props {
  children: React.ReactNode;
}

export function ContentOSLayoutShell({ children }: Props) {
  const [userName, setUserName]           = useState("Usuário");
  const [userRole, setUserRole]           = useState("Operacional");
  const [initials, setInitials]           = useState("U");
  const [isAdmin, setIsAdmin]             = useState(false);
  const [activeClientName, setActiveClientName] = useState("");

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
          .select("name, role")
          .eq("id", user.id)
          .maybeSingle();

        if (!profile || cancelled) return;

        const name = profile.name ?? user.email ?? "Usuário";
        const ini = name
          .split(/\s+/)
          .slice(0, 2)
          .map((w: string) => w[0] ?? "")
          .join("")
          .toUpperCase() || "U";

        const roleLabel: Record<string, string> = {
          admin:          "Admin",
          operacional:    "Operacional",
          social_media:   "Social Media",
          designer:       "Designer",
          editor:         "Editor",
          videomaker:     "Videomaker",
          gestor_trafego: "Gestor de Tráfego",
        };

        setUserName(name);
        setUserRole(roleLabel[profile.role] ?? profile.role ?? "Operacional");
        setInitials(ini);
        setIsAdmin(profile.role === "admin");

        // Active client guard — staff must select a client before using ContentOS
        if (STAFF_ROLES.has(profile.role)) {
          const storedId  = localStorage.getItem(ACTIVE_CLIENT_KEY);
          const pathname  = window.location.pathname;
          const onSelectPage = pathname.startsWith("/contentos/selecionar-cliente");

          if (!storedId) {
            if (!onSelectPage) window.location.href = "/contentos/selecionar-cliente";
            return;
          }

          // Verify the stored client still exists in DB
          const { data: clientRow } = await supabase
            .from("clients")
            .select("id, company_name")
            .eq("id", storedId)
            .in("status", CLIENT_VISIBLE_STATUSES)
            .is("deleted_at", null)
            .is("archived_at", null)
            .maybeSingle();

          if (!clientRow) {
            localStorage.removeItem(ACTIVE_CLIENT_KEY);
            localStorage.removeItem(ACTIVE_CLIENT_NAME_KEY);
            if (!onSelectPage) window.location.href = "/contentos/selecionar-cliente";
            return;
          }

          // Update name in case it changed since last visit
          const clientName = clientRow.company_name ?? "";
          localStorage.setItem(ACTIVE_CLIENT_NAME_KEY, clientName);
          if (!cancelled) setActiveClientName(clientName);
        }
      } catch {}
    })();

    return () => { cancelled = true; };
  }, []);

  const handleSignOut = async () => {
    localStorage.removeItem(ACTIVE_CLIENT_KEY);
    localStorage.removeItem(ACTIVE_CLIENT_NAME_KEY);
    await performSignOut();
    window.location.href = "/login";
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="hidden md:flex">
        <AppSidebar
          variant="contentos"
          userName={userName}
          userRole={userRole}
          onSignOut={handleSignOut}
        />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Admin bar — shows active client + controls */}
        {isAdmin && (
          <div className="bg-indigo-900 flex items-center justify-between px-4 py-1.5 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                Admin
              </span>
              {activeClientName ? (
                <span className="text-xs text-indigo-200">
                  Visualizando:{" "}
                  <span className="font-bold text-white">{activeClientName}</span>
                </span>
              ) : (
                <span className="text-xs text-indigo-400">Nenhum cliente selecionado</span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/contentos/selecionar-cliente"
                className="text-[11px] font-medium text-indigo-300 hover:text-white transition-colors"
              >
                ↔ Trocar cliente
              </Link>
              <Link
                href="/admin/dashboard"
                className="flex items-center gap-1 text-xs font-medium text-indigo-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                Voltar ao Admin
              </Link>
            </div>
          </div>
        )}

        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
          <div className="flex items-center gap-2">
            <RecDropIcon size={16} className="text-red-500" />
            <span className="text-sm font-semibold text-gray-700">REC OS</span>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button className="relative p-2 rounded-xl hover:bg-gray-50 transition-colors">
              <Bell className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={handleSignOut}
              className="w-8 h-8 bg-red-600 rounded-xl flex items-center justify-center text-white text-xs font-bold hover:bg-red-700 transition-colors"
              title={`${userName} — Clique para sair`}
            >
              {initials}
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">{children}</main>
      </div>
      <MobileBottomNav variant="contentos" />
    </div>
  );
}
