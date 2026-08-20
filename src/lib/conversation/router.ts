/**
 * LOKAT OS — Conversation Core Foundation V1. Intent Router + Domain
 * Router combinados numa função pura: mensagem -> intenção -> alvo de
 * domínio real (com maturidade honesta, lida do registry canônico).
 * Esta fundação NUNCA executa a ação -- só decide para onde ela deveria
 * ir. Nenhuma chamada a módulo real (REC OS/Growth/Meu Negócio/etc.)
 * acontece aqui; a execução fica para uma missão futura, depois que um
 * canal real existir.
 */
import { findModuleById, type PlatformModuleMaturity } from "@/config/platform-modules";
import { matchConversationIntent, type ConversationIntentDef } from "./intents";
import type { DomainTarget } from "./types";

const MATURITY_HONEST_NOTICE: Record<Exclude<PlatformModuleMaturity, "production">, string> = {
  qa_pending: "Este módulo já existe, mas ainda está em QA -- trate a resposta com cautela.",
  preview: "Este módulo hoje funciona com dados de demonstração, não dados reais da sua empresa.",
  planned: "Esta funcionalidade ainda não foi construída -- só o planejamento arquitetural existe.",
  blocked: "Este módulo está bloqueado no momento.",
  experimental: "Este módulo é experimental -- os dados podem não ser confiáveis ainda.",
  not_implemented: "Esta funcionalidade ainda não existe no LOKAT OS.",
  coming_soon: "Esta funcionalidade foi anunciada, mas o trabalho ainda não começou.",
};

/** Nunca inventa dado: se o módulo não estiver registrado ou não for "production", carrega um aviso honesto. */
export function resolveDomainTarget(intent: ConversationIntentDef): DomainTarget {
  const mod = findModuleById(intent.moduleId);
  if (!mod) {
    return { moduleId: intent.moduleId, label: intent.label, maturity: null, honestNotice: "Módulo ainda não registrado no LOKAT OS." };
  }
  const honestNotice = mod.maturity === "production" ? null : MATURITY_HONEST_NOTICE[mod.maturity];
  return { moduleId: mod.id, label: mod.name, maturity: mod.maturity, honestNotice };
}

export interface ConversationRouteResult {
  intent: ConversationIntentDef | null;
  domain: DomainTarget | null;
}

export function routeConversationMessage(message: string): ConversationRouteResult {
  const intent = matchConversationIntent(message);
  if (!intent) return { intent: null, domain: null };
  return { intent, domain: resolveDomainTarget(intent) };
}
