"use client";
import { useEffect, useState } from "react";
import { X, ArrowRight, CheckCircle2 } from "lucide-react";

type AccountType = "agency" | "business_owner" | "invited_client" | "admin";

const TOURS: Record<AccountType, { icon: string; title: string; steps: { icon: string; title: string; desc: string }[] }> = {
  agency: {
    icon: "🏢",
    title: "Bem-vindo à Lokat!",
    steps: [
      { icon: "👥", title: "Cadastre seus clientes",    desc: "Adicione empresas em Admin → Clientes e comece a organizar." },
      { icon: "🔗", title: "Conecte os canais",          desc: "Vincule Meta, Instagram e OlaClick de cada cliente." },
      { icon: "📅", title: "Planeje no ContentOS",       desc: "Crie conteúdos, agende publicações e envie para aprovação." },
      { icon: "📊", title: "Acompanhe relatórios",       desc: "Veja métricas reais por cliente em Resultados." },
    ],
  },
  business_owner: {
    icon: "🏪",
    title: "Seu painel está pronto!",
    steps: [
      { icon: "📋", title: "Complete o diagnóstico",     desc: "Preencha as informações da sua marca para personalizarmos tudo." },
      { icon: "🔗", title: "Conecte seus canais",        desc: "Vincule Instagram e Meta para acompanhar resultados." },
      { icon: "✅", title: "Aprove conteúdos",           desc: "A equipe enviará artes e legendas — você aprova direto aqui." },
      { icon: "📈", title: "Veja seus resultados",       desc: "Métricas reais de crescimento atualizadas automaticamente." },
    ],
  },
  invited_client: {
    icon: "🎉",
    title: "Bem-vindo ao seu painel!",
    steps: [
      { icon: "📁", title: "Veja seu projeto",           desc: "Acompanhe tarefas, prazos e o progresso do trabalho." },
      { icon: "✅", title: "Aprove conteúdos",           desc: "Revise e aprove artes e textos antes de publicar." },
      { icon: "📅", title: "Acompanhe o calendário",     desc: "Veja o que está planejado para as próximas semanas." },
      { icon: "💬", title: "Envie solicitações",         desc: "Precisa de algo? Use a área de solicitações para pedir." },
    ],
  },
  admin: {
    icon: "⚡",
    title: "Painel administrativo",
    steps: [
      { icon: "👥", title: "Gerencie clientes",          desc: "Crie e configure clientes em Admin → Clientes." },
      { icon: "📣", title: "Gerencie ContentOS",         desc: "Produza e aprove conteúdos por cliente." },
      { icon: "📊", title: "Veja a plataforma",          desc: "Monitore contas e status geral em Admin → Plataforma." },
      { icon: "⚙️", title: "Configure conexões",         desc: "Vincule Meta e integrações em Admin → Conexões." },
    ],
  },
};

function storageKey(type: AccountType) {
  return `lokat_welcome_seen_${type}`;
}

interface Props {
  accountType: AccountType;
}

export function WelcomeTourModal({ accountType }: Props) {
  const [visible, setVisible] = useState(false);
  const [step,    setStep]    = useState(0);
  const tour = TOURS[accountType];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(storageKey(accountType));
    if (!seen) setVisible(true);
  }, [accountType]);

  function dismiss(permanent: boolean) {
    setVisible(false);
    if (permanent && typeof window !== "undefined") {
      localStorage.setItem(storageKey(accountType), "1");
    }
  }

  if (!visible) return null;

  const isLast = step === tour.steps.length - 1;
  const current = tour.steps[step];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-lg">{tour.icon}</p>
            <h2 className="text-base font-black text-white mt-0.5">{tour.title}</h2>
          </div>
          <button
            onClick={() => dismiss(false)}
            className="text-white/60 hover:text-white transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-1.5 pt-4 px-6">
          {tour.steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`rounded-full transition-all ${
                i === step
                  ? "w-5 h-2 bg-indigo-600"
                  : i < step
                  ? "w-2 h-2 bg-indigo-300"
                  : "w-2 h-2 bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
              {current?.icon}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 mb-1">{current?.title}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{current?.desc}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex items-center gap-2">
          <button
            onClick={() => dismiss(true)}
            className="flex-1 py-2 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
          >
            Não mostrar novamente
          </button>

          {isLast ? (
            <button
              onClick={() => dismiss(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Entendi!
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Próximo
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
