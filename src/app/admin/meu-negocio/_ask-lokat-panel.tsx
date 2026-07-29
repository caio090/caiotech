"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, X } from "lucide-react";
import type { BusinessModuleKey } from "@/lib/business-archetypes/types";
import type { BusinessInsightResponse } from "@/lib/business-command-center/types";

const QUESTIONS = ["Por que meu CMV aumentou?", "Como esse CMV foi calculado?", "Quais dados estão faltando?", "Qual produto merece atenção?", "Minha reserva é suficiente?", "O que devo conferir primeiro?"];
const LokatIntelligenceOrb = dynamic(() => import("@/components/motion/lokat-intelligence-orb"), { ssr: false, loading: () => <div className="h-44 w-44" aria-hidden="true" /> });

export function AskLokatPanel({ open, onClose, onNavigate }: { open: boolean; onClose: () => void; onNavigate: (section: BusinessModuleKey) => void }) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState<BusinessInsightResponse | null>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    addEventListener("keydown", onKeyDown);
    return () => { removeEventListener("keydown", onKeyDown); previous?.focus(); };
  }, [open, onClose]);

  if (!open) return null;

  async function ask() {
    if (!question.trim()) return;
    setLoading(true); setMessage(""); setResponse(null);
    try {
      const request = await fetch("/api/meu-negocio/ai/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) });
      const data = await request.json() as { ok: boolean; message?: string; response?: BusinessInsightResponse; fallback?: string };
      if (data.response) setResponse(data.response); else setMessage(data.message ?? data.fallback ?? "Não foi possível analisar agora.");
    } catch { setMessage("Assistente indisponível. Os cálculos locais continuam disponíveis."); }
    finally { setLoading(false); }
  }

  return <div className="fixed inset-0 z-[90] bg-black/50" role="dialog" aria-modal="true" aria-labelledby="ask-lokat-title">
    <aside className="ml-auto flex h-full w-full max-w-xl flex-col bg-[#11141c] text-[#f6f7fb] shadow-2xl">
      <header className="flex items-start justify-between border-b border-[#272d3a] p-5"><div><div className="flex items-center gap-2"><Bot className="h-5 w-5 text-violet-400" /><h2 id="ask-lokat-title" className="font-black">Pergunte à Lokat</h2></div><p className="mt-1 text-[11px] text-[#8993a8]">Explica os dados; não altera preços, estoque ou configurações.</p></div><button ref={closeButton} onClick={onClose} aria-label="Fechar" className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"><X className="h-5 w-5" /></button></header>
      <div className="flex-1 overflow-y-auto p-5"><div className="mx-auto mb-3 w-fit"><LokatIntelligenceOrb /></div><p className="text-[10px] font-black uppercase text-[#8993a8]">Perguntas sugeridas</p><div className="mt-2 flex flex-wrap gap-2">{QUESTIONS.map((item) => <button key={item} onClick={() => setQuestion(item)} className="rounded border border-[#3a4354] px-2.5 py-1.5 text-[11px] text-[#bcc4d4] hover:bg-[#1d2230]">{item}</button>)}</div>
        {loading && <div className="mt-6 flex items-center gap-2 text-xs text-violet-300"><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />Analisando o snapshot seguro...</div>}
        {message && <div className="mt-6 rounded border border-amber-400/30 bg-amber-400/10 p-4 text-xs text-amber-200"><strong className="block">Assistente IA ainda não configurado</strong>{message}</div>}
        {response && <div className="mt-6 space-y-4 text-xs"><section><h3 className="font-black">Resumo</h3><p className="mt-1 text-[#bcc4d4]">{response.summary}</p></section>{response.findings.map((finding) => <section key={finding.title} className="border-l-2 border-violet-500 pl-3"><h3 className="font-bold">{finding.title}</h3><p className="mt-1 text-[#8993a8]">{finding.explanation}</p><div className="mt-2 flex flex-wrap gap-1">{finding.metricIds.map((id) => <span key={id} className="bg-violet-400/10 px-2 py-1 text-[10px] text-violet-300">{id}</span>)}</div></section>)}<section><h3 className="font-black">Próximas verificações</h3><ul className="mt-1 list-disc pl-4 text-[#bcc4d4]">{response.recommendedChecks.map((item) => <li key={item}>{item}</li>)}</ul></section><p className="text-[10px] text-[#8993a8]">{response.disclaimer}</p></div>}
      </div>
      <footer className="border-t border-[#272d3a] p-4"><textarea value={question} maxLength={500} onChange={(event) => setQuestion(event.target.value)} placeholder="Faça uma pergunta sobre o negócio" className="h-20 w-full resize-none rounded border border-[#3a4354] bg-[#171b26] p-3 text-xs outline-none focus:border-violet-400" /><div className="mt-2 flex items-center justify-between"><button onClick={() => onNavigate("cmv_menu")} className="text-[10px] font-bold text-violet-300">Abrir CMV</button><button disabled={loading || !question.trim()} onClick={ask} className="rounded bg-violet-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">Perguntar</button></div></footer>
    </aside>
  </div>;
}
