"use client";
import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { Plus, Send, MessageSquare, Clock, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";

interface Request {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  open:           "Aberta",
  in_review:      "Em análise",
  in_progress:    "Em andamento",
  waiting_client: "Aguardando você",
  done:           "Concluída",
  archived:       "Arquivada",
};

function statusIcon(s: string) {
  if (s === "done")           return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />;
  if (s === "in_progress")    return <Clock className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />;
  if (s === "waiting_client") return <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />;
  return <Circle className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />;
}

export default function ClientSolicitacoesPage() {
  const [requests,  setRequests]  = useState<Request[]>([]);
  const [fetching,  setFetching]  = useState(isSupabaseConfigured);
  const [showForm,  setShowForm]  = useState(false);
  const [title,     setTitle]     = useState("");
  const [body,      setBody]      = useState("");
  const [sending,   setSending]   = useState(false);
  const [error,     setError]     = useState("");
  const [clientId,  setClientId]  = useState<string | null>(null);

  const loadRequests = useCallback(async (cid: string) => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("client_requests")
        .select("id, title, description, status, created_at")
        .eq("client_id", cid)
        .neq("status", "archived")
        .order("created_at", { ascending: false });
      setRequests((data ?? []) as Request[]);
    } catch {
      // table may not exist yet
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) { setFetching(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) { setFetching(false); return; }

        const { data: profile } = await supabase
          .from("profiles").select("client_id").eq("id", user.id).maybeSingle();
        const cid = (profile as { client_id?: string | null } | null)?.client_id;

        if (cid && !cancelled) {
          setClientId(cid);
          await loadRequests(cid);
        }
      } catch {}
      finally { if (!cancelled) setFetching(false); }
    })();
    return () => { cancelled = true; };
  }, [loadRequests]);

  async function handleSend() {
    if (!title.trim()) return;
    setError("");
    setSending(true);
    try {
      if (isSupabaseConfigured && clientId) {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        // Resolve o responsável pela conta do cliente (agency_id > owner_id > created_by)
        const { data: ownerRaw } = await supabase.rpc("get_request_owner_for_client", {
          p_client_id: clientId,
        });
        const ownerProfileId = (ownerRaw as string | null) ?? null;

        const { error: insertErr } = await supabase
          .from("client_requests")
          .insert({
            client_id:         clientId,
            requester_user_id: user?.id,
            owner_profile_id:  ownerProfileId,
            title:             title.trim(),
            description:       body.trim() || null,
            status:            "open",
            source:            "client_portal",
          });

        if (insertErr) {
          // If table doesn't exist (SQL 45 not run), show friendly error
          setError(
            insertErr.code === "42P01"
              ? "Sistema de solicitações ainda não ativado. Fale com a equipe."
              : "Erro ao enviar. Tente novamente."
          );
          setSending(false);
          return;
        }
        await loadRequests(clientId);
      }

      setShowForm(false);
      setTitle("");
      setBody("");
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <PageHeader title="Solicitações" description="Peça ajustes, novos conteúdos ou tire dúvidas">
        <button
          onClick={() => { setShowForm(!showForm); setError(""); }}
          className="flex items-center gap-2 text-sm font-medium text-white bg-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova solicitação
        </button>
      </PageHeader>

      {showForm && (
        <div className="bg-white rounded-2xl border border-indigo-100 p-5 mb-5">
          <h3 className="text-sm font-bold text-gray-800 mb-3">Nova Solicitação</h3>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-3 outline-none focus:border-indigo-400"
            placeholder="Título da solicitação"
            disabled={sending}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-3 outline-none focus:border-indigo-400 h-24 resize-none"
            placeholder="Descreva o que você precisa..."
            disabled={sending}
          />
          {error && (
            <p className="text-xs text-red-600 mb-3 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => { setShowForm(false); setError(""); }}
              disabled={sending}
              className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSend}
              disabled={!title.trim() || sending}
              className="flex items-center gap-2 text-sm font-medium text-white bg-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-40"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Enviar solicitação
            </button>
          </div>
        </div>
      )}

      {fetching ? (
        <div className="flex items-center gap-2 py-12 justify-center text-sm text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
        </div>
      ) : requests.length > 0 ? (
        <div className="space-y-2">
          {requests.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-start gap-3">
              {statusIcon(r.status)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{r.title}</p>
                {r.description && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{r.description}</p>
                )}
                <p className="text-[11px] text-gray-400 mt-1">
                  {new Date(r.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                r.status === "done"           ? "bg-emerald-100 text-emerald-700" :
                r.status === "in_progress"    ? "bg-blue-100 text-blue-700" :
                r.status === "waiting_client" ? "bg-amber-100 text-amber-700" :
                "bg-gray-100 text-gray-600"
              }`}>
                {STATUS_LABEL[r.status] ?? r.status}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
            <MessageSquare className="w-6 h-6 text-indigo-400" />
          </div>
          <p className="text-sm font-bold text-gray-700 mb-1">Nenhuma solicitação enviada ainda</p>
          <p className="text-xs text-gray-400 text-center max-w-xs">
            Use o botão &quot;Nova solicitação&quot; para pedir ajustes, tirar dúvidas ou solicitar conteúdos.
          </p>
        </div>
      )}
    </div>
  );
}
