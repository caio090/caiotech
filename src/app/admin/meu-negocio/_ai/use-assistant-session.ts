"use client";

import { useCallback, useRef, useState } from "react";
import type { AssistantContextSnapshot, AssistantMode, AssistantRequestStatus, MotorLokatAssistantResponse } from "@/lib/motor-lokat/ai/types";
import { generateId } from "../_shared";

/**
 * Fase 9 — chat session state, kept only in React memory for this session:
 * no localStorage, no sessionStorage, nothing persisted to the backend.
 */
export function useAssistantSession() {
  const [sessionId] = useState(() => generateId("session"));
  const [status, setStatus] = useState<AssistantRequestStatus>("idle");
  const [streamedText, setStreamedText] = useState("");
  const [structuredResult, setStructuredResult] = useState<MotorLokatAssistantResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setStatus("idle");
  }, []);

  /** Returns the final accumulated text on success, or null — callers commit it to their own message list themselves, never via a render-time side effect here. */
  const askStreaming = useCallback(async (mode: AssistantMode, message: string, context: AssistantContextSnapshot, history: Array<{ role: "user" | "assistant"; content: string }>): Promise<string | null> => {
    setStreamedText("");
    setErrorMessage(null);
    setStatus("sending");
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/motor-lokat/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, message, context, history, sessionId }),
        signal: controller.signal,
      });

      if (res.status === 503) {
        setStatus("blocked");
        setErrorMessage("Assistente temporariamente indisponível.");
        return null;
      }
      if (!res.ok || !res.body) {
        setStatus("error");
        setErrorMessage("Não foi possível obter resposta do assistente.");
        return null;
      }

      setStatus("streaming");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("event: error")) {
            setStatus("error");
            setErrorMessage("O assistente encontrou um erro ao responder.");
            return null;
          }
          if (line.startsWith("data: ")) {
            const raw = line.slice(6);
            if (raw === "[DONE]") continue;
            try {
              const parsed = JSON.parse(raw) as { delta?: string };
              if (parsed.delta) {
                accumulated += parsed.delta;
                setStreamedText(accumulated);
              }
            } catch {
              // Ignore a malformed chunk rather than breaking the whole stream.
            }
          }
        }
      }
      setStatus("completed");
      return accumulated;
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        setStatus("idle");
        return null;
      }
      setStatus("error");
      setErrorMessage("Não foi possível conectar ao assistente.");
      return null;
    }
  }, [sessionId]);

  const askStructured = useCallback(async (
    mode: AssistantMode,
    message: string,
    context: AssistantContextSnapshot,
    attachment?: { name: string; type: string; size: number; dataBase64: string }
  ): Promise<MotorLokatAssistantResponse | null> => {
    setErrorMessage(null);
    setStatus("sending");
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/motor-lokat/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, message, context, history: [], sessionId, attachment }),
        signal: controller.signal,
      });

      if (res.status === 503) {
        setStatus("blocked");
        setErrorMessage("Assistente temporariamente indisponível.");
        return null;
      }
      const body = await res.json() as { ok: boolean; data?: MotorLokatAssistantResponse; message?: string };
      if (!res.ok || !body.ok || !body.data) {
        setStatus("error");
        setErrorMessage(body.message ?? "Não foi possível obter uma proposta do assistente.");
        return null;
      }
      setStructuredResult(body.data);
      setStatus("completed");
      return body.data;
    } catch {
      setStatus("error");
      setErrorMessage("Não foi possível conectar ao assistente.");
      return null;
    }
  }, [sessionId]);

  return { sessionId, status, streamedText, structuredResult, errorMessage, askStreaming, askStructured, cancel, setStatus };
}
