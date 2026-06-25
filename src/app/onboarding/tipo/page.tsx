"use client";
import { useRouter } from "next/navigation";
import { saveOnboarding } from "@/lib/onboarding-store";
import { Building2, Rocket, Users, ClipboardList } from "lucide-react";

export default function OnboardingTipoPage() {
  const router = useRouter();

  const select = (accountType: string, tipo: string, route: string) => {
    saveOnboarding({ tipo });
    try {
      sessionStorage.setItem("lokat_account_type", accountType);
    } catch {}
    router.push(route);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900 mb-2">Como você pretende usar a LOKAT OS?</h1>
        <p className="text-gray-500 text-sm">Vamos personalizar sua experiência conforme o seu perfil.</p>
      </div>

      <div className="flex flex-col gap-3">

        {/* Card 1 — Empresa ou autônomo */}
        <button
          onClick={() => select("empresa", "cliente", "/onboarding/cliente")}
          className="relative bg-white border-2 border-indigo-500 rounded-2xl p-5 text-left transition-all hover:border-indigo-600 hover:bg-indigo-50/40 group shadow-sm shadow-indigo-100"
        >
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-indigo-600" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-bold text-gray-900">Sou empresa ou autônomo</h3>
                <span className="text-[10px] font-bold text-white bg-indigo-500 px-2 py-0.5 rounded-full tracking-wide">RECOMENDADO</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Quero organizar o marketing da minha própria marca com apoio de IA.
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                Advogado, arquiteto, clínica, restaurante, loja, academia, prestador de serviço…
              </p>
            </div>
          </div>
        </button>

        {/* Card 2 — Agência ou produtora */}
        <button
          onClick={() => select("agencia", "cliente", "/onboarding/cliente")}
          className="bg-white border-2 border-gray-100 rounded-2xl p-5 text-left transition-all hover:border-purple-400 hover:bg-purple-50/30 group"
        >
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0">
              <Rocket className="w-5 h-5 text-purple-600" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-gray-800 mb-1 group-hover:text-gray-900">Tenho uma agência ou produtora</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Quero gerenciar clientes, equipe, aprovações, conteúdos e produção em um único sistema.
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                Agência de marketing, produtora audiovisual, social media, equipe interna…
              </p>
            </div>
          </div>
        </button>

        {/* Card 3 — Cliente ou convidado */}
        <button
          onClick={() => select("cliente_atendido", "equipe", "/convite")}
          className="bg-white border-2 border-gray-100 rounded-2xl p-5 text-left transition-all hover:border-emerald-400 hover:bg-emerald-50/30 group"
        >
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-emerald-600" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-gray-800 mb-1 group-hover:text-gray-900">Sou cliente ou recebi um convite</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Quero acessar aprovações, calendário, relatórios ou arquivos de uma marca atendida.
              </p>
            </div>
          </div>
        </button>

        {/* Card 4 — Só diagnóstico */}
        <button
          onClick={() => { router.push("/diagnostico"); }}
          className="bg-white border-2 border-gray-100 rounded-2xl p-5 text-left transition-all hover:border-amber-400 hover:bg-amber-50/30 group"
        >
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
              <ClipboardList className="w-5 h-5 text-amber-500" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-gray-800 mb-1 group-hover:text-gray-900">Quero fazer apenas um diagnóstico</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Quero entender o potencial da minha presença digital antes de criar conta.
              </p>
            </div>
          </div>
        </button>

      </div>

      <p className="text-center text-xs text-gray-400 mt-8">
        Já tem conta?{" "}
        <a href="/login" className="text-indigo-600 font-medium hover:underline">Entrar</a>
      </p>
    </div>
  );
}
