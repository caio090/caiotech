import { PageHeader } from "@/components/page-header";
import { Flag, Plus, Target, CalendarDays, Users, TrendingUp, Rocket } from "lucide-react";

export default async function ContentosCampanhasPage() {
  return (
    <>
      <PageHeader
        title="Campanhas"
        description="Ciclos estratégicos da sua marca"
      />

      <div className="mb-6 bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3">
        <Flag className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-indigo-800">Gestão de campanhas em desenvolvimento</p>
          <p className="text-xs text-indigo-600 mt-0.5">
            Esta aba centralizará os ciclos estratégicos — datas comemorativas, campanhas institucionais, tráfego pago e muito mais.
            Cada campanha terá objetivo, período, conteúdos, verba e resultado.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[
          { icon: Target,       label: "Objetivo da campanha", desc: "Vender, leads, engajamento" },
          { icon: CalendarDays, label: "Período",              desc: "Início, fim e datas-chave" },
          { icon: Users,        label: "Público",              desc: "Persona e segmentação" },
          { icon: TrendingUp,   label: "Verba sugerida",       desc: "Orçamento e canal" },
          { icon: Flag,         label: "Status",               desc: "Planejada, ativa, finalizada" },
          { icon: Plus,         label: "Conteúdos",            desc: "Pautas ligadas à campanha" },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4">
            <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center mb-3">
              <Icon className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-xs font-bold text-gray-800">{label}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-10 text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Rocket className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
        </div>
        <p className="text-sm font-bold text-gray-700 mb-1">Nenhuma campanha criada ainda</p>
        <p className="text-xs text-gray-400 max-w-md mx-auto">
          As campanhas serão listadas aqui. Cada campanha organiza objetivos, conteúdos, calendário e tráfego em um único ciclo estratégico.
        </p>
        <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-xl border border-indigo-100 opacity-60 cursor-not-allowed">
          <Plus className="w-3.5 h-3.5" />
          Nova campanha · Em breve
        </div>
      </div>
    </>
  );
}
