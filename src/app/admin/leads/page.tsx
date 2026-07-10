"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Users, Zap, ClipboardList, Calendar, Bot, AlertTriangle,
  RefreshCw, MessageSquare, ChevronRight, Lock, ListOrdered,
  Target, Clock, X,
} from "lucide-react";
import Link from "next/link";
import { getPlannedIntegrations, INTEGRATION_TYPES } from "@/lib/integrations";
import { CANONICAL_ACCOUNT_TYPES } from "@/lib/account-types";

type WaitlistEntry = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  account_type: string;
  city: string | null;
  segment: string | null;
  interest: string | null;
  source: string | null;
  status: string;
  created_at: string;
};

type ApiResponse = {
  ok: boolean;
  entries?: WaitlistEntry[];
  total?: number;
  code?: string;
  message?: string;
};

/* ── Label maps ─────────────────────────────────────── */

const SOURCE_LABEL: Record<string, string> = {
  site_modal:        "Agendamento",
  site_conversation: "Agendamento",
  "pre-acesso":      "Beta",
  pre_acesso:        "Beta",
  beta:              "Beta",
  landing:           "Site",
  website:           "Site",
  diagnostico:       "Diagnóstico",
  diagnostic:        "Diagnóstico",
  typebot:           "Typebot",
  whatsapp:          "WhatsApp",
  manual:            "Manual",
  novo_cadastro:     "Cadastro legado",
};

function getSourceLabel(s: string | null | undefined): string {
  if (!s) return "Não informado";
  return SOURCE_LABEL[s] ?? SOURCE_LABEL[s.toLowerCase()] ?? s;
}

const SOURCE_COLOR: Record<string, string> = {
  Agendamento:     "bg-indigo-50 text-indigo-700 border-indigo-100",
  Beta:            "bg-purple-50 text-purple-700 border-purple-100",
  Site:            "bg-blue-50 text-blue-700 border-blue-100",
  Diagnóstico:     "bg-amber-50 text-amber-700 border-amber-100",
  Typebot:         "bg-emerald-50 text-emerald-700 border-emerald-100",
  WhatsApp:        "bg-green-50 text-green-700 border-green-100",
  Manual:          "bg-gray-50 text-gray-600 border-gray-200",
  "Não informado": "bg-gray-50 text-gray-400 border-gray-100",
};

function getIntentLabel(s: string | null): string {
  if (!s) return "—";
  const map: Record<string, string> = {
    beta:                    "Entrar na beta",
    lista_beta:              "Entrar na beta",
    diagnostico:             "Diagnóstico gratuito",
    diagnostico_gratuito:    "Diagnóstico gratuito",
    demo:                    "Agendar demonstração",
    agendar_demo:            "Agendar demonstração",
    falar_com_lokat:         "Falar com a Lokat",
    orcamento:               "Orçamento",
    "diagnóstico gratuito":  "Diagnóstico gratuito",
    "demonstração guiada":   "Demonstração guiada",
    "falar com a equipe":    "Falar com a Lokat",
    "só estou explorando":   "Explorando",
  };
  return map[s.toLowerCase()] ?? s;
}

function getProfileLabel(s: string | null): string {
  if (!s) return "—";
  const map: Record<string, string> = {
    agency:         "Agência",
    agencia:        "Agência",
    business:       "Empresa",
    local_business: "Negócio local",
    professional:   "Profissional",
    interested:     "Interessado",
    autonomo:       "Autônomo",
  };
  return map[s.toLowerCase()] ?? s;
}

const STATUS_LABEL: Record<string, string> = {
  new:       "Novo",
  contacted: "Contatado",
  invited:   "Convidado",
  accepted:  "Aceito",
  rejected:  "Rejeitado",
  archived:  "Arquivado",
};

const STATUS_COLOR: Record<string, string> = {
  new:       "bg-blue-50 text-blue-700",
  contacted: "bg-yellow-50 text-yellow-700",
  invited:   "bg-purple-50 text-purple-700",
  accepted:  "bg-green-50 text-green-700",
  rejected:  "bg-red-50 text-red-700",
  archived:  "bg-gray-100 text-gray-500",
};

