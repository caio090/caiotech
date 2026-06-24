"use client";
import { useState } from "react";
import { useOnboardingStore, getObjetivoPrincipal } from "@/lib/onboarding-store";
import { useCanvaStore } from "@/lib/canva-store";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";
import { Check, Lock, AlertCircle } from "lucide-react";

const LEVELS = [
  {
    id: 1,
    title: "Marca em estruturação",
    desc: "Os dados da marca estão sendo configurados. Nosso time analisa tudo antes de começar.",
    color: "bg-gray-100 text-gray-600",
    activeColor: "bg-indigo-600 text-white",
    badge: "🏗️",
  },
  {
    id: 2,
    title: "Conteúdo em ritmo",
    desc: "A marca tem um calendário editorial ativo. Os primeiros conteúdos estão sendo criados.",
    color: "bg-blue-50 text-blue-700",
    activeColor: "bg-blue-600 text-white",
    badge: "🎬",
  },
  {
    id: 3,
    title: "Calendário ativo",
    desc: "Publicações recorrentes e aprovações fluindo. A marca está no ar com consistência.",
    color: "bg-purple-50 text-purple-700",
    activeColor: "bg-purple-600 text-white",
    badge: "📅",
  },
  {
    id: 4,
    title: "Conteúdo validado",
    desc: "O cliente aprova com agilidade, o conteúdo reflete a voz da marca. Performance crescendo.",
    color: "bg-amber-50 text-amber-700",
    activeColor: "bg-amber-500 text-white",
    badge: "✅",
  },
  {
    id: 5,
    title: "Crescimento consistente",
    desc: "Resultados mensuráveis. Relatórios com dados reais. A marca cresce com estratégia.",
    color: "bg-emerald-50 text-emerald-700",
    activeColor: "bg-emerald-600 text-white",
    badge: "📈",
  },
];

interface Mission {
  id: string;
  label: string;
  category: string;
  urgent?: boolean;
}

const ALL_MISSIONS: Mission[] = [
  { id: "m1", label: "Aprovar conteúdo da semana",     category: "aprovacao",   urgent: true },
  { id: "m2", label: "Enviar material pendente",        category: "material",    urgent: true },
  { id: "m3", label: "Revisar calendário do mês",       category: "calendario" },
  { id: "m4", label: "Validar campanha em andamento",   category: "campanha" },
  { id: "m5", label: "Analisar relatório mensal",       category: "relatorio" },
  { id: "m6", label: "Atualizar produtos/serviços",     category: "produto" },
  { id: "m7", label: "Configurar Canva da marca",       category: "canva" },
  { id: "m8", label: "Responder comentários pendentes", category: "engajamento" },
  { id: "m9", label: "Compartilhar depoimento recente", category: "prova_social" },
  { id: "m10", label: "Confirmar data de evento",       category: "evento" },
];

function calcBrandLevel(data: ReturnType<typeof useOnboardingStore>, canva: ReturnType<typeof useCanvaStore>): number {
  if (!data.marca?.nome) return 1;
  if (!getObjetivoPrincipal(data) || !data.publico?.clienteIdeal) return 1;
  if (canva.status === null) return 2;
  if (!data.operacao?.frequencia) return 2;
  return 3;
}

