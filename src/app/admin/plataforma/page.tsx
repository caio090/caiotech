import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { canAccessPlatformCentral } from "@/lib/access-control";
import { PageHeader } from "@/components/page-header";
import {
  Building2, Users, Briefcase, TrendingUp, AlertCircle,
  CheckCircle2, Clock, Link2, ShoppingCart, FileText,
  MessageSquare, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { getPlanLabel, getAccountTypeLabel } from "@/lib/account-permissions";
import { CLIENT_VISIBLE_STATUSES, isMissingClientVisibilityColumn, isVisibleClientRecord } from "@/lib/client-visibility";

interface PlatformAccount {
  id: string;
  company_name: string | null;
  responsible_name: string | null;
  email: string | null;
  segment: string | null;
  status: string | null;
  account_type: string | null;
  created_at: string | null;
  has_meta_connection?: boolean;
  has_olaclick_connection?: boolean;
  open_request_count?: number;
}

interface ProfileRow {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  account_type: string | null;
  plan: string | null;
  created_at: string | null;
}

function statusIcon(s: string | null) {
  if (s === "active")     return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
  if (s === "onboarding") return <Clock className="w-3.5 h-3.5 text-blue-500" />;
  return <AlertCircle className="w-3.5 h-3.5 text-gray-400" />;
}

function accountTypeBadge(t: string | null) {
  const map: Record<string, string> = {
    agency:          "bg-violet-100 text-violet-700",
    direct_business: "bg-blue-100 text-blue-700",
    freelancer:      "bg-amber-100 text-amber-700",
    internal:        "bg-gray-100 text-gray-600",
    lokat_client:    "bg-indigo-100 text-indigo-700",
  };
  return map[t ?? ""] ?? "bg-indigo-100 text-indigo-700";
}

function roleTypeBadge(r: string | null) {
  const map: Record<string, string> = {
    super_admin: "bg-red-100 text-red-700",
    admin:       "bg-indigo-100 text-indigo-700",
    cliente:     "bg-teal-100 text-teal-700",
  };
  return map[r ?? ""] ?? "bg-gray-100 text-gray-600";
}

export default async function PlataformaPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).maybeSingle();

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

  // Fetch clients
  let clientsResult = await supabase
    .from("clients")
    .select("id, company_name, responsible_name, email, segment, status, account_type, created_at, deleted_at, archived_at")
    .in("status", CLIENT_VISIBLE_STATUSES)
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  if (clientsResult.error && isMissingClientVisibilityColumn(clientsResult.error)) {
    clientsResult = await supabase
      .from("clients")
      .select("id, company_name, responsible_name, email, segment, status, account_type, created_at")
      .in("status", CLIENT_VISIBLE_STATUSES)
      .order("created_at", { ascending: false }) as typeof clientsResult;
  }

  const clients = (clientsResult.data ?? []).filter(isVisibleClientRecord) as PlatformAccount[];

  // Fetch profiles (users da plataforma)
  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("id, name, email, role, account_type, plan, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const profiles = (allProfiles ?? []) as ProfileRow[];

  // Stats de clients
  const byType = {
    lokat:   clients.filter((c) => !c.account_type || c.account_type === "lokat_client"),
    agency:  clients.filter((c) => c.account_type === "agency"),
    direct:  clients.filter((c) => c.account_type === "direct_business"),
    other:   clients.filter((c) => c.account_type === "freelancer" || c.account_type === "internal"),
  };
  const active    = clients.filter((c) => c.status === "active").length;
  const onboarding = clients.filter((c) => c.status === "onboarding").length;

  // Stats de profiles (usuários)
  const adminProfiles  = profiles.filter((p) => p.role === "admin" || p.role === "super_admin");
  const clientProfiles = profiles.filter((p) => p.role === "cliente");
  const staffProfiles  = profiles.filter((p) => !["admin","super_admin","cliente"].includes(p.role ?? ""));

  // Tenta buscar meta assets e olaclick por client
  const clientIds = clients.map((c) => c.id);
  let metaSet   = new Set<string>();
  let olacheckSet = new Set<string>();
  let requestMap: Record<string, number> = {};

  if (clientIds.length > 0) {
    const [metaRes, olaRes, reqRes] = await Promise.all([
      supabase.from("client_meta_assets").select("client_id").in("client_id", clientIds),
      supabase.from("olaclick_connections").select("client_id").eq("status","connected").in("client_id", clientIds),
      supabase.from("client_requests").select("client_id").eq("status","open").in("client_id", clientIds),
    ]);
    for (const r of metaRes.data ?? []) metaSet.add((r as { client_id: string }).client_id);
    for (const r of olaRes.data ?? [])  olacheckSet.add((r as { client_id: string }).client_id);
    for (const r of reqRes.data ?? []) {
      const id = (r as { client_id: string }).client_id;
      requestMap[id] = (requestMap[id] ?? 0) + 1;
    }
  }

  const enriched: PlatformAccount[] = clients.map((c) => ({
    ...c,
    has_meta_connection:    metaSet.has(c.id),
    has_olaclick_connection: olacheckSet.has(c.id),
    open_request_count:     requestMap[c.id] ?? 0,
  }));

  const withPendingConnection = enriched.filter((c) => !c.has_meta_connection && !c.has_olaclick_connection);
  const withOpenRequests      = enriched.filter((c) => (c.open_request_count ?? 0) > 0);

  return (
    <div>
      <PageHeader
        title="Plataforma"
        description="CRM Central — visão geral de toda a base de contas"
      />

      <div className="space-y-6">

        {/* Stats de clientes */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total de clientes", value: clients.length,   Icon: Users,       color: "text-indigo-600 bg-indigo-50" },
            { label: "Ativos",            value: active,           Icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
            { label: "Onboarding",        value: onboarding,       Icon: Clock,        color: "text-blue-600 bg-blue-50" },
            { label: "Usuários",          value: profiles.length,  Icon: Users,        color: "text-purple-600 bg-purple-50" },
          ].map(({ label, value, Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Breakdown por tipo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Clientes Lokat", count: byType.lokat.length,  Icon: Users,     color: "bg-indigo-50 text-indigo-600" },
            { label: "Agências",       count: byType.agency.length, Icon: Building2, color: "bg-violet-50 text-violet-600" },
            { label: "Empresas",       count: byType.direct.length, Icon: Briefcase, color: "bg-blue-50 text-blue-600" },
            { label: "Outros",         count: byType.other.length,  Icon: TrendingUp, color: "bg-amber-50 text-amber-600" },
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

        {/* Alertas operacionais */}
        {(withPendingConnection.length > 0 || withOpenRequests.length > 0) && (
          <div className="grid md:grid-cols-2 gap-3">
            {withPendingConnection.length > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="w-4 h-4 text-amber-600" />
                  <p className="text-xs font-bold text-amber-800">Conexões pendentes</p>
                </div>
                <p className="text-sm font-bold text-amber-900">{withPendingConnection.length} clientes</p>
                <p className="text-xs text-amber-700">sem Meta ou OlaClick conectado</p>
              </div>
            )}
            {withOpenRequests.length > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <p className="text-xs font-bold text-blue-800">Solicitações abertas</p>
                </div>
                <p className="text-sm font-bold text-blue-900">
                  {Object.values(requestMap).reduce((a, b) => a + b, 0)} solicitações
                </p>
                <p className="text-xs text-blue-700">em {withOpenRequests.length} clientes</p>
              </div>
            )}
          </div>
        )}

        {/* Tabela de clientes */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-bold text-gray-900">Clientes</p>
            <Link href="/admin/clientes" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              Gerenciar <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {enriched.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-400">Nenhum cliente encontrado.</div>
            )}
            {enriched.map((c) => (
              <div key={c.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                <div className="flex-shrink-0">{statusIcon(c.status)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{c.company_name ?? c.responsible_name ?? "—"}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-gray-400 truncate">{c.segment ?? c.email ?? "—"}</p>
                    {c.has_meta_connection    && <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">Meta</span>}
                    {c.has_olaclick_connection && <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full"><ShoppingCart className="inline w-2.5 h-2.5 mr-0.5" />Cardápio</span>}
                    {(c.open_request_count ?? 0) > 0 && <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-full">{c.open_request_count} solicitação{(c.open_request_count ?? 0) > 1 ? "ões" : ""}</span>}
                  </div>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${accountTypeBadge(c.account_type)}`}>
                  {c.account_type === "agency" ? "Agência" : c.account_type === "direct_business" ? "Empresa" : c.account_type === "freelancer" ? "Freelancer" : "Cliente Lokat"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tabela de usuários */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-bold text-gray-900">Usuários da plataforma</p>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span>{adminProfiles.length} admins</span>
              <span>{clientProfiles.length} clientes</span>
              <span>{staffProfiles.length} staff</span>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {profiles.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-400">Nenhum usuário encontrado.</div>
            )}
            {profiles.slice(0, 50).map((p) => (
              <div key={p.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                <div className="w-7 h-7 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-500">
                  {(p.name ?? p.email ?? "?")[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{p.name ?? "Sem nome"}</p>
                  <p className="text-xs text-gray-400 truncate">{p.email ?? "—"}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${roleTypeBadge(p.role)}`}>
                    {p.role ?? "—"}
                  </span>
                  {p.plan && p.plan !== "starter" && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                      {getPlanLabel(p.plan)}
                    </span>
                  )}
                  {p.account_type && p.account_type !== "nao_definido" && (
                    <span className="text-[10px] font-medium text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded-full hidden md:inline">
                      {getAccountTypeLabel(p.account_type)}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {profiles.length > 50 && (
              <div className="px-5 py-3 text-xs text-gray-400">
                Mostrando 50 de {profiles.length} usuários.
              </div>
            )}
          </div>
        </div>

        {/* Solicitações abertas */}
        {withOpenRequests.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-sm font-bold text-gray-900">Clientes com solicitações abertas</p>
            </div>
            <div className="divide-y divide-gray-50">
              {withOpenRequests.map((c) => (
                <div key={c.id} className="px-5 py-3.5 flex items-center gap-3">
                  <MessageSquare className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.company_name ?? "—"}</p>
                  </div>
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full flex-shrink-0">
                    {c.open_request_count} aberta{(c.open_request_count ?? 0) > 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Diagnóstico de conexões pendentes */}
        {withPendingConnection.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-sm font-bold text-gray-900">Clientes sem conexão configurada</p>
              <p className="text-xs text-gray-400">Oportunidade de upsell ou onboarding pendente</p>
            </div>
            <div className="divide-y divide-gray-50">
              {withPendingConnection.slice(0, 20).map((c) => (
                <div key={c.id} className="px-5 py-3.5 flex items-center gap-3">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.company_name ?? "—"}</p>
                    <p className="text-xs text-gray-400">{c.segment ?? c.email ?? "—"}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="w-3 h-3 text-gray-300" />
                    <span className="text-[10px] text-gray-400">Sem conexão</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
