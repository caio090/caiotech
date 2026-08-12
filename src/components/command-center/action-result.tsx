"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { withCompanyContext } from "@/lib/company-context/navigation";
import type { CommandNavigateFlow } from "@/lib/command-center/intents";
import { InlineCompanyPicker } from "./inline-company-picker";

/**
 * Sprint Command Center + Jarvis Context V1 — container genérico de
 * resultado do Command Center. Contrato mínimo: título, resumo, contexto
 * exigido (Company) e uma ação primária sempre navegável (nunca um texto
 * pedindo para "acessar a rota X"). Company-required agora resolve
 * INLINE (Problema 2) -- nunca redireciona para o seletor do ContentOS;
 * a escolha vira estado local, a ação primária já nasce com a Company
 * resolvida.
 */
export function CommandActionResultCard({
  action,
  activeCompanyId,
  activeCompanyName,
  onNewClient,
}: {
  action: CommandNavigateFlow;
  activeCompanyId: string | null;
  activeCompanyName: string | null;
  onNewClient?: () => void;
}) {
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [pickedName, setPickedName] = useState<string | null>(null);

  const companyId = pickedId ?? activeCompanyId;
  const companyName = pickedId ? pickedName : activeCompanyName;
  const needsCompanyChoice = action.requiresCompany && !companyId;

  return (
    <div className="p-4 space-y-3" data-testid="command-action-result" data-intent={action.intentId}>
      <div>
        <p className="text-sm font-bold text-white">{action.title}</p>
        <p className="text-xs text-white/50 mt-0.5">{action.summary}</p>
      </div>

      {needsCompanyChoice ? (
        <div className="space-y-2" data-testid="command-action-company-required">
          <p className="text-xs text-white/70">Para qual empresa?</p>
          <InlineCompanyPicker
            onSelect={(id, name) => { setPickedId(id); setPickedName(name); }}
            onNewClient={onNewClient}
          />
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Link
            href={action.requiresCompany && companyId ? withCompanyContext(action.href, companyId) : action.href}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition-colors"
            data-testid="command-action-primary"
          >
            {action.requiresCompany && companyName
              ? `${action.primaryLabel} para ${companyName}`
              : action.primaryLabel}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          {action.requiresCompany && pickedId && (
            <button
              type="button"
              onClick={() => { setPickedId(null); setPickedName(null); }}
              className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 text-xs font-medium px-3 py-2 rounded-xl transition-colors"
            >
              Escolher outra empresa
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Pergunta/raciocínio aberto: nunca vira chat dentro do Command Center, sempre entrega ao Jarvis real. */
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
