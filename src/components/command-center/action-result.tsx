"use client";

import Link from "next/link";
import { ArrowRight, Building2, MessageCircle, Plus } from "lucide-react";
import { withCompanyContext } from "@/lib/company-context/navigation";
import type { CommandActionResult } from "@/lib/command-center/intents";

/**
 * Sprint Final Product Experience Consolidation (Parte A, Fase 7) —
 * container genérico de resultado do Command Center. Contrato mínimo:
 * título, resumo, contexto exigido (Company) e uma ação primária sempre
 * navegável (nunca um texto pedindo para "acessar a rota X" -- Fase 6).
 */
export function CommandActionResultCard({
  action,
  activeCompanyId,
  activeCompanyName,
}: {
  action: CommandActionResult;
  activeCompanyId: string | null;
  activeCompanyName: string | null;
}) {
  const needsCompanyChoice = action.requiresCompany && !activeCompanyId;

  return (
    <div className="p-4 space-y-3" data-testid="command-action-result" data-intent={action.intentId}>
      <div>
        <p className="text-sm font-bold text-white">{action.title}</p>
        <p className="text-xs text-white/50 mt-0.5">{action.summary}</p>
      </div>

      {needsCompanyChoice ? (
        <div className="space-y-2" data-testid="command-action-company-required">
          <p className="text-xs text-white/70">Para qual empresa?</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/contentos/selecionar-cliente?next=${encodeURIComponent(action.href)}`}
              className="flex items-center gap-1.5 bg-purple-600/80 hover:bg-purple-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors"
            >
              <Building2 className="w-3.5 h-3.5" />
              Selecionar empresa
            </Link>
            <Link
              href="/admin/clientes"
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/15 text-white/90 text-xs font-medium px-3 py-2 rounded-xl transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo cliente
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Link
            href={action.requiresCompany && activeCompanyId ? withCompanyContext(action.href, activeCompanyId) : action.href}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition-colors"
            data-testid="command-action-primary"
          >
            {action.requiresCompany && activeCompanyName
              ? `${action.primaryLabel} para ${activeCompanyName}`
              : action.primaryLabel}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          {action.requiresCompany && activeCompanyId && (
            <Link
              href={`/contentos/selecionar-cliente?next=${encodeURIComponent(action.href)}`}
              className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 text-xs font-medium px-3 py-2 rounded-xl transition-colors"
            >
              Escolher outra empresa
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/** Fase 9/10 — pergunta/raciocínio aberto: nunca vira chat dentro do Command Center, sempre entrega ao Jarvis real. */
export function CommandJarvisHandoffCard({ query, onHandoff }: { query: string; onHandoff: () => void }) {
  return (
    <div className="p-4 space-y-3" data-testid="command-jarvis-handoff">
      <div>
        <p className="text-sm font-bold text-white">Isso parece uma conversa</p>
        <p className="text-xs text-white/50 mt-0.5">O Jarvis pode raciocinar sobre isso com você.</p>
      </div>
      <button
        type="button"
        onClick={onHandoff}
        className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition-colors"
        data-testid="command-jarvis-handoff-cta"
      >
        <MessageCircle className="w-3.5 h-3.5" />
        Continuar com Jarvis
      </button>
      <p className="text-[10px] text-white/30 truncate">&ldquo;{query}&rdquo;</p>
    </div>
  );
}
