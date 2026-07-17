"use client";
import { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/page-header";
import { mockUsers } from "@/data/mock-data";
import { cn } from "@/lib/utils";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { INVITABLE_ROLES, ROLE_LABELS, ROLE_COLORS } from "@/lib/access-control";
import {
  Mail, Calendar, X, Loader2, Info, Link2, Copy, Check,
  UserPlus, KeyRound, BadgeCheck, XCircle, Clock3,
  ExternalLink, BriefcaseBusiness, ChevronDown, ChevronUp,
  MoreVertical, Archive, ArchiveRestore, Trash2, TestTube2,
  Ban, RefreshCw,
} from "lucide-react";
import type { DbProfile } from "@/lib/supabase/types";

// ── Role config ──────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; color: string }> = Object.fromEntries(
  Object.entries(ROLE_LABELS).map(([k, v]) => [k, { label: v, color: ROLE_COLORS[k] ?? "bg-gray-100 text-gray-600" }])
);

const ALL_ROLES = Object.entries(ROLE_CONFIG).map(([value, { label }]) => ({ value, label }));

const AVATAR_COLORS = [
  "bg-indigo-600", "bg-purple-600", "bg-pink-600", "bg-emerald-600",
  "bg-amber-600", "bg-red-600", "bg-teal-600", "bg-slate-600",
];

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase() || "?";
}

function avatarColor(id: string) {
  const n = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface TeamInvite {
  id: string;
  token: string;
  email: string | null;
  name:  string | null;
  role:  string;
  department: string | null;
  status: "pending" | "sent" | "accepted" | "expired" | "cancelled";
  expires_at: string | null;
  created_at: string;
}

interface AccessRequest {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  birthday: string | null;
  desired_role: string;
  desired_department: string | null;
  portfolio_url: string | null;
  tools: string | null;
  availability: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

// ── Mock fallback ─────────────────────────────────────────────────────────────

const MOCK_PROFILES: DbProfile[] = mockUsers.map((u, i) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role === "client" ? "cliente" : u.role,
  phone: "",
  avatar_url: null,
  created_at: new Date(1748736000000 - i * 45 * 24 * 60 * 60 * 1000).toISOString(),
}));

