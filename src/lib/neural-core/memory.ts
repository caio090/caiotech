/**
 * Sprint Gota Neural Foundation V1 (Fase 52-53) — Memory Contract.
 * Sem vector DB, sem embeddings, sem Supabase -- só o shape.
 */
import type { ConversationContext } from "./context";

export type NeuralMemoryType = "fact" | "preference" | "decision" | "strategy" | "history" | "derived_insight";

export interface NeuralMemoryEntry {
  id: string;
  companyId: string;
  projectId?: string;
  type: NeuralMemoryType;
  content: string;
  source: string;
  verified: boolean;
  importance: "low" | "medium" | "high";
  createdAt: string;
  expiresAt?: string;
}

/** `BusinessMemory` é só um alias semântico para a lista de entradas -- reforça a distinção do título da Fase 53. */
export type BusinessMemory = NeuralMemoryEntry[];

/**
 * Fase 53 — "chat history != company memory". Uma ConversationContext
 * NUNCA vira NeuralMemoryEntry sozinha; só through uma promoção
 * EXPLÍCITA (ex.: o usuário confirma que uma resposta virou uma
 * decisão). Esta função nunca promove automaticamente -- existe para
 * deixar a regra testável, não para contornar ela.
 */
export function conversationTurnIsMemoryEntry(turn: ConversationContext): false {
  void turn;
  return false;
}

export function promoteConversationToMemory(
  turn: ConversationContext,
  promotion: { type: NeuralMemoryType; content: string; importance: NeuralMemoryEntry["importance"] }
): NeuralMemoryEntry {
  return {
    id: `memory:${turn.turnId}`,
    companyId: turn.companyId,
    type: promotion.type,
    content: promotion.content,
    source: "user_input",
    verified: true, // só chega aqui através de uma confirmação explícita do chamador
    importance: promotion.importance,
    createdAt: turn.occurredAt,
  };
}
