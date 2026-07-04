"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Mic, X, ChevronRight, AlertTriangle, Clock, CheckSquare,
  Sparkles, KanbanSquare, BarChart3, ShoppingBag, FileText, Zap,
} from "lucide-react";
import Link from "next/link";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";

const VOICE_ENABLED_KEY = "lokat_voice_enabled";
const VOICE_FLOAT_KEY   = "lokat_voice_floating_button";

// ── Types ────────────────────────────────────────────────────────────────────

interface VoiceSummary {
  pendingApprovals: number;
  overdueTasks:     number;
  readyToSchedule:  number;
  lateFollowUps:    number;
}

const EMPTY_SUMMARY: VoiceSummary = {
  pendingApprovals: 0,
  overdueTasks:     0,
  readyToSchedule:  0,
  lateFollowUps:    0,
};

const QUICK_ACTIONS: { label: string; href: string; icon: React.ElementType }[] = [
  { label: "Aprovações pendentes",    href: "/admin/contentos",              icon: CheckSquare  },
  { label: "Tarefas atrasadas",       href: "/admin/operacional/kanban",     icon: AlertTriangle },
  { label: "Prontos para agendar",    href: "/admin/contentos",              icon: Clock        },
  { label: "Abrir ContentOS",         href: "/admin/contentos",              icon: Sparkles     },
  { label: "Abrir Operacional",       href: "/admin/operacional",            icon: KanbanSquare },
  { label: "Abrir Relatórios",        href: "/admin/relatorios",             icon: BarChart3    },
  { label: "Abrir ComercialOS",       href: "/admin/leads",                  icon: ShoppingBag  },
  { label: "Abrir Financeiro",        href: "/admin/financeiro",             icon: FileText     },
];

// ── Component ────────────────────────────────────────────────────────────────

