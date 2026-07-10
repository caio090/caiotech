"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import {
  Users, Building2, Rocket, UserCheck, AlertTriangle,
  RefreshCw, Search, Filter, ChevronDown, Shield,
  Activity, Clock, CheckCircle2, XCircle,
  Bell, UserX, ListOrdered,
} from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getPlannedIntegrations, INTEGRATION_TYPES } from "@/lib/integrations";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Account {
  id: string;
  email: string | null;
  name: string | null;
  role: string | null;
  account_type: string | null;
  account_status: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  company_name: string | null;
  agency_name: string | null;
  plan_slug: string | null;
  coupon_code: string | null;
  subscription_status: string | null;
  source: string;
  has_profile: boolean;
}

type AccountFilter =
  | "todos"
  | "interna"
  | "agencia"
  | "cliente_direto"
  | "cliente_agencia"
  | "autonomo"
  | "operacional"
  | "lead"
  | "trial"
  | "sem_perfil"
  | "bloqueado";

const ACCOUNT_TYPE_BADGE_CONFIG: Record<string, { label: string; cls: string }> = {
  // Canonical new types
  interno_lokat:    { label: "Interno Lokat",      cls: "bg-emerald-50 text-emerald-700" },
  agencia_parceira: { label: "Agência parceira",   cls: "bg-purple-50 text-purple-700" },
  cliente_direto:   { label: "Cliente direto",     cls: "bg-indigo-50 text-indigo-700" },
  cliente_agencia:  { label: "Cliente de agência", cls: "bg-blue-50 text-blue-700" },
  autonomo:         { label: "Autônomo",           cls: "bg-amber-50 text-amber-700" },
  lead:             { label: "Lead",               cls: "bg-gray-100 text-gray-600" },
  operacional:      { label: "Operacional",        cls: "bg-sky-50 text-sky-700" },
  teste:            { label: "Teste",              cls: "bg-slate-100 text-slate-600" },
  // Legacy DB values
  agencia:          { label: "Agência",            cls: "bg-purple-50 text-purple-700" },
  empresa:          { label: "Empresa",            cls: "bg-indigo-50 text-indigo-700" },
  invited_client:   { label: "Cliente convidado",  cls: "bg-blue-50 text-blue-700" },
  diagnostic_only:  { label: "Lead / Diagnóstico", cls: "bg-amber-50 text-amber-700" },
  super_admin:      { label: "Super Admin",        cls: "bg-emerald-50 text-emerald-700" },
  freelancer:       { label: "Autônomo",           cls: "bg-amber-50 text-amber-700" },
  social_media:     { label: "Social Media",       cls: "bg-sky-50 text-sky-700" },
};

function getAccountTypeBadge(type: string | null): { label: string; cls: string } {
  if (!type) return { label: "—", cls: "bg-gray-50 text-gray-400" };
  const cfg = ACCOUNT_TYPE_BADGE_CONFIG[type.toLowerCase()];
  return cfg ?? { label: type, cls: "bg-gray-50 text-gray-500" };
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  active:          { label: "Ativo",       cls: "bg-emerald-50 text-emerald-700" },
  trialing:        { label: "Trial",       cls: "bg-indigo-50 text-indigo-700" },
  beta_free:       { label: "Beta",        cls: "bg-purple-50 text-purple-700" },
  suspended:       { label: "Suspenso",    cls: "bg-amber-50 text-amber-700" },
  blocked:         { label: "Bloqueado",   cls: "bg-red-50 text-red-700" },
  pending_setup:   { label: "Pendente",    cls: "bg-gray-100 text-gray-500" },
};

const SOURCE_LABELS: Record<string, { label: string; cls: string }> = {
  "auth+profile+client":  { label: "Cliente",    cls: "text-emerald-600" },
  "auth+profile+agency":  { label: "Agência",    cls: "text-purple-600" },
  "auth+profile":         { label: "Perfil",     cls: "text-blue-600" },
  "auth_only":            { label: "Auth",       cls: "text-amber-600" },
  "profiles_fallback":    { label: "Contingência", cls: "text-orange-600" },
  "current_session":      { label: "Sessão",     cls: "text-indigo-600" },
};

