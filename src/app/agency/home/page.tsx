"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users, FileCheck, CalendarDays, BarChart2, Zap,
  Plus, ArrowRight, Wifi, Clock, ChevronRight, Rocket,
} from "lucide-react";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { PLANS } from "@/lib/billing/plans";
import { TrialUpgradeBar } from "@/components/billing/TrialUpgradeBar";

interface AgencyStats {
  clientCount: number;
  maxClients: number;
  planSlug: string;
  trialDaysLeft: number | null;
  agencyName: string;
}

const QUICK_ACTIONS = [
  { label: "Adicionar cliente",  href: "/admin/clientes",              icon: Plus,         color: "#7b6ef6" },
  { label: "Abrir ContentOS",    href: "/admin/contentos",             icon: Rocket,       color: "#a855f7" },
  { label: "Ver aprovações",     href: "/admin/contentos/aprovacoes",  icon: FileCheck,    color: "#f59e0b" },
  { label: "Ver relatórios",     href: "/admin/relatorios",            icon: BarChart2,    color: "#10b981" },
  { label: "Conectar fontes",    href: "/admin/conexoes",              icon: Wifi,         color: "#3b82f6" },
  { label: "Ver plano",          href: "/planos",                      icon: Zap,          color: "#6366f1" },
];

export default function AgencyHomePage() {
  const [stats, setStats] = useState<AgencyStats>({
    clientCount: 0,
    maxClients: 5,
    planSlug: "start",
    trialDaysLeft: 14,
    agencyName: "Sua Agência",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        // Nome da agência: metadata ou email prefix
        const name = (user.user_metadata?.name as string | undefined)
          || user.email?.split("@")[0]
          || "Minha Agência";

        // Contagem de clientes visíveis
        const { count } = await supabase
          .from("clients")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null)
          .is("archived_at", null)
          .in("status", ["ativo", "active", "onboarding"]);

        setStats(prev => ({
          ...prev,
          agencyName: name,
          clientCount: count ?? 0,
        }));
      } catch {}
      setLoading(false);
    }
    void load();
  }, []);

  const plan = PLANS.find(p => p.slug === stats.planSlug) ?? PLANS[0];
  const usagePercent = Math.min((stats.clientCount / stats.maxClients) * 100, 100);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Trial bar */}
      {stats.trialDaysLeft !== null && (
        <TrialUpgradeBar
          daysLeft={stats.trialDaysLeft}
          planName={plan?.name ?? "Start · Beta"}
          planSlug={stats.planSlug}
        />
      )}

      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-purple-600 rounded-xl flex items-center justify-center text-white text-sm font-black">
              {stats.agencyName[0]?.toUpperCase() ?? "A"}
            </div>
            <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Portal da Agência</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900">
            {loading ? "Carregando…" : stats.agencyName}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Plano <span className="font-semibold text-purple-700">{plan?.name ?? "Start"}</span>
            {" · "}
            <span className="text-gray-400">{stats.clientCount}/{stats.maxClients} clientes</span>
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Clientes",     value: stats.clientCount,    icon: Users,        color: "text-purple-600", bg: "bg-purple-50 border-purple-100" },
            { label: "Aprovações",   value: "—",                  icon: FileCheck,    color: "text-amber-600",  bg: "bg-amber-50 border-amber-100" },
            { label: "Calendário",   value: "—",                  icon: CalendarDays, color: "text-blue-600",   bg: "bg-blue-50 border-blue-100" },
            { label: "Relatórios",   value: "—",                  icon: BarChart2,    color: "text-emerald-600",bg: "bg-emerald-50 border-emerald-100" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`rounded-2xl border p-4 ${bg}`}>
              <Icon className={`w-4 h-4 mb-2 ${color}`} strokeWidth={1.5} />
              <p className={`text-xl font-black ${color}`}>{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Client limit bar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-800">Limite de clientes</h2>
            <Link href="/planos" className="text-xs text-purple-600 hover:underline font-medium flex items-center gap-1">
              Fazer upgrade <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 bg-gray-100 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-purple-500 transition-all"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <span className="text-xs font-bold text-gray-600 tabular-nums">
              {stats.clientCount}/{stats.maxClients}
            </span>
          </div>
          <p className="text-xs text-gray-400">
            {stats.clientCount === 0
              ? "Cadastre o primeiro cliente para começar a operar a agência."
              : `${stats.maxClients - stats.clientCount} vaga${stats.maxClients - stats.clientCount !== 1 ? "s" : ""} disponível no plano atual.`}
          </p>
        </div>

        {/* Empty state */}
        {!loading && stats.clientCount === 0 && (
          <div className="bg-purple-50 border border-purple-100 rounded-2xl p-6 mb-6 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-purple-600" strokeWidth={1.5} />
            </div>
            <h3 className="text-sm font-bold text-purple-900 mb-1">Cadastre seu primeiro cliente</h3>
            <p className="text-xs text-purple-700 leading-relaxed mb-4">
              Cadastre o primeiro cliente para começar a operar a agência dentro da Lokat OS.
            </p>
            <Link
              href="/admin/clientes"
              className="inline-flex items-center gap-2 bg-purple-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar cliente
            </Link>
          </div>
        )}

        {/* Quick actions */}
        <div className="mb-8">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Ações rápidas</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {QUICK_ACTIONS.map(({ label, href, icon: Icon, color }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3.5 hover:border-gray-200 hover:shadow-sm transition-all group"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
                  <Icon className="w-4 h-4" style={{ color }} strokeWidth={1.5} />
                </div>
                <span className="text-xs font-semibold text-gray-700 group-hover:text-gray-900">{label}</span>
                <ArrowRight className="w-3 h-3 text-gray-300 ml-auto group-hover:text-gray-500 transition-colors" />
              </Link>
            ))}
          </div>
        </div>

        {/* Admin link */}
        <div className="text-center">
          <Link href="/admin/inicio" className="text-xs text-gray-400 hover:text-indigo-600 hover:underline transition-colors">
            Acessar painel completo do administrador →
          </Link>
        </div>
      </div>
    </div>
  );
}
