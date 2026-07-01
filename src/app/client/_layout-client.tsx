"use client";
import { useEffect, useRef, useState } from "react";
import { Bell, CheckSquare, X } from "lucide-react";
import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileBottomNav } from "@/components/mobile-nav";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { performSignOut } from "@/lib/sign-out";
import { hasUnreadNotif, markNotifSeen } from "@/lib/notifications";
import { CLIENT_VISIBLE_STATUSES } from "@/lib/client-visibility";

interface Props {
  children: React.ReactNode;
}

export function ClientLayoutShell({ children }: Props) {
  const [companyName, setCompanyName]   = useState("Portal do Cliente");
  const [initials, setInitials]         = useState("LC");
  const [pendingCount, setPendingCount] = useState(0);
  const [hasUnread, setHasUnread]       = useState(false);
  const [showBell, setShowBell]         = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;

    async function fetchData() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        let { data: clientRow } = await supabase
          .from("clients")
          .select("id, company_name, responsible_name, deleted_at, archived_at")
          .eq("owner_id", user.id)
          .in("status", CLIENT_VISIBLE_STATUSES)
          .is("deleted_at", null)
          .is("archived_at", null)
          .maybeSingle();

        // Caminho alternativo: cliente convidado — profiles.client_id
        if (!clientRow) {
          const { data: profileRow } = await supabase
            .from("profiles")
            .select("client_id")
            .eq("id", user.id)
            .maybeSingle();
          if (profileRow?.client_id) {
            const { data: clientByProfile } = await supabase
              .from("clients")
              .select("id, company_name, responsible_name, deleted_at, archived_at")
              .eq("id", profileRow.client_id)
              .is("deleted_at", null)
              .is("archived_at", null)
              .maybeSingle();
            clientRow = clientByProfile ?? null;
          }
        }

        if (!clientRow || cancelled) return;

        const name = clientRow.company_name ?? clientRow.responsible_name ?? "Meu Portal";
        const ini  = name
          .split(/\s+/)
          .slice(0, 2)
          .map((w: string) => w[0] ?? "")
          .join("")
          .toUpperCase() || "LC";

        setCompanyName(name);
        setInitials(ini);

        const { count } = await supabase
          .from("approvals")
          .select("id", { count: "exact", head: true })
          .eq("client_id", clientRow.id)
          .eq("status", "aguardando");

        const cnt = count ?? 0;
        if (!cancelled) {
          setPendingCount(cnt);
          // Red dot on bell = new approvals since user last opened the dropdown
          setHasUnread(hasUnreadNotif(cnt));
        }
      } catch {}
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showBell) return;
    function handleClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowBell(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showBell]);

  function handleBellToggle() {
    setShowBell((v) => {
      const opening = !v;
      if (opening) {
        // Mark as seen — red dot disappears; sidebar badge is unchanged
        markNotifSeen(pendingCount);
        setHasUnread(false);
      }
      return opening;
    });
  }

  const handleSignOut = async () => {
    await performSignOut();
    window.location.href = "/login";
  };

  // Sidebar badge is tied to pending count — independent of bell "seen" state
  const badges = pendingCount > 0 ? { "/client/aprovacoes": pendingCount } : undefined;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="hidden md:flex">
        <AppSidebar
          variant="client"
          userName={companyName}
          userRole="Cliente"
          onSignOut={handleSignOut}
          badges={badges}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
          <div>
            <span className="text-sm font-semibold text-gray-700">Portal do Cliente</span>
            <span className="hidden sm:inline text-sm text-gray-400 ml-2">— {companyName}</span>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Bell — red dot = unseen; badge on sidebar = pending count */}
            <div ref={bellRef} className="relative">
              <button
                onClick={handleBellToggle}
                className="relative p-2 rounded-xl hover:bg-gray-50 transition-colors"
                aria-label="Notificações"
              >
                <Bell className="w-4 h-4 text-gray-500" />
                {hasUnread && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>

              {showBell && (
                <div className="absolute right-0 top-10 z-50 w-72 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <span className="text-xs font-bold text-gray-800">Notificações</span>
                    <button
                      onClick={() => setShowBell(false)}
                      className="text-gray-400 hover:text-gray-600 p-0.5 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {pendingCount > 0 ? (
                    <div className="p-3">
                      <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-3 mb-3">
                        <CheckSquare className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800">
                            {pendingCount === 1
                              ? "Você tem 1 conteúdo aguardando aprovação."
                              : `Você tem ${pendingCount} conteúdos aguardando aprovação.`}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Revise e responda para liberar a publicação.
                          </p>
                        </div>
                      </div>
                      <Link
                        href="/client/aprovacoes"
                        onClick={() => setShowBell(false)}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-pink-600 text-white text-xs font-semibold rounded-xl hover:bg-pink-700 transition-colors"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        Ver aprovações
                      </Link>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-gray-400">
                      <Bell className="w-7 h-7 mx-auto mb-2 text-gray-200" />
                      <p className="text-xs">Nenhuma notificação no momento.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleSignOut}
              className="w-8 h-8 bg-pink-500 rounded-xl flex items-center justify-center text-white text-xs font-bold hover:bg-pink-600 transition-colors"
              title={`${companyName} — Clique para sair`}
            >
              {initials}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      <MobileBottomNav variant="client" />
    </div>
  );
}
