"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Sprint MVP Experience Completion V0.1 (Parte D3) — hook de chat do Jarvis.
 * Histórico só em memória do componente (nunca localStorage/sessionStorage/
 * banco -- Fase D4). Uma requisição ativa por vez (o próprio AbortController
 * garante isso no client; o servidor também garante via cost-controls).
 */

export type JarvisChatStatus = "idle" | "sending" | "streaming" | "completed" | "error" | "blocked";

export interface JarvisMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface JarvisAttachment {
  name: string;
  type: string;
  size: number;
  dataBase64: string;
}

export interface UseJarvisChatOptions {
  companyId?: string | null;
  route?: string;
}

let messageCounter = 0;
function nextId(): string {
  messageCounter += 1;
  return `jarvis-msg-${messageCounter}-${Date.now()}`;
}

export function useJarvisChat({ companyId, route }: UseJarvisChatOptions) {
  const [messages, setMessages] = useState<JarvisMessage[]>([]);
  const [status, setStatus] = useState<JarvisChatStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastUserMessageRef = useRef<string>("");

  const send = useCallback(async (text: string, attachment?: JarvisAttachment) => {
    const trimmed = text.trim();
    if (!trimmed || status === "sending" || status === "streaming") return;

    lastUserMessageRef.current = trimmed;
    setErrorMessage(null);
    setMessages((prev) => [...prev, { id: nextId(), role: "user", content: trimmed }]);

    const assistantId = nextId();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);
    setStatus("sending");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const historyForRequest = messages.slice(-12).map((m) => ({ role: m.role, content: m.content }));
      const response = await fetch("/api/jarvis/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history: historyForRequest, companyId, route, attachment }),
        signal: controller.signal,
      });

      if (response.status === 503) {
        setStatus("blocked");
        setErrorMessage("Jarvis está temporariamente indisponível (configuração de IA ausente).");
        return;
      }
      if (response.status === 429) {
        setStatus("error");
        setErrorMessage("Já existe uma resposta em andamento.");
        return;
      }
      if (!response.ok || !response.body) {
        setStatus("error");
        setErrorMessage("Não foi possível falar com o Jarvis agora.");
        return;
      }

      setStatus("streaming");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          if (chunk.startsWith("event: error")) {
            const dataLine = chunk.split("\n").find((l) => l.startsWith("data: "));
            const payload = dataLine ? JSON.parse(dataLine.slice(6)) : { message: "Erro desconhecido." };
            setErrorMessage(payload.message);
            setStatus("error");
            return;
          }
          if (chunk.startsWith("data: ")) {
            const raw = chunk.slice(6);
            if (raw === "[DONE]") continue;
            const payload = JSON.parse(raw) as { delta: string };
            accumulated += payload.delta;
            setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m)));
          }
        }
      }
      setStatus("completed");
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        setStatus("idle");
        return;
      }
      setStatus("error");
      setErrorMessage("Não foi possível falar com o Jarvis agora.");
    } finally {
      abortRef.current = null;
    }
  }, [companyId, route, status, messages]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const repeat = useCallback(() => {
    if (lastUserMessageRef.current) send(lastUserMessageRef.current);
  }, [send]);

  const reset = useCallback(() => {
    setMessages([]);
    setStatus("idle");
    setErrorMessage(null);
  }, []);

  return { messages, status, errorMessage, send, cancel, repeat, reset };
}
