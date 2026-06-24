"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveOnboarding } from "@/lib/onboarding-store";

type FieldKey = "clienteIdeal" | "faixaEtaria" | "localizacao" | "dores" | "desejos" | "objecoes" | "contato";

const fields: { key: FieldKey; label: string; placeholder: string; multiline?: boolean }[] = [
  { key: "clienteIdeal", label: "Quem é seu cliente ideal?", placeholder: "Ex: Mulheres de 25 a 45 anos que compram presentes para família e amigos" },
  { key: "faixaEtaria",  label: "Faixa etária principal", placeholder: "Ex: 25 a 45 anos" },
  { key: "localizacao",  label: "Onde fica o seu público?", placeholder: "Ex: São Paulo capital e Grande São Paulo" },
  { key: "dores",        label: "Quais são as principais dores e problemas?", placeholder: "Ex: Dificuldade de encontrar presentes personalizados com bom preço...", multiline: true },
  { key: "desejos",      label: "O que ele deseja ou sonha?", placeholder: "Ex: Presentear de forma especial sem gastar muito...", multiline: true },
  { key: "objecoes",     label: "Quais as principais objeções na hora de comprar?", placeholder: "Ex: Preço alto, dúvida sobre qualidade, prazo de entrega...", multiline: true },
  { key: "contato",      label: "Como esse cliente costuma entrar em contato?", placeholder: "Ex: Instagram, WhatsApp, indicação de amigos, Google" },
];

export default function OnboardingPublicoPage() {
  const router = useRouter();
  const [form, setForm] = useState<Record<FieldKey, string>>({
    clienteIdeal: "", faixaEtaria: "", localizacao: "",
    dores: "", desejos: "", objecoes: "", contato: "",
  });

  const set = (key: FieldKey) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    saveOnboarding({ publico: form });
    router.push("/onboarding/identidade");
  };

  const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 transition-colors";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900 mb-2">Seu público ideal</h1>
        <p className="text-sm text-gray-500">Quanto mais detalhes você der, mais personalizados serão os conteúdos criados para a sua marca.</p>
      </div>

      <form onSubmit={submit} className="space-y-5">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">{f.label}</label>
            {f.multiline ? (
              <textarea
                value={form[f.key]}
                onChange={set(f.key)}
                placeholder={f.placeholder}
                className={`${inputCls} h-20 resize-none`}
              />
            ) : (
              <input
                type="text"
                value={form[f.key]}
                onChange={set(f.key)}
                placeholder={f.placeholder}
                className={inputCls}
              />
            )}
          </div>
        ))}

        <div className="pt-2">
          <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors text-sm">
            Continuar →
          </button>
          <button
            type="button"
            onClick={() => { saveOnboarding({ publico: form }); router.push("/onboarding/identidade"); }}
            className="w-full mt-2 text-xs text-gray-400 hover:text-gray-600 py-2 transition-colors"
          >
            Pular por agora →
          </button>
        </div>
      </form>
    </div>
  );
}
