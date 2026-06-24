"use client";
import { useState } from "react";
import { useOnboardingStore } from "@/lib/onboarding-store";
import { X, Sparkles } from "lucide-react";

export function WelcomeBanner() {
  const data = useOnboardingStore();
  const [visible, setVisible] = useState(true);

  const brandName = data.marca?.nome || data.cliente?.empresa;

  if (!brandName || !visible) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-4 mb-6 flex items-center gap-3">
      <Sparkles className="w-5 h-5 text-white flex-shrink-0" strokeWidth={1.5} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold">Bem-vindo ao LOKAT OS, {brandName}!</p>
        <p className="text-xs text-indigo-200 mt-0.5">Seu onboarding foi concluído. Nossa equipe analisará sua marca em até 24h.</p>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="p-1 rounded-lg hover:bg-white/20 transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
