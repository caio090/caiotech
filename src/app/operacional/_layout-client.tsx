"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { Bell, Search, ClipboardList, X, Clock3, ChevronRight } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileBottomNav } from "@/components/mobile-nav";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { performSignOut } from "@/lib/sign-out";
import { formatRoleDisplay, ROLE_DEPARTMENT_FILTER } from "@/lib/access-control";
import { normalizeStatus, STATUS_LABELS, isTaskOverdue, fmtTaskDate, ACTIVE_STATUS_EXCLUDE } from "@/lib/operational-tasks";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface RecentTask {
  id:        string;
  title:     string;
  status:    string;
  priority:  string | null;
  due_date:  string | null;
  created_at: string;
  clients?:  { company_name: string | null }[] | null;
}

const SEEN_KEY = (uid: string) => `lokat_op_seen_${uid}`;

function getSeenIds(uid: string): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY(uid));
    return new Set(JSON.parse(raw ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function saveSeenIds(uid: string, ids: Set<string>) {
  try {
    const arr = [...ids].slice(-300);
    localStorage.setItem(SEEN_KEY(uid), JSON.stringify(arr));
  } catch {}
}

interface Props {
  children: React.ReactNode;
}

export function OperacionalLayoutShell({ children }: Props) {
  const [userName,    setUserName]    = useState("Equipe");
  const [initials,    setInitials]    = useState("EQ");
  const [roleDisplay, setRoleDisplay] = useState("Operacional");
  const [primaryRole, setPrimaryRole] = useState("operacional");

  // Notifications
  const [userId,       setUserId]       = useState<string | null>(null);
  const [recentTasks,  setRecentTasks]  = useState<RecentTask[]>([]);
  const [unseenCount,  setUnseenCount]  = useState(0);
  const [showBell,     setShowBell]     = useState(false);

  const bellRef = useRef<HTMLDivElement>(null);

  // Close bell dropdown on outside click
  useEffect(() => {
    if (!showBell) return;
    function handle(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowBell(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showBell]);

  const markAllSeen = useCallback((uid: string, tasks: RecentTask[]) => {
    const seen = getSeenIds(uid);
    tasks.forEach((t) => seen.add(t.id));
    saveSeenIds(uid, seen);
    setUnseenCount(0);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;

    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        setUserId(user.id);

        // Fetch profile + extra roles in parallel
        const [profileRes, rolesRes] = await Promise.all([
          supabase.from("profiles").select("name, role").eq("id", user.id).maybeSingle(),
          supabase.from("profile_roles").select("role").eq("user_id", user.id),
        ]);
        if (cancelled) return;

        const profile = profileRes.data;
        const primary = profile?.role ?? "operacional";
        const extras  = (rolesRes.data ?? []).map((r: { role: string }) => r.role).filter((r: string) => r !== primary);
        const name    = profile?.name ?? user.email ?? "Equipe";
        const ini     = name.split(/\s+/).slice(0, 2).map((w: string) => w[0] ?? "").join("").toUpperCase() || "EQ";

        if (!cancelled) {
          setUserName(name);
          setInitials(ini);
          setPrimaryRole(primary);
          setRoleDisplay(formatRoleDisplay(primary, extras));
        }

        // Build OR filter for task fetch
        const allRoles = [primary, ...extras];
        const conditions: string[] = [`assigned_to.eq.${user.id}`];
        for (const role of allRoles) {
          if (role === "admin") break;
          conditions.push(`assigned_role.eq.${role}`);
          for (const dept of (ROLE_DEPARTMENT_FILTER[role] ?? [])) {
            conditions.push(`department.eq.${dept}`);
          }
        }

        // Fetch recent active tasks for notification count
        let q = supabase
          .from("operational_tasks")
          .select("id, title, status, priority, due_date, created_at, clients(company_name)")
          .not("status", "in", ACTIVE_STATUS_EXCLUDE)
          .order("created_at", { ascending: false })
          .limit(50);

        if (primary !== "admin") {
          q = q.or(conditions.join(","));
        }

        const { data: tasks } = await q;
        if (cancelled || !tasks) return;

        const normalizedTasks: RecentTask[] = tasks.map((t) => ({
          ...t,
          status: normalizeStatus(t.status),
          clients: t.clients as { company_name: string | null }[] | null,
        }));

        if (!cancelled) {
          setRecentTasks(normalizedTasks);

          const seen    = getSeenIds(user.id);
          const unseen  = normalizedTasks.filter((t) => !seen.has(t.id));
          setUnseenCount(unseen.length);
        }
      } catch {}
    })();

    return () => { cancelled = true; };
  }, []);

  const handleSignOut = async () => {
    await performSignOut();
    window.location.href = "/login";
  };

  const handleBellClick = () => {
    setShowBell((v) => {
      if (!v && userId) {
        markAllSeen(userId, recentTasks);
      }
      return !v;
    });
  };

  const COMERCIAL_ROLES = new Set(["comercial", "sdr", "closer"]);
  const hasComercial = COMERCIAL_ROLES.has(primaryRole);

  const RECOS_ALLOWED = new Set(["admin", "videomaker", "editor", "operacional"]);
  const hasRecos = RECOS_ALLOWED.has(primaryRole);

  const hideRoutes = [
    ...(hasComercial ? [] : ["/operacional/comercial"]),
    ...(hasRecos ? [] : ["/operacional/recos"]),
  ];

  return (
    <div className="lk-dark flex h-screen overflow-hidden bg-gray-50">
      <div className="hidden md:flex">
        <AppSidebar
          variant="operacional"
          userName={userName}
          userRole={roleDisplay}
          onSignOut={handleSignOut}
          hideRoutes={hideRoutes}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
          {/* Search */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-48 md:w-64">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              placeholder="Buscar..."
              className="text-sm bg-transparent outline-none text-gray-600 placeholder-gray-400 w-full"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Bell notification */}
            <div ref={bellRef} className="relative">
              <button
                onClick={handleBellClick}
                className="relative p-2 rounded-xl hover:bg-gray-50 transition-colors"
                aria-label="Notificações"
              >
                <Bell className="w-4 h-4 text-gray-400" />
                {unseenCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-black text-white leading-none">
                    {unseenCount > 9 ? "9+" : unseenCount}
                  </span>
                )}
              </button>

              {/* Dropdown */}
              {showBell && (
                <div className="absolute right-0 top-11 z-50 w-80 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-xs font-bold text-gray-800">Tarefas recentes</span>
                      {recentTasks.length > 0 && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-1.5 py-0.5 rounded-full">
                          {recentTasks.length}
                        </span>
                      )}
                    </div>
                    <button onClick={() => setShowBell(false)} className="p-1 rounded-lg hover:bg-gray-100">
                      <X className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {recentTasks.length === 0 ? (
                      <div className="py-8 text-center">
                        <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-xs text-gray-400">Nenhuma notificação nova.</p>
                      </div>
                    ) : (
                      recentTasks.slice(0, 15).map((t) => {
                        const over = isTaskOverdue(t.due_date);
                        return (
                          <Link
                            key={t.id}
                            href="/operacional/minhas-tarefas"
                            onClick={() => setShowBell(false)}
                            className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors"
                          >
                            <div className={cn(
                              "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                              t.status === "briefing"    ? "bg-sky-400" :
                              t.status === "em_producao" ? "bg-indigo-500" :
                              t.status === "ajuste"      ? "bg-orange-400" :
                              "bg-gray-300"
                            )} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-800 truncate">{t.title}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {t.clients?.[0]?.company_name
                                  ? `${t.clients[0].company_name} · `
                                  : ""}
                                {STATUS_LABELS[t.status] ?? t.status}
                              </p>
                              {t.due_date && (
                                <p className={cn("text-[10px] flex items-center gap-0.5 mt-0.5", over ? "text-red-500 font-medium" : "text-gray-400")}>
                                  <Clock3 className="w-2.5 h-2.5" />
                                  {fmtTaskDate(t.due_date)}
                                </p>
                              )}
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mt-1" />
                          </Link>
                        );
                      })
                    )}
                  </div>

                  {recentTasks.length > 0 && (
                    <div className="px-4 py-3 border-t border-gray-50">
                      <Link
                        href="/operacional/minhas-tarefas"
                        onClick={() => setShowBell(false)}
                        className="block text-center text-xs font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        Ver todas as tarefas →
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User avatar + sign out */}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-xl hover:bg-gray-50 transition-colors group"
              title="Clique para sair"
            >
              <div className="w-7 h-7 bg-slate-600 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {initials}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-gray-800 leading-none">{userName}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-none">{roleDisplay}</p>
              </div>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      <MobileBottomNav variant="operacional" />
    </div>
  );
}