const FILTER_OPTIONS: { value: AccountFilter; label: string }[] = [
  { value: "todos",           label: "Todas" },
  { value: "interna",         label: "Internas" },
  { value: "agencia",         label: "Agências" },
  { value: "cliente_direto",  label: "Clientes diretos" },
  { value: "cliente_agencia", label: "Clientes de agência" },
  { value: "autonomo",        label: "Autônomos" },
  { value: "operacional",     label: "Operacionais" },
  { value: "lead",            label: "Leads" },
  { value: "trial",           label: "Em trial" },
  { value: "sem_perfil",      label: "Sem perfil" },
  { value: "bloqueado",       label: "Bloqueado/Suspenso" },
];

const inputCls = "border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 transition-colors bg-white";

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function fmtRelative(s: string | null) {
  if (!s) return "nunca";
  const diff = Date.now() - new Date(s).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 7) return `${days}d atrás`;
  if (days < 30) return `${Math.floor(days / 7)}sem atrás`;
  return fmtDate(s);
}

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number | string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-4 h-4" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-xl font-black text-gray-900">{value}</p>
        <p className="text-[11px] text-gray-400">{label}</p>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function PlatformAccountsPage() {
  const [accounts,     setAccounts]     = useState<Account[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [apiError,     setApiError]     = useState<string | null>(null);
  const [degraded,     setDegraded]     = useState(false);
  const [degradedMsg,  setDegradedMsg]  = useState<string | null>(null);
  const [search,       setSearch]       = useState("");
  const [filter,       setFilter]       = useState<AccountFilter>("todos");
  const [actionTarget, setActionTarget] = useState<string | null>(null);
  const [actionMsg,    setActionMsg]    = useState<{ id: string; ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    setDegraded(false);
    setDegradedMsg(null);
    try {
      const res = await fetch("/api/admin/accounts");

      let json: {
        ok: boolean;
        accounts?: Account[];
        code?: string;
        message?: string;
        degraded?: boolean;
        warning?: string | null;
        debug?: Record<string, unknown>;
      } | null = null;
      try { json = await res.json(); } catch { /* empty */ }

      if (!res.ok || !json?.ok) {
        const code    = json?.code ?? `http_${res.status}`;
        const message = json?.message ?? `Erro ${res.status} ao carregar contas.`;
        setApiError(`[${code}] ${message}`);
        setLoading(false);
        return;
      }

      if (!Array.isArray(json.accounts)) {
        setApiError("A API retornou um formato inesperado. Verifique os logs do servidor.");
        setLoading(false);
        return;
      }

      setAccounts(json.accounts);
      if (json.degraded) {
        setDegraded(true);
        setDegradedMsg(json.warning ?? "Dados em modo de contingência.");
      }
    } catch (e) {
      setApiError(`Erro de rede: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleStatusChange(userId: string, newStatus: string) {
    if (!isSupabaseConfigured) return;
    setActionTarget(userId);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ account_status: newStatus } as Record<string, string>)
        .eq("id", userId);

      if (error) {
        setActionMsg({ id: userId, ok: false, text: `Erro: ${error.message}` });
      } else {
        setActionMsg({ id: userId, ok: true, text: `Status: "${newStatus}".` });
        setAccounts((prev) => prev.map((a) => a.id === userId ? { ...a, account_status: newStatus } : a));
      }
    } catch {
      setActionMsg({ id: userId, ok: false, text: "Erro inesperado." });
    } finally {
      setActionTarget(null);
      setTimeout(() => setActionMsg(null), 3000);
    }
  }

  const filtered = accounts.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (a.email ?? "").toLowerCase().includes(q) ||
      (a.name ?? "").toLowerCase().includes(q) ||
      (a.company_name ?? "").toLowerCase().includes(q) ||
      (a.agency_name ?? "").toLowerCase().includes(q);
    const matchFilter =
      filter === "todos"           ? true :
      filter === "interna"         ? (a.role === "super_admin" || a.role === "admin") :
      filter === "agencia"         ? a.account_type === "agencia" :
      filter === "cliente_direto"  ? a.account_type === "empresa" :
      filter === "cliente_agencia" ? a.account_type === "invited_client" :
      filter === "autonomo"        ? (a.account_type === "autonomo" || a.account_type === "freelancer") :
      filter === "operacional"     ? (a.role === "social_media" || a.role === "operacional") :
      filter === "lead"            ? a.account_type === "diagnostic_only" :
      filter === "trial"           ? a.subscription_status === "trialing" :
      filter === "sem_perfil"      ? !a.has_profile :
      filter === "bloqueado"       ? (a.account_status === "blocked" || a.account_status === "suspended") :
      true;
    return matchSearch && matchFilter;
  });

  // Stats
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const week  = new Date(); week.setDate(week.getDate() - 7); week.setHours(0, 0, 0, 0);
  const newToday   = accounts.filter((a) => a.created_at && new Date(a.created_at) >= today).length;
  const newWeek    = accounts.filter((a) => a.created_at && new Date(a.created_at) >= week).length;
  const agencies   = accounts.filter((a) => a.account_type === "agencia").length;
  const businesses = accounts.filter((a) => a.account_type === "empresa").length;
  const trialing   = accounts.filter((a) => a.subscription_status === "trialing").length;
  const blocked    = accounts.filter((a) => a.account_status === "blocked" || a.account_status === "suspended").length;
  const noProfile  = accounts.filter((a) => !a.has_profile).length;

  return (
    <div>
      <PageHeader
        title="Central de Contas"
        description="Todos os usuários do auth — cadastros, tipos de conta, status e ações"
      />

      {/* Super admin tabs */}
      <div className="flex gap-2 mb-5">
        <span className="text-xs font-bold px-3 py-1.5 bg-gray-900 text-white rounded-xl">Contas</span>
        <Link
          href="/admin/super/waitlist"
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
        >
          <ListOrdered className="w-3.5 h-3.5" />
          Lista Beta
        </Link>
      </div>

      {/* Degraded warning */}
      {degraded && degradedMsg && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
          <span>{degradedMsg} Os dados abaixo são provenientes dos perfis do banco de dados.</span>
        </div>
      )}

      {/* API error */}
      {apiError && (
        <div className="mb-4 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-700">
          {apiError}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        <StatCard label="Total"      value={accounts.length} icon={Users}         color="bg-gray-100 text-gray-600" />
        <StatCard label="Hoje"       value={newToday}        icon={Bell}          color="bg-indigo-50 text-indigo-600" />
        <StatCard label="7 dias"     value={newWeek}         icon={Activity}      color="bg-blue-50 text-blue-600" />
        <StatCard label="Agências"   value={agencies}        icon={Rocket}        color="bg-purple-50 text-purple-600" />
        <StatCard label="Empresas"   value={businesses}      icon={Building2}     color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Sem perfil" value={noProfile}       icon={UserX}         color="bg-amber-50 text-amber-600" />
        <StatCard label="Bloqueados" value={blocked}         icon={AlertTriangle} color="bg-red-50 text-red-600" />
      </div>

      {/* Filters + search */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputCls} w-full pl-9`}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as AccountFilter)}
            className={`${inputCls} pl-9 pr-8 appearance-none cursor-pointer`}
          >
            {FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} strokeWidth={1.5} />
          Atualizar
        </button>
      </div>

      {/* Aviso filtros */}
      <div className="mb-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2 text-[11px] text-amber-700 flex items-center gap-2">
        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
        Alguns filtros dependem da classificação de conta no cadastro — resultados podem estar incompletos.
      </div>

      {/* Banners de estado — erro já tratado acima */}
      {!isSupabaseConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700">
          Supabase não configurado — dados podem estar incompletos.
        </div>
      )}
      {!apiError && !loading && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 text-xs text-slate-600">
          A Central lista todos os usuários do auth, incluindo contas sem perfil público.
          Contas sem empresa ou agência aparecem como pendentes de configuração.
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-sm text-gray-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Carregando contas...
          </div>
        ) : apiError ? (
          <div className="text-center py-16">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-300" />
            <p className="text-sm text-red-500 font-medium">Não foi possível carregar as contas.</p>
            <p className="text-xs text-gray-400 mt-1">Veja o erro acima. Tente atualizar ou verifique os logs.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-8 h-8 mx-auto mb-2 text-gray-200" />
            <p className="text-sm text-gray-400">Nenhuma conta encontrada com este filtro.</p>
            {accounts.length > 0 && (
              <p className="text-xs text-gray-300 mt-1">{accounts.length} conta{accounts.length !== 1 ? "s" : ""} no total — ajuste o filtro ou busca.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Nome / E-mail", "Tipo", "Vínculo", "Portal OS", "Integrações", "Status", "Cadastro / Acesso", "Ações"].map((h) => (
                    <th key={h} className="text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((a) => {
                  const statusCfg  = STATUS_LABELS[a.account_status ?? "pending_setup"] ?? STATUS_LABELS.pending_setup;
                  const sourceCfg  = SOURCE_LABELS[a.source] ?? SOURCE_LABELS["auth_only"];
                  const isActionRow = actionTarget === a.id;
                  const noProfile  = !a.has_profile;

                  return (
                    <tr key={a.id} className={`hover:bg-gray-50 transition-colors ${noProfile ? "opacity-75" : ""}`}>
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-gray-900">{a.name ?? <span className="text-gray-400 italic">sem nome</span>}</p>
                        <p className="text-[11px] text-gray-400">{a.email ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const badge = getAccountTypeBadge(a.account_type);
                          return (
                            <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
                              {badge.label}
                            </span>
                          );
                        })()}
                        {a.role && a.role !== "user" && (
                          <p className="text-[9px] text-gray-400 mt-0.5">{a.role}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {a.company_name ? (
                          <span className="text-xs text-gray-700">{a.company_name}</span>
                        ) : a.agency_name ? (
                          <span className="text-xs text-purple-600">{a.agency_name}</span>
                        ) : (
                          <span className="text-[11px] text-gray-300">sem vínculo</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold ${sourceCfg.cls}`}>{sourceCfg.label}</span>
                      </td>
                      {/* Portal OS */}
                      <td className="px-4 py-3">
                        {a.role === "cliente" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Ativo
                          </span>
                        ) : a.source === "auth+profile+client" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                            <Shield className="w-2.5 h-2.5" /> Admin OS
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-300">—</span>
                        )}
                      </td>
                      {/* Integrações planejadas */}
                      <td className="px-4 py-3">
                        {(() => {
                          const planned = getPlannedIntegrations(a.account_type);
                          if (planned.length === 0) return <span className="text-[10px] text-gray-300">—</span>;
                          return (
                            <div className="flex flex-wrap gap-0.5">
                              {planned.slice(0, 3).map((key) => {
                                const t = INTEGRATION_TYPES.find((t) => t.key === key);
                                return t ? (
                                  <span key={key} className="text-[9px] font-medium text-gray-500 bg-gray-50 border border-gray-100 px-1 py-0.5 rounded">
                                    {t.label.split(" / ")[0]}
                                  </span>
                                ) : null;
                              })}
                              {planned.length > 3 && (
                                <span className="text-[9px] text-gray-400">+{planned.length - 3}</span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${statusCfg.cls}`}>
                          {statusCfg.label}
                        </span>
                        {actionMsg?.id === a.id && (
                          <p className={`text-[9px] mt-0.5 ${actionMsg.ok ? "text-emerald-600" : "text-red-600"}`}>{actionMsg.text}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[11px] text-gray-500">{fmtDate(a.created_at)}</p>
                        <p className="text-[10px] text-gray-400">acesso {fmtRelative(a.last_sign_in_at)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {noProfile ? (
                            <span className="text-[10px] text-gray-300" title="Crie ou repare o profile antes de alterar status">Sem perfil</span>
                          ) : a.account_status !== "blocked" && a.account_status !== "suspended" ? (
                            <>
                              <button
                                onClick={() => void handleStatusChange(a.id, "blocked")}
                                disabled={isActionRow}
                                className="text-[10px] font-medium text-red-600 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                                title="Bloquear conta"
                              >Bloquear</button>
                              {a.account_status === "active" && (
                                <button
                                  onClick={() => void handleStatusChange(a.id, "suspended")}
                                  disabled={isActionRow}
                                  className="text-[10px] font-medium text-amber-600 hover:text-amber-700 px-2 py-1 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-40"
                                  title="Suspender temporariamente"
                                >Suspender</button>
                              )}
                            </>
                          ) : (
                            <button
                              onClick={() => void handleStatusChange(a.id, "active")}
                              disabled={isActionRow}
                              className="text-[10px] font-medium text-emerald-600 hover:text-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-40"
                              title="Reativar conta"
                            >Reativar</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[11px] text-gray-400 mt-3">
        {filtered.length} de {accounts.length} conta{accounts.length !== 1 ? "s" : ""}
        {" · "}Bloqueio/suspensão é status interno — não remove acesso ao auth.
        {" · "}Contas sem empresa ou agência são normais para super_admin e diagnóstico.
      </p>
    </div>
  );
}