const MOCK_REQUESTS: AccessRequest[] = [
  {
    id: "mock-1",
    name: "João Silva",
    email: "joao@exemplo.com",
    phone: "(11) 98888-0001",
    city: "São Paulo - SP",
    birthday: "1996-05-12",
    desired_role: "designer",
    desired_department: "design",
    portfolio_url: "https://behance.net/joaosilva",
    tools: "Figma, Illustrator, Photoshop",
    availability: "Integral",
    notes: "5 anos de experiência em design digital para agências.",
    status: "pending",
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "mock-2",
    name: "Ana Pereira",
    email: "ana@exemplo.com",
    phone: "(21) 99777-0002",
    city: "Rio de Janeiro - RJ",
    birthday: null,
    desired_role: "social_media",
    desired_department: "social_media",
    portfolio_url: null,
    tools: "Meta Ads, Canva, CapCut",
    availability: "Parcial (20h/semana)",
    notes: null,
    status: "pending",
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
];

// ── Invite modal ──────────────────────────────────────────────────────────────

interface InviteModalProps {
  onClose: () => void;
  prefill?: { email?: string; name?: string; role?: string; department?: string };
  requestId?: string;
  onSuccess?: () => void;
}

function InviteModal({ onClose, prefill, requestId, onSuccess }: InviteModalProps) {
  const [form, setForm] = useState({
    email:      prefill?.email      ?? "",
    name:       prefill?.name       ?? "",
    role:       prefill?.role       ?? "social_media",
    department: prefill?.department ?? "",
  });
  const [loading,    setLoading]    = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied,     setCopied]     = useState(false);
  const [error,      setError]      = useState("");
  const linkRef = useRef<HTMLInputElement>(null);

  const invitableRoles = INVITABLE_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] ?? r }));

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!isSupabaseConfigured) {
        const fakeToken = crypto.randomUUID();
        setInviteLink(`${window.location.origin}/convite/${fakeToken}`);
        return;
      }

      const supabase = createClient();

      // Generate invite
      const { data, error: rpcError } = await supabase.rpc("create_team_invite", {
        p_email:      form.email || null,
        p_name:       form.name  || null,
        p_role:       form.role,
        p_department: form.department || null,
        p_notes:      null,
        p_expires_h:  168,
      });

      if (rpcError) { setError("Erro ao gerar convite: " + rpcError.message); return; }

      const result = data as { success?: boolean; token?: string; error?: string } | null;
      if (!result?.success || !result.token) {
        setError(result?.error === "forbidden"
          ? "Apenas admins podem gerar convites."
          : "Erro ao gerar token. Verifique se o SQL 07 foi executado.");
        return;
      }

      // Mark request as converted_to_invite if originated from a request
      if (requestId) {
        await supabase.rpc("admin_update_access_request", {
          p_id: requestId, p_status: "converted_to_invite", p_notes: null,
        });
      }

      setInviteLink(`${window.location.origin}/convite/${result.token}`);
      onSuccess?.();
    } catch (err) {
      console.error("[equipe] invite:", err);
      setError("Erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-600" />
            <div>
              <h2 className="text-base font-black text-gray-900">Gerar convite</h2>
              <p className="text-xs text-gray-400 mt-0.5">Link de acesso para colaborador</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {inviteLink ? (
          <div className="p-6 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Link2 className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">Link gerado!</h3>
              <p className="text-xs text-gray-500">Copie e envie para o colaborador. Válido por 7 dias.</p>
            </div>

            <div className="flex gap-2">
              <input
                ref={linkRef}
                readOnly
                value={inviteLink}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono text-gray-600 outline-none bg-gray-50 truncate"
                onClick={() => linkRef.current?.select()}
              />
              <button
                onClick={handleCopy}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors flex-shrink-0",
                  copied ? "bg-emerald-100 text-emerald-700" : "bg-indigo-600 text-white hover:bg-indigo-700"
                )}
              >
                {copied ? <><Check className="w-3.5 h-3.5" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
              </button>
            </div>

            <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-xs text-amber-700">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              Envio de e-mail automático disponível na V2. Compartilhe o link manualmente.
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setInviteLink(null); }}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Novo convite
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-indigo-600 text-white text-sm font-bold py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Concluir
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleGenerate} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Função *</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 transition-colors bg-white"
                  required
                >
                  {invitableRoles.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Nome (opcional)</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Mariana Costa"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">E-mail (opcional)</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="email@empresa.com"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Departamento (opcional)</label>
              <input
                type="text"
                value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                placeholder="Ex: Social Media, Design…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 transition-colors"
              />
            </div>

            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={loading} className="flex-1 bg-indigo-600 text-white text-sm font-bold py-2.5 rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando…</> : <><Link2 className="w-3.5 h-3.5" /> Gerar link</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Access request card ───────────────────────────────────────────────────────

interface RequestCardProps {
  req: AccessRequest;
  onApprove: (req: AccessRequest) => void;
  onReject:  (id: string) => void;
  isProcessing: boolean;
}

function RequestCard({ req, onApprove, onReject, isProcessing }: RequestCardProps) {
  const [expanded, setExpanded] = useState(false);
  const roleLabel = ROLE_LABELS[req.desired_role] ?? req.desired_role;

  const STATUS_CFG: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
    pending:             { label: "Pendente",          icon: Clock3,     cls: "bg-amber-100 text-amber-700" },
    approved:            { label: "Aprovado",          icon: BadgeCheck, cls: "bg-emerald-100 text-emerald-700" },
    rejected:            { label: "Recusado",          icon: XCircle,    cls: "bg-red-100 text-red-700" },
    converted_to_invite: { label: "Convite enviado",   icon: Link2,      cls: "bg-blue-100 text-blue-700" },
  };

  const statusCfg = STATUS_CFG[req.status] ?? STATUS_CFG.pending;
  const StatusIcon = statusCfg.icon;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0", avatarColor(req.id))}>
          {initials(req.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-900 truncate">{req.name}</span>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1", statusCfg.cls)}>
              <StatusIcon className="w-2.5 h-2.5" />
              {statusCfg.label}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
            <span className="truncate">{req.email}</span>
            <span className={cn("font-medium px-1.5 py-0.5 rounded-md text-[10px]", ROLE_COLORS[req.desired_role] ?? "bg-gray-100 text-gray-600")}>
              {roleLabel}
            </span>
          </div>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0"
          title={expanded ? "Menos detalhes" : "Ver detalhes"}
        >
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-5 pb-4 border-t border-gray-50 pt-3 space-y-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-gray-600">
            {req.phone    && <span><span className="font-medium text-gray-500">WhatsApp:</span> {req.phone}</span>}
            {req.city     && <span><span className="font-medium text-gray-500">Cidade:</span> {req.city}</span>}
            {req.birthday && <span><span className="font-medium text-gray-500">Nasc.:</span> {new Date(req.birthday + "T00:00").toLocaleDateString("pt-BR")}</span>}
            {req.desired_department && (
              <span className="flex items-center gap-1">
                <BriefcaseBusiness className="w-3 h-3 text-gray-400" />
                <span className="font-medium text-gray-500">Depto.:</span> {req.desired_department}
              </span>
            )}
            {req.availability && <span className="col-span-2"><span className="font-medium text-gray-500">Disponibilidade:</span> {req.availability}</span>}
            {req.tools        && <span className="col-span-2"><span className="font-medium text-gray-500">Ferramentas:</span> {req.tools}</span>}
          </div>

          {req.portfolio_url && (
            <a
              href={req.portfolio_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              Ver portfólio
            </a>
          )}

          {req.notes && (
            <div className="bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-600 leading-relaxed">
              {req.notes}
            </div>
          )}

          <p className="text-xs text-gray-400">Enviado em {formatDate(req.created_at)}</p>
        </div>
      )}

      {/* Actions — only for pending */}
      {req.status === "pending" && (
        <div className="px-5 pb-4 flex gap-2">
          <button
            disabled={isProcessing}
            onClick={() => onReject(req.id)}
            className="flex items-center gap-1.5 text-xs font-medium text-red-600 border border-red-200 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <XCircle className="w-3.5 h-3.5" />
            Recusar
          </button>
          <button
            disabled={isProcessing}
            onClick={() => onApprove(req)}
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 px-3 py-2 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            <BadgeCheck className="w-3.5 h-3.5" />
            Aprovar e gerar convite
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  serverProfiles: DbProfile[] | null;
}

export function AdminEquipeContent({ serverProfiles }: Props) {
  const serverHasReal = serverProfiles !== null && serverProfiles.length > 0;
  const [activeTab, setActiveTab] = useState<"equipe" | "solicitacoes" | "convites">("equipe");

  // ── Convites tab state ──
  const [invites,        setInvites]        = useState<TeamInvite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [invitesFetched, setInvitesFetched] = useState(false);
  const [cancellingId,   setCancellingId]   = useState<string | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  // ── Equipe tab state ──
  const [isFetching,         setIsFetching]         = useState(isSupabaseConfigured && !serverHasReal);
  const [clientSideProfiles, setClientSideProfiles] = useState<DbProfile[] | null>(null);
  const [roleOverrides,      setRoleOverrides]      = useState<Record<string, string>>({});
  const [updatingId,         setUpdatingId]         = useState<string | null>(null);
  const [showInviteModal,    setShowInviteModal]    = useState(false);
  const [toast,              setToast]              = useState<string | null>(null);
  const [openMenuId,         setOpenMenuId]         = useState<string | null>(null);
  const [actionLoading,      setActionLoading]      = useState<string | null>(null);
  // Track local overrides for is_test / archived_at after mutations
  const [accountOverrides,   setAccountOverrides]   = useState<Record<string, { is_test?: boolean; archived_at?: string | null }>>({});

  // ── Solicitações tab state ──
  // In demo mode, seed directly so no synchronous setState inside effect
  const [requests,        setRequests]        = useState<AccessRequest[]>(
    !isSupabaseConfigured ? MOCK_REQUESTS : []
  );
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsFetched, setRequestsFetched] = useState(!isSupabaseConfigured);
  const [processingId,     setProcessingId]     = useState<string | null>(null);
  const [approveTarget,    setApproveTarget]    = useState<AccessRequest | null>(null);

  // Fetch team profiles
  useEffect(() => {
    if (!isSupabaseConfigured || serverHasReal) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) { setIsFetching(false); return; }
      const { data } = await supabase
        .from("profiles")
        .select("id, name, email, role, phone, avatar_url, created_at")
        .order("created_at", { ascending: false });
      if (!cancelled) {
        setClientSideProfiles((data as DbProfile[]) ?? []);
        setIsFetching(false);
      }
    })();
    return () => { cancelled = true; };
  }, [serverHasReal]);

  // Fetch convites when tab opens
  useEffect(() => {
    if (activeTab !== "convites" || invitesFetched || !isSupabaseConfigured) return;
    let cancelled = false;
    (async () => {
      setInvitesLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("team_invites")
          .select("id, token, email, name, role, department, status, expires_at, created_at")
          .order("created_at", { ascending: false })
          .limit(50);

        if (!cancelled) {
          if (error) { console.error("[equipe] invites:", error.message); setInvites([]); }
          else { setInvites((data as TeamInvite[]) ?? []); }
          setInvitesFetched(true);
          setInvitesLoading(false);
        }
      } catch {
        if (!cancelled) { setInvites([]); setInvitesFetched(true); setInvitesLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab, invitesFetched]);

  // Fetch access requests when tab opens (skipped in demo mode — state seeded above)
  useEffect(() => {
    if (activeTab !== "solicitacoes" || requestsFetched || !isSupabaseConfigured) return;

    let cancelled = false;
    (async () => {
      if (!cancelled) setRequestsLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("team_access_requests")
          .select("*")
          .order("created_at", { ascending: false });

        if (cancelled) return;
        if (error) {
          console.error("[equipe] requests fetch error:", error.message);
          setRequests(MOCK_REQUESTS);
        } else {
          setRequests((data as AccessRequest[]) ?? []);
        }
      } catch {
        if (!cancelled) setRequests(MOCK_REQUESTS);
      } finally {
        if (!cancelled) { setRequestsLoading(false); setRequestsFetched(true); }
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab, requestsFetched]);

  const isDemo = !isSupabaseConfigured || (!isFetching && !serverHasReal && !clientSideProfiles);
  const baseProfiles = isDemo ? MOCK_PROFILES : (serverProfiles ?? clientSideProfiles ?? []);
  const displayProfiles = baseProfiles.map((p) => ({
    ...p,
    role: roleOverrides[p.id] ?? p.role,
    ...(accountOverrides[p.id] ?? {}),
  }));

  const pendingCount = isDemo
    ? MOCK_REQUESTS.filter((r) => r.status === "pending").length
    : requests.filter((r) => r.status === "pending").length;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (!confirm("Cancelar este convite? O link deixará de funcionar.")) return;
    setCancellingId(inviteId);
    try {
      if (isSupabaseConfigured) {
        const supabase = createClient();
        await supabase.from("team_invites").update({ status: "cancelled" }).eq("id", inviteId);
      }
      setInvites((prev) => prev.map((inv) => inv.id === inviteId ? { ...inv, status: "cancelled" } : inv));
      showToast("Convite cancelado.");
    } catch { showToast("Erro ao cancelar convite."); }
    finally { setCancellingId(null); }
  };

  const handleCopyInviteLink = (token: string, inviteId: string) => {
    const url = `${window.location.origin}/convite/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedInviteId(inviteId);
      setTimeout(() => setCopiedInviteId(null), 2000);
    });
  };

  const handleArchive = async (profileId: string, archive: boolean) => {
    if (isDemo || !isSupabaseConfigured) { showToast("Ação indisponível no modo demo."); return; }
    setActionLoading(profileId);
    try {
      const supabase = createClient();
      const fn = archive ? "admin_archive_user" : "admin_unarchive_user";
      const { error } = await supabase.rpc(fn, { p_user_id: profileId });
      if (error) { showToast("Erro: " + error.message); }
      else {
        setAccountOverrides((prev) => ({ ...prev, [profileId]: { ...prev[profileId], archived_at: archive ? new Date().toISOString() : null } }));
        showToast(archive ? "Conta arquivada." : "Conta reativada.");
      }
    } catch { showToast("Erro inesperado."); }
    finally { setActionLoading(null); setOpenMenuId(null); }
  };

  const handleMarkTest = async (profileId: string, isTest: boolean) => {
    if (isDemo || !isSupabaseConfigured) { showToast("Ação indisponível no modo demo."); return; }
    setActionLoading(profileId);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("admin_mark_test_account", { p_user_id: profileId, p_is_test: isTest });
      if (error) { showToast("Erro: " + error.message); }
      else {
        setAccountOverrides((prev) => ({ ...prev, [profileId]: { ...prev[profileId], is_test: isTest } }));
        showToast(isTest ? "Marcada como conta de teste." : "Removida da lista de teste.");
      }
    } catch { showToast("Erro inesperado."); }
    finally { setActionLoading(null); setOpenMenuId(null); }
  };

  const handleDeleteTest = async (profileId: string) => {
    if (isDemo || !isSupabaseConfigured) { showToast("Ação indisponível no modo demo."); return; }
    if (!confirm("Excluir permanentemente esta conta de teste? Esta ação não pode ser desfeita.")) return;
    setActionLoading(profileId);
    try {
      const res = await fetch("/api/admin/users/delete-test-account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profileId }),
      });
      if (!res.ok) {
        const { error } = await res.json() as { error?: string };
        showToast("Erro: " + (error ?? res.statusText));
      } else {
        setClientSideProfiles((prev) => prev ? prev.filter((p) => p.id !== profileId) : prev);
        showToast("Conta excluída.");
      }
    } catch { showToast("Erro inesperado."); }
    finally { setActionLoading(null); setOpenMenuId(null); }
  };

  const handleRoleChange = async (profileId: string, newRole: string) => {
    setRoleOverrides((prev) => ({ ...prev, [profileId]: newRole }));
    if (isDemo || !isSupabaseConfigured) return;
    setUpdatingId(profileId);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", profileId);
      if (error) {
        setRoleOverrides((prev) => { const n = { ...prev }; delete n[profileId]; return n; });
        showToast("Erro ao alterar role.");
      } else {
        showToast("Role atualizado.");
      }
    } catch {
      setRoleOverrides((prev) => { const n = { ...prev }; delete n[profileId]; return n; });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      if (!isDemo && isSupabaseConfigured) {
        const supabase = createClient();
        await supabase.rpc("admin_update_access_request", { p_id: id, p_status: "rejected", p_notes: null });
      }
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "rejected" } : r));
      showToast("Solicitação recusada.");
    } catch {
      showToast("Erro ao recusar.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleApprove = (req: AccessRequest) => {
    setApproveTarget(req);
  };

  const handleInviteSuccess = () => {
    if (approveTarget) {
      setRequests((prev) =>
        prev.map((r) => r.id === approveTarget.id ? { ...r, status: "converted_to_invite" } : r)
      );
    }
    setRequestsFetched(false); // refetch
  };

  return (
    <div>
      <PageHeader
        title="Equipe"
        description={
          isFetching
            ? "Carregando membros…"
            : isDemo
            ? `${displayProfiles.length} membros (modo demonstração)`
            : `${displayProfiles.length} membros`
        }
      >
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 text-sm font-medium text-white bg-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Convidar membro
        </button>
      </PageHeader>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-gray-100 p-1 rounded-2xl w-fit flex-wrap">
        <button
          onClick={() => setActiveTab("equipe")}
          className={cn("text-sm font-medium px-4 py-2 rounded-xl transition-all", activeTab === "equipe" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
        >
          Equipe ativa
        </button>
        <button
          onClick={() => setActiveTab("convites")}
          className={cn("text-sm font-medium px-4 py-2 rounded-xl transition-all flex items-center gap-2", activeTab === "convites" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
        >
          Convites
          {invites.filter((i) => i.status === "pending" || i.status === "sent").length > 0 && (
            <span className="bg-indigo-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {invites.filter((i) => i.status === "pending" || i.status === "sent").length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("solicitacoes")}
          className={cn("text-sm font-medium px-4 py-2 rounded-xl transition-all flex items-center gap-2", activeTab === "solicitacoes" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
        >
          Solicitações
          {pendingCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Tab: Equipe ── */}
      {activeTab === "equipe" && (
        <>
          {isDemo && !isFetching && (
            <div className="mb-4 flex items-center gap-2 text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
              Modo demonstração — dados fictícios
            </div>
          )}
          {isFetching && (
            <div className="mb-4 flex items-center gap-2 text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 w-fit">
              <Loader2 className="w-3 h-3 animate-spin" />
              Carregando membros…
            </div>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayProfiles.map((profile) => {
              const roleInfo = ROLE_CONFIG[profile.role] ?? { label: profile.role, color: "bg-gray-100 text-gray-600" };
              const ini = initials(profile.name ?? profile.email ?? "?");
              const bgColor = avatarColor(profile.id);
              const isUpdating = updatingId === profile.id;

              const isArchived  = !!profile.archived_at;
              const isTestAcc   = !!profile.is_test;
              const isActioning = actionLoading === profile.id;
              const menuOpen    = openMenuId === profile.id;

              return (
                <div key={profile.id} className={cn("bg-white rounded-2xl border p-5 hover:shadow-md transition-shadow relative", isArchived ? "border-gray-200 opacity-60" : "border-gray-100")}>
                  {/* Top row: avatar + name + action menu */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className={cn("w-12 h-12 rounded-2xl text-white font-bold text-sm flex items-center justify-center flex-shrink-0", bgColor)}>
                      {ini}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 flex-wrap">
                        <h3 className="text-sm font-bold text-gray-900 truncate">{profile.name ?? "—"}</h3>
                        {isTestAcc  && <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">TESTE</span>}
                        {isArchived && <span className="text-[9px] font-bold bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">ARQUIVADO</span>}
                      </div>
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full inline-block mt-0.5", roleInfo.color)}>
                        {roleInfo.label}
                      </span>
                    </div>
                    {/* Three-dot menu */}
                    <div className="relative flex-shrink-0">
                      <button
                        onClick={() => setOpenMenuId(menuOpen ? null : profile.id)}
                        className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors"
                      >
                        {isActioning
                          ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                          : <MoreVertical className="w-4 h-4 text-gray-400" />}
                      </button>
                      {menuOpen && (
                        <div className="absolute right-0 top-8 z-20 bg-white border border-gray-100 rounded-2xl shadow-lg py-1.5 min-w-[180px]">
                          {isArchived ? (
                            <button
                              onClick={() => handleArchive(profile.id, false)}
                              className="flex items-center gap-2.5 w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <ArchiveRestore className="w-3.5 h-3.5 text-emerald-600" />
                              Reativar conta
                            </button>
                          ) : (
                            <button
                              onClick={() => handleArchive(profile.id, true)}
                              className="flex items-center gap-2.5 w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <Archive className="w-3.5 h-3.5 text-amber-600" />
                              Arquivar conta
                            </button>
                          )}
                          {isTestAcc ? (
                            <button
                              onClick={() => handleMarkTest(profile.id, false)}
                              className="flex items-center gap-2.5 w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <TestTube2 className="w-3.5 h-3.5 text-gray-400" />
                              Remover rótulo teste
                            </button>
                          ) : (
                            <button
                              onClick={() => handleMarkTest(profile.id, true)}
                              className="flex items-center gap-2.5 w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <TestTube2 className="w-3.5 h-3.5 text-amber-500" />
                              Marcar como teste
                            </button>
                          )}
                          {isTestAcc && (
                            <button
                              onClick={() => handleDeleteTest(profile.id)}
                              className="flex items-center gap-2.5 w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100 mt-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Excluir conta de teste
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-3 truncate">
                    <Mail className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{profile.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                    <Calendar className="w-3 h-3 flex-shrink-0" />
                    Membro desde {formatDate(profile.created_at)}
                  </div>
                  <div className="relative">
                    <select
                      value={profile.role}
                      onChange={(e) => handleRoleChange(profile.id, e.target.value)}
                      disabled={isUpdating || isArchived}
                      className={cn(
                        "w-full border rounded-xl px-3 py-2 text-xs font-medium outline-none transition-colors bg-white appearance-none cursor-pointer",
                        isUpdating || isArchived ? "border-gray-100 text-gray-400 cursor-wait" : "border-gray-200 text-gray-700 hover:border-indigo-300 focus:border-indigo-400"
                      )}
                    >
                      {ALL_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    {isUpdating && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-indigo-500 animate-spin" />}
                  </div>
                </div>
              );
            })}

            {/* Invite slot */}
            <button
              onClick={() => setShowInviteModal(true)}
              className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-5 flex flex-col items-center justify-center text-center hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
            >
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                <KeyRound className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-500">Gerar convite</p>
              <p className="text-xs text-gray-400 mt-1">Link de acesso para novo membro</p>
            </button>
          </div>
        </>
      )}

      {/* ── Tab: Convites ── */}
      {activeTab === "convites" && (
        <div>
          {!isSupabaseConfigured && (
            <div className="mb-4 flex items-center gap-2 text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
              Supabase não configurado — convites reais indisponíveis
            </div>
          )}

          {invitesLoading && (
            <div className="flex items-center gap-2 text-xs text-gray-400 py-8">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando convites…
            </div>
          )}

          {!invitesLoading && isSupabaseConfigured && invites.length === 0 && invitesFetched && (
            <div className="text-center py-16">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">Nenhum convite gerado</p>
              <p className="text-xs text-gray-400">Convites gerados aparecerão aqui.</p>
            </div>
          )}

          {!invitesLoading && invites.length > 0 && (
            <div className="space-y-3">
              {invites.map((inv) => {
                const isActive   = inv.status === "pending" || inv.status === "sent";
                const isExpired  = inv.status === "expired" || (inv.expires_at ? new Date(inv.expires_at) < new Date() : false);
                const roleInfo   = ROLE_CONFIG[inv.role] ?? { label: inv.role, color: "bg-gray-100 text-gray-600" };
                const isCopied   = copiedInviteId === inv.id;
                const isCancelling = cancellingId === inv.id;

                const STATUS_MAP: Record<string, { label: string; cls: string }> = {
                  pending:   { label: "Pendente",   cls: "bg-amber-100 text-amber-700" },
                  sent:      { label: "Enviado",    cls: "bg-blue-100 text-blue-700" },
                  accepted:  { label: "Aceito",     cls: "bg-emerald-100 text-emerald-700" },
                  expired:   { label: "Expirado",   cls: "bg-gray-100 text-gray-500" },
                  cancelled: { label: "Cancelado",  cls: "bg-red-100 text-red-600" },
                };
                const statusInfo = STATUS_MAP[isExpired && isActive ? "expired" : inv.status] ?? STATUS_MAP.pending;

                return (
                  <div key={inv.id} className="bg-white rounded-2xl border border-gray-100 px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", inv.status === "accepted" ? "bg-emerald-100" : "bg-indigo-100")}>
                        <KeyRound className={cn("w-4 h-4", inv.status === "accepted" ? "text-emerald-600" : "text-indigo-600")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-900 truncate">{inv.name ?? inv.email ?? "Sem nome"}</span>
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", statusInfo.cls)}>{statusInfo.label}</span>
                          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-md", roleInfo.color)}>{roleInfo.label}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5 flex-wrap">
                          {inv.email && <span className="truncate">{inv.email}</span>}
                          {inv.department && <span>{inv.department}</span>}
                          <span>Criado {formatDate(inv.created_at)}</span>
                          {inv.expires_at && <span>Expira {formatDate(inv.expires_at)}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Actions — apenas para convites não encerrados */}
                    {inv.status !== "accepted" && inv.status !== "cancelled" && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50 flex-wrap">
                        <button
                          onClick={() => handleCopyInviteLink(inv.token, inv.id)}
                          className={cn("flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border transition-colors", isCopied ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "border-gray-200 text-gray-600 hover:bg-gray-50")}
                        >
                          {isCopied ? <><Check className="w-3 h-3" /> Copiado</> : <><Copy className="w-3 h-3" /> Copiar link</>}
                        </button>
                        <button
                          onClick={() => { setInvitesFetched(false); }}
                          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" /> Atualizar
                        </button>
                        <button
                          onClick={() => handleCancelInvite(inv.id)}
                          disabled={isCancelling}
                          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 ml-auto"
                        >
                          {isCancelling ? <><Loader2 className="w-3 h-3 animate-spin" /> Cancelando…</> : <><Ban className="w-3 h-3" /> Cancelar convite</>}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Solicitações ── */}
      {activeTab === "solicitacoes" && (
        <div>
          {isDemo && (
            <div className="mb-4 flex items-center gap-2 text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
              Modo demonstração — solicitações fictícias
            </div>
          )}

          {requestsLoading && (
            <div className="flex items-center gap-2 text-xs text-gray-400 py-8">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando solicitações…
            </div>
          )}

          {!requestsLoading && requests.length === 0 && (
            <div className="text-center py-16">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BadgeCheck className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">Nenhuma solicitação</p>
              <p className="text-xs text-gray-400">Quando alguém solicitar acesso à equipe, aparecerá aqui.</p>
            </div>
          )}

          {!requestsLoading && requests.length > 0 && (
            <>
              {pendingCount > 0 && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 text-xs text-amber-700 mb-4 w-fit">
                  <Clock3 className="w-3.5 h-3.5" />
                  <strong>{pendingCount}</strong> solicitação{pendingCount > 1 ? "ões" : ""} pendente{pendingCount > 1 ? "s" : ""}
                </div>
              )}

              <div className="space-y-3">
                {requests.map((req) => (
                  <RequestCard
                    key={req.id}
                    req={req}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    isProcessing={processingId === req.id}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Invite modal — standalone */}
      {showInviteModal && (
        <InviteModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {}}
        />
      )}

      {/* Invite modal — from request approval */}
      {approveTarget && (
        <InviteModal
          onClose={() => setApproveTarget(null)}
          prefill={{
            email:      approveTarget.email,
            name:       approveTarget.name,
            role:       approveTarget.desired_role,
            department: approveTarget.desired_department ?? "",
          }}
          requestId={approveTarget.id}
          onSuccess={handleInviteSuccess}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
