"use client";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Send, Phone, Mail, MessageSquare, HelpCircle } from "lucide-react";

export default function ClientSuportePage() {
  const [msg, setMsg] = useState("");

  const faqs = [
    { q: "Como aprovar um conteúdo?", a: "Vá em 'Aprovações' no menu lateral, veja o preview e clique em Aprovar ou Reprovar." },
    { q: "Como fazer uma solicitação?", a: "Clique em 'Solicitações' e depois em 'Nova solicitação'. Descreva o que você precisa." },
    { q: "Quando meu relatório fica pronto?", a: "Os relatórios são gerados todo dia 1° do mês com os dados do mês anterior." },
    { q: "Posso solicitar conteúdos extras?", a: "Sim! Abra uma solicitação descrevendo o conteúdo. Nossa equipe avaliará e retornará em até 24h." },
  ];

  return (
    <div>
      <PageHeader title="Suporte" description="Precisa de ajuda? Estamos aqui." />
      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-bold text-gray-800 mb-3">Perguntas Frequentes</h2>
          <div className="space-y-2">
            {faqs.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className="text-sm font-bold text-gray-800 mb-1 flex items-center gap-1.5"><HelpCircle className="w-4 h-4 text-gray-400 flex-shrink-0" strokeWidth={1.5} />{f.q}</p>
                <p className="text-xs text-gray-600 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-bold text-gray-800 mb-3">Fale com a equipe</h2>
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="Escreva sua mensagem aqui..."
                className="w-full h-32 text-sm border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-400 resize-none mb-3"
              />
              <button className="flex items-center gap-2 text-sm font-medium text-white bg-indigo-600 px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors">
                <Send className="w-4 h-4" />
                Enviar mensagem
              </button>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4">Contato direto</h3>
            <div className="space-y-3">
              {[
                { icon: Phone, label: "WhatsApp", value: "(11) 99999-0000" },
                { icon: Mail, label: "Email", value: "atendimento@lokat.com.br" },
                { icon: MessageSquare, label: "Instagram", value: "@lokatagencia" },
              ].map((c) => (
                <div key={c.label} className="flex items-center gap-3">
                  <c.icon className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">{c.label}</p>
                    <p className="text-xs font-medium text-gray-800">{c.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
