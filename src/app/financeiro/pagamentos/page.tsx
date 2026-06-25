"use client";
import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import {
  DollarSign, CheckCircle2, Clock, AlertCircle, Plus, MoreVertical,
  Check, X, RotateCcw, Copy, Loader2, TrendingUp, Link2,
  ShoppingCart, Zap, Receipt,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────
type ChargeStatus = "draft" | "pending" | "paid" | "overdue" | "canceled" | "refunded" | "manual_confirmed";
type AccountType  = "agencia" | "empresa" | "cliente_atendido" | "lokat" | "nao_definido";

interface Charge {
  id: string;
  description: string | null;
  amount: number;
  due_date: string;
  paid_at: string | null;
  status: ChargeStatus;
  payment_method: string | null;
  payment_link: string | null;
  gateway_provider: string | null;
  notes: string | null;
  client_id: string | null;
  clients?: { company_name: string } | null;
}

// ── Mock data por perfil ───────────────────────────────────────
const MOCK_CHARGES: Charge[] = [
  { id: "1", description: "Mensalidade — Plano Agência", amount: 1200, due_date: "2026-07-05", paid_at: "2026-07-03", status: "paid",    payment_method: "pix",  payment_link: null, gateway_provider: null, notes: null, client_id: "c1", clients: { company_name: "Duh Lanches" } },
  { id: "2", description: "Mensalidade — Plano Empresa",  amount: 597,  due_date: "2026-07-10", paid_at: null,         status: "pending", payment_method: null,   payment_link: null, gateway_provider: null, notes: null, client_id: "c2", clients: { company_name: "Los Caldos" } },
  { id: "3", description: "Setup inicial",                amount: 1500, due_date: "2026-06-01", paid_at: null,         status: "overdue", payment_method: null,   payment_link: null, gateway_provider: null, notes: null, client_id: "c3", clients: { company_name: "My Sorvetes" } },
  { id: "4", description: "Mensalidade — Plano Empresa",  amount: 597,  due_date: "2026-07-15", paid_at: null,         status: "pending", payment_method: null,   payment_link: null, gateway_provider: null, notes: null, client_id: "c4", clients: { company_name: "MD Móveis" } },
];

const MOCK_EXPENSES: Charge[] = [
  { id: "e1", description: "Meta Ads — Julho",   amount: 800, due_date: "2026-07-01", paid_at: "2026-07-01", status: "paid",    payment_method: "cartao", payment_link: null, gateway_provider: null, notes: null, client_id: null, clients: null },
  { id: "e2", description: "Canva Pro",           amount: 89,  due_date: "2026-07-10", paid_at: null,         status: "pending", payment_method: null,     payment_link: null, gateway_provider: null, notes: null, client_id: null, clients: null },
  { id: "e3", description: "Produção de vídeo",  amount: 600, due_date: "2026-07-20", paid_at: null,         status: "pending", payment_method: null,     payment_link: null, gateway_provider: null, notes: null, client_id: null, clients: null },
  { id: "e4", description: "Google Ads — Junho", amount: 430, due_date: "2026-06-30", paid_at: null,         status: "overdue", payment_method: null,     payment_link: null, gateway_provider: null, notes: null, client_id: null, clients: null },
];

const MOCK_CLIENT_CHARGES: Charge[] = [
  { id: "cc1", description: "Mensalidade Plano Empresa — Julho", amount: 597, due_date: "2026-07-10", paid_at: null,         status: "pending", payment_method: null,  payment_link: "https://asaas.com/pay/xxx", gateway_provider: "asaas", notes: null, client_id: null, clients: null },
  { id: "cc2", description: "Mensalidade Plano Empresa — Junho", amount: 597, due_date: "2026-06-10", paid_at: "2026-06-08", status: "paid",    payment_method: "pix", payment_link: null,                         gateway_provider: "asaas", notes: null, client_id: null, clients: null },
];

// ── Status config ──────────────────────────────────────────────
const STATUS_CONFIG: Record<ChargeStatus, { label: string; cls: string }> = {
  draft:            { label: "Rascunho",   cls: "bg-gray-100 text-gray-500" },
  pending:          { label: "Pendente",   cls: "bg-blue-50 text-blue-700 border border-blue-100" },
  paid:             { label: "Pago",       cls: "bg-emerald-50 text-emerald-700 border border-emerald-100" },
  overdue:          { label: "Vencido",    cls: "bg-red-50 text-red-700 border border-red-100" },
  canceled:         { label: "Cancelado",  cls: "bg-gray-100 text-gray-400" },
  refunded:         { label: "Estornado",  cls: "bg-orange-50 text-orange-600" },
  manual_confirmed: { label: "Confirmado", cls: "bg-teal-50 text-teal-700 border border-teal-100" },
};

// ── Modal: Nova cobrança / Nova despesa ────────────────────────
function NewChargeModal({ onClose, onCreated, mode }: {
  onClose: () => void; onCreated: () => void; mode: "charge" | "expense";
}) {
  const [desc, setDesc]     = useState("");
  const [amount, setAmount] = useState("");
  const [due, setDue]       = useState("");
  const [notes, setNotes]   = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");
  const isExpense = mode === "expense";

  const handleSave = async () => {
    if (!desc || !amount || !due) { setErr("Preencha descrição, valor e vencimento."); return; }
    setSaving(true);
    try {
      if (isSupabaseConfigured) {
        const sb = createClient();
        const { data: { user } } = await sb.auth.getUser();
        await sb.from("finance_charges").insert({
          description: desc,
          amount: parseFloat(amount.replace(",", ".")),
          due_date: due,
          notes: notes || null,
          status: "pending",
          created_by: user?.id ?? null,
          organization_id: user?.id ?? null,
        });
      }
      onCreated();
      onClose();
    } catch { setErr("Erro ao salvar."); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-gray-900">
            {isExpense ? "Registrar despesa" : "Nova cobrança"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {isExpense ? "Descrição da despesa" : "Descrição"}
            </label>
            <input value={desc} onChange={(e) => setDesc(e.target.value)}
              placeholder={isExpense ? "Meta Ads — Julho" : "Mensalidade — Plano Agência"}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Valor (R$)</label>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="800,00" type="text"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Vencimento</label>
              <input value={due} onChange={(e) => setDue(e.target.value)} type="date"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Observação (opcional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder={isExpense ? "Canal, campanha, referência…" : "Referente a contrato…"}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 resize-none" />
          </div>
          {err && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{err}</p>}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-indigo-600 text-white text-sm font-bold py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? "Salvando…" : isExpense ? "Registrar" : "Criar cobrança"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Action menu ────────────────────────────────────────────────
function ChargeActions({ charge, onRefresh }: { charge: Charge; onRefresh: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const act = async (newStatus: ChargeStatus) => {
    setOpen(false);
    if (!isSupabaseConfigured) { onRefresh(); return; }
    setBusy(true);
    try {
      const sb = createClient();
      const patch: Record<string, unknown> = { status: newStatus };
      if (newStatus === "paid" || newStatus === "manual_confirmed") patch.paid_at = new Date().toISOString();
      if (newStatus === "pending") patch.paid_at = null;
      await sb.from("finance_charges").update(patch).eq("id", charge.id);
      onRefresh();
    } finally { setBusy(false); }
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} disabled={busy}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreVertical className="w-4 h-4" />}
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-52 text-sm">
          {charge.status !== "paid" && charge.status !== "manual_confirmed" && (
            <button onClick={() => act("manual_confirmed")} className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-50 text-emerald-700">
              <Check className="w-3.5 h-3.5" /> Confirmar pagamento
            </button>
          )}
          {(charge.status === "paid" || charge.status === "manual_confirmed") && (
            <button onClick={() => act("pending")} className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-50 text-blue-700">
              <RotateCcw className="w-3.5 h-3.5" /> Voltar para pendente
            </button>
          )}
          {charge.status === "pending" && (
            <button onClick={() => act("overdue")} className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-50 text-red-600">
              <AlertCircle className="w-3.5 h-3.5" /> Marcar vencida
            </button>
          )}
          {charge.status !== "canceled" && (
            <button onClick={() => act("canceled")} className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-50 text-gray-500">
              <X className="w-3.5 h-3.5" /> Cancelar
            </button>
          )}
          {charge.payment_link && (
            <button onClick={() => { navigator.clipboard.writeText(charge.payment_link!); setOpen(false); }}
              className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-50 text-gray-700">
              <Copy className="w-3.5 h-3.5" /> Copiar link
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Shared: tabela ─────────────────────────────────────────────
function ChargeTable({ charges, loading, filter, showClient, onRefresh, readOnly = false }: {
  charges: Charge[]; loading: boolean; filter: ChargeStatus | "all";
  showClient?: boolean; onRefresh: () => void; readOnly?: boolean;
}) {
  const visible = filter === "all" ? charges : charges.filter((c) => c.status === filter);

  if (loading) return (
    <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
      <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Carregando…</span>
    </div>
  );

  if (visible.length === 0) return (
    <div className="py-16 text-center">
      <DollarSign className="w-8 h-8 text-gray-200 mx-auto mb-2" />
      <p className="text-sm text-gray-400">Nenhum registro encontrado.</p>
    </div>
  );

  return (
    <div className="divide-y divide-gray-50">
      {visible.map((c) => {
        const cfg = STATUS_CONFIG[c.status] ?? { label: c.status, cls: "bg-gray-100 text-gray-500" };
        const isOverdue = c.status === "overdue";
        const daysOverdue = isOverdue ? Math.floor((Date.now() - new Date(c.due_date).getTime()) / 86400000) : 0;
        return (
          <div key={c.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800 truncate">{c.description ?? "—"}</p>
              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                {showClient && c.clients?.company_name}
                {c.gateway_provider && <span className="inline-flex items-center gap-0.5 text-indigo-400"><Zap className="w-2.5 h-2.5" />{c.gateway_provider}</span>}
                {c.payment_link && <span className="inline-flex items-center gap-0.5 text-indigo-500"><Link2 className="w-2.5 h-2.5" />link</span>}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-gray-400">{new Date(c.due_date + "T00:00:00").toLocaleDateString("pt-BR")}</p>
              {isOverdue && <p className="text-[10px] text-red-500">{daysOverdue}d vencido</p>}
            </div>
            <p className="text-sm font-black text-gray-900 flex-shrink-0 w-24 text-right">{formatCurrency(Number(c.amount))}</p>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${cfg.cls}`}>{cfg.label}</span>
            {!readOnly && <ChargeActions charge={c} onRefresh={onRefresh} />}
            {readOnly && c.payment_link && (
              <a href={c.payment_link} target="_blank" rel="noopener noreferrer"
                className="text-[10px] font-bold px-2.5 py-1 bg-indigo-600 text-white rounded-full whitespace-nowrap hover:bg-indigo-700">
                Pagar
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Filter bar ─────────────────────────────────────────────────
function FilterBar({ filter, onChange }: { filter: ChargeStatus | "all"; onChange: (f: ChargeStatus | "all") => void }) {
  return (
    <div className="flex gap-2 mb-4 flex-wrap">
      {(["all", "pending", "paid", "overdue", "manual_confirmed", "canceled"] as const).map((s) => (
        <button key={s} onClick={() => onChange(s)}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
            filter === s ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-gray-500 hover:border-indigo-300"
          }`}>
          {s === "all" ? "Todas" : STATUS_CONFIG[s]?.label ?? s}
        </button>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// VIEW: Agência / Lokat
// ══════════════════════════════════════════════════════════════
function AgencyView({ accountType }: { accountType: AccountType }) {
  const [charges, setCharges]     = useState<Charge[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showNew, setShowNew]     = useState(false);
  const [filter, setFilter]       = useState<ChargeStatus | "all">("all");
  const [gatewayOk, setGatewayOk] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (!isSupabaseConfigured) { setCharges(MOCK_CHARGES); return; }
      const sb = createClient();
      const { data } = await sb
        .from("finance_charges")
        .select("*, clients(company_name)")
        .order("due_date", { ascending: false })
        .limit(100);
      setCharges((data as Charge[]) ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    fetch("/api/payments/gateway/status")
      .then((r) => r.json())
      .then((d: { configured: boolean }) => setGatewayOk(d.configured))
      .catch(() => setGatewayOk(false));
  }, [load]);

  const paid    = charges.filter((c) => c.status === "paid" || c.status === "manual_confirmed");
  const pending = charges.filter((c) => c.status === "pending");
  const overdue = charges.filter((c) => c.status === "overdue");
  const sumOf   = (arr: Charge[]) => arr.reduce((s, c) => s + Number(c.amount), 0);
  const mrr     = charges.filter((c) => {
    if (c.status !== "paid" && c.status !== "manual_confirmed") return false;
    const d = new Date(c.paid_at ?? c.due_date); const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).reduce((s, c) => s + Number(c.amount), 0);

  return (
    <div>
      <PageHeader
        title="FinanceOS"
        description={accountType === "lokat" ? "Cobranças, MRR e inadimplência dos clientes da Lokat" : "Cobranças, recebimentos e inadimplência dos seus clientes"}
      >
        {gatewayOk === false && (
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> Gateway não configurado
          </span>
        )}
        {gatewayOk === true && (
          <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Asaas ativo
          </span>
        )}
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> Nova cobrança
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Recebido",  value: formatCurrency(sumOf(paid)),    Icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", alert: false },
          { label: "A receber", value: formatCurrency(sumOf(pending)), Icon: Clock,        color: "text-blue-600",   bg: "bg-blue-50",    alert: false },
          { label: "Vencido",   value: formatCurrency(sumOf(overdue)), Icon: AlertCircle,  color: "text-red-600",    bg: "bg-red-50",     alert: overdue.length > 0 },
          { label: "MRR mês",   value: formatCurrency(mrr),            Icon: TrendingUp,   color: "text-indigo-600", bg: "bg-indigo-50",  alert: false },
          { label: "Cobranças", value: String(charges.length),         Icon: DollarSign,   color: "text-gray-600",   bg: "bg-gray-100",   alert: false },
        ].map(({ label, value, Icon, color, bg, alert }) => (
          <div key={label} className={`bg-white rounded-2xl border ${alert ? "border-red-200" : "border-gray-100"} p-4`}>
            <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center mb-2`}>
              <Icon className={`w-4 h-4 ${color}`} strokeWidth={1.5} />
            </div>
            <p className="text-[11px] text-gray-400 mb-0.5">{label}</p>
            <p className={`text-lg font-black ${alert ? "text-red-600" : "text-gray-900"}`}>{value}</p>
          </div>
        ))}
      </div>

      <FilterBar filter={filter} onChange={setFilter} />

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-bold text-gray-800">Cobranças</h2>
          <span className="text-xs text-gray-400">
            {(filter === "all" ? charges : charges.filter((c) => c.status === filter)).length} registros
          </span>
        </div>
        <ChargeTable charges={charges} loading={loading} filter={filter} showClient onRefresh={load} />
      </div>

      {showNew && <NewChargeModal mode="charge" onClose={() => setShowNew(false)} onCreated={load} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// VIEW: Empresa / Autônomo — custos de marketing
// ══════════════════════════════════════════════════════════════
function EmpresaView() {
  const [expenses, setExpenses]       = useState<Charge[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showNew, setShowNew]         = useState(false);
  const [filter, setFilter]           = useState<ChargeStatus | "all">("all");
  const [showCharges, setShowCharges] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (!isSupabaseConfigured) { setExpenses(MOCK_EXPENSES); return; }
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      const { data } = await sb
        .from("finance_charges")
        .select("*")
        .eq("organization_id", user?.id ?? "")
        .is("client_id", null)
        .order("due_date", { ascending: false })
        .limit(100);
      setExpenses((data as Charge[]) ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalPaid = expenses.filter((e) => e.status === "paid" || e.status === "manual_confirmed").reduce((s, e) => s + Number(e.amount), 0);
  const totalPend = expenses.filter((e) => e.status === "pending").reduce((s, e) => s + Number(e.amount), 0);
  const totalOver = expenses.filter((e) => e.status === "overdue").reduce((s, e) => s + Number(e.amount), 0);
  const totalMonth = expenses.filter((e) => {
    const d = new Date(e.due_date); const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div>
      <PageHeader title="FinanceOS" description="Custos de marketing, investimentos e despesas da sua marca">
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> Registrar despesa
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "No mês",   value: formatCurrency(totalMonth), Icon: ShoppingCart, color: "text-purple-600",  bg: "bg-purple-50" },
          { label: "Pago",     value: formatCurrency(totalPaid),  Icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "A pagar",  value: formatCurrency(totalPend),  Icon: Clock,        color: "text-blue-600",    bg: "bg-blue-50" },
          { label: "Em atraso",value: formatCurrency(totalOver),  Icon: AlertCircle,  color: "text-red-600",     bg: "bg-red-50",  alert: totalOver > 0 },
        ].map(({ label, value, Icon, color, bg, alert }) => (
          <div key={label} className={`bg-white rounded-2xl border ${alert ? "border-red-200" : "border-gray-100"} p-4`}>
            <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center mb-2`}>
              <Icon className={`w-4 h-4 ${color}`} strokeWidth={1.5} />
            </div>
            <p className="text-[11px] text-gray-400 mb-0.5">{label}</p>
            <p className={`text-lg font-black ${alert ? "text-red-600" : "text-gray-900"}`}>{value}</p>
          </div>
        ))}
      </div>

      {!showCharges && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Receipt className="w-4 h-4 text-indigo-600" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">Cobrar clientes?</p>
              <p className="text-xs text-gray-400 mt-0.5">Ative se você presta serviços e quer emitir cobranças para terceiros.</p>
            </div>
          </div>
          <button onClick={() => setShowCharges(true)}
            className="text-xs font-bold text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 whitespace-nowrap flex-shrink-0">
            Ativar cobranças
          </button>
        </div>
      )}

      <FilterBar filter={filter} onChange={setFilter} />

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-bold text-gray-800">Despesas e investimentos</h2>
          <span className="text-xs text-gray-400">
            {(filter === "all" ? expenses : expenses.filter((c) => c.status === filter)).length} registros
          </span>
        </div>
        <ChargeTable charges={expenses} loading={loading} filter={filter} onRefresh={load} />
      </div>

      {showNew && <NewChargeModal mode="expense" onClose={() => setShowNew(false)} onCreated={load} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// VIEW: Cliente convidado — cobranças próprias (read-only)
// ══════════════════════════════════════════════════════════════
function ClienteView() {
  const [charges, setCharges] = useState<Charge[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<ChargeStatus | "all">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (!isSupabaseConfigured) { setCharges(MOCK_CLIENT_CHARGES); return; }
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      const { data: client } = await sb.from("clients").select("id").eq("owner_id", user.id).maybeSingle();
      if (!client) { setCharges([]); return; }
      const { data } = await sb
        .from("finance_charges")
        .select("*")
        .eq("client_id", client.id)
        .order("due_date", { ascending: false })
        .limit(50);
      setCharges((data as Charge[]) ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const paid    = charges.filter((c) => c.status === "paid" || c.status === "manual_confirmed");
  const pending = charges.filter((c) => c.status === "pending");
  const overdue = charges.filter((c) => c.status === "overdue");

  return (
    <div>
      <PageHeader title="Minhas cobranças" description="Vencimentos, status e links de pagamento" />

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Pagas",     value: paid.length,    Icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Pendentes", value: pending.length, Icon: Clock,        color: "text-blue-600",   bg: "bg-blue-50" },
          { label: "Vencidas",  value: overdue.length, Icon: AlertCircle,  color: "text-red-600",    bg: "bg-red-50",  alert: overdue.length > 0 },
        ].map(({ label, value, Icon, color, bg, alert }) => (
          <div key={label} className={`bg-white rounded-2xl border ${alert ? "border-red-200" : "border-gray-100"} p-4`}>
            <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center mb-2`}>
              <Icon className={`w-4 h-4 ${color}`} strokeWidth={1.5} />
            </div>
            <p className="text-[11px] text-gray-400 mb-0.5">{label}</p>
            <p className={`text-xl font-black ${alert ? "text-red-600" : "text-gray-900"}`}>{value}</p>
          </div>
        ))}
      </div>

      <FilterBar filter={filter} onChange={setFilter} />

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-bold text-gray-800">Cobranças</h2>
        </div>
        <ChargeTable charges={charges} loading={loading} filter={filter} onRefresh={load} readOnly />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN — detecta account_type e renderiza a view correta
// ══════════════════════════════════════════════════════════════
export default function FinanceiroPagamentosPage() {
  const [accountType, setAccountType] = useState<AccountType>("nao_definido");
  const [resolving, setResolving]     = useState(true);

  useEffect(() => {
    const cached = typeof window !== "undefined"
      ? (sessionStorage.getItem("lokat_account_type") as AccountType | null)
      : null;

    if (cached && cached !== "nao_definido") {
      setAccountType(cached);
      setResolving(false);
      return;
    }

    if (!isSupabaseConfigured) {
      setAccountType("agencia");
      setResolving(false);
      return;
    }

    (async () => {
      try {
        const sb = createClient();
        const { data: { user } } = await sb.auth.getUser();
        if (!user) { setResolving(false); return; }
        const { data } = await sb
          .from("profiles")
          .select("account_type, role")
          .eq("id", user.id)
          .maybeSingle();
        if (data) {
          if (data.role === "lokat") setAccountType("lokat");
          else if (data.account_type) setAccountType(data.account_type as AccountType);
        }
      } catch { /* mantém nao_definido */ }
      finally { setResolving(false); }
    })();
  }, []);

  if (resolving) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
    </div>
  );

  if (accountType === "cliente_atendido") return <ClienteView />;
  if (accountType === "empresa")           return <EmpresaView />;
  return <AgencyView accountType={accountType} />;
}
