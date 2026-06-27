import { PageHeader } from "@/components/page-header";
import { BarChart3 } from "lucide-react";

export default function ClientResultadosPage() {
  return (
    <div>
      <PageHeader title="Resultados" description="Performance e métricas da sua marca" />
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100">
        <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mb-4">
          <BarChart3 className="w-6 h-6 text-purple-400" />
        </div>
        <p className="text-sm font-bold text-gray-700 mb-1">Relatório ainda não disponível</p>
        <p className="text-xs text-gray-400 text-center max-w-xs">
          Os resultados aparecerão aqui após a integração com Meta/Instagram ser configurada e os primeiros conteúdos publicados.
        </p>
      </div>
    </div>
  );
}
