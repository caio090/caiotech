"use client";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { mockRequests } from "@/data/mock-data";
import { Plus, Send } from "lucide-react";

export default function ClientSolicitacoesPage() {
  const requests = mockRequests.filter((r) => r.clientId === "client-1");
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <PageHeader title="Solicitações" description="Peça ajustes, novos conteúdos ou tire dúvidas">
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 text-sm font-medium text-white bg-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" />
          Nova solicitação
        </button>
      </PageHeader>

      {showForm && (
        <div className="bg-white rounded-2xl border border-indigo-100 p-5 mb-5">
          <h3 className="text-sm font-bold text-gray-800 mb-3">Nova Solicitação</h3>
          <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-3 outline-none focus:border-indigo-400" placeholder="Título da solicitação" />
          <textarea className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-3 outline-none focus:border-indigo-400 h-24 resize-none" placeholder="Descreva o que você precisa..." />
          <button onClick={() => setShowForm(false)} className="flex items-center gap-2 text-sm font-medium text-white bg-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors">
            <Send className="w-4 h-4" />
            Enviar solicitação
          </button>
        </div>
      )}

      <div className="space-y-3">
        {requests.map((r) => (
          <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="text-sm font-bold text-gray-800">{r.title}</h3>
              <StatusBadge status={r.status as "pending"} />
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">{r.description}</p>
            <p className="text-xs text-gray-400 mt-2">{new Date(r.createdAt).toLocaleDateString("pt-BR")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
