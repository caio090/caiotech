"use client";

import { useEffect, useState } from "react";

/**
 * Fase 18 — fallback. Reuses the existing /api/ai/status route (GET,
 * pre-existing convention: `{ openaiConfigured: boolean }`, never the key
 * itself) instead of creating a second status endpoint. Optimistic `true`
 * on first render so the panel doesn't flash a false "indisponível" while
 * the check is in flight; corrected as soon as the response arrives.
 */
export function useAssistantAvailability(): boolean {
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai/status")
      .then((res) => (res.ok ? res.json() : { openaiConfigured: false }))
      .then((body: { openaiConfigured?: boolean }) => { if (!cancelled) setConfigured(Boolean(body.openaiConfigured)); })
      .catch(() => { if (!cancelled) setConfigured(false); });
    return () => { cancelled = true; };
  }, []);

  return configured;
}
