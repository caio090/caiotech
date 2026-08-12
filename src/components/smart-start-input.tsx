"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Mic, Loader2, ExternalLink, X } from "lucide-react";
import Link from "next/link";
import { openJarvis } from "@/lib/jarvis/open-jarvis";
import { resolveCommandFlow, looksConversational, type CommandFlow } from "@/lib/command-center/intents";
import { CommandActionResultCard, CommandJarvisHandoffCard } from "@/components/command-center/action-result";
import { InlineClientCreation } from "@/components/command-center/inline-client-creation";
import { InlineProjectCreation } from "@/components/command-center/inline-project-creation";

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
 * Sprint Command Center + Jarvis Context V1 — Command Bar de
 * /admin/inicio. Nunca uma segunda conversa do Jarvis:
 * 1) tenta resolver um flow conhecido localmente, sem rede
 *    (src/lib/command-center/intents.ts) -- ação real, navegável, nunca
 *    um parágrafo pedindo para "acessar outra rota";
 * 2) "criar cliente"/"criar projeto" abrem wizards inline reais (nunca
 *    o seletor do ContentOS, nunca uma segunda API/tabela);
 * 3) se parecer uma pergunta/raciocínio aberto, entrega ao Jarvis real
 *    via openJarvis() -- nunca tenta responder aqui;
 * 4) senão, cai na busca informacional existente (dashboard-search),
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
  const [flow, setFlow]             = useState<CommandFlow | null>(null);
  const [projectCompany, setProjectCompany] = useState<{ id: string; name: string | null } | null>(null);
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
    setFlow(null);
    setProjectCompany(activeCompanyId ? { id: activeCompanyId, name: activeCompanyName } : null);
    setConversational(null);

    const resolved = resolveCommandFlow(q);
    if (resolved) { setFlow(resolved); return; }

    if (looksConversational(q)) { setConversational(q); return; }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 500);
  }, [search, activeCompanyId, activeCompanyName]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length >= 2) {
      setShowPanel(true);
      resolve(val.trim());
    } else {
      setResult(null);
      setFlow(null);
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
    setFlow(null);
    setConversational(null);
    setShowPanel(false);
    inputRef.current?.focus();
  }

  function handleJarvisHandoff() {
    if (!conversational) return;
    openJarvis({ prompt: conversational });
    setShowPanel(false);
  }

  function switchToCreateProject(companyId?: string, companyName?: string) {
    if (companyId) setProjectCompany({ id: companyId, name: companyName ?? null });
    setFlow({ kind: "create_project", intentId: "create_project" });
  }

  function switchToCreateClient() {
    setFlow({ kind: "create_client", intentId: "create_client" });
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
          placeholder="O que você quer fazer? Ex.: criar um projeto..."
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
      {showPanel && (result || loading || flow || conversational) && (
        <div className="absolute top-full mt-2 left-0 right-0 z-50 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          {flow?.kind === "navigate" && (
            <CommandActionResultCard
              action={flow}
              activeCompanyId={activeCompanyId}
              activeCompanyName={activeCompanyName}
              onNewClient={switchToCreateClient}
            />
          )}
          {flow?.kind === "create_client" && (
            <InlineClientCreation
              onClose={() => setShowPanel(false)}
              onProjectRequested={(id, name) => switchToCreateProject(id, name)}
            />
          )}
          {flow?.kind === "create_project" && (
            <InlineProjectCreation
              companyId={projectCompany?.id ?? null}
              companyName={projectCompany?.name ?? null}
              onSelectCompany={(id, name) => setProjectCompany({ id, name })}
            />
          )}
          {conversational && (
            <CommandJarvisHandoffCard query={conversational} onHandoff={handleJarvisHandoff} />
          )}
          {!flow && !conversational && loading && !result && (
            <div className="p-4 text-sm text-indigo-200/60 text-center">Buscando...</div>
          )}
          {!flow && !conversational && result && (
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