const ACCOUNT_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  cliente_lokat:    { label: "Cliente Lokat",     color: "bg-indigo-50 text-indigo-700 border-indigo-100" },
  cliente_agencia:  { label: "Cliente de agência", color: "bg-blue-50 text-blue-700 border-blue-100" },
  agencia_parceira: { label: "Agência parceira",   color: "bg-purple-50 text-purple-700 border-purple-100" },
  autonomo:         { label: "Autônomo",           color: "bg-amber-50 text-amber-700 border-amber-100" },
  lead:             { label: "Lead",               color: "bg-gray-50 text-gray-600 border-gray-200" },
  interno_lokat:    { label: "Interno Lokat",      color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  operacional:      { label: "Operacional",        color: "bg-sky-50 text-sky-700 border-sky-100" },
  agency:           { label: "Agência parceira",   color: "bg-purple-50 text-purple-700 border-purple-100" },
  agencia:          { label: "Agência parceira",   color: "bg-purple-50 text-purple-700 border-purple-100" },
  business:         { label: "Cliente Lokat",      color: "bg-indigo-50 text-indigo-700 border-indigo-100" },
  local_business:   { label: "Cliente Lokat",      color: "bg-indigo-50 text-indigo-700 border-indigo-100" },
  professional:     { label: "Autônomo",           color: "bg-amber-50 text-amber-700 border-amber-100" },
  interested:       { label: "Lead",               color: "bg-gray-50 text-gray-600 border-gray-200" },
  novo_cadastro:    { label: "Lead",               color: "bg-gray-50 text-gray-600 border-gray-200" },
};

function getAccountTypeBadge(type: string | null | undefined): { label: string; color: string } {
  if (!type) return { label: "Lead", color: "bg-gray-50 text-gray-600 border-gray-200" };
  const key = type.toLowerCase();
  return ACCOUNT_TYPE_CONFIG[key] ?? { label: type, color: "bg-gray-50 text-gray-500 border-gray-100" };
}

const AGENT_TONES = [
  { key: "consultivo",     label: "Consultivo" },
  { key: "direto",         label: "Direto" },
  { key: "qualificacao",   label: "Qualificação" },
  { key: "agressivo_leve", label: "Agressivo leve" },
  { key: "reativacao",     label: "Reativação" },
];

const AGENT_OBJECTIVES = [
  { key: "qualificar",         label: "Qualificar" },
  { key: "agendar_demo",       label: "Agendar demo" },
  { key: "converter_beta",     label: "Converter p/ beta" },
  { key: "converter_cliente",  label: "Converter p/ cliente" },
  { key: "encaminhar_agencia", label: "Encaminhar agência" },
  { key: "followup",           label: "Marcar follow-up" },
];

function generateAgenteSuggestion(lead: WaitlistEntry, tone: string, objective: string): string {
  const src   = getSourceLabel(lead.source);
  const stage = STATUS_LABEL[lead.status] ?? lead.status;
  const first = lead.name.split(" ")[0] ?? lead.name;
  const toneMsg: Record<string, string> = {
    consultivo:      `"Olá ${first}! Tenho interesse em entender melhor o seu negócio. Podemos conversar rapidamente?"`,
    direto:          `"Olá ${first}! Quero te mostrar como a Lokat OS organiza toda a operação em um lugar. Posso apresentar em 15 minutos?"`,
    qualificacao:    `"Olá ${first}! Uma pergunta rápida: seu maior gargalo hoje é produção de conteúdo, gestão de clientes ou equipe?"`,
    agressivo_leve:  `"Olá ${first}! Estamos nas últimas vagas do beta exclusivo. Ainda tem interesse em garantir sua entrada?"`,
    reativacao:      `"Olá ${first}! Tivemos um contato anterior e gostaria de retomar. Tem novidades no seu negócio?"`,
  };
  const objNext: Record<string, string> = {
    qualificar:         "Aguardar resposta da pergunta de qualificação antes de avançar.",
    agendar_demo:       "Enviar link do calendário ou solicitar horário disponível.",
    converter_beta:     "Enviar link de cadastro beta com código exclusivo.",
    converter_cliente:  "Preparar proposta comercial personalizada.",
    encaminhar_agencia: "Identificar agência parceira compatível e fazer a conexão.",
    followup:           "Agendar lembrete de follow-up para 3 dias.",
  };
  const msg  = toneMsg[tone]  ?? `"Olá ${first}! Gostaria de conversar sobre como a Lokat OS pode ajudar o seu negócio."`;
  const next = objNext[objective] ?? "Definir próximo passo com o lead.";
  return `Lead: ${lead.name}\nOrigem: ${src}  ·  Etapa: ${stage}\n\nMensagem sugerida:\n${msg}\n\nPróximo passo: ${next}`;
}

