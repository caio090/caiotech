"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveOnboarding } from "@/lib/onboarding-store";

const segmentos = [
  "Alimentação", "Beleza & Estética", "Saúde", "Educação", "Tecnologia",
  "Construção", "Varejo", "Serviços", "Moda", "Agência", "Outros",
];

export default function OnboardingMarcaPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nome: "", pais: "Brasil", estado: "", cidade: "",
    segmento: "", descricao: "", produtos: "",
    instagram: "", whatsapp: "", site: "",
  });

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    saveOnboarding({ marca: form });
    router.push("/onboarding/publico");
  };

  const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 transition-colors";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900 mb-2">Sua marca</h1>
        <p className="text-sm text-gray-500">Conta pra gente sobre o negócio. Essas informações vão personalizar tudo no seu painel.</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Nome da marca <span className="text-red-400">*</span></label>
          <input type="text" value={form.nome} onChange={set("nome")} placeholder="Ex: Minha Marca" className={inputCls} required />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">País</label>
            <input type="text" value={form.pais} onChange={set("pais")} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Estado</label>
            <input type="text" value={form.estado} onChange={set("estado")} placeholder="SP" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Cidade</label>
            <input type="text" value={form.cidade} onChange={set("cidade")} placeholder="São Paulo" className={inputCls} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Segmento</label>
          <select value={form.segmento} onChange={set("segmento")} className={`${inputCls} bg-white`}>
            <option value="">Selecione o segmento...</option>
            {segmentos.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Descrição da empresa</label>
          <textarea
            value={form.descricao}
            onChange={set("descricao")}
            placeholder="Conte um pouco sobre o que a empresa faz, sua história, diferenciais..."
            className={`${inputCls} h-24 resize-none`}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Produtos ou serviços principais</label>
          <textarea
            value={form.produtos}
            onChange={set("produtos")}
            placeholder="Ex: Caixas personalizadas, trufas, bombons artesanais, kits presente..."
            className={`${inputCls} h-20 resize-none`}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Instagram</label>
            <input type="text" value={form.instagram} onChange={set("instagram")} placeholder="@suamarca" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">WhatsApp</label>
            <input type="tel" value={form.whatsapp} onChange={set("whatsapp")} placeholder="(11) 99999-0000" className={inputCls} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Site (opcional)</label>
          <input type="url" value={form.site} onChange={set("site")} placeholder="https://www.suamarca.com.br" className={inputCls} />
        </div>

        <div className="pt-2">
          <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors text-sm">
            Continuar →
          </button>
        </div>
      </form>
    </div>
  );
}
