"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Users, Building2, Rocket, UserCheck, AlertTriangle,
  RefreshCw, Search, Filter, ChevronDown, Shield,
  Activity, Clock, CheckCircle2, XCircle, Eye,
  Bell, MoreHorizontal,
} from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

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
  plan_slug: string | null;
  coupon_code: string | null;
  subscription_status: string | null;
}

type AccountFilter = "todos" | "agencia" | "empresa" | "invited_client" | "diagnostic_only" | "trial" | "sem_vinculo" | "bloqueado";

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  agencia:          "Agência",
  empresa:          "Empresa",
  invited_client:   "Cliente convidado",
  diagnostic_only:  "Diagnóstico",
  super_admin:      "Super Admin",
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  active:          { label: "Ativo",       cls: "bg-emerald-50 text-emerald-700" },
  trialing:        { label: "Trial",       cls: "bg-indigo-50 text-indigo-700" },
  beta_free:       { label: "Beta",        cls: "bg-purple-50 text-purple-700" },
  suspended:       { label: "Suspenso",    cls: "bg-amber-50 text-amber-700" },
  blocked:         { label: "Bloqueado",   cls: "bg-red-50 text-red-700" },
  pending_setup:   { label: "Pendente",    cls: "bg-gray-100 text-gray-500" },
};

const FILTER_OPTIONS: { value: AccountFilter; label: string }[] = [
  { value: "todos",          label: "Todos" },
  { value: "agencia",        label: "Agências" },
  { value: "empresa",        label: "Empresas" },
  { value: "invited_client", label: "Clientes convidados" },
  { value: "diagnostic_only",label: "Só diagnóstico" },
  { value: "trial",          label: "Em trial" },
  { value: "sem_vinculo",    label: "Sem vínculo" },
  { value: "bloqueado",      label: "Bloqueado/Suspenso" },
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

// ── Stats card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ElementType; color: string }) {
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
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState<AccountFilter>("todos");
  const [actionTarget, setActionTarget] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/accounts");
      if (!res.ok) {
        console.error("[accounts] API error:", res.status, await res.text().catch(() => ""));
        setLoading(false);
        return;
      }
      const json = await res.json() as { ok: boolean; accounts?: Account[] };
      if (!json.ok || !Array.isArray(json.accounts)) { setLoading(false); return; }
      setAccounts(json.accounts.map((a) => ({ ...a, last_sign_in_at: null })));
    } catch (e) {
      console.error("[accounts] load error:", e);
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
        setActionMsg({ id: userId, ok: true, text: `Status atualizado para "${newStatus}".` });
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
      (a.company_name ?? "").toLowerCase().includes(q);
    const matchFilter =
      filter === "todos" ? true :
      filter === "agencia" ? a.account_type === "agencia" :
      filter === "empresa" ? a.account_type === "empresa" :
      filter === "invited_client" ? a.account_type === "invited_client" :
      filter === "diagnostic_only" ? a.account_type === "diagnostic_only" :
      filter === "trial" ? a.subscription_status === "trialing" :
      filter === "sem_vinculo" ? !a.company_name :
      filter === "bloqueado" ? (a.account_status === "blocked" || a.account_status === "suspended") :
      true;
    return matchSearch && matchFilter;
  });

  // Stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const week = new Date(); week.setDate(week.getDate() - 7); week.setHours(0, 0, 0, 0);
  const newToday = accounts.filter((a) => a.created_at && new Date(a.created_at) >= today).length;
  const newWeek  = accounts.filter((a) => a.created_at && new Date(a.created_at) >= week).length;
  const agencies = accounts.filter((a) => a.account_type === "agencia").length;
  const businesses = accounts.filter((a) => a.account_type === "empresa").length;
  const trialing = accounts.filter((a) => a.subscription_status === "trialing").length;
  const blocked  = accounts.filter((a) => a.account_status === "blocked" || a.account_status === "suspended").length;

  return (
    <div>
      <PageHeader
        title="Central de Contas"
        description="Cadastros, tipos de conta, status e ações administrativas"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard label="Hoje"       value={newToday}   icon={Bell}        color="bg-indigo-50 text-indigo-600" />
        <StatCard label="7 dias"     value={newWeek}    icon={Activity}    color="bg-blue-50 text-blue-600" />
        <StatCard label="Agências"   value={agencies}   icon={Rocket}      color="bg-purple-50 text-purple-600" />
        <StatCard label="Empresas"   value={businesses} icon={Building2}   color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Em trial"   value={trialing}   icon={Clock}       color="bg-amber-50 text-amber-600" />
        <StatCard label="Bloqueados" value={blocked}    icon={AlertTriangle} color="bg-red-50 text-red-600" />
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

      {/* Info note */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 text-xs text-slate-600">
        A Central mostra todos os perfis encontrados. Contas sem empresa ou agência aparecem como pendentes de configuração.
      </div>
      {!isSupabaseConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700">
          Supabase não configurado — dados podem estar incompletos.
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-sm text-gray-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Carregando contas...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-8 h-8 mx-auto mb-2 text-gray-200" />
            <p className="text-sm text-gray-400">Nenhuma conta encontrada.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Nome / E-mail", "Tipo", "Empresa", "Status", "Plano", "Cadastro", "Ações"].map((h) => (
                    <th key={h} className="text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((a) => {
                  const statusCfg = STATUS_LABELS[a.account_status ?? "active"] ?? STATUS_LABELS.active;
                  const isActionRow = actionTarget === a.id;
                  return (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-gray-900">{a.name ?? "—"}</p>
                        <p className="text-[11px] text-gray-400">{a.email ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600">
                          {a.account_type ? (ACCOUNT_TYPE_LABELS[a.account_type] ?? a.account_type) : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600">{a.company_name ?? <span className="text-gray-300">sem vínculo</span>}</span>
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
                        <span className="text-xs text-gray-500">{a.plan_slug ?? a.subscription_status ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[11px] text-gray-500">{fmtDate(a.created_at)}</p>
                        <p className="text-[10px] text-gray-400">acesso {fmtRelative(a.last_sign_in_at)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {a.account_status !== "blocked" && a.account_status !== "suspended" ? (
                            <button
                              onClick={() => void handleStatusChange(a.id, "blocked")}
                              disabled={isActionRow}
                              className="text-[10px] font-medium text-red-600 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                              title="Bloquear conta"
                            >
                              Bloquear
                            </button>
                          ) : (
                            <button
                              onClick={() => void handleStatusChange(a.id, "active")}
                              disabled={isActionRow}
                              className="text-[10px] font-medium text-emerald-600 hover:text-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-40"
                              title="Reativar conta"
                            >
                              Reativar
                            </button>
                          )}
                          {a.account_status === "active" && (
                            <button
                              onClick={() => void handleStatusChange(a.id, "suspended")}
                              disabled={isActionRow}
                              className="text-[10px] font-medium text-amber-600 hover:text-amber-700 px-2 py-1 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-40"
                              title="Suspender temporariamente"
                            >
                              Suspender
                            </button>
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
        {" · "}Bloqueio/suspensão é apenas status interno — não remove acesso ao auth ainda.
        {" · "}Dados enriquecidos (plano, cupom, trial) ficam disponíveis após SQL 70.
      </p>
    </div>
  );
}
