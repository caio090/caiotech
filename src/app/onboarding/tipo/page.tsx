"use client";
import { useRouter } from "next/navigation";
import { saveOnboarding } from "@/lib/onboarding-store";
import { Rocket, Users, GraduationCap } from "lucide-react";

export default function OnboardingTipoPage() {
  const router = useRouter();

  const select = (tipo: string, route: string) => {
    saveOnboarding({ tipo });
    router.push(route);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900 mb-2">Como você deseja começar?</h1>
        <p className="text-gray-500 text-sm">Vamos personalizar sua experiência dentro da Lokat OS.</p>
      </div>

      <div className="flex flex-col gap-3">

        {/* Card 1 — Iniciar diagnóstico (destaque principal) */}
        <button
          onClick={() => select("cliente", "/onboarding/cliente")}
          className="relative bg-white border-2 border-indigo-500 rounded-2xl p-5 text-left transition-all hover:border-indigo-600 hover:bg-indigo-50/40 group shadow-sm shadow-indigo-100"
        >
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
              <Rocket className="w-5 h-5 text-indigo-600" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-bold text-gray-900">Iniciar diagnóstico</h3>
                <span className="text-[10px] font-bold text-white bg-indigo-500 px-2 py-0.5 rounded-full tracking-wide">RECOMENDADO</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Quero configurar minha empresa e receber um diagnóstico estratégico personalizado.
              </p>
            </div>
          </div>
        </button>

        {/* Card 2 — Participar da equipe */}
        <button
          onClick={() => select("equipe", "/convite")}
          className="bg-white border-2 border-gray-100 rounded-2xl p-5 text-left transition-all hover:border-emerald-400 hover:bg-emerald-50/30 group"
        >
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-emerald-600" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-gray-800 mb-1 group-hover:text-gray-900">Participar da equipe</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Recebi um convite ou desejo solicitar acesso para trabalhar com a equipe da Lokat.
              </p>
            </div>
          </div>
        </button>

        {/* Card 3 — Academy (em breve) */}
        <div
          className="relative bg-white border-2 border-gray-100 rounded-2xl p-5 text-left opacity-50 cursor-not-allowed select-none"
          aria-disabled="true"
        >
          {/* Badge EM BREVE */}
          <span className="absolute top-3.5 right-4 text-[9px] font-black tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full uppercase">
            EM BREVE
          </span>

          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-5 h-5 text-amber-500" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0 pr-16">
              <h3 className="text-sm font-bold text-gray-800 mb-1">Academy</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Acesse cursos, treinamentos e conteúdos exclusivos da Academy.
              </p>
            </div>
          </div>
        </div>

      </div>

      <p className="text-center text-xs text-gray-400 mt-8">
        Já tem conta?{" "}
        <a href="/login" className="text-indigo-600 font-medium hover:underline">Entrar</a>
      </p>
    </div>
  );
}
