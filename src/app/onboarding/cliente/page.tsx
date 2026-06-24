"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveOnboarding } from "@/lib/onboarding-store";
import { Eye, EyeOff } from "lucide-react";

type FormKey = "nome" | "email" | "telefone" | "senha" | "empresa";

export default function OnboardingClientePage() {
  const router = useRouter();
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState<Record<FormKey, string>>({
    nome: "", email: "", telefone: "", senha: "", empresa: "",
  });
  const [errors, setErrors] = useState<Partial<Record<FormKey, string>>>({});

  const set = (key: FormKey) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = (): Partial<Record<FormKey, string>> => {
    const errs: Partial<Record<FormKey, string>> = {};
    if (!form.nome.trim()) errs.nome = "Nome obrigatório";
    if (!form.email.includes("@")) errs.email = "E-mail inválido";
    if (!form.telefone.trim()) errs.telefone = "Telefone obrigatório";
    if (form.senha.length < 6) errs.senha = "Mínimo 6 caracteres";
    if (!form.empresa.trim()) errs.empresa = "Nome da empresa obrigatório";
    return errs;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    saveOnboarding({ cliente: form });
    router.push("/onboarding/objetivo");
  };

  const inputClass = (key: FormKey) =>
    `w-full border rounded-xl px-4 py-2.5 text-sm outline-none transition-colors ${errors[key] ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-indigo-400"}`;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900 mb-2">Crie sua conta</h1>
        <p className="text-sm text-gray-500">Preencha seus dados para começar. Você pode alterar tudo depois.</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Nome completo</label>
          <input type="text" value={form.nome} onChange={set("nome")} placeholder="Ana Silva" className={inputClass("nome")} />
          {errors.nome && <p className="text-xs text-red-500 mt-1">{errors.nome}</p>}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">E-mail</label>
          <input type="email" value={form.email} onChange={set("email")} placeholder="ana@minhaempresa.com.br" className={inputClass("email")} />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Telefone / WhatsApp</label>
          <input type="tel" value={form.telefone} onChange={set("telefone")} placeholder="(11) 99999-0000" className={inputClass("telefone")} />
          {errors.telefone && <p className="text-xs text-red-500 mt-1">{errors.telefone}</p>}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Senha</label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={form.senha}
              onChange={set("senha")}
              placeholder="Mínimo 6 caracteres"
              className={`${inputClass("senha")} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.senha && <p className="text-xs text-red-500 mt-1">{errors.senha}</p>}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Nome da empresa / marca</label>
          <input type="text" value={form.empresa} onChange={set("empresa")} placeholder="Ex: Minha Empresa" className={inputClass("empresa")} />
          {errors.empresa && <p className="text-xs text-red-500 mt-1">{errors.empresa}</p>}
        </div>

        <div className="pt-2">
          <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors text-sm">
            Continuar →
          </button>
        </div>

        <p className="text-center text-xs text-gray-400">
          Ao continuar, você concorda com os{" "}
          <span className="text-indigo-600 cursor-pointer hover:underline">Termos de Uso</span>
          {" "}e a{" "}
          <span className="text-indigo-600 cursor-pointer hover:underline">Política de Privacidade</span>.
        </p>
      </form>
    </div>
  );
}
