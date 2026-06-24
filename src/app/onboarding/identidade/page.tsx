"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveOnboarding } from "@/lib/onboarding-store";
import { Upload, CheckCircle } from "lucide-react";

const coresSugestoes = [
  "#FF6B6B", "#FF8E53", "#FFD93D", "#6BCB77",
  "#4D96FF", "#9B59B6", "#1ABC9C", "#E74C3C",
  "#F39C12", "#2ECC71", "#3498DB", "#34495E",
];

export default function OnboardingIdentidadePage() {
  const router = useRouter();
  const [logoName, setLogoName] = useState("");
  const [cores, setCores] = useState<string[]>([]);
  const [form, setForm] = useState({ referencias: "", canva: "", drive: "", estilo: "" });

  const toggleCor = (c: string) =>
    setCores((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    saveOnboarding({ identidade: { logoName, cores: cores.join(","), ...form } });
    router.push("/onboarding/estilo");
  };

  const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 transition-colors";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900 mb-2">Identidade visual</h1>
        <p className="text-sm text-gray-500">Vamos entender a cara da sua marca para criar conteúdos com a sua identidade.</p>
      </div>

      <form onSubmit={submit} className="space-y-6">
        {/* Logo mock upload */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Logo da marca</label>
          <div
            className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-indigo-300 transition-colors cursor-pointer bg-white"
            onClick={() => setLogoName(logoName ? "" : "logo_marca.png")}
          >
            {logoName ? (
              <>
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-emerald-600">{logoName}</p>
                <p className="text-xs text-gray-400 mt-1">Clique para remover</p>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400 font-medium">Clique para enviar sua logo</p>
                <p className="text-xs text-gray-300 mt-1">PNG, JPG ou SVG · (simulado)</p>
              </>
            )}
          </div>
        </div>

        {/* Color picker */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Cores da marca</label>
          <p className="text-xs text-gray-400 mb-3">Selecione as cores que representam sua marca</p>
          <div className="flex flex-wrap gap-2.5">
            {coresSugestoes.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleCor(c)}
                className={`w-9 h-9 rounded-full transition-all ${cores.includes(c) ? "ring-4 ring-indigo-400 ring-offset-2 scale-110" : "hover:scale-105"}`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
          {cores.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <p className="text-xs text-gray-500">Selecionadas:</p>
              <div className="flex gap-1.5">
                {cores.map((c) => (
                  <div key={c} className="w-5 h-5 rounded-full border border-gray-200" style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* References */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Referências visuais</label>
          <textarea
            value={form.referencias}
            onChange={set("referencias")}
            placeholder="Ex: Minimalista com tons pastel, similar à Havaianas. Gosto de artes clean com muito espaço em branco..."
            className={`${inputCls} h-20 resize-none`}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Link do Canva (opcional)</label>
          <input type="url" value={form.canva} onChange={set("canva")} placeholder="https://www.canva.com/..." className={inputCls} />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Link do Google Drive (opcional)</label>
          <input type="url" value={form.drive} onChange={set("drive")} placeholder="https://drive.google.com/..." className={inputCls} />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Descrição do estilo visual</label>
          <textarea
            value={form.estilo}
            onChange={set("estilo")}
            placeholder="Ex: Elegante e feminino, com uso de dourado e branco. Prefiro artes sofisticadas e sem excesso de texto..."
            className={`${inputCls} h-20 resize-none`}
          />
        </div>

        <div className="pt-2">
          <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors text-sm">
            Continuar →
          </button>
          <button
            type="button"
            onClick={() => router.push("/onboarding/estilo")}
            className="w-full mt-2 text-xs text-gray-400 hover:text-gray-600 py-2 transition-colors"
          >
            Pular por agora →
          </button>
        </div>
      </form>
    </div>
  );
}
