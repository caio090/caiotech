"use client";

import { useState } from "react";
import { Send, Square, RotateCcw, Copy, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssistantContextSnapshot, AssistantMode } from "@/lib/motor-lokat/ai/types";
import { MAX_MESSAGE_CHARS } from "@/lib/motor-lokat/ai/cost-controls";
import { useAssistantSession } from "./use-assistant-session";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatProps {
  mode: AssistantMode;
  context: AssistantContextSnapshot;
  placeholder: string;
  onCreateProposal?: (answer: string) => void;
}

/** Fase 9 — real streaming chat against /api/motor-lokat/assistant. Session-only history: no localStorage/sessionStorage. */
export function AssistantChat({ mode, context, placeholder, onCreateProposal }: ChatProps) {
  const { status, streamedText, errorMessage, askStreaming, cancel } = useAssistantSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);

  const isBusy = status === "sending" || status === "streaming";

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    const history = messages.slice(-8);
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    const finalText = await askStreaming(mode, trimmed, context, history);
    if (finalText) setMessages((prev) => [...prev, { role: "assistant", content: finalText }]);
  }

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const lastAssistantMessage = status === "streaming" ? streamedText : (messages[messages.length - 1]?.role === "assistant" ? messages[messages.length - 1].content : "");

  return (
    <div className="flex flex-col h-full" style={{ color: "var(--business-text)" }}>
      <div className="flex-1 overflow-y-auto space-y-3 px-1 py-2 min-h-[180px]">
        {messages.length === 0 && status !== "streaming" && (
          <div className="rounded-2xl border p-3" style={{ background: "var(--business-surface-soft)", borderColor: "var(--business-border)" }}>
            <p className="text-xs" style={{ color: "var(--business-muted)" }}>{placeholder}</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("rounded-2xl px-3 py-2 text-xs max-w-[92%]", m.role === "user" ? "ml-auto text-white" : "")}
            style={m.role === "user" ? { background: "var(--business-accent)" } : { background: "var(--business-surface)", border: "1px solid var(--business-border)" }}>
            {m.content}
          </div>
        ))}
        {status === "streaming" && (
          <div className="rounded-2xl px-3 py-2 text-xs max-w-[92%]" style={{ background: "var(--business-surface)", border: "1px solid var(--business-border)" }}>
            {streamedText || <span style={{ color: "var(--business-muted)" }}>Digitando...</span>}
          </div>
        )}
        {status === "blocked" && (
          <p className="text-[11px] px-1" style={{ color: "var(--business-muted)" }}>Assistente temporariamente indisponível.</p>
        )}
        {status === "error" && errorMessage && (
          <p className="text-[11px] px-1 text-red-600">{errorMessage}</p>
        )}
      </div>

      <div className="flex items-center gap-1.5 px-1 pb-1 flex-wrap">
        {isBusy && (
          <button onClick={cancel} className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border" style={{ borderColor: "var(--business-border)", color: "var(--business-muted)" }}>
            <Square className="w-3 h-3" /> Cancelar
          </button>
        )}
        {!isBusy && lastUserMessage && (
          <button onClick={() => send(lastUserMessage)} className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border" style={{ borderColor: "var(--business-border)", color: "var(--business-muted)" }}>
            <RotateCcw className="w-3 h-3" /> Repetir
          </button>
        )}
        {!isBusy && lastAssistantMessage && (
          <button
            onClick={() => { navigator.clipboard?.writeText(lastAssistantMessage); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border"
            style={{ borderColor: "var(--business-border)", color: "var(--business-muted)" }}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copied ? "Copiado" : "Copiar"}
          </button>
        )}
        {!isBusy && lastAssistantMessage && onCreateProposal && (
          <button
            onClick={() => onCreateProposal(lastAssistantMessage)}
            className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg text-white"
            style={{ background: "var(--business-accent)" }}
          >
            <Sparkles className="w-3 h-3" /> Criar proposta
          </button>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="flex items-center gap-2 border-t pt-2 mt-1"
        style={{ borderColor: "var(--business-border)" }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, MAX_MESSAGE_CHARS))}
          placeholder="Pergunte algo sobre este negócio..."
          aria-label="Mensagem para o Assistente LOKAT"
          disabled={isBusy}
          className="flex-1 text-xs rounded-xl px-3 py-2 outline-none border"
          style={{ borderColor: "var(--business-border)", background: "var(--business-surface)" }}
        />
        <button
          type="submit"
          disabled={isBusy || !input.trim()}
          aria-label="Enviar mensagem"
          className="p-2 rounded-xl text-white disabled:opacity-40"
          style={{ background: "var(--business-accent)" }}
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
