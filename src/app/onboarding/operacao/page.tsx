"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveOnboarding } from "@/lib/onboarding-store";
import { cn } from "@/lib/utils";
import { Users } from "lucide-react";

const redesDisponiveis = ["Instagram", "Facebook", "TikTok", "LinkedIn", "YouTube", "X / Twitter"];

const ferramentas = [
  { key: "usaCanva"   as const, emoji: "🎨", label: "Canva",              desc: "Criação de artes e templates" },
  { key: "usaMeta"    as const, emoji: "📱", label: "Meta Business Suite", desc: "Agendamento e anúncios pagos" },
  { key: "usaDrive"   as const, emoji: "📁", label: "Google Drive",        desc: "Armazenamento de arquivos" },
  { key: "usaTrafego" as const, emoji: "📊", label: "Tráfego Pago",        desc: "Meta Ads, Google Ads" },
];

const frequencias = [
  "1 post por semana",
  "2–3 posts por semana",
  "5 posts por semana",
  "1 post por dia",
  "Mais de 1 por dia",
];

type ToggleKey = "usaCanva" | "usaMeta" | "usaDrive" | "usaTrafego" | "equipeInterna";

function Toggle({ keyName, value, onToggle }: { keyName: ToggleKey; value: boolean; onToggle: (k: ToggleKey) => void }) {
  return (
    <div
      onClick={() => onToggle(keyName)}
      className={cn(
        "w-11 h-6 rounded-full relative transition-colors flex-shrink-0 cursor-pointer",
        value ? "bg-indigo-600" : "bg-gray-200"
      )}
    >
      <div className={cn(
        "absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all",
        value ? "left-6" : "left-1"
      )} />
    </div>
  );
}

export default function OnboardingOperacaoPage() {
  const router = useRouter();
  const [redes, setRedes] = useState<string[]>([]);
  const [form, setForm] = useState({
    responsavel: "", whatsapp: "", horario: "", frequencia: "",
    usaCanva: false, usaMeta: false, usaDrive: false, usaTrafego: false, equipeInterna: false,
  });

  const toggleRede = (r: string) =>
    setRedes((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);

  const toggleBool = (key: ToggleKey) => setForm((f) => ({ ...f, [key]: !f[key] }));

  const set = (key: "responsavel" | "whatsapp" | "horario" | "frequencia") =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    saveOnboarding({ operacao: { ...form, redes } });
    router.push("/onboarding/conclusao");
  };

  const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 transition-colors";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900 mb-2">Operação</h1>
        <p className="text-sm text-gray-500">Como você trabalha no dia a dia? Isso nos ajuda a entender o fluxo de aprovação de conteúdos.</p>
      </div>

      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Quem aprova os conteúdos?</label>
          <input type="text" value={form.responsavel} onChange={set("responsavel")} placeholder="Ex: Ana Silva, Diretora de Marketing" className={inputCls} />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">WhatsApp do responsável</label>
          <input type="tel" value={form.whatsapp} onChange={set("whatsapp")} placeholder="(11) 99999-0000" className={inputCls} />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Melhor horário de contato</label>
          <input type="text" value={form.horario} onChange={set("horario")} placeholder="Ex: Segunda a sexta, das 9h às 18h" className={inputCls} />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Frequência desejada de conteúdo</label>
          <select value={form.frequencia} onChange={set("frequencia")} className={`${inputCls} bg-white`}>
            <option value="">Selecione a frequência...</option>
            {frequencias.map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>

        {/* Equipe interna */}
        <label className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl cursor-pointer hover:border-gray-200 transition-colors">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-gray-400 flex-shrink-0" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-medium text-gray-700">Possui equipe interna de marketing?</p>
              <p className="text-xs text-gray-400">Designer, Social Media ou Gestor de Tráfego in-house</p>
            </div>
          </div>
          <Toggle keyName="equipeInterna" value={form.equipeInterna} onToggle={toggleBool} />
        </label>

        {/* Redes sociais */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-2">Redes sociais que usa</label>
          <div className="flex flex-wrap gap-2">
            {redesDisponiveis.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => toggleRede(r)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-xl border-2 transition-all",
                  redes.includes(r)
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-gray-100 bg-white text-gray-600 hover:border-gray-200"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Ferramentas */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-2">Ferramentas que utiliza</label>
          <div className="space-y-2">
            {ferramentas.map((f) => (
              <label
                key={f.key}
                className="flex items-center justify-between p-3.5 bg-white border border-gray-100 rounded-xl cursor-pointer hover:border-gray-200 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{f.emoji}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-700">{f.label}</p>
                    <p className="text-xs text-gray-400">{f.desc}</p>
                  </div>
                </div>
                <Toggle keyName={f.key} value={form[f.key]} onToggle={toggleBool} />
              </label>
            ))}
          </div>
        </div>

        <div className="pt-2">
          <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors text-sm">
            Finalizar configuração →
          </button>
        </div>
      </form>
    </div>
  );
}
