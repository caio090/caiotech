"use client";
import { PageHeader } from "@/components/page-header";
import { MessageSquare, QrCode, Zap, Globe, Bell, Send, Users, CheckSquare, Info } from "lucide-react";

const USE_CASES = [
  { icon: CheckSquare, label: "Enviar aprovação", desc: "Link de aprovação de arte/vídeo direto pelo WhatsApp" },
  { icon: Users,       label: "Atendimento",     desc: "Canal de comunicação com o cliente do cardápio digital" },
  { icon: Send,        label: "Follow-up",        desc: "Automação de follow-up no pipeline comercial" },
  { icon: Bell,        label: "Alertas",          desc: "Notificação ao operacional quando cliente aprova ou reprova" },
];

const PROVIDERS = [
  {
    slug:   "evolution",
    name:   "Evolution API",
    tag:    "Piloto recomendado",
    tagCls: "bg-indigo-50 text-indigo-700 border-indigo-100",
    desc:   "Self-hosted ou managed. QR Code simples, sem aprovação Meta. Ideal para testar com poucos clientes.",
    pros:   ["QR Code rápido", "Custo baixo", "Sem burocracia Meta"],
    cons:   ["Não oficial", "1 número por instância", "Risco de ban se mal usado"],
  },
  {
    slug:   "whatsapp_cloud",
    name:   "WhatsApp Cloud API",
    tag:    "Escala / Oficial",
    tagCls: "bg-emerald-50 text-emerald-700 border-emerald-100",
    desc:   "Meta Business Platform. Templates aprovados, múltiplos números, oficial e escalável.",
    pros:   ["Oficial Meta", "Multi-número", "Sem risco de ban"],
    cons:   ["Onboarding Meta", "Templates aprovados", "Custo por mensagem"],
  },
];

export default function WhatsAppPage() {
  return (
    <div>
      <PageHeader title="WhatsApp" description="Canal de comunicação e aprovação via WhatsApp — em desenvolvimento" />

      {/* Banner em breve */}
      <div className="mb-6 flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
        <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-700 space-y-1">
          <p className="font-semibold text-amber-800">Integração em planejamento</p>
          <p>A conexão via WhatsApp ainda não está implementada. Esta página mostra o que está planejado e como funcionará.</p>
          <p>Consulte <span className="font-mono">docs/DATA_SOURCES_AND_CLIENT_REPORTS_PLAN.md</span> para o plano técnico completo.</p>
        </div>
      </div>

      {/* Usos previstos */}
      <div className="mb-6">
        <p className="text-sm font-bold text-gray-900 mb-3">Para que será usado</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {USE_CASES.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Provedores */}
      <div className="mb-6">
        <p className="text-sm font-bold text-gray-900 mb-3">Caminhos técnicos</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PROVIDERS.map((p) => (
            <div key={p.slug} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-bold text-gray-900">{p.name}</span>
                <span className={`ml-auto text-[10px] font-semibold border px-1.5 py-0.5 rounded-full ${p.tagCls}`}>{p.tag}</span>
              </div>
              <p className="text-xs text-gray-500">{p.desc}</p>
              <div className="space-y-1">
                {p.pros.map((pro) => (
                  <p key={pro} className="text-[11px] text-emerald-600 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-emerald-400 flex-shrink-0" /> {pro}
                  </p>
                ))}
                {p.cons.map((con) => (
                  <p key={con} className="text-[11px] text-gray-400 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" /> {con}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Placeholder conexão */}
      <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
        <QrCode className="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p className="text-sm font-semibold text-gray-600 mb-1">Conectar via QR Code</p>
        <p className="text-xs text-gray-400 mb-2">Em breve — conecte um número WhatsApp para enviar aprovações e receber respostas dos clientes.</p>
        <div className="flex items-center justify-center gap-3 mt-4">
          <span className="inline-flex items-center gap-1.5 text-[11px] bg-gray-50 border border-gray-100 text-gray-400 px-3 py-1.5 rounded-full">
            <Zap className="w-3 h-3" /> Evolution API — piloto
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] bg-gray-50 border border-gray-100 text-gray-400 px-3 py-1.5 rounded-full">
            <Globe className="w-3 h-3" /> WhatsApp Cloud — escala
          </span>
        </div>
      </div>
    </div>
  );
}
