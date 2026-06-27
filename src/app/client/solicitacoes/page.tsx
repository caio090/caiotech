"use client";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Plus, Send, MessageSquare } from "lucide-react";

export default function ClientSolicitacoesPage() {
  const [showForm, setShowForm] = useState(false);
  const [title,   setTitle]   = useState("");
  const [body,    setBody]    = useState("");
  const [sent,    setSent]    = useState(false);

  function handleSend() {
    if (!title.trim()) return;
    setSent(true);
    setShowForm(false);
    setTitle("");
    setBody("");
    setTimeout(() => setSent(false), 4000);
  }

  return (
    <div>
      <PageHeader title="Solicitações" description="Peça ajustes, novos conteúdos ou tire dúvidas">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 text-sm font-medium text-white bg-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova solicitação
        </button>
      </PageHeader>

      {sent && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700 font-medium">
          ✓ Solicitação enviada com sucesso. A equipe será notificada.
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl border border-indigo-100 p-5 mb-5">
          <h3 className="text-sm font-bold text-gray-800 mb-3">Nova Solicitação</h3>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-3 outline-none focus:border-indigo-400"
            placeholder="Título da solicitação"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-3 outline-none focus:border-indigo-400 h-24 resize-none"
            placeholder="Descreva o que você precisa..."
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSend}
              disabled={!title.trim()}
              className="flex items-center gap-2 text-sm font-medium text-white bg-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
              Enviar solicitação
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100">
        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
          <MessageSquare className="w-6 h-6 text-indigo-400" />
        </div>
        <p className="text-sm font-bold text-gray-700 mb-1">Nenhuma solicitação enviada ainda</p>
        <p className="text-xs text-gray-400 text-center max-w-xs">
          Use o botão &quot;Nova solicitação&quot; para pedir ajustes, tirar dúvidas ou solicitar conteúdos.
        </p>
      </div>
    </div>
  );
}
