"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Mic, Loader2, ExternalLink, X } from "lucide-react";
import Link from "next/link";
import { openJarvis } from "@/lib/jarvis/open-jarvis";
import { resolveCommandIntent, looksConversational, type CommandActionResult } from "@/lib/command-center/intents";
import { CommandActionResultCard, CommandJarvisHandoffCard } from "@/components/command-center/action-result";

interface SearchCard {
  title: string;
  desc: string;
  href: string;
  color?: string;
}

interface SearchResult {
  answer: string;
  intent: string;
  confidence: number;
  cards: SearchCard[];
  suggestedRoute?: string;
  source?: "openai" | "keyword";
}

/**
 * Sprint Final Product Experience Consolidation (Parte A) — Command Bar
 * de /admin/inicio. Nunca uma segunda conversa do Jarvis (Fase 3/10):
 * 1) tenta resolver uma intenção conhecida localmente, sem rede
 *    (src/lib/command-center/intents.ts) -- ação real, navegável, nunca
 *    um parágrafo pedindo para "acessar outra rota" (Fase 6);
 * 2) se parecer uma pergunta/raciocínio aberto, entrega ao Jarvis real
 *    via openJarvis() (Fase 9) -- nunca tenta responder aqui;
 * 3) senão, cai na busca informacional existente (dashboard-search),
 *    preservada como estava.
 */
export function SmartStartInput({
  activeCompanyId = null,
  activeCompanyName = null,
}: {
  activeCompanyId?: string | null;
  activeCompanyName?: string | null;
}) {
  const [query, setQuery]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<SearchResult | null>(null);
  const [action, setAction]         = useState<CommandActionResult | null>(null);
  const [conversational, setConversational] = useState<string | null>(null);
  const [showPanel, setShowPanel]   = useState(false);
  const containerRef                = useRef<HTMLDivElement>(null);
  const inputRef                    = useRef<HTMLInputElement>(null);
  const debounceRef                 = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResult(null); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/ai/dashboard-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      if (res.ok) {
        const data = await res.json() as SearchResult & { ok: boolean };
        if (data.ok) setResult(data);
      }
    } catch {}
    setLoading(false);
  }, []);

  const resolve = useCallback((q: string) => {
    setResult(null);
    setAction(null);
    setConversational(null);

    const intent = resolveCommandIntent(q);
    if (intent) { setAction(intent); return; }

    if (looksConversational(q)) { setConversational(q); return; }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 500);
  }, [search]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length >= 2) {
      setShowPanel(true);
      resolve(val.trim());
    } else {
      setResult(null);
      setAction(null);
      setConversational(null);
      setShowPanel(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && query.trim().length >= 2) {
      resolve(query.trim());
    }
    if (e.key === "Escape") { setShowPanel(false); inputRef.current?.blur(); }
  }

  function handleClear() {
    setQuery("");
    setResult(null);
    setAction(null);
    setConversational(null);
    setShowPanel(false);
    inputRef.current?.focus();
  }

  function handleJarvisHandoff() {
    if (!conversational) return;
    openJarvis({ prompt: conversational });
    setShowPanel(false);
  }

  useEffect(() => {
    if (!showPanel) return;
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPanel(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [showPanel]);

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-4 py-3.5 shadow-2xl">
        {loading
          ? <Loader2 className="w-4 h-4 text-indigo-300 flex-shrink-0 animate-spin" />
          : <Search className="w-4 h-4 text-indigo-200/70 flex-shrink-0" />
        }
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setShowPanel(true)}
          placeholder="O que você quer fazer? Ex.: criar uma campanha..."
          className="flex-1 bg-transparent outline-none text-sm text-white placeholder-indigo-100/50"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="w-5 h-5 flex items-center justify-center text-indigo-200/50 hover:text-white flex-shrink-0"
            aria-label="Limpar busca"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          type="button"
          title="Lokat Voice — em breve"
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 text-indigo-200/70 cursor-not-allowed flex-shrink-0"
          disabled
        >
          <Mic className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Results panel */}
      {showPanel && (result || loading || action || conversational) && (
        <div className="absolute top-full mt-2 left-0 right-0 z-50 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          {action && (
            <CommandActionResultCard
              action={action}
              activeCompanyId={activeCompanyId}
              activeCompanyName={activeCompanyName}
            />
          )}
          {conversational && (
            <CommandJarvisHandoffCard query={conversational} onHandoff={handleJarvisHandoff} />
          )}
          {!action && !conversational && loading && !result && (
            <div className="p-4 text-sm text-indigo-200/60 text-center">Buscando...</div>
          )}
          {!action && !conversational && result && (
            <div className="p-4 space-y-3">
              <p className="text-sm text-white/80 leading-relaxed">{result.answer}</p>
              {result.cards.length > 0 && (
                <div className="space-y-1.5">
                  {result.cards.map((card) => (
                    <Link
                      key={card.href}
                      href={card.href}
                      onClick={() => setShowPanel(false)}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors no-underline group"
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: card.color ?? "#7b6ef6" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white/90">{card.title}</p>
                        <p className="text-[10px] text-white/40">{card.desc}</p>
                      </div>
                      <ExternalLink className="w-3 h-3 text-white/20 group-hover:text-white/50 flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
              {result.source && (
                <p className="text-[9px] text-white/20 pt-1 border-t border-white/5">
                  {result.source === "openai" ? "✦ IA" : "busca local"}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
