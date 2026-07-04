"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseAutoRefreshOptions {
  /** Habilita o polling. Se false, nenhum intervalo é criado. */
  enabled: boolean;
  /** Intervalo em ms. Padrão: 300000 (5 min). */
  intervalMs?: number;
  /** Função assíncrona chamada a cada ciclo e no mount (se refreshOnMount=true). */
  onRefresh: () => void | Promise<void>;
  /** Se true (padrão), dispara onRefresh imediatamente ao montar. */
  refreshOnMount?: boolean;
}

/**
 * Hook de auto-atualização com:
 * - Polling configurável (padrão 5 min)
 * - Sem refresh em aba oculta (document.visibilityState)
 * - Sem refresh duplo se já há requisição em andamento
 * - Botão manual via retorno `refresh()`
 */
export function useAutoRefresh({
  enabled,
  intervalMs = 300_000,
  onRefresh,
  refreshOnMount = true,
}: UseAutoRefreshOptions) {
  const running = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const refresh = useCallback(async () => {
    if (!enabled) return;
    if (running.current) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    running.current = true;
    try {
      await onRefreshRef.current();
    } finally {
      running.current = false;
    }
  }, [enabled]);

  // Dispara no mount
  useEffect(() => {
    if (refreshOnMount && enabled) {
      void refresh();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Polling
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      void refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs, refresh]);

  // Retoma ao focar na aba
  useEffect(() => {
    if (!enabled) return;
    const handler = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [enabled, refresh]);

  return { refresh };
}