const PIPELINE_STAGES = [
  { key: "new",       label: "Novo",      color: "bg-blue-50 border-blue-200 text-blue-700" },
  { key: "contacted", label: "Contatado", color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
  { key: "invited",   label: "Convidado", color: "bg-purple-50 border-purple-200 text-purple-700" },
  { key: "accepted",  label: "Aceito",    color: "bg-green-50 border-green-200 text-green-700" },
  { key: "archived",  label: "Arquivado", color: "bg-gray-50 border-gray-200 text-gray-500" },
];

const SOURCE_TABS = [
  { key: "all",           label: "Todos" },
  { key: "Beta",          label: "Beta" },
  { key: "Diagnóstico",   label: "Diagnóstico" },
  { key: "Agendamento",   label: "Agendamento" },
  { key: "Typebot",       label: "Typebot" },
  { key: "Site",          label: "Site" },
  { key: "WhatsApp",      label: "WhatsApp" },
  { key: "Não informado", label: "Sem origem" },
];

/* ── Page ───────────────────────────────────────────── */

export default function AdminLeadsPage() {
  const [entries,      setEntries]      = useState<WaitlistEntry[]>([]);
  const [total,        setTotal]        = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [srcFilter,    setSrcFilter]    = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAiInfo,    setShowAiInfo]    = useState(false);
  const [agenteLead,    setAgenteLead]    = useState<WaitlistEntry | null>(null);
  const [agenteTone,    setAgenteTone]    = useState("consultivo");
  const [agenteObj,     setAgenteObj]     = useState("agendar_demo");
  const [agenteResult,  setAgenteResult]  = useState("");
  const [typeUpdating,  setTypeUpdating]  = useState<string | null>(null);
  const [typeError,     setTypeError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/admin/waitlist");
      const json = await res.json() as ApiResponse;
      if (!json.ok) {
        setError(json.code ?? json.message ?? "Erro ao carregar");
        return;
      }
      setEntries(json.entries ?? []);
      setTotal(json.total ?? 0);
    } catch {
      setError("Erro de rede ao carregar CRM.");
    } finally {
      setLoading(false);
    }
  }, []);

  /* eslint-disable-next-line react-hooks/set-state-in-effect */
  useEffect(() => { void load(); }, [load]);

  const bySrc = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of entries) {
      const lbl = getSourceLabel(e.source);
      m[lbl] = (m[lbl] ?? 0) + 1;
    }
    return m;
  }, [entries]);

  const byStatus = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of entries) m[e.status] = (m[e.status] ?? 0) + 1;
    return m;
  }, [entries]);

  const filtered = useMemo(() => entries.filter((e) => {
    if (srcFilter !== "all" && getSourceLabel(e.source) !== srcFilter) return false;
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    return true;
  }), [entries, srcFilter, statusFilter]);

  const semFollowUp = useMemo(() => entries.filter((e) => e.status === "new").length, [entries]);

  const KPI_CARDS = [
    { label: "Todos",        icon: Users,         count: total,                     color: "text-indigo-600",  bg: "bg-indigo-50",  srcKey: "all"         },
    { label: "Beta",         icon: Zap,           count: bySrc["Beta"] ?? 0,        color: "text-purple-600",  bg: "bg-purple-50",  srcKey: "Beta"        },
    { label: "Diagnóstico",  icon: ClipboardList, count: bySrc["Diagnóstico"] ?? 0, color: "text-amber-600",   bg: "bg-amber-50",   srcKey: "Diagnóstico" },
    { label: "Agendamento",  icon: Calendar,      count: bySrc["Agendamento"] ?? 0, color: "text-indigo-500",  bg: "bg-indigo-50",  srcKey: "Agendamento" },
    { label: "Typebot",      icon: Bot,           count: bySrc["Typebot"] ?? 0,     color: "text-emerald-600", bg: "bg-emerald-50", srcKey: "Typebot"     },
    { label: "Sem follow-up",icon: AlertTriangle, count: semFollowUp,               color: "text-red-600",     bg: "bg-red-50",     srcKey: "_new"        },
  ];

  async function updateAccountType(id: string, account_type: string | null) {
    const prevType = entries.find((e) => e.id === id)?.account_type ?? null;
    setTypeUpdating(id);
    setTypeError(null);
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, account_type: account_type ?? "" } : e));
    try {
      const res = await fetch("/api/admin/waitlist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, account_type }),
      });
      const data = await res.json() as { ok: boolean; message?: string; code?: string };
      if (!res.ok || !data.ok) {
        setEntries((prev) => prev.map((e) => e.id === id ? { ...e, account_type: prevType ?? "" } : e));
        setTypeError(data.message ?? `Erro ${res.status}`);
        setTimeout(() => setTypeError(null), 4000);
      }
    } catch {
      setEntries((prev) => prev.map((e) => e.id === id ? { ...e, account_type: prevType ?? "" } : e));
      setTypeError("Erro de conexão.");
      setTimeout(() => setTypeError(null), 4000);
    } finally {
      setTypeUpdating(null);
    }
  }

  function handleKpiClick(srcKey: string) {
    if (srcKey === "_new") {
      setSrcFilter("all");
      setStatusFilter("new");
    } else {
      setSrcFilter(srcKey);
      setStatusFilter("all");
    }
  }

  return (
    <div>
      <PageHeader title="CRM" description="Leads e pipeline comercial">
        <button
          onClick={() => void load()}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 border border-gray-200 rounded-xl px-3 py-2 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </PageHeader>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {KPI_CARDS.map(({ label, icon: Icon, count, color, bg, srcKey }) => {
          const isActive =
            srcKey === "_new"
              ? statusFilter === "new" && srcFilter === "all"
              : srcFilter === srcKey;
          return (
            <button
              key={label}
              onClick={() => handleKpiClick(srcKey)}
              className={`bg-white rounded-2xl border p-4 flex items-center gap-3 hover:border-indigo-200 transition-colors text-left ${
                isActive ? "border-indigo-300 ring-1 ring-indigo-200" : "border-gray-100"
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
                <Icon className={`w-4 h-4 ${color}`} strokeWidth={1.5} />
              </div>
              <div>
                <p className={`text-xl font-black ${count > 0 ? color : "text-gray-300"}`}>{count}</p>
                <p className="text-[10px] text-gray-400 leading-tight">{label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Waitlist shortcut */}
      <div className="mb-5 bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <ListOrdered className="w-4 h-4 text-indigo-500" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-800">Waitlist — Lista de Espera</p>
            <p className="text-[10px] text-gray-400">Leads captados pelo site, modal e /pre-acesso · entrada no CRM</p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link
            href="/admin/super/waitlist"
            className="text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition-colors"
          >
            Ver waitlist →
          </Link>
          <Link
            href="/admin/super/leads"
            className="text-xs font-medium text-gray-500 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
          >
            Central →
          </Link>
        </div>
      </div>

      {/* Error */}
      {typeError && (
        <div className="mb-3 bg-red-50 border border-red-100 rounded-xl px-4 py-2 text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          {typeError}
        </div>
      )}
      {error && (
        <div className="mb-5 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          {error === "unauthenticated" || error === "forbidden"
            ? "Acesso restrito a administradores."
            : error === "service_role_missing"
              ? "SUPABASE_SERVICE_ROLE_KEY não configurada — leads indisponíveis."
              : error}
        </div>
      )}

      {/* Source filter */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center gap-1 text-[10px] text-gray-400 mr-1">
          <Target className="w-3 h-3" /> Origem:
        </div>
        {SOURCE_TABS.map((f) => {
          const cnt = f.key === "all" ? total : (bySrc[f.key] ?? 0);
          return (
            <button
              key={f.key}
              onClick={() => setSrcFilter(f.key)}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                srcFilter === f.key
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
              }`}
            >
              {f.label}{cnt > 0 ? ` (${cnt})` : ""}
            </button>
          );
        })}
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="flex items-center gap-1 text-[10px] text-gray-400 mr-1">
          <Clock className="w-3 h-3" /> Etapa:
        </div>
        {(["all", "new", "contacted", "invited", "accepted", "archived"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-[10px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
              statusFilter === s
                ? "bg-gray-800 text-white border-gray-800"
                : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
            }`}
          >
            {s === "all"
              ? `Todos (${total})`
              : `${STATUS_LABEL[s] ?? s}${byStatus[s] ? ` (${byStatus[s]})` : ""}`}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center mb-6">
          <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-400">Carregando leads...</p>
        </div>
      ) : !error && filtered.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-10 text-center mb-6">
          <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Nenhum lead para este filtro.</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold">Nome / Contato</th>
                <th className="text-left px-4 py-3 font-semibold">Origem</th>
                <th className="text-left px-4 py-3 font-semibold">Intenção</th>
                <th className="text-left px-4 py-3 font-semibold" title="Classificação visual">Tipo</th>
                <th className="text-left px-4 py-3 font-semibold">Etapa</th>
                <th className="text-left px-4 py-3 font-semibold">Criado em</th>
                <th className="text-right px-4 py-3 font-semibold">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((e) => {
                const phone    = e.phone?.replace(/\D/g, "") ?? "";
                const wa       = phone
                  ? `https://wa.me/55${phone}?text=${encodeURIComponent(`Olá ${e.name}! Obrigado pelo interesse na Lokat OS.`)}`
                  : null;
                const srcLbl   = getSourceLabel(e.source);
                const srcCls   = SOURCE_COLOR[srcLbl] ?? "bg-gray-50 text-gray-500 border-gray-100";
                const accBadge = getAccountTypeBadge(e.account_type);
                return (
                  <tr key={e.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 text-xs">{e.name}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{e.email}</p>
                      {e.phone && <p className="text-[10px] text-gray-400">{e.phone}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${srcCls}`}>
                        {srcLbl}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[10px] text-gray-500 max-w-[160px]">
                      <p className="line-clamp-2">{getIntentLabel(e.interest)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={e.account_type ?? ""}
                        disabled={typeUpdating === e.id}
                        onChange={(ev) => void updateAccountType(e.id, ev.target.value || null)}
                        title="Classificar tipo comercial"
                        className="text-[10px] border border-gray-200 rounded-lg px-1.5 py-0.5 outline-none focus:border-indigo-400 bg-white disabled:opacity-60 transition-colors max-w-[130px]"
                      >
                        <option value="">Não classificado</option>
                        {CANONICAL_ACCOUNT_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      {e.segment && <p className="text-[10px] text-gray-400 mt-1">{e.segment}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${STATUS_COLOR[e.status] ?? "bg-gray-50 text-gray-500"}`}>
                        {STATUS_LABEL[e.status] ?? e.status}
                      </span>
                      {e.status === "accepted" && (
                        <p className="text-[9px] text-emerald-600 font-semibold mt-1">OS ativo</p>
                      )}
                      {e.status === "invited" && (
                        <p className="text-[9px] text-purple-500 font-medium mt-1">Convite enviado</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[10px] text-gray-400 whitespace-nowrap">
                      {new Date(e.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => { setAgenteLead(e); setAgenteTone("consultivo"); setAgenteObj("agendar_demo"); setAgenteResult(""); }}
                          title="Agente IA"
                          className="p-1.5 rounded-lg hover:bg-violet-50 text-violet-400 transition-colors"
                        >
                          <Bot className="w-4 h-4" />
                        </button>
                        {wa && (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="WhatsApp"
                            className="p-1.5 rounded-lg hover:bg-green-50 text-green-500 transition-colors"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </a>
                        )}
                        <Link
                          href="/admin/super/waitlist"
                          title="Ver na waitlist"
                          className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-400 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* Pipeline */}
      <div className="mb-6 bg-white border border-gray-100 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-gray-800">Pipeline comercial</p>
          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
            Em preparação
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {PIPELINE_STAGES.map((stage) => (
            <div key={stage.key} className={`rounded-xl border p-3 text-center ${stage.color}`}>
              <p className="text-xl font-black">{byStatus[stage.key] ?? 0}</p>
              <p className="text-[10px] font-medium mt-0.5">{stage.label}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-3">
          Etapas baseadas no status da waitlist. Drag-and-drop e pipeline completo em sprint futura.
        </p>
      </div>

      {/* AI Agent */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-violet-50 rounded-xl flex items-center justify-center">
              <Bot className="w-4 h-4 text-violet-400" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-800">Agente IA de Leads</p>
              <p className="text-[10px] text-gray-400">Qualificação, follow-up e alertas automáticos</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
            <Lock className="w-2.5 h-2.5" /> Desativado
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowAiInfo((v) => !v)}
            className="text-xs font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-100 px-3 py-1.5 rounded-xl transition-colors"
          >
            Saber mais
          </button>
          <button className="flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-xl cursor-not-allowed opacity-60">
            <Lock className="w-3 h-3" /> Ativar agente — plano superior
          </button>
        </div>
        {showAiInfo && (
          <div className="mt-3 p-3 bg-violet-50 border border-violet-100 rounded-xl text-xs text-violet-700 space-y-1">
            <p className="font-bold text-violet-800 mb-1">O que o Agente IA fará quando ativado:</p>
            {[
              "Qualificar leads automaticamente com base em respostas",
              "Alertar quando um lead ficar sem resposta por X horas",
              "Sugerir mensagem de follow-up personalizada",
              "Encaminhar para humano quando necessário",
            ].map((item) => (
              <p key={item} className="flex items-center gap-1.5">
                <ChevronRight className="w-3 h-3" />{item}
              </p>
            ))}
            <p className="text-[10px] text-violet-500 mt-2">
              Disponível em plano superior. Fale com a LOKAT para ativar.
            </p>
          </div>
        )}
      </div>

      {/* Agente IA modal */}
      {agenteLead && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setAgenteLead(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center">
                  <Bot className="w-4 h-4 text-violet-600" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-bold text-gray-800">Agente IA comercial</p>
              </div>
              <button
                onClick={() => setAgenteLead(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                <p className="text-xs font-bold text-gray-800">{agenteLead.name}</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    getSourceLabel(agenteLead.source),
                    STATUS_LABEL[agenteLead.status] ?? agenteLead.status,
                    ...(agenteLead.interest ? [getIntentLabel(agenteLead.interest)] : []),
                  ].map((tag) => (
                    <span key={tag} className="text-[10px] bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-lg">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3 pt-1.5 border-t border-gray-200 mt-1.5">
                  <div>
                    <p className="text-[9px] text-gray-400 font-medium uppercase tracking-wide">Empresa / Nicho</p>
                    <p className="text-[10px] text-gray-700 font-semibold">{agenteLead.segment ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-400 font-medium uppercase tracking-wide">Acesso OS</p>
                    <p className={`text-[10px] font-semibold ${agenteLead.status === "accepted" ? "text-emerald-600" : agenteLead.status === "invited" ? "text-purple-600" : "text-gray-400"}`}>
                      {agenteLead.status === "accepted" ? "Ativo" : agenteLead.status === "invited" ? "Convidado" : "Sem acesso"}
                    </p>
                  </div>
                  {agenteLead.city && (
                    <div>
                      <p className="text-[9px] text-gray-400 font-medium uppercase tracking-wide">Cidade</p>
                      <p className="text-[10px] text-gray-700 font-semibold">{agenteLead.city}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Lead convertido — contexto de conta */}
              {(agenteLead.status === "invited" || agenteLead.status === "accepted") && (() => {
                const planned = getPlannedIntegrations(agenteLead.account_type);
                const accBadge = getAccountTypeBadge(agenteLead.account_type);
                return (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 space-y-2">
                    <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide">Lead convertido</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${accBadge.color}`}>
                        {accBadge.label}
                      </span>
                      <span className={`text-[10px] font-semibold ${agenteLead.status === "accepted" ? "text-emerald-600" : "text-purple-600"}`}>
                        {agenteLead.status === "accepted" ? "• OS ativo" : "• Convite enviado"}
                      </span>
                    </div>
                    {planned.length > 0 && (
                      <div>
                        <p className="text-[9px] text-indigo-500 font-medium mb-1">Integrações planejadas para este perfil:</p>
                        <div className="flex flex-wrap gap-1">
                          {planned.map((key) => {
                            const t = INTEGRATION_TYPES.find((t) => t.key === key);
                            return t ? (
                              <span key={key} className="text-[9px] font-medium text-indigo-600 bg-white border border-indigo-100 px-1.5 py-0.5 rounded-md">
                                {t.label}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Tom da abordagem</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {AGENT_TONES.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setAgenteTone(key)}
                      className={`text-[11px] font-medium px-3 py-2 rounded-xl border transition-colors text-left ${
                        agenteTone === key
                          ? "bg-violet-600 text-white border-violet-600"
                          : "bg-white text-gray-600 border-gray-200 hover:border-violet-200"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Objetivo</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {AGENT_OBJECTIVES.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setAgenteObj(key)}
                      className={`text-[11px] font-medium px-3 py-2 rounded-xl border transition-colors text-left ${
                        agenteObj === key
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-gray-600 border-gray-200 hover:border-indigo-200"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setAgenteResult(generateAgenteSuggestion(agenteLead, agenteTone, agenteObj))}
                className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
              >
                <Bot className="w-4 h-4" />
                Gerar abordagem
              </button>

              {agenteResult && (
                <div className="bg-violet-50 border border-violet-100 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-violet-700 uppercase tracking-wide mb-2">Sugestão gerada</p>
                  <pre className="text-[11px] text-violet-900 whitespace-pre-wrap font-sans leading-relaxed">
                    {agenteResult}
                  </pre>
                  <p className="text-[9px] text-violet-400 mt-2">Sugestão local baseada nos dados do lead. Revise antes de usar.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
