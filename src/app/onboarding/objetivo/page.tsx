"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveOnboarding } from "@/lib/onboarding-store";
import { cn } from "@/lib/utils";

const objetivos = [
  { id: "vender",      emoji: "💰", label: "Vender mais",              desc: "Aumentar conversões e receita" },
  { id: "leads",       emoji: "🎯", label: "Gerar leads",              desc: "Atrair novos potenciais clientes" },
  { id: "autoridade",  emoji: "🏆", label: "Construir autoridade",     desc: "Virar referência no segmento" },
  { id: "engajamento", emoji: "❤️", label: "Aumentar engajamento",     desc: "Mais comentários, curtidas e interações" },
  { id: "marketing",   emoji: "📊", label: "Organizar marketing",      desc: "Ter processo e consistência" },
  { id: "atendimento", emoji: "💬", label: "Melhorar atendimento",     desc: "Comunicação mais ágil com clientes" },
];

export default function OnboardingObjetivoPage() {
  const router = useRouter();
  const [principal, setPrincipal] = useState<string | null>(null);
  const [secundarios, setSecundarios] = useState<string[]>([]);

  const selectPrincipal = (id: string) => {
    setPrincipal(id);
    setSecundarios((prev) => prev.filter((s) => s !== id));
  };

  const toggleSecundario = (id: string) => {
    if (id === principal) return;
    setSecundarios((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : prev.length < 2 ? [...prev, id] : prev
    );
  };

  const canContinue = !!principal;

  const submit = () => {
    if (!principal) return;
    saveOnboarding({ objetivo: { principal, secundarios } });
    router.push("/onboarding/marca");
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900 mb-2">Qual o objetivo da marca?</h1>
        <p className="text-sm text-gray-500">
          Escolha o <strong>objetivo principal</strong>. Depois selecione até 2 objetivos secundários (opcional).
        </p>
      </div>

      {/* Step 1: principal */}
      <div className="mb-8">
        <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Objetivo principal</p>
        <div className="grid grid-cols-2 gap-2.5">
          {objetivos.map((o) => {
            const active = principal === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => selectPrincipal(o.id)}
                className={cn(
                  "flex flex-col items-start gap-1.5 p-4 rounded-2xl border-2 text-left transition-all",
                  active
                    ? "border-indigo-500 bg-indigo-50 shadow-sm"
                    : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"
                )}
              >
                <span className="text-2xl leading-none">{o.emoji}</span>
                <span className={cn("text-sm font-bold leading-tight", active ? "text-indigo-700" : "text-gray-800")}>
                  {o.label}
                </span>
                <span className="text-xs text-gray-400 leading-tight">{o.desc}</span>
                {active && (
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wider mt-0.5">Principal ✓</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: secundários (only show after principal is selected) */}
      {principal && (
        <div className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Objetivos secundários</p>
          <p className="text-xs text-gray-400 mb-3">Opcional — até 2 opções além do principal</p>
          <div className="flex flex-wrap gap-2">
            {objetivos
              .filter((o) => o.id !== principal)
              .map((o) => {
                const active = secundarios.includes(o.id);
                const disabled = !active && secundarios.length >= 2;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => toggleSecundario(o.id)}
                    disabled={disabled}
                    className={cn(
                      "px-3 py-2 rounded-xl border-2 text-xs font-medium transition-all flex items-center gap-1.5",
                      active
                        ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                        : disabled
                          ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    )}
                  >
                    {o.emoji} {o.label}
                  </button>
                );
              })}
          </div>
          {secundarios.length > 0 && (
            <p className="text-xs text-indigo-500 mt-2 font-medium">{secundarios.length}/2 selecionados</p>
          )}
        </div>
      )}

      {/* Summary preview */}
      {principal && (
        <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Resumo dos objetivos</p>
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs bg-indigo-600 text-white px-2.5 py-1 rounded-full font-medium">
              {objetivos.find((o) => o.id === principal)?.emoji}{" "}
              {objetivos.find((o) => o.id === principal)?.label}
            </span>
            {secundarios.map((s) => {
              const obj = objetivos.find((o) => o.id === s);
              return (
                <span key={s} className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-medium">
                  {obj?.emoji} {obj?.label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <button
        onClick={submit}
        disabled={!canContinue}
        className={cn(
          "w-full font-bold py-3 rounded-xl transition-colors text-sm",
          canContinue
            ? "bg-indigo-600 text-white hover:bg-indigo-700"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        )}
      >
        {canContinue ? "Continuar →" : "Selecione um objetivo para continuar"}
      </button>
    </div>
  );
}
