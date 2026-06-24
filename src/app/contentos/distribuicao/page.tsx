import { PageHeader } from "@/components/page-header";
import { MousePointerClick, Target, DollarSign, Clock, CheckCircle2, AlertCircle, Megaphone } from "lucide-react";

export default async function ContentosDistribuicaoPage() {
  return (
    <>
      <PageHeader
        title="Distribuição"
        description="Tráfego orgânico e pago da sua marca"
      />

      <div className="mb-6 bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-start gap-3">
        <MousePointerClick className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-orange-800">Módulo de distribuição em desenvolvimento</p>
          <p className="text-xs text-orange-600 mt-0.5">
            Esta aba centralizará o status das suas campanhas pagas — alcance, cliques, verba, resultados e sugestões de otimização.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[
          { icon: CheckCircle2,      label: "Conteúdo aprovado p/ tráfego", desc: "Peças com potencial de anúncio",    color: "emerald" },
          { icon: Target,            label: "Objetivo e público",            desc: "Topo, meio ou fundo de funil",      color: "blue" },
          { icon: DollarSign,        label: "Verba",                         desc: "Orçamento, duração e canal",        color: "purple" },
          { icon: Clock,             label: "Status de tráfego",             desc: "Sugerido → aprovado → rodando",     color: "amber" },
          { icon: MousePointerClick, label: "Desempenho",                    desc: "Alcance, cliques, CPM e CPC",       color: "indigo" },
          { icon: AlertCircle,       label: "Otimização",                    desc: "Alertas de baixo desempenho",       color: "red" },
        ].map(({ icon: Icon, label, desc, color }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4">
            <div className={`w-8 h-8 bg-${color}-50 rounded-xl flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 text-${color}-500`} />
            </div>
            <p className="text-xs font-bold text-gray-800">{label}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{desc}</p>
            <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full mt-1.5 inline-block">Em breve</span>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-10 text-center">
        <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Megaphone className="w-6 h-6 text-orange-400" />
        </div>
        <p className="text-sm font-bold text-gray-700 mb-1">Nenhum dado de tráfego disponível</p>
        <p className="text-xs text-gray-400 max-w-md mx-auto">
          Quando houver campanhas pagas em andamento, o status e os resultados serão exibidos aqui pela equipe de tráfego.
        </p>
      </div>
    </>
  );
}
