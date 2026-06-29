"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Plus, Search, X, AtSign, CheckCircle2, AlertCircle, Clock,
  Edit2, Trash2, Loader2, Building2, User, Tag, Filter,
  Mail, Copy, ExternalLink, TrendingUp,
} from "lucide-react";
import { getClientLimitByPlan } from "@/lib/account-permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isClientVisible } from "@/lib/client-visibility";

// ── Modal Novo Cliente ─────────────────────────────────────────
interface NewClientForm {
  company_name: string;
  responsible_name: string;
  email: string;
  phone: string;
  segment: string;
  status: string;
}

const SEGMENTS = [
  "Restaurante", "Delivery", "Construção", "Materiais de construção",
  "Clínica", "Odontologia", "Serviços", "Varejo", "Agência",
  "Tecnologia", "Educação", "Beleza", "Fitness", "Outro",
];

const NEW_CLIENT_SEGMENTS = [
  "Restaurante",
  "Delivery",
  "Restaurante + Delivery",
  "Academia",
  "Loja local",
  "Material de construcao",
  "Clinica / Estetica",
  "Mercado / Conveniencia",
  "Prestador de servico",
  "Outro",
];

function NewClientModal({ onSave, onCancel, loading }: {
  onSave: (data: NewClientForm) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<NewClientForm>({
    company_name: "", responsible_name: "", email: "",
    phone: "", segment: "", status: "onboarding",
  });
  const valid = form.company_name.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
            <Plus className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-sm font-bold text-gray-900">Novo cliente</p>
        </div>
        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Nome da empresa <span className="text-red-500">*</span></label>
            <input
              value={form.company_name}
              onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
              placeholder="Nome da empresa"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Responsável</label>
            <input
              value={form.responsible_name}
              onChange={(e) => setForm((f) => ({ ...f, responsible_name: e.target.value }))}
              placeholder="Nome do dono ou responsável"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="email@empresa.com"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">WhatsApp</label>
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="(00) 00000-0000"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Segmento / Nicho</label>
            <select
              value={form.segment}
              onChange={(e) => setForm((f) => ({ ...f, segment: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white outline-none focus:border-indigo-400"
            >
              <option value="">Selecione...</option>
              {NEW_CLIENT_SEGMENTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Status inicial</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white outline-none focus:border-indigo-400"
            >
              <option value="onboarding">Onboarding</option>
              <option value="active">Ativo</option>
            </select>
          </div>
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-[11px] text-indigo-700">
            Depois de criar o cliente, use o botao de convite no card para gerar o link de acesso.
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} disabled={loading} className="flex-1 py-2.5 border border-gray-200 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={() => onSave(form)} disabled={!valid || loading} className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Criar cliente
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tipos ──────────────────────────────────────────────────────
interface Client {
  id: string;
  company_name: string | null;
  responsible_name: string | null;
  email: string | null;
  phone: string | null;
  segment: string | null;
  status: string | null;
  has_meta?: boolean;
  has_instagram?: boolean;
  has_diagnostico?: boolean;
  has_brief?: boolean;
}

interface CreateClientApiError {
  error?: string;
  code?: string;
  supabaseError?: {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
  } | null;
}

type StatusFilter = "todos" | "operacionais" | "onboarding";

// ── Badges ─────────────────────────────────────────────────────
function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${color}`}>
      {label}
    </span>
  );
}

function ClientBadges({ c }: { c: Client }) {
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {c.status === "active"     && <Badge label="Ativo"      color="text-emerald-700 bg-emerald-50" />}
      {c.status === "onboarding" && <Badge label="Onboarding" color="text-blue-700 bg-blue-50" />}
      {c.has_meta                && <Badge label="Meta"       color="text-indigo-700 bg-indigo-50" />}
      {c.has_instagram           && <Badge label="Instagram"  color="text-pink-700 bg-pink-50" />}
      {c.has_diagnostico         && <Badge label="Diagnóstico ok" color="text-violet-700 bg-violet-50" />}
      {!c.has_brief              && <Badge label="Brief pendente" color="text-amber-700 bg-amber-50" />}
    </div>
  );
}

// ── Modal Convite ─────────────────────────────────────────────
function InviteModal({ client, onClose }: { client: Client; onClose: () => void }) {
  const [email,   setEmail]   = useState(client.email ?? "");
  const [loading, setLoading] = useState(false);
  const [link,    setLink]    = useState<string | null>(null);
  const [error,   setError]   = useState("");
  const [warning, setWarning] = useState("");
  const [copied,  setCopied]  = useState(false);

  async function handleGenerate() {
    if (!email.trim()) { setError("Informe o e-mail do cliente."); return; }
    setLoading(true); setError(""); setWarning("");
    try {
      const res = await fetch(`/api/admin/clients/${client.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.ok) {
        const data = await res.json() as { link: string; warning?: string };
        setLink(data.link);
        setWarning(data.warning ?? "");
      } else {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setError(err.error ?? "Erro ao gerar convite.");
      }
    } catch { setError("Erro de conexão."); }
    finally { setLoading(false); }
  }

  function handleCopy() {
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
            <Mail className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Convidar cliente</p>
            <p className="text-xs text-gray-400 truncate max-w-[220px]">{client.company_name}</p>
          </div>
        </div>

        {!link ? (
          <>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1">E-mail do cliente</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@empresa.com"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
              <p className="text-[11px] text-gray-400 mt-1">O cliente usará este e-mail para criar a senha de acesso.</p>
            </div>
            {error && (
              <p className="text-xs text-red-600 mb-3 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {error}
              </p>
            )}
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleGenerate} disabled={loading} className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Gerar link
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
              {warning && <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 mb-2">{warning}</p>}
              <p className="text-xs font-semibold text-emerald-700 mb-2">Link de convite gerado!</p>
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                <span className="text-xs text-gray-600 flex-1 truncate">{link}</span>
                <button onClick={handleCopy} title="Copiar" className="text-gray-400 hover:text-indigo-600">
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
                <a href={link} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-indigo-600">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">Válido por 7 dias. Envie este link para {email}.</p>
            </div>
            <button onClick={onClose} className="w-full py-2.5 bg-gray-100 text-sm font-medium text-gray-700 rounded-xl hover:bg-gray-200 transition-colors">
              Fechar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Modal Excluir ──────────────────────────────────────────────
function DeleteModal({
  client, onConfirm, onCancel, loading,
}: {
  client: Client; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  const [checked, setChecked] = useState(false);
  const name = client.company_name ?? "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Excluir cliente?</p>
            <p className="text-xs text-gray-400 truncate max-w-[220px]">{name}</p>
          </div>
        </div>
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl mb-4 text-xs text-red-700 leading-relaxed">
          Apagar cliente? Ele deixara de aparecer nos modulos da plataforma.
        </div>
        <label className="flex items-start gap-3 mb-5 cursor-pointer group">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-red-600 cursor-pointer flex-shrink-0"
          />
          <span className="text-xs text-gray-700 leading-relaxed group-hover:text-gray-900 transition-colors">
            Entendo que este cliente deixara de aparecer nos modulos da plataforma.
          </span>
        </label>
        <div className="flex gap-2">
          <button onClick={onCancel} disabled={loading} className="flex-1 py-2.5 border border-gray-200 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={!checked || loading} className="flex-1 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Apagar cliente
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Editar ───────────────────────────────────────────────
function EditModal({
  client, onSave, onCancel, loading,
}: {
  client: Client; onSave: (data: Partial<Client>) => void; onCancel: () => void; loading: boolean;
}) {
  const [form, setForm] = useState({
    company_name:     client.company_name     ?? "",
    responsible_name: client.responsible_name ?? "",
    email:            client.email            ?? "",
    phone:            client.phone            ?? "",
    segment:          client.segment          ?? "",
    status:           client.status           ?? "active",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
            <Edit2 className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-sm font-bold text-gray-900">Editar cliente</p>
        </div>
        <div className="space-y-3 mb-5">
          {([
            ["company_name",     "Nome da empresa"],
            ["responsible_name", "Responsável"],
            ["email",            "E-mail"],
            ["phone",            "Telefone"],
            ["segment",          "Segmento"],
          ] as [keyof typeof form, string][]).map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-700 mb-1">{label}</label>
              <input
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white outline-none focus:border-indigo-400"
            >
              <option value="active">Ativo</option>
              <option value="onboarding">Onboarding</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} disabled={loading} className="flex-1 py-2.5 border border-gray-200 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={() => onSave(form)} disabled={loading} className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Card de cliente ────────────────────────────────────────────
function ClientCard({ c, onEdit, onDelete, onInvite, isAdmin }: { c: Client; onEdit: (c: Client) => void; onDelete: (c: Client) => void; onInvite: (c: Client) => void; isAdmin: boolean }) {
  const initials = (c.company_name ?? c.responsible_name ?? "?")
    .split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-indigo-700">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{c.company_name ?? "Sem nome"}</p>
          <p className="text-xs text-gray-400 truncate">{c.segment ?? "Sem segmento"}</p>
          <ClientBadges c={c} />
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => onInvite(c)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Convidar cliente">
            <Mail className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onEdit(c)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Editar">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          {isAdmin && (
            <button onClick={() => onDelete(c)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Excluir">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="space-y-1.5 text-xs">
        {c.responsible_name && (
          <div className="flex items-center gap-1.5 text-gray-500">
            <User className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{c.responsible_name}</span>
          </div>
        )}
        {c.email && (
          <div className="flex items-center gap-1.5 text-gray-400">
            <Tag className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{c.email}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Indicador de uso do plano ─────────────────────────────────
function PlanUsageBar({ plan, clientCount, isAdmin }: { plan: string | null; clientCount: number; isAdmin: boolean }) {
  if (isAdmin || plan === null) return null;
  const limit = getClientLimitByPlan(plan);
  const pct   = Math.min(100, Math.round((clientCount / limit) * 100));
  const near  = pct >= 80;
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${near ? "bg-amber-50 border-amber-100" : "bg-gray-50 border-gray-100"}`}>
      <TrendingUp className={`w-4 h-4 flex-shrink-0 ${near ? "text-amber-500" : "text-gray-400"}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-700">
            {clientCount} de {isFinite(limit) ? limit : "∞"} clientes
          </span>
          <span className={`text-[10px] font-bold ${near ? "text-amber-600" : "text-gray-400"}`}>
            {isFinite(limit) ? `${pct}%` : "Ilimitado"}
          </span>
        </div>
        {isFinite(limit) && (
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${near ? "bg-amber-500" : "bg-indigo-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
      {near && <span className="text-[10px] font-bold text-amber-600 flex-shrink-0">Limite próximo</span>}
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────
export default function AdminClientesPage() {
  const [clients,       setClients]       = useState<Client[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [isAdmin,       setIsAdmin]       = useState(false);
  const [userPlan,      setUserPlan]      = useState<string | null>(null);
  const [actionMsg,     setActionMsg]     = useState<string | null>(null);
  const [search,        setSearch]        = useState("");
  const [statusFilter,  setStatusFilter]  = useState<StatusFilter>("todos");
  const [segFilter,     setSegFilter]     = useState("");
  const [metaFilter,    setMetaFilter]    = useState<"todos" | "connected" | "not_connected">("todos");
  const [diagFilter,    setDiagFilter]    = useState<"todos" | "ok" | "pending">("todos");
  const [showFilters,   setShowFilters]   = useState(false);
  const [editingClient,  setEditingClient]  = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [creatingClient, setCreatingClient] = useState(false);
  const [invitingClient, setInvitingClient] = useState<Client | null>(null);
  const [actionLoading,  setActionLoading]  = useState(false);

  const fetchClients = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    try {
      const res = await fetch("/api/admin/clients");
      if (res.ok) {
        const data = await res.json() as { clients: Client[]; isAdmin: boolean; plan?: string };
        setClients(data.clients.filter((client) => isClientVisible(client.status)));
        setIsAdmin(data.isAdmin);
        if (data.plan) setUserPlan(data.plan);
      }
    } catch { /* estado vazio */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchClients(); }, [fetchClients]);

  const segments = useMemo(() => {
    const set = new Set(clients.map((c) => c.segment).filter(Boolean));
    return [...set].sort() as string[];
  }, [clients]);

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (!isClientVisible(c.status)) return false;
      if (statusFilter === "operacionais" && !isClientVisible(c.status)) return false;
      if (statusFilter === "onboarding" && c.status !== "onboarding") return false;
      if (segFilter && c.segment !== segFilter) return false;
      if (metaFilter === "connected"     && !c.has_meta) return false;
      if (metaFilter === "not_connected" && c.has_meta)  return false;
      if (diagFilter === "ok"      && !c.has_diagnostico) return false;
      if (diagFilter === "pending" && c.has_diagnostico)  return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        (c.company_name ?? "").toLowerCase().includes(q) ||
        (c.responsible_name ?? "").toLowerCase().includes(q) ||
        (c.segment ?? "").toLowerCase().includes(q)
      );
    });
  }, [clients, search, statusFilter, segFilter, metaFilter, diagFilter]);

  const flash = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 3000);
  };

  const handleCreateClient = async (data: NewClientForm) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const created = await res.json() as Client;
        setClients((prev) => [created, ...prev]);
        flash(`Cliente "${created.company_name}" criado com sucesso.`);
        setCreatingClient(false);
      } else {
        const err = await res.json().catch(() => ({})) as CreateClientApiError;
        let message = err.error ?? "Erro ao criar cliente.";
        if (err.code === "MISSING_SERVICE_ROLE" || err.code === "missing_service_role") {
          message = "Configuracao do servidor ausente. Verifique SUPABASE_SERVICE_ROLE_KEY na Vercel.";
        } else if (err.code === "CLIENT_INSERT_FAILED") {
          message = "Nao foi possivel criar o cliente. Verifique os campos obrigatorios ou o schema da tabela clients.";
        }
        if (err.supabaseError?.message) {
          message += ` Detalhe tecnico: ${err.supabaseError.message}`;
        }
        flash(message);
      }
    } catch { flash("Erro de conexão."); }
    finally { setActionLoading(false); }
  };

  const handleSaveEdit = async (data: Partial<Client>) => {
    if (!editingClient) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/clients/${editingClient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setClients((prev) => prev.map((c) => c.id === editingClient.id ? { ...c, ...data } : c));
        flash("Cliente atualizado com sucesso.");
      } else { flash("Erro ao salvar. Tente novamente."); }
    } catch { flash("Erro de conexão."); }
    finally { setActionLoading(false); setEditingClient(null); }
  };

  const handleDelete = async () => {
    if (!deletingClient) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/clients/${deletingClient.id}`, { method: "DELETE" });
      if (res.ok) {
        setClients((prev) => prev.filter((c) => c.id !== deletingClient.id));
        flash("Cliente excluído.");
      } else { flash("Erro ao excluir. Verifique as permissões."); }
    } catch { flash("Erro de conexão."); }
    finally { setActionLoading(false); setDeletingClient(null); }
  };

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: "todos",         label: "Todos" },
    { value: "operacionais",  label: "Ativos" },
    { value: "onboarding",    label: "Onboarding" },
  ];

  return (
    <div>
      <PageHeader title="Clientes" description={loading ? "Carregando..." : `${filtered.length} de ${clients.length} clientes`}>
        <button
          onClick={() => setCreatingClient(true)}
          className="flex items-center gap-2 text-sm font-medium text-white bg-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo cliente
        </button>
      </PageHeader>

      {actionMsg && (
        <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-700">
          {actionMsg}
        </div>
      )}

      <div className="mb-5 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, responsável ou segmento..."
              className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-indigo-300"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border rounded-xl transition-colors ${
              showFilters ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Filter className="w-4 h-4" /> Filtros
          </button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                statusFilter === opt.value
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {opt.label}
              {opt.value !== "todos" && (
                <span className="ml-1 opacity-70">
                  ({opt.value === "operacionais"
                    ? clients.filter((c) => ["active", "onboarding"].includes(c.status ?? "")).length
                    : clients.filter((c) => c.status === opt.value).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {showFilters && (
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Segmento</label>
              <select value={segFilter} onChange={(e) => setSegFilter(e.target.value)} className="w-full border border-gray-200 bg-white rounded-xl px-3 py-2 text-sm outline-none">
                <option value="">Todos os segmentos</option>
                {segments.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                <AtSign className="inline w-3 h-3 mr-1" />Meta
              </label>
              <select value={metaFilter} onChange={(e) => setMetaFilter(e.target.value as typeof metaFilter)} className="w-full border border-gray-200 bg-white rounded-xl px-3 py-2 text-sm outline-none">
                <option value="todos">Todos</option>
                <option value="connected">Meta conectado</option>
                <option value="not_connected">Sem Meta</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Diagnóstico</label>
              <select value={diagFilter} onChange={(e) => setDiagFilter(e.target.value as typeof diagFilter)} className="w-full border border-gray-200 bg-white rounded-xl px-3 py-2 text-sm outline-none">
                <option value="todos">Todos</option>
                <option value="ok">Diagnóstico ok</option>
                <option value="pending">Pendente</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-12 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" /> Carregando clientes...
        </div>
      )}
      {!loading && !isSupabaseConfigured && (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
          <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-600 mb-1">Banco de dados não configurado</p>
          <p className="text-xs text-gray-400">Configure o Supabase para gerenciar clientes reais.</p>
        </div>
      )}
      {!loading && isSupabaseConfigured && clients.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
          <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-600 mb-1">Nenhum cliente cadastrado</p>
          <p className="text-xs text-gray-400">Adicione o primeiro cliente para começar.</p>
        </div>
      )}
      {!loading && isSupabaseConfigured && clients.length > 0 && filtered.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
          <AlertCircle className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Nenhum cliente encontrado com os filtros selecionados.</p>
          <button onClick={() => { setSearch(""); setStatusFilter("todos"); setSegFilter(""); setMetaFilter("todos"); setDiagFilter("todos"); }} className="mt-2 text-xs text-indigo-600 hover:underline">
            Limpar filtros
          </button>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <ClientCard key={c.id} c={c} isAdmin={isAdmin} onEdit={setEditingClient} onDelete={setDeletingClient} onInvite={setInvitingClient} />
          ))}
        </div>
      )}

      {!loading && clients.length > 0 && (
        <div className="mt-6 space-y-3">
          <PlanUsageBar plan={userPlan} clientCount={clients.length} isAdmin={isAdmin} />
          <div className="flex items-center gap-4 text-[11px] text-gray-400">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> {clients.filter((c) => c.has_meta).length} com Meta</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-violet-400" /> {clients.filter((c) => c.has_diagnostico).length} com diagnóstico</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-amber-400" /> {clients.filter((c) => !c.has_brief).length} sem brief</span>
          </div>
        </div>
      )}

      {creatingClient && <NewClientModal onSave={handleCreateClient} onCancel={() => setCreatingClient(false)} loading={actionLoading} />}
      {invitingClient && <InviteModal client={invitingClient} onClose={() => setInvitingClient(null)} />}
      {editingClient  && <EditModal  client={editingClient}  onSave={handleSaveEdit} onCancel={() => setEditingClient(null)}  loading={actionLoading} />}
      {deletingClient && <DeleteModal client={deletingClient} onConfirm={handleDelete} onCancel={() => setDeletingClient(null)} loading={actionLoading} />}
    </div>
  );
}
