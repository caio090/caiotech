/**
 * Sprint MVP Experience Completion V0.1 — ponte mínima entre qualquer
 * página (ex.: Meu Escritório) e o painel do Jarvis, montado globalmente
 * em src/app/admin/_layout-client.tsx. Evita prop-drilling do estado do
 * painel por toda a árvore de componentes -- um CustomEvent client-only,
 * nada de estado global novo, nada de segundo orchestrator.
 */

export const JARVIS_OPEN_EVENT = "jarvis:open";

export interface JarvisOpenDetail {
  /** Quick prompt já pronto para envio (ex.: "Resumir meu dia"). Quando ausente, o painel só abre. */
  prompt?: string;
  /** Quando true, o painel abre já no modo push-to-talk. */
  voice?: boolean;
}

export function openJarvis(detail: JarvisOpenDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<JarvisOpenDetail>(JARVIS_OPEN_EVENT, { detail }));
}