export function LokatVoicePanel() {
  const [enabled,   setEnabled]   = useState(false);
  const [showFloat, setShowFloat] = useState(false);
  const [open,      setOpen]      = useState(false);
  const [summary,   setSummary]   = useState<VoiceSummary>(EMPTY_SUMMARY);
  const [loading,   setLoading]   = useState(false);
  const [mounted,   setMounted]   = useState(false);

  // Read settings from localStorage
  useEffect(() => {
    const isEnabled = localStorage.getItem(VOICE_ENABLED_KEY) !== "false";
    const showBtn   = localStorage.getItem(VOICE_FLOAT_KEY) !== "false";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setEnabled(isEnabled);
    setShowFloat(showBtn);
  }, []);

  const fetchSummary = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const today    = new Date().toISOString().split("T")[0];

      const [approvalsRes, tasksRes, readyRes, leadsRes] = await Promise.all([
        supabase.from("approvals").select("id", { count: "exact", head: true }).eq("status", "aguardando"),
        supabase.from("operational_tasks").select("id", { count: "exact", head: true }).not("status", "eq", "concluido").not("due_date", "is", null).lt("due_date", today),
        supabase.from("content_items").select("id", { count: "exact", head: true }).eq("status", "pronto_para_agendar"),
        supabase.from("leads").select("id", { count: "exact", head: true }).lt("next_action_at", new Date().toISOString()),
      ]);

      setSummary({
        pendingApprovals: approvalsRes.count ?? 0,
        overdueTasks:     tasksRes.count ?? 0,
        readyToSchedule:  readyRes.count ?? 0,
        lateFollowUps:    leadsRes.count ?? 0,
      });
    } catch {}
    setLoading(false);
  }, []);

  function handleOpen() {
    setOpen(true);
    fetchSummary();
  }

  function toggleEnabled() {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem(VOICE_ENABLED_KEY, String(next));
  }

  function buildSummaryText(): string {
    const parts: string[] = [];
    if (summary.pendingApprovals > 0) parts.push(`${summary.pendingApprovals} aprovação${summary.pendingApprovals > 1 ? "ões" : ""} pendente${summary.pendingApprovals > 1 ? "s" : ""}`);
    if (summary.overdueTasks > 0)     parts.push(`${summary.overdueTasks} tarefa${summary.overdueTasks > 1 ? "s" : ""} atrasada${summary.overdueTasks > 1 ? "s" : ""}`);
    if (summary.readyToSchedule > 0)  parts.push(`${summary.readyToSchedule} conteúdo${summary.readyToSchedule > 1 ? "s" : ""} pronto${summary.readyToSchedule > 1 ? "s" : ""} para agendar`);
    if (summary.lateFollowUps > 0)    parts.push(`${summary.lateFollowUps} follow-up${summary.lateFollowUps > 1 ? "s" : ""} em atraso`);
    if (parts.length === 0) return "";
    return "Hoje você tem " + parts.join(", ") + ".";
  }

  const hasAlerts = summary.pendingApprovals > 0 || summary.overdueTasks > 0 || summary.readyToSchedule > 0 || summary.lateFollowUps > 0;
  const summaryText = buildSummaryText();

  if (!mounted || !enabled || !showFloat) return null;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-[5.5rem] md:bottom-6 right-4 md:right-6 z-50 w-12 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105"
        title="Lokat Voice"
        aria-label="Abrir Lokat Voice"
      >
        <Zap className="w-5 h-5" />
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-6 pointer-events-none">
          <div className="pointer-events-auto w-80 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-indigo-600 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-white" />
                <span className="text-sm font-bold text-white">Lokat Voice</span>
                <span className="text-[9px] font-bold bg-indigo-500 text-indigo-100 px-1.5 py-0.5 rounded-full">BETA</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-indigo-200 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Resumo do dia</p>
                {loading ? (
                  <p className="text-xs text-gray-400">Carregando...</p>
                ) : hasAlerts ? (
                  <p className="text-xs text-gray-700 leading-relaxed">{summaryText}</p>
                ) : (
                  <p className="text-xs text-gray-400">Sem alertas importantes no momento.</p>
                )}
              </div>

              {/* Alert badges */}
              {hasAlerts && !loading && (
                <div className="flex flex-wrap gap-1.5">
                  {summary.pendingApprovals > 0 && (
                    <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full">
                      {summary.pendingApprovals} aprovação{summary.pendingApprovals > 1 ? "ões" : ""}
                    </span>
                  )}
                  {summary.overdueTasks > 0 && (
                    <span className="text-[10px] font-bold bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded-full">
                      {summary.overdueTasks} tarefa{summary.overdueTasks > 1 ? "s" : ""} atrasada{summary.overdueTasks > 1 ? "s" : ""}
                    </span>
                  )}
                  {summary.readyToSchedule > 0 && (
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full">
                      {summary.readyToSchedule} pronto{summary.readyToSchedule > 1 ? "s" : ""} p/ agendar
                    </span>
                  )}
                  {summary.lateFollowUps > 0 && (
                    <span className="text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-100 px-2 py-0.5 rounded-full">
                      {summary.lateFollowUps} follow-up{summary.lateFollowUps > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              )}

              {/* Quick actions */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Ações rápidas</p>
                <div className="space-y-1">
                  {QUICK_ACTIONS.map(({ label, href, icon: Icon }) => (
                    <Link
                      key={href + label}
                      href={href}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-indigo-50 transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-500" />
                        <span className="text-xs text-gray-600 group-hover:text-indigo-700">{label}</span>
                      </div>
                      <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-indigo-400" />
                    </Link>
                  ))}
                </div>
              </div>

              {/* Footer: mode future + toggle */}
              <div className="border-t border-gray-50 pt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-gray-300" />
                    <span className="text-[10px] text-gray-300">Modo voz · fase futura</span>
                  </div>
                  <button
                    onClick={toggleEnabled}
                    className="text-[10px] text-gray-400 hover:text-red-500 transition-colors"
                  >
                    Desativar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
