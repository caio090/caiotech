import { TrendingUp, Lightbulb } from "lucide-react";
import { ContentosSubNavServer } from "../_contentos-subnav-server";
import { RADAR_DEMO_OPPORTUNITIES } from "@/lib/rec-os-workflow/radar-opportunities";
import { RadarOpportunityCard } from "./_radar-opportunity-card";
import { EmptyState } from "@/components/empty-state";

/**
 * Fase 7/12 do hotfix canônico 1.0.1 — auditoria confirmou que o Radar não
 * tem hoje nenhuma lógica real por cliente: era um redirect puro para a aba
 * "Oportunidades" de Resultados, que por sua vez é só conteúdo estático
 * ("Em breve"). Redirecionar para outro pathname violava a regra desta
 * sprint de nunca tirar o usuário da rota que ele abriu. Como não há dado
 * real que dependa de cliente aqui, um seletor inline seria decorativo — o
 * conteúdo é o mesmo com ou sem `?client=`. A rota agora renderiza esse
 * mesmo conteúdo diretamente em /admin/contentos/radar, sem redirect.
 *
 * Sprint REC OS 3.0.1.1 (Fase 2) — a ação real "Criar a partir desta
 * oportunidade" foi adicionada: como o Radar ainda não tem detecção real de
 * tendências, as oportunidades continuam demonstrativas (marcadas
 * "Demonstração" na UI), mas o botão agora constrói de verdade um
 * CreateContentSeed e abre o workspace Criar preservando cliente e
 * contexto — não é mais só decorativo.
 */
export default async function AdminContentosRadarPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client } = await searchParams;
  const clientId = client ?? null;

  return (
    <>
      <ContentosSubNavServer initialClientId={clientId ?? undefined} />

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

        {!clientId && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-700">
            Selecione um cliente na navegação acima para poder criar conteúdo a partir de uma oportunidade.
          </div>
        )}

        <div>
          <h2 className="text-xs font-black uppercase tracking-wide text-gray-500 mb-3">Oportunidades (demonstração)</h2>
          {RADAR_DEMO_OPPORTUNITIES.length === 0 ? (
            <EmptyState icon={TrendingUp} title="Nenhuma oportunidade no momento" description="Quando o Radar tiver detecção real conectada, as oportunidades aparecem aqui." />
          ) : (
            <div className="space-y-2">
              {RADAR_DEMO_OPPORTUNITIES.map((opp) => (
                <RadarOpportunityCard key={opp.id} opp={opp} clientId={clientId} />
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xs font-black uppercase tracking-wide text-gray-500 mb-3">Módulos futuros do Radar</h2>
          <div className="space-y-2">
            {[
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
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
          <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-800">Radar alimentado por IA — planejado, ainda não implementado</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Quando conectado ao módulo de tendências, o Radar analisará volume de busca, engajamento em redes sociais
              e padrões de sazonalidade para sugerir pautas no momento certo. As oportunidades acima são demonstrativas
              e não dependem de cliente — o botão de criação é que usa o cliente selecionado.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
