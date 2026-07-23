"use client";

import { useMemo, useState } from "react";
import { Search, BookOpen } from "lucide-react";
import { GLOSSARY } from "@/lib/motor-lokat/glossary";

export function GlossaryTab({ initialTermId }: { initialTermId: string | null }) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(initialTermId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GLOSSARY;
    return GLOSSARY.filter((g) =>
      g.simpleName.toLowerCase().includes(q) ||
      g.technicalName.toLowerCase().includes(q) ||
      g.id.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <BookOpen className="w-3.5 h-3.5 text-purple-600" />
          <p className="text-xs font-bold text-gray-700">Glossário vivo</p>
        </div>
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar termo (ex.: margem, CAC, ponto de equilíbrio)"
            className="w-full text-sm border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 outline-none focus:border-purple-400"
          />
        </div>

        <div className="space-y-2">
          {filtered.map((entry) => {
            const isOpen = openId === entry.id;
            return (
              <div key={entry.id} className="border border-gray-100 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenId(isOpen ? null : entry.id)}
                  className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-gray-800">{entry.simpleName}</p>
                    <p className="text-[10px] text-gray-400">{entry.technicalName}</p>
                  </div>
                  <span className="text-gray-300 text-xs">{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 space-y-2 border-t border-gray-50 pt-2">
                    <p className="text-xs text-gray-700 leading-relaxed">{entry.explanation}</p>
                    <p className="text-xs font-mono bg-gray-50 rounded-lg px-2.5 py-1.5 border border-gray-100">{entry.formula}</p>
                    <p className="text-[11px] text-gray-500">Exemplo: {entry.example}</p>
                    {entry.commonMistakes.length > 0 && (
                      <p className="text-[11px] text-amber-700">Erro comum: {entry.commonMistakes.join("; ")}</p>
                    )}
                    {entry.relatedTerms.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {entry.relatedTerms.map((rel) => (
                          <button
                            key={rel}
                            onClick={() => setOpenId(rel)}
                            className="text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-100 rounded-full px-2 py-0.5 hover:bg-purple-100 transition-colors"
                          >
                            {rel}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-6">Nenhum termo encontrado para &ldquo;{query}&rdquo;.</p>
          )}
        </div>
      </div>
    </div>
  );
}
