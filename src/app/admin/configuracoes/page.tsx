"use client";
import { PageHeader } from "@/components/page-header";
import { useState } from "react";

export default function AdminConfigPage() {
  const [orgName, setOrgName] = useState("Lokat Agência");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <PageHeader title="Configurações" description="Gerencie sua organização" />
      <div className="max-w-2xl space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Organização</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nome da agência</label>
              <input value={orgName} onChange={(e) => setOrgName(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Segmento</label>
              <select className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 bg-white outline-none focus:border-indigo-400">
                <option>Agência de Marketing Digital</option>
                <option>Agência de Design</option>
                <option>Agência Full Service</option>
                <option>Freelancer</option>
              </select>
            </div>
            <button onClick={handleSave} className="text-sm font-medium text-white bg-indigo-600 px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors">
              {saved ? "✓ Salvo!" : "Salvar alterações"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Plano atual</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-base font-black text-gray-900">Pro</div>
              <p className="text-xs text-gray-500">R$ 597/mês · 5 membros · Todos os módulos</p>
            </div>
            <button className="text-sm font-medium text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors">
              Gerenciar plano
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Notificações</h2>
          {["Aprovações pendentes", "Tarefas atrasadas", "Cobranças vencidas", "Novos leads"].map((n) => (
            <label key={n} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0 cursor-pointer">
              <span className="text-sm text-gray-700">{n}</span>
              <div className="w-10 h-5 bg-indigo-600 rounded-full relative">
                <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow" />
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
