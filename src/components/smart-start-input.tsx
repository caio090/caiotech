"use client";
import { Search, Mic } from "lucide-react";

// MOCK VISUAL — campo preparado para futura integração com Lokat Voice/IA, sem lógica real ainda.
export function SmartStartInput() {
  return (
    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-4 py-3.5 shadow-2xl">
      <Search className="w-4 h-4 text-indigo-200/70 flex-shrink-0" />
      <input
        type="text"
        placeholder="Pesquise ou peça para criar algo..."
        disabled
        className="flex-1 bg-transparent outline-none text-sm text-white placeholder-indigo-100/50 cursor-not-allowed"
      />
      <button
        type="button"
        disabled
        title="Lokat Voice — em breve"
        className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 text-indigo-200/70 cursor-not-allowed flex-shrink-0"
      >
        <Mic className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
