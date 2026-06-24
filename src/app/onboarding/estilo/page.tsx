"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveOnboarding } from "@/lib/onboarding-store";
import { cn } from "@/lib/utils";

const tons = [
  { id: "profissional", emoji: "💼", label: "Profissional",  desc: "Formal e confiável" },
  { id: "direto",       emoji: "⚡", label: "Direto",        desc: "Objetivo e sem rodeios" },
  { id: "acolhedor",    emoji: "🤗", label: "Acolhedor",     desc: "Próximo e empático" },
  { id: "educativo",    emoji: "📚", label: "Educativo",     desc: "Explica e ensina" },
  { id: "popular",      emoji: "🎉", label: "Popular",       desc: "Próximo do povo" },
  { id: "sofisticado",  emoji: "✨", label: "Sofisticado",   desc: "Elegante e refinado" },
  { id: "divertido",    emoji: "😄", label: "Divertido",     desc: "Leve e bem-humorado" },
  { id: "tecnico",      emoji: "🔧", label: "Técnico",       desc: "Especialista e detalhado" },
  { id: "tradicional",  emoji: "🏛️", label: "Tradicional",  desc: "Clássico e sólido" },
];

const formalidades = [
  { id: "muito_informal", label: "Muito informal",    example: '"Ei, tudo bem?! 😄"' },
  { id: "informal",       label: "Informal",          example: '"Oi! Que tal essa novidade?"' },
  { id: "neutro",         label: "Neutro",            example: '"Olá! Temos algo especial para você."' },
  { id: "formal",         label: "Formal",            example: '"Prezado cliente, apresentamos..."' },
  { id: "muito_formal",   label: "Muito formal",      example: '"É com satisfação que comunicamos..."' },
];

const ctaEstilos = [
  { id: "urgencia",    emoji: "🔥", label: "Urgência",       example: '"Corra! Últimas unidades!"' },
  { id: "convite",     emoji: "🤝", label: "Convite",        example: '"Venha conhecer nosso espaço."' },
  { id: "pergunta",    emoji: "❓", label: "Pergunta",       example: '"Você já conhece nosso produto?"' },
  { id: "beneficio",   emoji: "🎯", label: "Benefício",      example: '"Economize tempo e dinheiro hoje."' },
];

export default function OnboardingEstiloPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [palavrasUsa, setPalavrasUsa] = useState("");
  const [palavrasEvita, setPalavrasEvita] = useState("");
  const [formalidade, setFormalidade] = useState("");
  const [ctaEstilo, setCtaEstilo] = useState("");

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : prev.length < 3 ? [...prev, id] : prev
    );

  const submit = () => {
    saveOnboarding({
      estilo: { tomDeVoz: selected, palavrasUsa, palavrasEvita, formalidade, ctaEstilo },
    });
    router.push("/onboarding/operacao");
  };

  const skip = () => {
    saveOnboarding({
      estilo: { tomDeVoz: [], palavrasUsa: "", palavrasEvita: "", formalidade: "", ctaEstilo: "" },
    });
    router.push("/onboarding/operacao");
  };

  const textareaCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 transition-colors resize-none h-20";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900 mb-2">Tom de voz e estilo</h1>
        <p className="text-sm text-gray-500">Como a marca se comunica? Isso guia a linguagem de todos os conteúdos.</p>
      </div>

      {/* Tom de voz */}
      <section className="mb-8">
        <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Tom de voz</h2>
        <p className="text-xs text-gray-400 mb-3">Selecione até 3 tons que mais combinam com a marca</p>
        <div className="grid grid-cols-3 gap-2">
          {tons.map((t) => {
            const active = selected.includes(t.id);
            return (
              <button
                key={t.id}
                onClick={() => toggle(t.id)}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 text-center transition-all",
                  active
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"
                )}
              >
                <span className="text-2xl leading-none">{t.emoji}</span>
                <span className={cn("text-xs font-bold", active ? "text-indigo-700" : "text-gray-700")}>{t.label}</span>
                <span className="text-[10px] text-gray-400 leading-tight">{t.desc}</span>
              </button>
            );
          })}
        </div>
        {selected.length > 0 && (
          <div className="bg-indigo-50 rounded-xl p-3 mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-indigo-700">Selecionado:</span>
            {selected.map((s) => {
              const ton = tons.find((t) => t.id === s);
              return (
                <span key={s} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                  {ton?.emoji} {ton?.label}
                </span>
              );
            })}
          </div>
        )}
      </section>

      <div className="h-px bg-gray-100 mb-8" />

      {/* Palavras */}
      <section className="mb-8 space-y-4">
        <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Vocabulário da marca</h2>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">
            Palavras e expressões que a marca <span className="text-emerald-600">usa</span>
          </label>
          <textarea
            value={palavrasUsa}
            onChange={(e) => setPalavrasUsa(e.target.value)}
            placeholder="Ex: transformação, resultado, exclusivo, artesanal, com amor..."
            className={textareaCls}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">
            Palavras e expressões que a marca <span className="text-red-500">evita</span>
          </label>
          <textarea
            value={palavrasEvita}
            onChange={(e) => setPalavrasEvita(e.target.value)}
            placeholder="Ex: barato, promocinho, mega, super, caro, perfeito..."
            className={textareaCls}
          />
        </div>
      </section>

      <div className="h-px bg-gray-100 mb-8" />

      {/* Formalidade */}
      <section className="mb-8">
        <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Nível de formalidade</h2>
        <div className="space-y-2">
          {formalidades.map((f) => {
            const active = formalidade === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFormalidade(f.id)}
                className={cn(
                  "w-full flex items-center justify-between p-3.5 rounded-xl border-2 text-left transition-all",
                  active
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-100 bg-white hover:border-gray-200"
                )}
              >
                <span className={cn("text-sm font-medium", active ? "text-indigo-700" : "text-gray-700")}>
                  {f.label}
                </span>
                <span className="text-xs text-gray-400 italic">{f.example}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="h-px bg-gray-100 mb-8" />

      {/* CTA Estilo */}
      <section className="mb-8">
        <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Estilo de chamada para ação (CTA)</h2>
        <p className="text-xs text-gray-400 mb-3">Como a marca convida as pessoas a agir?</p>
        <div className="grid grid-cols-2 gap-2.5">
          {ctaEstilos.map((c) => {
            const active = ctaEstilo === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCtaEstilo(c.id)}
                className={cn(
                  "flex flex-col items-start gap-1 p-4 rounded-2xl border-2 text-left transition-all",
                  active
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"
                )}
              >
                <span className="text-xl">{c.emoji}</span>
                <span className={cn("text-sm font-bold", active ? "text-indigo-700" : "text-gray-800")}>{c.label}</span>
                <span className="text-xs text-gray-400 italic leading-tight">{c.example}</span>
              </button>
            );
          })}
        </div>
      </section>

      <button
        onClick={submit}
        className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors text-sm"
      >
        Continuar →
      </button>
      <button
        onClick={skip}
        className="w-full mt-2 text-xs text-gray-400 hover:text-gray-600 py-2 transition-colors"
      >
        Pular por agora →
      </button>
    </div>
  );
}
