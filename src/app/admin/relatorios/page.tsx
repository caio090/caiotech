"use client";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import {
  BarChart3, FileText, Download, X, Mail, MessageCircle,
  CalendarDays, Clock, Building2, ChevronDown,
} from "lucide-react";

// ── Modal de exportação ────────────────────────────────────────
type ExportFormat = "pdf" | "png" | "whatsapp" | "email" | "agendar";

const EXPORT_OPTIONS: { value: ExportFormat; label: string; desc: string; available: boolean }[] = [
  { value: "pdf",      label: "Gerar PDF",        desc: "Download direto em PDF",         available: false },
  { value: "png",      label: "Gerar PNG",         desc: "Imagem do relatório",             available: false },
  { value: "whatsapp", label: "Enviar por WhatsApp",desc: "Compartilhar via WhatsApp",      available: false },
  { value: "email",    label: "Enviar por e-mail", desc: "Enviar para o cliente",           available: false },
  { value: "agendar",  label: "Agendar envio",     desc: "Envio automático por data",       available: false },
];

function ExportModal({ onClose }: { onClose: () => void }) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
              <Download className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-sm font-bold text-gray-900">Exportar relatório</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 mb-5">
          {EXPORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelectedFormat(opt.value)}
              className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 text-left transition-all ${
                selectedFormat === opt.value
                  ? "border-indigo-400 bg-indigo-50"
                  : "border-gray-100 hover:border-gray-200 bg-white"
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                <p className="text-xs text-gray-400">{opt.desc}</p>
              </div>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex-shrink-0 ml-2">
                Em breve
              </span>
            </button>
          ))}
        </div>

        <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs text-gray-500 mb-4">
          As funções de exportação serão liberadas com a integração de dados reais do cliente.
          Por enquanto, é possível visualizar o relatório em tela e copiar manualmente.
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 border border-gray-200 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────
export default function AdminRelatoriosPage() {
  const [showExport, setShowExport] = useState(false);

  return (
    <div>
      <PageHeader title="Relatórios" description="Performance por cliente">
        <button
          onClick={() => setShowExport(true)}
          className="flex items-center gap-2 text-sm font-medium text-white bg-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Exportar relatório
        </button>
      </PageHeader>

      {/* Estado vazio */}
      <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200 mb-6">
        <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-7 h-7 text-gray-300" />
        </div>
        <p className="text-sm font-semibold text-gray-600 mb-1">Nenhum relatório gerado ainda</p>
        <p className="text-xs text-gray-400 max-w-xs mx-auto">
          Os relatórios serão gerados automaticamente conforme os dados de Instagram e conteúdo forem sendo coletados.
        </p>
      </div>

      {/* Módulos em preparação */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          {
            icon: BarChart3,
            title: "Performance Instagram",
            desc: "Alcance, impressões, engajamento e seguidores por período.",
            color: "bg-pink-50 text-pink-600",
          },
          {
            icon: FileText,
            title: "Conteúdo publicado",
            desc: "Posts aprovados, publicados e taxa de aprovação por cliente.",
            color: "bg-indigo-50 text-indigo-600",
          },
          {
            icon: CalendarDays,
            title: "Calendário de entregas",
            desc: "Visão mensal de conteúdos entregues vs. planejados.",
            color: "bg-emerald-50 text-emerald-600",
          },
          {
            icon: Building2,
            title: "Relatório por cliente",
            desc: "PDF consolidado com métricas, conteúdos e destaques.",
            color: "bg-amber-50 text-amber-600",
          },
          {
            icon: Mail,
            title: "Envio automático",
            desc: "Agendamento de relatórios mensais por e-mail ao cliente.",
            color: "bg-violet-50 text-violet-600",
          },
          {
            icon: MessageCircle,
            title: "Compartilhamento",
            desc: "Exportação em PDF/PNG ou envio via WhatsApp.",
            color: "bg-blue-50 text-blue-600",
          },
        ].map(({ icon: Icon, title, desc, color }) => (
          <div key={title} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-4.5 h-4.5" />
            </div>
            <p className="text-sm font-bold text-gray-800 mb-1">{title}</p>
            <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
            <div className="mt-3">
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                Em preparação
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3.5 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 flex items-start gap-2">
        <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span>
          Os relatórios serão ativados automaticamente quando a conexão Meta/Instagram estiver ativa e os primeiros dados coletados.
          Conecte a Meta em <strong>/admin/conexoes</strong> para iniciar o processo.
        </span>
      </div>

      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
    </div>
  );
}
