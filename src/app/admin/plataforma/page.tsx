import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { canAccessPlatformCentral } from "@/lib/access-control";
import { PageHeader } from "@/components/page-header";
import { Building2, Users, Briefcase, TrendingUp, AlertCircle, CheckCircle2, Clock } from "lucide-react";

interface PlatformClient {
  id: string;
  company_name: string | null;
  responsible_name: string | null;
  email: string | null;
  segment: string | null;
  status: string | null;
  account_type: string | null;
  created_at: string | null;
}

function accountTypeLabel(t: string | null) {
  switch (t) {
    case "agency":          return "Agência";
    case "direct_business": return "Empresa Direta";
    case "freelancer":      return "Freelancer";
    case "internal":        return "Interno";
    default:                return "Cliente Lokat";
  }
}

function accountTypeColor(t: string | null) {
  switch (t) {
    case "agency":          return "bg-violet-100 text-violet-700";
    case "direct_business": return "bg-blue-100 text-blue-700";
    case "freelancer":      return "bg-amber-100 text-amber-700";
    case "internal":        return "bg-gray-100 text-gray-600";
    default:                return "bg-indigo-100 text-indigo-700";
  }
}

function statusIcon(s: string | null) {
  if (s === "active")      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
  if (s === "onboarding")  return <Clock className="w-3.5 h-3.5 text-blue-500" />;
  return <AlertCircle className="w-3.5 h-3.5 text-gray-400" />;
}

export default async function PlataformaPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!canAccessPlatformCentral(profile?.role ?? "")) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="text-base font-bold text-gray-900 mb-1">Acesso restrito</h2>
          <p className="text-sm text-gray-500">Esta área é exclusiva para o administrador da plataforma.</p>
        </div>
      </div>
    );
  }

  const { data: allClients } = await supabase
    .from("clients")
    .select("id, company_name, responsible_name, email, segment, status, account_type, created_at")
    .not("status", "eq", "archived")
    .order("created_at", { ascending: false });

  const clients = (allClients ?? []) as PlatformClient[];

  const byType = {
    lokat: clients.filter((c) => !c.account_type || c.account_type === "lokat_client"),
    agency: clients.filter((c) => c.account_type === "agency"),
    direct: clients.filter((c) => c.account_type === "direct_business"),
    other: clients.filter((c) => c.account_type === "freelancer" || c.account_type === "internal"),
  };

  const active = clients.filter((c) => c.status === "active").length;
  const onboarding = clients.filter((c) => c.status === "onboarding").length;
  const inactive = clients.filter((c) => c.status === "inactive").length;

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Plataforma"
        subtitle="CRM Central — visão geral de toda a base de contas"
      />

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total de contas", value: clients.length, Icon: Users, color: "text-indigo-600 bg-indigo-50" },
            { label: "Ativos",          value: active,          Icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
            { label: "Onboarding",      value: onboarding,      Icon: Clock, color: "text-blue-600 bg-blue-50" },
            { label: "Inativos",        value: inactive,        Icon: AlertCircle, color: "text-gray-500 bg-gray-100" },
          ].map(({ label, value, Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Account type breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Clientes Lokat",   count: byType.lokat.length,  Icon: Users,     color: "bg-indigo-50 text-indigo-600" },
            { label: "Agências",          count: byType.agency.length, Icon: Building2, color: "bg-violet-50 text-violet-600" },
            { label: "Empresas Diretas",  count: byType.direct.length, Icon: Briefcase, color: "bg-blue-50 text-blue-600" },
            { label: "Outros",            count: byType.other.length,  Icon: TrendingUp, color: "bg-amber-50 text-amber-600" },
          ].map(({ label, count, Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-lg font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          ))}
        </div>

        {/* Client table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-bold text-gray-900">Todas as contas</p>
            <p className="text-xs text-gray-400">{clients.length} registros</p>
          </div>
          <div className="divide-y divide-gray-50">
            {clients.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-400">Nenhuma conta encontrada.</div>
            )}
            {clients.map((c) => (
              <div key={c.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                <div className="flex-shrink-0">{statusIcon(c.status)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{c.company_name ?? c.responsible_name ?? "—"}</p>
                  <p className="text-xs text-gray-400 truncate">{c.segment ?? c.email ?? "—"}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${accountTypeColor(c.account_type)}`}>
                  {accountTypeLabel(c.account_type)}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
