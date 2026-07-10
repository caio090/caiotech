"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  RefreshCw, Copy, Check, Users, List, AlertTriangle,
  Mail, Send, UserCheck, Archive, Trash2, Phone, MapPin, Tag,
} from "lucide-react";
import type { UnifiedLead } from "@/app/api/admin/leads/route";
import { CANONICAL_ACCOUNT_TYPES, getAccountTypeBadge } from "@/lib/account-types";

type ApiResponse = {
  ok: boolean;
  leads?: UnifiedLead[];
  summary?: {
    total: number; waitlist: number; signups: number;
    new: number; contacted: number; invited: number; accepted: number; archived: number;
  };
  warnings?: string[];
  code?: string;
  message?: string;
};

const STATUS_LABEL: Record<string, string> = {
  new:           "Novo",
  novo:          "Novo",
  novo_cadastro: "Novo",
  contacted:     "Contatado",
  contatado:     "Contatado",
  invited:       "Convidado",
  convidado:     "Convidado",
  accepted:      "Aceito",
  aceito:        "Aceito",
  archived:      "Arquivado",
  arquivado:     "Arquivado",
  legacy:        "Legado",
};

const STATUS_COLOR: Record<string, string> = {
  new:           "bg-blue-50 text-blue-700",
  novo:          "bg-blue-50 text-blue-700",
  novo_cadastro: "bg-blue-50 text-blue-700",
  contacted:     "bg-yellow-50 text-yellow-700",
  contatado:     "bg-yellow-50 text-yellow-700",
  invited:       "bg-purple-50 text-purple-700",
  convidado:     "bg-purple-50 text-purple-700",
  accepted:      "bg-green-50 text-green-700",
  aceito:        "bg-green-50 text-green-700",
  archived:      "bg-gray-100 text-gray-500",
  arquivado:     "bg-gray-100 text-gray-500",
  legacy:        "bg-gray-50 text-gray-400",
};

const SOURCE_LABEL: Record<string, string> = {
  waitlist:           "Beta",
  admin_signups_view: "Legado",
  novo_cadastro:      "Cadastro legado",
  site_modal:         "Agendamento",
  site_conversation:  "Agendamento",
  "pre-acesso":       "Beta",
  pre_acesso:         "Beta",
  beta:               "Beta",
  landing:            "Site",
  website:            "Site",
  diagnostico:        "Diagnóstico",
  diagnostic:         "Diagnóstico",
  typebot:            "Typebot",
  whatsapp:           "WhatsApp",
  manual:             "Manual",
};

const ACCOUNT_LABEL: Record<string, string> = {
  novo_cadastro: "Cadastro legado",
  agency:        "Agência",
  business:      "Empresa",
  professional:  "Profissional",
  interested:    "Interessado",
};

const ROLE_LABEL: Record<string, string> = {
  novo_cadastro: "Legado",
  cliente:       "Cliente",
  admin:         "Admin",
  super_admin:   "Super Admin",
  agency:        "Agência",
  team:          "Equipe",
  operacional:   "Operacional",
};

const SOURCE_COLOR: Record<string, string> = {
  waitlist:           "bg-indigo-50 text-indigo-700",
  admin_signups_view: "bg-gray-50 text-gray-500",
  novo_cadastro:      "bg-gray-50 text-gray-500",
  Agendamento:        "bg-indigo-50 text-indigo-700",
  Beta:               "bg-purple-50 text-purple-700",
  Site:               "bg-blue-50 text-blue-700",
  Diagnóstico:        "bg-amber-50 text-amber-700",
  Typebot:            "bg-emerald-50 text-emerald-700",
  WhatsApp:           "bg-green-50 text-green-700",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button onClick={copy} title="Copiar" className="p-1 rounded hover:bg-gray-100 transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
    </button>
  );
}

