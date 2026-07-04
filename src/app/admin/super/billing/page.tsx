"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import {
  TrendingUp, Users, Zap, AlertCircle, Tag, CreditCard,
  Plus, CheckCircle2, Clock, XCircle, RefreshCw, ChevronDown,
} from "lucide-react";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { PLANS, formatPrice } from "@/lib/billing/plans";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MrrSummary {
  total_subscriptions: number;
  active_subscriptions: number;
  trialing_subscriptions: number;
  beta_free_subscriptions: number;
  overdue_subscriptions: number;
  mrr_estimated: number;
  arr_estimated: number;
}

interface Subscription {
  id: string;
  client_id: string;
  plan_slug: string;
  status: string;
  trial_end_at: string | null;
  current_period_end: string | null;
  amount_monthly: number | null;
  billing_mode: string;
  clients?: { company_name: string } | null;
  billing_coupons?: { code: string } | null;
}

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number | null;
  duration_type: string;
  duration_months: number | null;
  redeemed_count: number;
  max_redemptions: number | null;
  expires_at: string | null;
  status: string;
}

type Tab = "mrr" | "subscriptions" | "coupons" | "plans";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  trialing:   { label: "Teste",    color: "text-blue-600 bg-blue-50 border-blue-100" },
  active:     { label: "Ativo",    color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
  past_due:   { label: "Vencido",  color: "text-red-600 bg-red-50 border-red-100" },
  canceled:   { label: "Cancelado",color: "text-gray-400 bg-gray-50 border-gray-100" },
  expired:    { label: "Expirado", color: "text-gray-400 bg-gray-50 border-gray-100" },
  beta_free:  { label: "Beta",     color: "text-purple-600 bg-purple-50 border-purple-100" },
};

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ── New Coupon Modal ──────────────────────────────────────────────────────────