export default function ContentosJornadaPage() {
  const data  = useOnboardingStore();
  const canva = useCanvaStore();

  const brandName    = data.marca?.nome || "";
  const brandInitial = brandName[0]?.toUpperCase() ?? "C";
  const currentLevel = calcBrandLevel(data, canva);

  const [completedMissions, setCompletedMissions] = useState<Set<string>>(new Set(["m3"]));

  const toggleMission = (id: string) =>
    setCompletedMissions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });

  const relevantMissions = ALL_MISSIONS.filter((m) => {
    if (m.category === "canva" && canva.status !== null) return false;
    return true;
  });

  const doneMissions   = relevantMissions.filter((m) => completedMissions.has(m.id));
  const totalMissions  = relevantMissions.length;
  const missionPct     = Math.round((doneMissions.length / totalMissions) * 100);

  return (
    <div>
      <PageHeader title="Jornada" description={`Progresso operacional de ${brandName}`} />

      {/* Brand + level summary */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 mb-6 flex items-start gap-4">
        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white font-black text-lg flex-shrink-0">
          {brandInitial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-indigo-200 text-xs mb-0.5">Marca ativa</p>
          <h2 className="text-white font-black text-base truncate">{brandName}</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full font-medium">
              {LEVELS[currentLevel - 1].badge} Nível {currentLevel} — {LEVELS[currentLevel - 1].title}
            </span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-white font-black text-2xl">{missionPct}%</div>
          <p className="text-indigo-200 text-[10px]">missões</p>
        </div>
      </div>

      {/* Levels track */}
      <div className="mb-8">
        <h2 className="text-sm font-bold text-gray-800 mb-4">Jornada operacional</h2>
        <div className="space-y-3">
          {LEVELS.map((level) => {
            const isDone    = level.id < currentLevel;
            const isCurrent = level.id === currentLevel;
            const isLocked  = level.id > currentLevel;
            return (
              <div
                key={level.id}
                className={cn(
                  "rounded-2xl border-2 p-4 transition-all",
                  isDone    ? "border-emerald-200 bg-emerald-50" :
                  isCurrent ? "border-indigo-400 bg-indigo-50 shadow-sm shadow-indigo-100" :
                              "border-gray-100 bg-white opacity-60"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 font-black",
                    isDone ? "bg-emerald-100 text-emerald-600" :
                    isCurrent ? "bg-indigo-600 text-white" :
                                "bg-gray-100 text-gray-400"
                  )}>
                    {isDone ? <Check className="w-5 h-5" /> : isLocked ? <Lock className="w-4 h-4" /> : level.badge}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider",
                        isDone ? "text-emerald-500" : isCurrent ? "text-indigo-500" : "text-gray-400"
                      )}>
                        Nível {level.id}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                          Atual
                        </span>
                      )}
                      {isDone && (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">
                          Concluído ✓
                        </span>
                      )}
                    </div>
                    <p className={cn(
                      "text-sm font-bold",
                      isDone ? "text-emerald-800" : isCurrent ? "text-indigo-900" : "text-gray-500"
                    )}>
                      {level.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{level.desc}</p>
                  </div>
                </div>

                {/* Progress bar for current level */}
                {isCurrent && (
                  <div className="mt-3 pt-3 border-t border-indigo-100">
                    <div className="flex justify-between text-xs text-indigo-600 mb-1.5">
                      <span>Progresso do nível</span>
                      <span>{missionPct}%</span>
                    </div>
                    <div className="h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${missionPct}%` }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Missions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-800">Missões operacionais</h2>
          <span className="text-xs text-gray-400">{doneMissions.length}/{totalMissions} concluídas</span>
        </div>

        {/* Urgent */}
        {relevantMissions.filter(m => m.urgent && !completedMissions.has(m.id)).length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" strokeWidth={1.5} />Urgente</p>
            <div className="space-y-2">
              {relevantMissions.filter(m => m.urgent && !completedMissions.has(m.id)).map((m) => (
                <label
                  key={m.id}
                  className="flex items-center gap-3 p-3.5 bg-red-50 border border-red-100 rounded-xl cursor-pointer hover:bg-red-100 transition-colors"
                >
                  <div
                    onClick={() => toggleMission(m.id)}
                    className="w-5 h-5 rounded-md border-2 border-red-300 flex items-center justify-center flex-shrink-0 transition-colors"
                  >
                    {completedMissions.has(m.id) && <Check className="w-3 h-3 text-red-600" />}
                  </div>
                  <span className="text-sm text-red-800 font-medium flex-1">{m.label}</span>
                  <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">Urgente</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Pending */}
        <div className="mb-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Pendentes</p>
          <div className="space-y-1.5">
            {relevantMissions.filter(m => !m.urgent && !completedMissions.has(m.id)).map((m) => (
              <label
                key={m.id}
                className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl cursor-pointer hover:border-gray-200 transition-colors"
              >
                <div
                  onClick={() => toggleMission(m.id)}
                  className="w-5 h-5 rounded-md border-2 border-gray-200 flex items-center justify-center flex-shrink-0 hover:border-indigo-400 transition-colors"
                >
                  {completedMissions.has(m.id) && <Check className="w-3 h-3 text-indigo-600" />}
                </div>
                <span className="text-sm text-gray-700 flex-1">{m.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Done */}
        {doneMissions.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Concluídas</p>
            <div className="space-y-1.5">
              {doneMissions.map((m) => (
                <label
                  key={m.id}
                  className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl cursor-pointer hover:bg-emerald-100 transition-colors"
                >
                  <div
                    onClick={() => toggleMission(m.id)}
                    className="w-5 h-5 rounded-md bg-emerald-500 border-2 border-emerald-500 flex items-center justify-center flex-shrink-0"
                  >
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm text-emerald-700 line-through flex-1">{m.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
