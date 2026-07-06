"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Clock, CheckCircle2, Mail, Phone, MapPin, Tag, Filter,
  RefreshCw, Copy, Check, UserCheck, Archive, Send, Users, Trash2, AlertTriangle,
} from "lucide-react";

type WaitlistEntry = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  account_type: string;
  city: string | null;
  segment: string | null;
  interest: string | null;
  social_or_site: string | null;
  source: string | null;
  status: string;
  beta_months_granted: number | null;
  notes: string | null;
  created_at: string;
};

type ApiResponse = {
  ok: boolean;
  entries?: WaitlistEntry[];
  total?: number;
  code?: string;
  message?: string;
};

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

const ACCOUNT_LABEL: Record<string, string> = {
  agency:       "Agência",
  business:     "Empresa",
  professional: "Profissional",
  interested:   "Interessado",
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

export default function WaitlistPage() {
  const [entries, setEntries]     = useState<WaitlistEntry[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [filter, setFilter]       = useState<string>("all");
  const [updating, setUpdating]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const res = await fetch(`/api/admin/waitlist${params}`);
      const json = await res.json() as ApiResponse;
      if (!json.ok) {
        setError(json.message ?? json.code ?? "Erro ao carregar lista");
        return;
      }
      setEntries(json.entries ?? []);
      setTotal(json.total ?? 0);
    } catch {
      setError("Erro de rede ao carregar lista beta.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    try {
      await fetch(`/api/admin/waitlist`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      await load();
    } finally {
      setUpdating(null);
    }
  }

  async function deleteEntry(id: string) {
    if (!confirm("Apagar este registro definitivamente? Esta ação não pode ser desfeita.")) return;
    setUpdating(id);
    try {
      await fetch(`/api/admin/waitlist?id=${id}`, { method: "DELETE" });
      await load();
    } finally {
      setUpdating(null);
    }
  }

  function whatsappMsg(entry: WaitlistEntry) {
    const phone = entry.phone?.replace(/\D/g, "") ?? "";
    const text = encodeURIComponent(
      `Olá ${entry.name}! Seu acesso beta à Lokat OS foi liberado. Acesse: https://app.lokat.com.br/criar-conta`
    );
    return phone ? `https://wa.me/55${phone}?text=${text}` : null;
  }

  const counts: Record<string, number> = {};
  for (const e of entries) counts[e.status] = (counts[e.status] ?? 0) + 1;

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
        <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-gray-900 text-white rounded-xl">
          Lista Beta
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Lista Beta</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} interessados na fila de acesso</p>
        </div>
        <button
          onClick={() => void load()}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 border border-gray-200 rounded-xl px-3 py-2 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {["all", "new", "contacted", "invited", "accepted", "archived"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
              filter === s
                ? "bg-indigo-600 text-white border-transparent"
                : "border-gray-200 text-gray-600 hover:border-indigo-300"
            }`}
          >
            {s === "all" ? "Todos" : STATUS_LABEL[s]}
            {s !== "all" && counts[s] ? ` (${counts[s]})` : ""}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      {!loading && !error && entries.length === 0 && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-6 space-y-2">
          <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Nenhum registro encontrado
          </div>
          <p className="text-xs text-amber-700 leading-relaxed">
            A tabela <code className="bg-amber-100 px-1 rounded">launch_waitlist</code> existe mas retornou 0 registros com permissão de leitura do service role.
          </p>
          <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
            <li>Verifique se <code className="bg-amber-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> está configurada na Vercel (Settings → Environment Variables).</li>
            <li>Confirme que a chave aponta para o mesmo projeto que <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code>.</li>
            <li>Se o SQL 74 foi rodado, execute <code className="bg-amber-100 px-1 rounded">SELECT * FROM launch_waitlist</code> no SQL Editor para confirmar os dados existem.</li>
          </ul>
        </div>
      )}

      {entries.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold">Nome / Contato</th>
                <th className="text-left px-4 py-3 font-semibold">Tipo</th>
                <th className="text-left px-4 py-3 font-semibold">Cidade / Segmento</th>
                <th className="text-left px-4 py-3 font-semibold">Interesse</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Entrada</th>
                <th className="text-right px-4 py-3 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entries.map((e) => {
                const wa = whatsappMsg(e);
                return (
                  <tr key={e.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{e.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-xs text-gray-500">{e.email}</span>
                        <CopyButton text={e.email} />
                      </div>
                      {e.phone && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">{e.phone}</span>
                          <CopyButton text={e.phone} />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold text-gray-700">
                        {ACCOUNT_LABEL[e.account_type] ?? e.account_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {e.city && <div className="flex items-center gap-1"><MapPin className="w-3 h-3" />{e.city}</div>}
                      {e.segment && <div className="flex items-center gap-1 mt-0.5"><Tag className="w-3 h-3" />{e.segment}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[180px]">
                      <p className="line-clamp-2">{e.interest ?? "—"}</p>
                      {e.social_or_site && <p className="text-indigo-600 truncate mt-0.5">{e.social_or_site}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-semibold px-2 py-1 rounded-lg ${STATUS_COLOR[e.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABEL[e.status] ?? e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(e.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {e.status === "new" && (
                          <button
                            disabled={updating === e.id}
                            onClick={() => updateStatus(e.id, "contacted")}
                            title="Marcar como contatado"
                            className="p-1.5 rounded-lg hover:bg-yellow-50 text-yellow-600 transition-colors disabled:opacity-50"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                        )}
                        {(e.status === "new" || e.status === "contacted") && (
                          <button
                            disabled={updating === e.id}
                            onClick={() => updateStatus(e.id, "invited")}
                            title="Marcar como convidado"
                            className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600 transition-colors disabled:opacity-50"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        {e.status !== "accepted" && e.status !== "archived" && (
                          <button
                            disabled={updating === e.id}
                            onClick={() => updateStatus(e.id, "accepted")}
                            title="Aceitar no beta"
                            className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors disabled:opacity-50"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                        {wa && (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Copiar mensagem WhatsApp"
                            className="p-1.5 rounded-lg hover:bg-green-50 text-green-500 transition-colors"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                        {e.status !== "archived" && (
                          <button
                            disabled={updating === e.id}
                            onClick={() => updateStatus(e.id, "archived")}
                            title="Arquivar"
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors disabled:opacity-50"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          disabled={updating === e.id}
                          onClick={() => deleteEntry(e.id)}
                          title="Apagar definitivamente"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
  );
}