interface NewCouponModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function NewCouponModal({ onClose, onCreated }: NewCouponModalProps) {
  const [form, setForm] = useState({
    code: "", description: "", discount_type: "percent",
    discount_value: "", duration_type: "once", duration_months: "",
    max_redemptions: "", expires_at: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim()) { setError("Código obrigatório."); return; }
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const payload: Record<string, unknown> = {
        code:          form.code.trim().toUpperCase(),
        description:   form.description || null,
        discount_type: form.discount_type,
        duration_type: form.duration_type,
        status:        "active",
      };
      if (form.discount_value) payload.discount_value = parseFloat(form.discount_value);
      if (form.duration_months) payload.duration_months = parseInt(form.duration_months);
      if (form.max_redemptions) payload.max_redemptions = parseInt(form.max_redemptions);
      if (form.expires_at) payload.expires_at = new Date(form.expires_at).toISOString();

      const { error: err } = await supabase.from("billing_coupons").insert(payload);
      if (err) { setError(err.message); return; }
      onCreated();
      onClose();
    } catch (ex) {
      setError(String(ex));
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-base font-black text-gray-900 mb-4">Criar cupom</h2>
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Código</label>
            <input type="text" value={form.code} onChange={set("code")} placeholder="BETA100" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Descrição (opcional)</label>
            <input type="text" value={form.description} onChange={set("description")} placeholder="Beta founders" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Tipo de desconto</label>
              <select value={form.discount_type} onChange={set("discount_type")} className={inputCls}>
                <option value="percent">Percentual (%)</option>
                <option value="fixed">Valor fixo (R$)</option>
                <option value="free_trial">Trial estendido</option>
                <option value="free_period">Período grátis</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {form.discount_type === "free_trial" ? "Dias grátis" : "Valor"}
              </label>
              <input type="number" value={form.discount_value} onChange={set("discount_value")}
                placeholder={form.discount_type === "percent" ? "100" : form.discount_type === "free_trial" ? "30" : "49"}
                className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Duração</label>
              <select value={form.duration_type} onChange={set("duration_type")} className={inputCls}>
                <option value="once">Uma vez</option>
                <option value="forever">Para sempre</option>
                <option value="repeating">Recorrente</option>
                <option value="trial_extension">Extensão de trial</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Meses (se recorrente)</label>
              <input type="number" value={form.duration_months} onChange={set("duration_months")} placeholder="3" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Máx. usos</label>
              <input type="number" value={form.max_redemptions} onChange={set("max_redemptions")} placeholder="Sem limite" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Expiração</label>
              <input type="date" value={form.expires_at} onChange={set("expires_at")} className={inputCls} />
            </div>
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-sm text-gray-600 rounded-xl hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-60">
              {loading ? "Criando…" : "Criar cupom"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SuperBillingPage() {
  const [tab, setTab]                     = useState<Tab>("mrr");
  const [mrr, setMrr]                     = useState<MrrSummary | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [coupons, setCoupons]             = useState<Coupon[]>([]);
  const [loading, setLoading]             = useState(false);
  const [sqlPending, setSqlPending]       = useState(false);
  const [showNewCoupon, setShowNewCoupon] = useState(false);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      const supabase = createClient();

      // MRR summary via view
      const { data: mrrData, error: mrrErr } = await supabase
        .from("v_billing_mrr_summary").select("*").maybeSingle();
      if (mrrErr?.code === "42P01") { setSqlPending(true); setLoading(false); return; }
      if (mrrData) setMrr(mrrData as MrrSummary);

      // Subscriptions with client names
      const { data: subs } = await supabase
        .from("client_subscriptions")
        .select("id,client_id,plan_slug,status,trial_end_at,current_period_end,amount_monthly,billing_mode,clients(company_name),billing_coupons(code)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (subs) setSubscriptions(subs as unknown as Subscription[]);

      // Coupons
      const { data: cpns } = await supabase
        .from("billing_coupons")
        .select("id,code,description,discount_type,discount_value,duration_type,duration_months,redeemed_count,max_redemptions,expires_at,status")
        .order("created_at", { ascending: false });
      if (cpns) setCoupons(cpns as Coupon[]);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "mrr",           label: "Visão geral",  icon: TrendingUp   },
    { key: "subscriptions", label: "Assinaturas",  icon: Users        },
    { key: "coupons",       label: "Cupons",        icon: Tag          },
    { key: "plans",         label: "Planos",        icon: Zap          },
  ];

  if (sqlPending) {
    return (
      <div>
        <PageHeader title="Billing & Planos" description="Painel super_admin de MRR, assinaturas e cupons" />
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-700">
            <p className="font-bold text-amber-800 mb-1">SQL 68 pendente</p>
            <p>As tabelas de billing ainda não foram criadas. Rode <code>docs/supabase/68-billing-plans-coupons-subscriptions.sql</code> no Supabase SQL Editor e recarregue.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Billing & Planos" description="MRR, assinaturas, cupons e planos — super_admin" />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-2xl w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
            {label}
          </button>
        ))}
        <button onClick={() => load()} disabled={loading} className="ml-1 p-2 text-gray-400 hover:text-gray-600 rounded-xl" title="Atualizar">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* ── Visão geral ── */}
      {tab === "mrr" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "MRR estimado",    value: mrr ? `R$ ${(mrr.mrr_estimated ?? 0).toLocaleString("pt-BR")}` : "—", icon: TrendingUp,  color: "text-emerald-600" },
              { label: "ARR estimado",    value: mrr ? `R$ ${(mrr.arr_estimated ?? 0).toLocaleString("pt-BR")}` : "—",  icon: TrendingUp,  color: "text-emerald-500" },
              { label: "Ativos",          value: mrr?.active_subscriptions ?? "—",                                        icon: CheckCircle2, color: "text-emerald-600" },
              { label: "Em teste",        value: mrr?.trialing_subscriptions ?? "—",                                      icon: Clock,        color: "text-blue-500" },
              { label: "Beta/free",       value: mrr?.beta_free_subscriptions ?? "—",                                     icon: Zap,          color: "text-purple-500" },
              { label: "Vencidos",        value: mrr?.overdue_subscriptions ?? "—",                                       icon: AlertCircle,  color: "text-red-500" },
              { label: "Total assinaturas", value: mrr?.total_subscriptions ?? "—",                                       icon: Users,        color: "text-gray-600" },
              { label: "Cupons ativos",   value: coupons.filter(c => c.status === "active").length,                       icon: Tag,          color: "text-indigo-500" },
            ].map((card) => (
              <div key={card.label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                <card.icon className={`w-5 h-5 flex-shrink-0 ${card.color}`} strokeWidth={1.5} />
                <div>
                  <p className={`text-lg font-black ${card.color}`}>{card.value}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{card.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
              <p className="text-xs font-bold text-amber-800">Pagamentos automáticos em preparação</p>
            </div>
            <p className="text-xs text-amber-700">Nesta fase beta, use PIX manual, invoice ou cupom. Registro de pagamentos abaixo.</p>
          </div>
        </div>
      )}

      {/* ── Assinaturas ── */}
      {tab === "subscriptions" && (
        <div>
          {subscriptions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Users className="w-8 h-8 mx-auto mb-2" strokeWidth={1} />
              <p className="text-sm">Nenhuma assinatura registrada ainda.</p>
              <p className="text-xs mt-1">Rode o SQL 68 e cadastre clientes para começar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Cliente","Plano","Status","Fim do trial","Valor/mês","Cupom","Modo"].map(h => (
                      <th key={h} className="text-left font-bold text-gray-500 pb-2 pr-4 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {subscriptions.map((s) => {
                    const sc = STATUS_LABELS[s.status] ?? { label: s.status, color: "text-gray-500" };
                    return (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="py-2.5 pr-4 font-semibold text-gray-800 whitespace-nowrap">
                          {s.clients?.company_name ?? s.client_id.slice(0,8)}
                        </td>
                        <td className="py-2.5 pr-4 capitalize">{s.plan_slug}</td>
                        <td className="py-2.5 pr-4">
                          <span className={`text-[10px] font-bold border px-1.5 py-0.5 rounded-full ${sc.color}`}>{sc.label}</span>
                        </td>
                        <td className="py-2.5 pr-4 text-gray-500">{fmtDate(s.trial_end_at)}</td>
                        <td className="py-2.5 pr-4 text-gray-700">{s.amount_monthly ? `R$ ${s.amount_monthly}` : "—"}</td>
                        <td className="py-2.5 pr-4 text-indigo-600">{s.billing_coupons?.code ?? "—"}</td>
                        <td className="py-2.5 pr-4 text-gray-400">{s.billing_mode}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Cupons ── */}
      {tab === "coupons" && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowNewCoupon(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Criar cupom
            </button>
          </div>
          {coupons.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Tag className="w-8 h-8 mx-auto mb-2" strokeWidth={1} />
              <p className="text-sm">Nenhum cupom criado ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Código","Descrição","Tipo","Valor","Duração","Usos","Expiração","Status"].map(h => (
                      <th key={h} className="text-left font-bold text-gray-500 pb-2 pr-4 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {coupons.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="py-2.5 pr-4 font-bold text-indigo-600">{c.code}</td>
                      <td className="py-2.5 pr-4 text-gray-500">{c.description ?? "—"}</td>
                      <td className="py-2.5 pr-4">{c.discount_type}</td>
                      <td className="py-2.5 pr-4">{c.discount_value ?? "—"}</td>
                      <td className="py-2.5 pr-4">{c.duration_type}{c.duration_months ? ` · ${c.duration_months}m` : ""}</td>
                      <td className="py-2.5 pr-4">{c.redeemed_count}{c.max_redemptions ? `/${c.max_redemptions}` : ""}</td>
                      <td className="py-2.5 pr-4 text-gray-500">{fmtDate(c.expires_at)}</td>
                      <td className="py-2.5 pr-4">
                        <span className={`text-[10px] font-bold border px-1.5 py-0.5 rounded-full ${c.status === "active" ? "text-emerald-600 bg-emerald-50 border-emerald-100" : "text-gray-400 bg-gray-50 border-gray-100"}`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Planos ── */}
      {tab === "plans" && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => (
            <div key={plan.slug} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-black text-gray-900">{plan.name}</p>
                <span className={`text-[9px] font-bold border px-1.5 py-0.5 rounded-full ${plan.status === "active" ? "text-emerald-600 bg-emerald-50 border-emerald-100" : plan.status === "beta" ? "text-purple-600 bg-purple-50 border-purple-100" : "text-gray-400 bg-gray-50 border-gray-100"}`}>
                  {plan.status}
                </span>
              </div>
              <p className="text-2xl font-black text-gray-900 mb-0.5">
                {formatPrice(plan.price_monthly)}<span className="text-xs font-normal text-gray-400">/mês</span>
              </p>
              <p className="text-[10px] text-gray-400 mb-3">{plan.trial_days} dias de trial</p>
              <p className="text-xs text-gray-500 mb-3">{plan.description}</p>
              <div className="space-y-1">
                {plan.entitlements.slice(0, 5).map((e) => (
                  <div key={e} className="flex items-center gap-1.5 text-[10px] text-gray-500">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" strokeWidth={2} />
                    {e.replace(/_/g, " ")}
                  </div>
                ))}
                {plan.entitlements.length > 5 && (
                  <p className="text-[10px] text-gray-400 flex items-center gap-1">
                    <ChevronDown className="w-3 h-3" /> +{plan.entitlements.length - 5} módulos
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showNewCoupon && (
        <NewCouponModal onClose={() => setShowNewCoupon(false)} onCreated={load} />
      )}
    </div>
  );
}
