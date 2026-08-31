import { Palette, Sparkles, ExternalLink } from "lucide-react";
import Link from "next/link";
import { ContentosSubNavServer } from "../_contentos-subnav-server";
import { DESIGN_FORMATS } from "@/lib/providers/shared/types";
import { getStudioSkills, isStudioSkillContractAvailable, isStudioSkillRuntimeAvailable } from "@/lib/rec-os/studio";
import { VIDIGAL_PNG_DELIVERY_STEPS } from "@/lib/rec-os/studio/skills/vidigal-png/instructions";

/**
 * Sprint REC OS Studio Foundation V0.1 — reaproveita /admin/contentos/visual
 * (antes um redirect puro para /admin/contentos/criar?step=visual) como a
 * landing real do Studio. Nenhuma rota nova criada (/admin/contentos/studio
 * é só destino conceitual futuro, ver docs/product-roadmap/vidigal-png-
 * master-prompt.txt, STUDIO_ARCHITECTURE_DECISION_V1).
 *
 * Puramente estrutural/contrato: a skill listada vem do Studio Skill
 * Registry (nunca hardcoded aqui), o status runtime é sempre "não
 * conectado" (nenhum executor de IA existe nesta Foundation), e não há
 * nenhum botão que sugira execução real ("Gerar"/"Criar com IA"/
 * "Executar Vidigal"/"Gerar PNG") -- só "Preparar briefing", que não
 * chama nenhum backend.
 */
export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client } = await searchParams;
  const clientId = client ?? null;
  const skills = getStudioSkills();

  return (
    <>
      <ContentosSubNavServer initialClientId={clientId ?? undefined} />

      <div className="space-y-4">
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-5">
          <p className="text-xs font-bold text-purple-800 mb-1 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5" /> STUDIO
          </p>
          <p className="text-xs text-purple-600">
            Direção criativa e produção visual do REC OS.
          </p>
        </div>

        {/* Nova criação visual */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wide text-gray-500">Nova criação visual</h2>

          <div>
            <label htmlFor="studio-brief" className="text-xs font-bold text-gray-600 mb-1.5 block">
              O que você quer criar?
            </label>
            <textarea
              id="studio-brief"
              rows={3}
              placeholder='Ex.: "Quero uma arte do aniversário da Duh para feed."'
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="studio-format" className="text-xs font-bold text-gray-600 mb-1.5 block">Formato</label>
              <select id="studio-format" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
                {DESIGN_FORMATS.map((f) => (
                  <option key={f.id} value={f.id}>{f.label} ({f.ratio})</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="studio-skill" className="text-xs font-bold text-gray-600 mb-1.5 block">Skill</label>
              <select id="studio-skill" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
                {skills.map((skill) => (
                  <option key={skill.id} value={skill.id}>{skill.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            disabled
            className="text-xs font-bold bg-gray-100 text-gray-400 px-4 py-2 rounded-xl cursor-not-allowed"
            title="Estrutura disponível — IA ainda não conectada"
          >
            Preparar briefing
          </button>
        </div>

        {/* Skills disponíveis */}
        <div>
          <h2 className="text-xs font-black uppercase tracking-wide text-gray-500 mb-3">Skills</h2>
          <div className="space-y-3">
            {skills.map((skill) => {
              const contractAvailable = isStudioSkillContractAvailable(skill);
              const runtimeAvailable = isStudioSkillRuntimeAvailable(skill);
              return (
                <div key={skill.id} className="bg-white border border-gray-100 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-500" /> {skill.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{skill.description}</p>
                    </div>
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                      v{skill.version}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${contractAvailable ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"}`}>
                      {contractAvailable ? "Estrutura disponível" : "Estrutura indisponível"}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${runtimeAvailable ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                      {runtimeAvailable ? "IA conectada" : "IA ainda não conectada"}
                    </span>
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wide text-gray-400 mb-2">Estrutura da entrega</p>
                    <div className="flex flex-wrap gap-1.5">
                      {VIDIGAL_PNG_DELIVERY_STEPS.map((step) => (
                        <span key={step.id} className="text-[10px] bg-gray-50 border border-gray-100 text-gray-500 px-2 py-1 rounded-lg">
                          {String(step.order).padStart(2, "0")} {step.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="text-[10px] font-black uppercase tracking-wide text-gray-400 mb-2">Módulos</p>
                    <div className="flex flex-wrap gap-1.5">
                      {skill.modules.map((mod) => (
                        <span
                          key={mod.id}
                          title={mod.description}
                          className={`text-[10px] px-2 py-1 rounded-lg border ${
                            mod.status === "placeholder_contract"
                              ? "bg-gray-50 border-gray-100 text-gray-400"
                              : "bg-purple-50 border-purple-100 text-purple-600"
                          }`}
                        >
                          {mod.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Integração com EditorOS */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-gray-800">EditorOS</p>
            <p className="text-xs text-gray-400 mt-0.5">Edição, composição, ajuste e acabamento visual da peça.</p>
          </div>
          <Link
            href={`/admin/contentos/editor-os${clientId ? `?client=${clientId}` : ""}`}
            className="text-xs font-bold text-purple-600 flex items-center gap-1 whitespace-nowrap"
          >
            Abrir EditorOS <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </>
  );
}
