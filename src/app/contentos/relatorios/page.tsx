import { PageHeader } from "@/components/page-header";
import { FileText, BarChart3, MessageSquare, Database, Calendar, ClipboardList } from "lucide-react";

export default async function ContentosRelatoriosPage() {
  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Resultados e análises da sua marca"
      />

      <div className="mb-6 bg-gray-50 border border-gray-200 rounded-2xl p-4 flex items-start gap-3">
        <FileText className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-gray-700">Relatórios em desenvolvimento</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Os relatórios mensais com dados digitais, resultados de campanha e recomendações para o próximo ciclo serão exibidos aqui.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[
          { icon: BarChart3,     color: "purple", label: "Relatório digital",        desc: "Instagram, Meta Ads e conteúdos publicados" },
          { icon: Database,      color: "indigo", label: "Dados do negócio",         desc: "Resultados físicos e indicadores de venda" },
          { icon: FileText,      color: "blue",   label: "PDF do relatório",         desc: "Resumo executivo gerado automaticamente" },
          { icon: MessageSquare, color: "emerald",label: "Resumo WhatsApp",          desc: "Texto pronto para envio ao responsável" },
          { icon: Calendar,      color: "amber",  label: "Histórico de relatórios",  desc: "Controle de relatórios enviados por período" },
          { icon: BarChart3,     color: "teal",   label: "Recomendações",            desc: "O que melhorar no próximo ciclo" },
        ].map(({ icon: Icon, label, desc, color }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4">
            <div className={`w-8 h-8 bg-${color}-50 rounded-xl flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 text-${color}-500`} />
            </div>
            <p className="text-xs font-bold text-gray-800">{label}</p>
            <p className="text-[10px] text-gray-400 mt-0.5 mb-2">{desc}</p>
            <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full">Em breve</span>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-10 text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <ClipboardList className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm font-bold text-gray-700 mb-1">Nenhum relatório disponível</p>
        <p className="text-xs text-gray-400 max-w-md mx-auto">
          Os relatórios serão gerados pela equipe Lokat e enviados mensalmente. Eles ficarão disponíveis aqui para consulta a qualquer momento.
        </p>
      </div>
    </>
  );
}
