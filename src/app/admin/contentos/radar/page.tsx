import { TrendingUp, Lightbulb } from "lucide-react";
import { ContentosSubNavServer } from "../_contentos-subnav-server";

/**
 * Fase 7/12 do hotfix canônico 1.0.1 — auditoria confirmou que o Radar não
 * tem hoje nenhuma lógica real por cliente: era um redirect puro para a aba
 * "Oportunidades" de Resultados, que por sua vez é só conteúdo estático
 * ("Em breve"). Redirecionar para outro pathname violava a regra desta
 * sprint de nunca tirar o usuário da rota que ele abriu. Como não há dado
 * real que dependa de cliente aqui, um seletor inline seria decorativo — o
 * conteúdo é o mesmo com ou sem `?client=`. A rota agora renderiza esse
 * mesmo conteúdo diretamente em /admin/contentos/radar, sem redirect.
 */
export default async function AdminContentosRadarPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client } = await searchParams;

  return (
    <>
      <ContentosSubNavServer initialClientId={client ?? undefined} />

      <div className="space-y-4">
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
          <p className="text-xs font-bold text-indigo-800 mb-1 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> O que é o Radar?
          </p>
          <p className="text-xs text-indigo-600">
            O Radar identifica tendências de mercado, momentos de atenção do público e lacunas de conteúdo
            detectadas pela IA — permitindo que a agência posicione o cliente na frente da concorrência.
          </p>
        </div>

        {[
          { label: "Tendências do segmento", desc: "Tópicos em alta para o público do cliente", status: "Em breve" },
          { label: "Gaps de conteúdo", desc: "Formatos e canais com baixa exploração", status: "Em breve" },
          { label: "Datas estratégicas", desc: "Efemérides e sazonalidades para explorar", status: "Em breve" },
          { label: "Benchmark de concorrentes", desc: "Visão comparativa de frequência e engajamento", status: "Em breve" },
          { label: "Alertas de oportunidade", desc: "Notificações quando um tema ganhar tração rápida", status: "Em breve" },
        ].map(({ label, desc, status }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-gray-800">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
            </div>
            <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full whitespace-nowrap">{status}</span>
          </div>
        ))}

        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
          <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-800">Radar alimentado por IA — planejado, ainda não implementado</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Quando conectado ao módulo de tendências, o Radar analisará volume de busca, engajamento em redes sociais
              e padrões de sazonalidade para sugerir pautas no momento certo. Esta tela não depende de cliente porque
              ainda não há dado real — o mesmo conteúdo é mostrado com ou sem cliente selecionado.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
