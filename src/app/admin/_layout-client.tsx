"use client";
import { useEffect, useRef, useState } from "react";
import {
  Bell, Search, ArrowLeft, CheckSquare,
  UserRoundPlus, X, UsersRound,
} from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileBottomNav } from "@/components/mobile-nav";
import { LokatVoicePanel } from "@/components/lokat-voice-panel";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { performSignOut } from "@/lib/sign-out";
import { ACTIVE_CLIENT_NAME_KEY } from "@/lib/active-client";

// ── Admin notification helpers ────────────────────────────────
const ADMIN_SEEN_KEY = "lokat_admin_notif_seen_count";
function getAdminSeenCount(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(ADMIN_SEEN_KEY) ?? "0", 10);
}
function markAdminSeen(total: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ADMIN_SEEN_KEY, String(total));
}

interface AdminNotif {
  type: "team_request" | "approval";
  title: string;
  message: string;
  href: string;
  clientName?: string;
  count?: number;
  urgency?: "normal" | "high";
}

interface Props {
  children: React.ReactNode;
}

export function AdminLayoutShell({ children }: Props) {
  const [userName,         setUserName]         = useState("Admin");
  const [initials,         setInitials]         = useState("A");
  const [activeClientName, setActiveClientName] = useState<string | null>(null);
  const pathname = usePathname();

  // Bell state
  const [notifs,           setNotifs]           = useState<AdminNotif[]>([]);
  const [notifTotal,       setNotifTotal]       = useState(0);
  const [hasUnread,        setHasUnread]        = useState(false);
  const [showBell,         setShowBell]         = useState(false);
  const [pendingTeamCount, setPendingTeamCount] = useState(0);
  const bellRef = useRef<HTMLDivElement>(null);

  const isOnContentosPage = pathname.startsWith("/admin/contentos");
  const isSelectingClient = pathname === "/admin/contentos/selecionar-cliente";

  // Fetch user name
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data: profile } = await supabase
          .from("profiles").select("name").eq("id", user.id).maybeSingle();
        if (!profile || cancelled) return;
        const name = profile.name ?? user.email ?? "Admin";
        const ini  = name.split(/\s+/).slice(0, 2).map((w: string) => w[0] ?? "").join("").toUpperCase() || "A";
        if (!cancelled) { setUserName(name); setInitials(ini); }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  // Fetch notification counts from existing tables (no separate notif table needed for V1)
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();

        const [teamRes, approvalRes] = await Promise.all([
          supabase
            .from("team_access_requests")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending"),
          supabase
            .from("approvals")
            .select("client_id, clients(company_name)")
            .eq("status", "aguardando"),
        ]);

        if (cancelled) return;

        const teamCount = teamRes.count ?? 0;
        const rawApprovals = approvalRes.data ?? [];

        // Agrupa aprovações por cliente
        const byClient = new Map<string, { name: string; count: number }>();
        for (const a of rawApprovals) {
          const id   = a.client_id as string;
          const name = (a.clients as { company_name?: string } | null)?.company_name ?? "Cliente";
          const cur  = byClient.get(id) ?? { name, count: 0 };
          byClient.set(id, { name: cur.name, count: cur.count + 1 });
        }
        const approvalCount = rawApprovals.length;
        const total         = teamCount + approvalCount;

        const built: AdminNotif[] = [];
        if (teamCount > 0) {
          built.push({
            type:    "team_request",
            title:   `${teamCount} solicitação${teamCount > 1 ? "ões" : ""} de equipe`,
            message: `${teamCount} pessoa${teamCount > 1 ? "s" : ""} aguardando aprovação de acesso.`,
            href:    "/admin/equipe",
          });
        }
        if (byClient.size === 1) {
          const [clientId, info] = [...byClient.entries()][0];
          built.push({
            type:       "approval",
            title:      `${info.count} aprovação${info.count > 1 ? "ões" : ""} — ${info.name}`,
            message:    `${info.count} conteúdo${info.count > 1 ? "s" : ""} de ${info.name} aguardando revisão.`,
            href:       `/admin/contentos/aprovacoes?client=${clientId}`,
            clientName: info.name,
            count:      info.count,
            urgency:    info.count >= 3 ? "high" : "normal",
          });
        } else if (byClient.size > 1) {
          for (const [clientId, info] of byClient.entries()) {
            built.push({
              type:       "approval",
              title:      `${info.count} aprovação${info.count > 1 ? "ões" : ""} — ${info.name}`,
              message:    `${info.count} conteúdo${info.count > 1 ? "s" : ""} aguardando.`,
              href:       `/admin/contentos/aprovacoes?client=${clientId}`,
              clientName: info.name,
              count:      info.count,
              urgency:    info.count >= 3 ? "high" : "normal",
            });
          }
        } else if (approvalCount > 0) {
          built.push({
            type:    "approval",
            title:   `${approvalCount} aprovação${approvalCount > 1 ? "ões" : ""} pendente${approvalCount > 1 ? "s" : ""}`,
            message: "Conteúdos aguardando revisão do cliente.",
            href:    "/admin/contentos/aprovacoes",
          });
        }

        setNotifs(built);
        setNotifTotal(total);
        setPendingTeamCount(teamCount);
        setHasUnread(total > getAdminSeenCount());
      } catch {
        // Tables may not exist yet — silently skip
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Close bell on outside click
  useEffect(() => {
    if (!showBell) return;
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowBell(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showBell]);

  function handleBellToggle() {
    setShowBell((v) => {
      const opening = !v;
      if (opening) {
        markAdminSeen(notifTotal);
        setHasUnread(false);
      }
      return opening;
    });
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isOnContentosPage || isSelectingClient) {
      setActiveClientName(null);
      return;
    }
    setActiveClientName(localStorage.getItem(ACTIVE_CLIENT_NAME_KEY) || null);
  }, [isOnContentosPage, isSelectingClient, pathname]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSignOut = async () => {
    await performSignOut();
    window.location.href = "/login";
  };

  // Badge on sidebar equipe link = pending team requests
  const badges = pendingTeamCount > 0 ? { "/admin/equipe": pendingTeamCount } : undefined;

  return (
    <div className="lk-dark flex h-screen overflow-hidden bg-gray-50">
      <div className="hidden md:flex">
        <AppSidebar
          variant="admin"
          userName={userName}
          userRole="Admin"
          onSignOut={handleSignOut}
          badges={badges}
        />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-48 md:w-72">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              placeholder="Buscar..."
              className="text-sm bg-transparent outline-none text-gray-600 placeholder-gray-400 w-full"
            />
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Admin notification bell — matches client pattern */}
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
                <div className="absolute right-0 top-10 z-50 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <span className="text-xs font-bold text-gray-800">Notificações</span>
                    <button
                      onClick={() => setShowBell(false)}
                      className="text-gray-400 hover:text-gray-600 p-0.5 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {notifs.length > 0 ? (
                    <div className="p-3 space-y-2">
                      {notifs.map((n, i) => (
                        <Link
                          key={i}
                          href={n.href}
                          onClick={() => setShowBell(false)}
                          className={`flex items-start gap-3 border rounded-xl p-3 no-underline transition-colors ${
                            n.type === "team_request"
                              ? "bg-indigo-50 border-indigo-100 hover:bg-indigo-100"
                              : n.urgency === "high"
                              ? "bg-red-50 border-red-100 hover:bg-red-100"
                              : "bg-amber-50 border-amber-100 hover:bg-amber-100"
                          }`}
                        >
                          {n.type === "team_request"
                            ? <UserRoundPlus className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                            : <CheckSquare className={`w-4 h-4 flex-shrink-0 mt-0.5 ${n.urgency === "high" ? "text-red-500" : "text-amber-500"}`} />
                          }
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800">{n.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                            {n.urgency === "high" && (
                              <span className="inline-block mt-1 text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">Urgente</span>
                            )}
                          </div>
                        </Link>
                      ))}

                      <div className="flex gap-2 pt-1">
                        {notifs.some((n) => n.type === "team_request") && (
                          <Link
                            href="/admin/equipe"
                            onClick={() => setShowBell(false)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
                          >
                            <UsersRound className="w-3.5 h-3.5" />
                            Ver equipe
                          </Link>
                        )}
                        {notifs.some((n) => n.type === "approval") && (
                          <Link
                            href="/admin/contentos/aprovacoes"
                            onClick={() => setShowBell(false)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-amber-500 text-white text-xs font-semibold rounded-xl hover:bg-amber-600 transition-colors"
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                            Ver aprovações
                          </Link>
                        )}
                      </div>
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
              className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-xs font-bold hover:bg-indigo-700 transition-colors"
              title={`${userName} — Clique para sair`}
            >
              {initials}
            </button>
          </div>
        </header>

        {isOnContentosPage && (
          <div className="bg-purple-700 border-b border-purple-600 flex items-center justify-between px-4 md:px-6 py-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">ContentOS</span>
              {isSelectingClient ? (
                <span className="text-xs text-purple-300">· Selecione um cliente</span>
              ) : activeClientName ? (
                <span className="text-xs text-purple-200">
                  · Visualizando: <span className="font-bold text-white">{activeClientName}</span>
                </span>
              ) : (
                <span className="text-xs text-purple-300">· Nenhum cliente selecionado</span>
              )}
            </div>
            {!isSelectingClient && (
              <div className="flex items-center gap-4">
                <Link
                  href="/admin/contentos/selecionar-cliente"
                  className="text-xs text-purple-200 hover:text-white transition-colors"
                >
                  ↔ Trocar cliente
                </Link>
                <Link
                  href="/admin/dashboard"
                  className="text-xs text-purple-200 hover:text-white transition-colors flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Sair da ContentOS
                </Link>
              </div>
            )}
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">{children}</main>
      </div>
      <MobileBottomNav variant="admin" />
      <LokatVoicePanel />
    </div>
  );
}