export default function LeadsPage() {
  const [leads, setLeads]       = useState<UnifiedLead[]>([]);
  const [summary, setSummary]   = useState<ApiResponse["summary"]>();
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [filter, setFilter]     = useState<string>("all");
  const [updating, setUpdating]         = useState<string | null>(null);
  const [typeUpdating, setTypeUpdating] = useState<string | null>(null);
  const [typeError, setTypeError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/leads");
      const json = await res.json() as ApiResponse;
      if (!json.ok) {
        setError(json.message ?? json.code ?? "Erro ao carregar leads");
        return;
      }
      setLeads(json.leads ?? []);
      setSummary(json.summary);
      setWarnings(json.warnings ?? []);
    } catch {
      setError("Erro de rede ao carregar leads.");
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    try {
      await fetch("/api/admin/waitlist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      await load();
    } finally {
      setUpdating(null);
    }
  }

  async function deleteLead(id: string) {
    if (!confirm("Apagar este registro definitivamente? Esta ação não pode ser desfeita.")) return;
    setUpdating(id);
    try {
      await fetch(`/api/admin/waitlist?id=${id}`, { method: "DELETE" });
      await load();
    } finally {
      setUpdating(null);
    }
  }

  async function updateAccountType(id: string, account_type: string | null) {
    const prevType = leads.find((l) => l.id === id)?.account_type ?? null;
    setTypeUpdating(id);
    setTypeError(null);
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, account_type } : l));
    try {
      const res = await fetch("/api/admin/waitlist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, account_type }),
      });
      const data = await res.json() as { ok: boolean; message?: string; code?: string };
      if (!res.ok || !data.ok) {
        setLeads((prev) => prev.map((l) => l.id === id ? { ...l, account_type: prevType } : l));
        setTypeError(data.message ?? `Erro ${res.status}`);
        setTimeout(() => setTypeError(null), 4000);
      }
    } catch {
      setLeads((prev) => prev.map((l) => l.id === id ? { ...l, account_type: prevType } : l));
      setTypeError("Erro de conexão.");
      setTimeout(() => setTypeError(null), 4000);
    } finally {
      setTypeUpdating(null);
    }
  }

  const filtered = filter === "all"
    ? leads
    : filter === "waitlist" || filter === "admin_signups_view"
      ? leads.filter((l) => l.source === filter)
      : leads.filter((l) => l.status === filter);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Super admin tabs */}
      <div className="flex gap-2 mb-2">
        <Link
          href="/admin/super/accounts"
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
        >
          <Users className="w-3.5 h-3.5" />
          Contas
        </Link>
        <Link
          href="/admin/super/waitlist"
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
        >
          <List className="w-3.5 h-3.5" />
          Lista Beta
        </Link>
        <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-gray-900 text-white rounded-xl">
          Central de Leads
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Central de Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {summary ? `${summary.waitlist} da waitlist beta · ${summary.signups} cadastros legados` : "Carregando..."}
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 border border-gray-200 rounded-xl px-3 py-2 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: summary.total, color: "text-gray-900" },
            { label: "Waitlist beta", value: summary.waitlist, color: "text-indigo-600" },
            { label: "Cadastros legados", value: summary.signups, color: "text-gray-500" },
            { label: "Aceitos no beta", value: summary.accepted, color: "text-green-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Warnings from sources */}
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 space-y-1">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              {w}
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "all",               label: "Todos" },
          { key: "waitlist",          label: "Waitlist beta" },
          { key: "admin_signups_view",label: "Legados" },
          { key: "new",               label: "Novos" },
          { key: "contacted",         label: "Contatados" },
          { key: "invited",           label: "Convidados" },
          { key: "accepted",          label: "Aceitos" },
          { key: "archived",          label: "Arquivados" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
              filter === f.key
                ? "bg-indigo-600 text-white border-transparent"
                : "border-gray-200 text-gray-600 hover:border-indigo-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {typeError && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-2 text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          {typeError}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 px-5 py-10 text-center text-sm text-gray-400">
          Nenhum lead encontrado para este filtro.
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold">Nome / Contato</th>
                <th className="text-left px-4 py-3 font-semibold">Tipo / Perfil</th>
                <th className="text-left px-4 py-3 font-semibold">Origem</th>
                <th className="text-left px-4 py-3 font-semibold">Cidade</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-right px-4 py-3 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((l) => {
                const isLegacy = l.source === "admin_signups_view";
                const phone = l.phone?.replace(/\D/g, "") ?? "";
                const wa = phone
                  ? `https://wa.me/55${phone}?text=${encodeURIComponent(`Olá ${l.name}! Seu acesso beta à Lokat OS foi liberado.`)}`
                  : null;
                return (
                  <tr key={`${l.source}-${l.id}`} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{l.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-xs text-gray-500">{l.email}</span>
                        <CopyButton text={l.email} />
                      </div>
                      {l.phone && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">{l.phone}</span>
                          <CopyButton text={l.phone} />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {l.source === "waitlist" ? (
                        <div>
                          <select
                            value={l.account_type ?? ""}
                            disabled={typeUpdating === l.id}
                            onChange={(e) => void updateAccountType(l.id, e.target.value || null)}
                            title="Classificar tipo comercial"
                            className="text-[10px] border border-gray-200 rounded-lg px-1.5 py-0.5 outline-none focus:border-indigo-400 bg-white disabled:opacity-60 transition-colors max-w-[130px]"
                          >
                            <option value="">Não classificado</option>
                            {CANONICAL_ACCOUNT_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                          {l.account_type && (() => {
                            const badge = getAccountTypeBadge(l.account_type);
                            return (
                              <span className={`inline-flex items-center mt-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${badge.cls}`}>
                                {badge.label}
                              </span>
                            );
                          })()}
                        </div>
                      ) : (
                        <div>
                          {(() => {
                            const badge = getAccountTypeBadge(l.account_type);
                            return (
                              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badge.cls}`}>
                                <Tag className="w-2.5 h-2.5" />
                                {badge.label}
                              </span>
                            );
                          })()}
                        </div>
                      )}
                      {l.role && <div className="text-gray-400 mt-0.5">{ROLE_LABEL[l.role] ?? l.role}</div>}
                      {l.segment && <div className="text-gray-400 mt-0.5">{l.segment}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${SOURCE_COLOR[l.source] ?? "bg-gray-50 text-gray-500"}`}>
                        {SOURCE_LABEL[l.source] ?? l.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {l.city && <div className="flex items-center gap-1"><MapPin className="w-3 h-3" />{l.city}</div>}
                      {l.created_at && <div className="text-gray-400 mt-0.5">{new Date(l.created_at).toLocaleDateString("pt-BR")}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-semibold px-2 py-1 rounded-lg ${STATUS_COLOR[l.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABEL[l.status] ?? l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {isLegacy ? (
                          <span className="text-[10px] text-gray-400 italic">Origem legada</span>
                        ) : (
                          <>
                            {l.status === "new" && (
                              <button disabled={updating === l.id} onClick={() => updateStatus(l.id, "contacted")} title="Contatado"
                                className="p-1.5 rounded-lg hover:bg-yellow-50 text-yellow-600 transition-colors disabled:opacity-50">
                                <Mail className="w-4 h-4" />
                              </button>
                            )}
                            {(l.status === "new" || l.status === "contacted") && (
                              <button disabled={updating === l.id} onClick={() => updateStatus(l.id, "invited")} title="Convidar"
                                className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600 transition-colors disabled:opacity-50">
                                <Send className="w-4 h-4" />
                              </button>
                            )}
                            {l.status !== "accepted" && l.status !== "archived" && (
                              <button disabled={updating === l.id} onClick={() => updateStatus(l.id, "accepted")} title="Aceitar"
                                className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors disabled:opacity-50">
                                <UserCheck className="w-4 h-4" />
                              </button>
                            )}
                            {wa && (
                              <a href={wa} target="_blank" rel="noopener noreferrer" title="WhatsApp"
                                className="p-1.5 rounded-lg hover:bg-green-50 text-green-500 transition-colors">
                                <Phone className="w-4 h-4" />
                              </a>
                            )}
                            {l.status !== "archived" && (
                              <button disabled={updating === l.id} onClick={() => updateStatus(l.id, "archived")} title="Arquivar"
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors disabled:opacity-50">
                                <Archive className="w-4 h-4" />
                              </button>
                            )}
                            <button disabled={updating === l.id} onClick={() => deleteLead(l.id)} title="Apagar definitivamente"
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors disabled:opacity-50">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
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

      {/* Legend */}
      <p className="text-[11px] text-gray-400 text-center">
        Ações de arquivar/apagar afetam apenas registros da <strong>Waitlist Beta</strong> (launch_waitlist).
        Registros &quot;Legados&quot; (admin_signups_view) são somente leitura — mapear tabela base antes de ativar ações.
      </p>
    </div>
  );
}
