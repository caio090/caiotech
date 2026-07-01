"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Plus, Search, X, AtSign, CheckCircle2, AlertCircle, Clock,
  Edit2, Trash2, Loader2, Building2, User, Tag, Filter,
  Mail, Copy, ExternalLink, TrendingUp, Archive, CheckSquare, RotateCcw,
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
  "Academia",
  "Restaurante",
  "Delivery",
  "Restaurante + Delivery",
  "Loja local",
  "Material de construção",
  "Clínica / Estética",
  "Mercado / Conveniência",
  "Prestador de serviço",
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

type DeleteMode = "archive" | "hard";

interface DeleteModalState {
  mode: DeleteMode;
  clients: Client[];
}

interface CleanupCandidate extends Client {
  deleted_at: string | null;
  archived_at: string | null;
  created_at: string | null;
  reason: string | null;
}

interface CreateClientApiError {
  error?: string;
  code?: string;
  step?: string;
  supabaseMessage?: string | null;
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
  state, onConfirm, onCancel, loading,
}: {
  state: DeleteModalState; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  const [checked, setChecked] = useState(false);
  const [typed, setTyped] = useState("");
  const firstName = state.clients[0]?.company_name ?? "";
  const isHard = state.mode === "hard";
  const isBulk = state.clients.length > 1;
  const validHard = typed.trim() === "APAGAR" || (!isBulk && typed.trim() === firstName);
  const canConfirm = isHard ? validHard : checked;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isHard ? "bg-red-50" : "bg-amber-50"}`}>
            {isHard ? <Trash2 className="w-5 h-5 text-red-500" /> : <Archive className="w-5 h-5 text-amber-500" />}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{isHard ? "Apagar definitivamente?" : "Arquivar cliente?"}</p>
            <p className="text-xs text-gray-400 truncate max-w-[220px]">
              {isBulk ? `${state.clients.length} clientes selecionados` : firstName}
            </p>
          </div>
        </div>
        <div className={`p-3 rounded-xl mb-4 text-xs leading-relaxed ${isHard ? "bg-red-50 border border-red-100 text-red-700" : "bg-amber-50 border border-amber-100 text-amber-700"}`}>
          {isHard
            ? "Isso remove o cliente e vínculos relacionados do banco. Essa ação não deve ser usada em cliente real sem backup."
            : "Ele sairá das listas e seletores, mas os dados ficam preservados."}
        </div>
        {isHard ? (
          <div className="mb-5">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Digite {isBulk ? "APAGAR" : `o nome "${firstName}" ou APAGAR`} para confirmar
            </label>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-red-400"
            />
          </div>
        ) : (
          <label className="flex items-start gap-3 mb-5 cursor-pointer group">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-amber-600 cursor-pointer flex-shrink-0"
            />
            <span className="text-xs text-gray-700 leading-relaxed group-hover:text-gray-900 transition-colors">
              Entendo que estes clientes sairão das listas e seletores.
            </span>
          </label>
        )}
        <div className="flex gap-2">
          <button onClick={onCancel} disabled={loading} className="flex-1 py-2.5 border border-gray-200 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={!canConfirm || loading} className={`flex-1 py-2.5 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${isHard ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}`}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isHard ? "Apagar definitivamente" : "Arquivar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Lixeira ──────────────────────────────────────────────
interface TrashItem {
  id: string;
  company_name: string | null;
  responsible_name: string | null;
  email: string | null;
  segment: string | null;
  status: string | null;
  deleted_at: string | null;
  archived_at: string | null;
}

function TrashModal({
  items,
  loading,
  canHardDelete,
  onRestore,
  onHardDelete,
  onRefresh,
  onCancel,
}: {
  items: TrashItem[];
  loading: boolean;
  canHardDelete: boolean;
  onRestore: (item: TrashItem) => void;
  onHardDelete: (item: TrashItem) => void;
  onRefresh: () => void;
  onCancel: () => void;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleHardDelete = (item: TrashItem) => {
    setConfirmId((prev) => prev === item.id ? null : item.id);
  };

  const fmtDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-3xl w-full shadow-2xl max-h-[88vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-sm font-bold text-gray-900">Lixeira / Arquivados</p>
            <p className="text-xs text-gray-400 mt-1">Clientes ocultos das listas. Restaure ou apague definitivamente.</p>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button onClick={onRefresh} disabled={loading} className="px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            {loading ? "Carregando..." : "Atualizar"}
          </button>
          <span className="text-xs text-gray-400">{items.length} {items.length === 1 ? "cliente" : "clientes"}</span>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando lixeira...
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
            Nenhum cliente arquivado ou deletado.
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl border border-gray-100 p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.company_name ?? "Sem nome"}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {item.responsible_name ?? "—"} · {item.email ?? "Sem e-mail"}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {item.segment ?? "Sem segmento"} ·{" "}
                      <span className="text-amber-600 font-medium">{item.status ?? "sem status"}</span>
                      {item.archived_at && ` · Arquivado em ${fmtDate(item.archived_at)}`}
                      {!item.archived_at && item.deleted_at && ` · Deletado em ${fmtDate(item.deleted_at)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => onRestore(item)}
                      disabled={loading}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                    </button>
                    {canHardDelete && (
                      <button
                        onClick={() => handleHardDelete(item)}
                        disabled={loading}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-40 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Apagar
                      </button>
                    )}
                  </div>
                </div>
                {confirmId === item.id && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-xl space-y-2">
                    <p className="text-xs text-red-700 font-medium">Esta ação é irreversível. O cliente e seus vínculos serão apagados definitivamente.</p>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        id={`confirm-trash-${item.id}`}
                        className="mt-0.5 w-4 h-4 accent-red-600 flex-shrink-0 cursor-pointer"
                        onChange={(e) => {
                          if (e.target.checked) {
                            onHardDelete(item);
                            setConfirmId(null);
                          }
                        }}
                      />
                      <span className="text-xs text-red-800">Confirmo que quero apagar este cliente definitivamente.</span>
                    </label>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="text-[11px] text-gray-400 hover:text-gray-600"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Modal Editar ───────────────────────────────────────────────
function CleanupModal({
  candidates,
  selectedIds,
  loading,
  canHardDelete,
  onToggle,
  onRefresh,
  onArchive,
  onHardDelete,
  onCancel,
}: {
  candidates: CleanupCandidate[];
  selectedIds: Set<string>;
  loading: boolean;
  canHardDelete: boolean;
  onToggle: (id: string) => void;
  onRefresh: () => void;
  onArchive: () => void;
  onHardDelete: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-3xl w-full shadow-2xl max-h-[88vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-sm font-bold text-gray-900">Limpeza de clientes</p>
            <p className="text-xs text-gray-400 mt-1">Revise os candidatos antes de arquivar ou apagar. Nenhum cliente é selecionado automaticamente.</p>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button onClick={onRefresh} disabled={loading} className="px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            {loading ? "Carregando..." : "Atualizar relatório"}
          </button>
          <span className="text-xs text-gray-400">{selectedIds.size} selecionados</span>
          <button onClick={onArchive} disabled={selectedIds.size === 0 || loading} className="px-3 py-2 text-xs font-semibold rounded-xl bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40">
            Arquivar selecionados
          </button>
          {canHardDelete && (
            <button onClick={onHardDelete} disabled={selectedIds.size === 0 || loading} className="px-3 py-2 text-xs font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-40">
              Apagar definitivamente
            </button>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando candidatos...
          </div>
        )}

        {!loading && candidates.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
            Nenhum candidato retornado pela limpeza.
          </div>
        )}

        {!loading && candidates.length > 0 && (
          <div className="space-y-2">
            {candidates.map((candidate) => (
              <label key={candidate.id} className="flex items-start gap-3 rounded-xl border border-gray-100 p-3 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.has(candidate.id)}
                  onChange={() => onToggle(candidate.id)}
                  className="mt-1 w-4 h-4 accent-indigo-600"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{candidate.company_name ?? "Sem nome"}</p>
                  <p className="text-xs text-gray-400 truncate">{candidate.email ?? "Sem e-mail"} · {candidate.status ?? "sem status"}</p>
                  <p className="text-xs text-amber-700 mt-1">{candidate.reason ?? "Revisar manualmente"}</p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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
function ClientCard({
  c,
  onEdit,
  onArchive,
  onHardDelete,
  onInvite,
  isAdmin,
  canHardDelete,
  selectionMode,
  selected,
  isDuplicate,
  onToggleSelect,
}: {
  c: Client;
  onEdit: (c: Client) => void;
  onArchive: (c: Client) => void;
  onHardDelete: (c: Client) => void;
  onInvite: (c: Client) => void;
  isAdmin: boolean;
  canHardDelete: boolean;
  selectionMode: boolean;
  selected: boolean;
  isDuplicate?: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const initials = (c.company_name ?? c.responsible_name ?? "?")
    .split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

  return (
    <div className={`bg-white rounded-2xl border p-5 hover:shadow-sm transition-shadow ${selected ? "border-indigo-300 ring-2 ring-indigo-100" : isDuplicate ? "border-amber-200" : "border-gray-100"}`}>
      <div className="flex items-start gap-3 mb-3">
        {selectionMode && (
          <button
            type="button"
            onClick={() => onToggleSelect(c.id)}
            aria-label={selected ? "Remover da seleção" : "Selecionar cliente"}
            className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${selected ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-gray-200 text-gray-400"}`}
          >
            {selected && <CheckSquare className="w-4 h-4" />}
          </button>
        )}
        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-indigo-700">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-bold text-gray-900 truncate">{c.company_name ?? "Sem nome"}</p>
            {isDuplicate && (
              <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full flex-shrink-0" title="Possível duplicata — verifique e arquive o registro antigo na Lixeira">
                ⚠ Duplicata
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 truncate">{c.segment ?? "Sem segmento"}</p>
          <ClientBadges c={c} />
        </div>
        <div className="flex flex-wrap gap-1 flex-shrink-0 justify-end max-w-[180px]">
          <button onClick={() => onInvite(c)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Gerar convite">
            <Mail className="w-3.5 h-3.5" /> Convite
          </button>
          <button onClick={() => onEdit(c)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Editar cliente">
            <Edit2 className="w-3.5 h-3.5" /> Editar
          </button>
          {isAdmin && (
            <>
              <button onClick={() => onArchive(c)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Arquivar cliente">
                <Archive className="w-3.5 h-3.5" /> Arquivar
              </button>
              {canHardDelete && (
                <button onClick={() => onHardDelete(c)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors" title="Apagar definitivamente">
                  <Trash2 className="w-3.5 h-3.5" /> Apagar
                </button>
              )}
            </>
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
  const [userRole,      setUserRole]      = useState("");
  const [userPlan,      setUserPlan]      = useState<string | null>(null);
  const [actionMsg,     setActionMsg]     = useState<string | null>(null);
  const [search,        setSearch]        = useState("");
  const [statusFilter,  setStatusFilter]  = useState<StatusFilter>("todos");
  const [segFilter,     setSegFilter]     = useState("");
  const [metaFilter,    setMetaFilter]    = useState<"todos" | "connected" | "not_connected">("todos");
  const [diagFilter,    setDiagFilter]    = useState<"todos" | "ok" | "pending">("todos");
  const [showFilters,   setShowFilters]   = useState(false);
  const [editingClient,  setEditingClient]  = useState<Client | null>(null);
  const [deleteModal,    setDeleteModal]    = useState<DeleteModalState | null>(null);
  const [creatingClient, setCreatingClient] = useState(false);
  const [invitingClient, setInvitingClient] = useState<Client | null>(null);
  const [actionLoading,  setActionLoading]  = useState(false);
  const [selectionMode,  setSelectionMode]  = useState(false);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [cleanupOpen,    setCleanupOpen]    = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupCandidates, setCleanupCandidates] = useState<CleanupCandidate[]>([]);
  const [selectedCleanupIds, setSelectedCleanupIds] = useState<Set<string>>(new Set());
  const [trashOpen,    setTrashOpen]    = useState(false);
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashItems,   setTrashItems]   = useState<TrashItem[]>([]);

  const fetchClients = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    try {
      const res = await fetch("/api/admin/clients");
      if (res.ok) {
        const data = await res.json() as { clients: Client[]; isAdmin: boolean; role?: string; plan?: string };
        setClients(data.clients.filter((client) => isClientVisible(client.status)));
        setIsAdmin(data.isAdmin);
        setUserRole(data.role ?? "");
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

  // IDs de clientes com possível duplicata (mesmo nome normalizado)
  const duplicateIds = useMemo(() => {
    const norm = (s: string | null) => (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
    const nameCount = new Map<string, string[]>();
    for (const c of clients) {
      const key = norm(c.company_name);
      if (!key) continue;
      nameCount.set(key, [...(nameCount.get(key) ?? []), c.id]);
    }
    const ids = new Set<string>();
    for (const group of nameCount.values()) {
      if (group.length > 1) group.forEach((id) => ids.add(id));
    }
    return ids;
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

  const canHardDelete = userRole === "super_admin";
  const selectedClients = useMemo(
    () => clients.filter((client) => selectedClientIds.has(client.id)),
    [clients, selectedClientIds],
  );
  const selectedCleanupClients = useMemo(
    () => cleanupCandidates.filter((client) => selectedCleanupIds.has(client.id)),
    [cleanupCandidates, selectedCleanupIds],
  );

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
        } else if (err.code === "ADMIN_CREATE_CLIENT_RPC_UNAVAILABLE") {
          message = err.error ?? "Rode docs/supabase/51-admin-create-client-bypass.sql no Supabase.";
        } else if (err.code === "CLIENT_RLS_BLOCKED") {
          message = "Nao foi possivel criar o cliente por RLS no passo server-side. Confira SQL 51 e service role.";
        } else if (err.code === "CLIENT_INSERT_FAILED") {
          message = err.error ?? "Nao foi possivel criar o cliente. Verifique os campos obrigatorios ou o schema da tabela clients.";
        }
        const technical = err.supabaseMessage ?? err.supabaseError?.message;
        if (technical) {
          message += ` Detalhe tecnico: ${technical}`;
        }
        if (err.step) {
          message += ` Step: ${err.step}.`;
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

  const toggleClientSelection = (id: string) => {
    setSelectedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCleanupSelection = (id: string) => {
    setSelectedCleanupIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedClientIds(new Set());
  };

  const loadCleanupCandidates = async () => {
    setCleanupLoading(true);
    try {
      const res = await fetch("/api/admin/clients/cleanup");
      const data = await res.json().catch(() => ({})) as { candidates?: CleanupCandidate[]; error?: string };
      if (res.ok) {
        setCleanupCandidates(data.candidates ?? []);
        setSelectedCleanupIds(new Set());
      } else {
        flash(data.error ?? "Nao foi possivel carregar limpeza.");
      }
    } catch {
      flash("Erro de conexao ao carregar limpeza.");
    } finally {
      setCleanupLoading(false);
    }
  };

  const openCleanup = () => {
    setCleanupOpen(true);
    void loadCleanupCandidates();
  };

  const loadTrashItems = async () => {
    setTrashLoading(true);
    try {
      const res = await fetch("/api/admin/clients/trash");
      const data = await res.json().catch(() => ({})) as { clients?: TrashItem[]; error?: string };
      if (res.ok) {
        setTrashItems(data.clients ?? []);
      } else {
        flash(data.error ?? "Nao foi possivel carregar a lixeira.");
      }
    } catch {
      flash("Erro de conexao ao carregar lixeira.");
    } finally {
      setTrashLoading(false);
    }
  };

  const openTrash = () => {
    setTrashOpen(true);
    void loadTrashItems();
  };

  const handleRestoreClient = async (item: TrashItem) => {
    setTrashLoading(true);
    try {
      const res = await fetch(`/api/admin/clients/${item.id}/restore`, { method: "POST" });
      if (res.ok) {
        setTrashItems((prev) => prev.filter((t) => t.id !== item.id));
        flash(`"${item.company_name ?? "Cliente"}" restaurado.`);
        void fetchClients();
      } else {
        const err = await res.json().catch(() => ({})) as { error?: string };
        flash(err.error ?? "Erro ao restaurar cliente.");
      }
    } catch {
      flash("Erro de conexao.");
    } finally {
      setTrashLoading(false);
    }
  };

  const handleHardDeleteFromTrash = async (item: TrashItem) => {
    setTrashLoading(true);
    try {
      const res = await fetch(`/api/admin/clients/${item.id}/hard-delete`, { method: "DELETE" });
      if (res.ok) {
        setTrashItems((prev) => prev.filter((t) => t.id !== item.id));
        flash(`"${item.company_name ?? "Cliente"}" apagado definitivamente.`);
      } else {
        const err = await res.json().catch(() => ({})) as { error?: string };
        flash(err.error ?? "Erro ao apagar cliente.");
      }
    } catch {
      flash("Erro de conexao.");
    } finally {
      setTrashLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    const targets = deleteModal.clients;
    if (targets.length === 0) return;
    setActionLoading(true);
    try {
      const res = targets.length === 1
        ? await fetch(`/api/admin/clients/${targets[0].id}${deleteModal.mode === "hard" ? "?mode=hard" : ""}`, { method: "DELETE" })
        : await fetch("/api/admin/clients/bulk-delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clientIds: targets.map((client) => client.id), mode: deleteModal.mode }),
          });
      if (res.ok) {
        const removedIds = new Set(targets.map((client) => client.id));
        setClients((prev) => prev.filter((client) => !removedIds.has(client.id)));
        setCleanupCandidates((prev) => prev.filter((client) => !removedIds.has(client.id)));
        setSelectedClientIds(new Set());
        setSelectedCleanupIds(new Set());
        setSelectionMode(false);
        flash(deleteModal.mode === "hard" ? "Cliente apagado definitivamente." : "Cliente arquivado.");
      } else {
        const err = await res.json().catch(() => ({})) as { error?: string; technical?: { message?: string } };
        const detail = err.technical?.message ? ` Detalhe tecnico: ${err.technical.message}` : "";
        flash(`${err.error ?? "Erro ao processar cliente."}${detail}`);
      }
    } catch {
      flash("Erro de conexao.");
    } finally {
      setActionLoading(false);
      setDeleteModal(null);
    }
  };

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: "todos",         label: "Todos" },
    { value: "operacionais",  label: "Ativos" },
    { value: "onboarding",    label: "Onboarding" },
  ];

  return (
    <div>
      <PageHeader title="Clientes" description={loading ? "Carregando..." : `${filtered.length} de ${clients.length} clientes`}>
        {isAdmin && (
          <button
            onClick={() => setSelectionMode(true)}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <CheckSquare className="w-4 h-4" />
            Selecionar clientes
          </button>
        )}
        {isAdmin && (
          <button
            onClick={openCleanup}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Archive className="w-4 h-4" />
            Limpeza
          </button>
        )}
        {isAdmin && (
          <button
            onClick={openTrash}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Lixeira
          </button>
        )}
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

      {selectionMode && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-3">
          <span className="text-sm font-semibold text-indigo-700">{selectedClientIds.size} selecionados</span>
          <button
            onClick={() => setDeleteModal({ mode: "archive", clients: selectedClients })}
            disabled={selectedClientIds.size === 0}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40"
          >
            Arquivar
          </button>
          {canHardDelete && (
            <button
              onClick={() => setDeleteModal({ mode: "hard", clients: selectedClients })}
              disabled={selectedClientIds.size === 0}
              className="px-3 py-2 text-xs font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-40"
            >
              Apagar definitivamente
            </button>
          )}
          <button onClick={cancelSelection} className="px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50">
            Cancelar sele��o
          </button>
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
            <ClientCard
              key={c.id}
              c={c}
              isAdmin={isAdmin}
              canHardDelete={canHardDelete}
              selectionMode={selectionMode}
              selected={selectedClientIds.has(c.id)}
              isDuplicate={duplicateIds.has(c.id)}
              onToggleSelect={toggleClientSelection}
              onEdit={setEditingClient}
              onArchive={(client) => setDeleteModal({ mode: "archive", clients: [client] })}
              onHardDelete={(client) => setDeleteModal({ mode: "hard", clients: [client] })}
              onInvite={setInvitingClient}
            />
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
      {cleanupOpen && (
        <CleanupModal
          candidates={cleanupCandidates}
          selectedIds={selectedCleanupIds}
          loading={cleanupLoading || actionLoading}
          canHardDelete={canHardDelete}
          onToggle={toggleCleanupSelection}
          onRefresh={loadCleanupCandidates}
          onArchive={() => setDeleteModal({ mode: "archive", clients: selectedCleanupClients })}
          onHardDelete={() => setDeleteModal({ mode: "hard", clients: selectedCleanupClients })}
          onCancel={() => setCleanupOpen(false)}
        />
      )}
      {deleteModal && <DeleteModal state={deleteModal} onConfirm={handleDelete} onCancel={() => setDeleteModal(null)} loading={actionLoading} />}
      {trashOpen && (
        <TrashModal
          items={trashItems}
          loading={trashLoading}
          canHardDelete={canHardDelete}
          onRestore={handleRestoreClient}
          onHardDelete={handleHardDeleteFromTrash}
          onRefresh={loadTrashItems}
          onCancel={() => setTrashOpen(false)}
        />
      )}
    </div>
  );
}
