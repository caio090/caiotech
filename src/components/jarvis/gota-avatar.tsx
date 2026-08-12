"use client";

/**
 * Sprint Command Center + Jarvis Context V1 (Gota no Jarvis) — mesmo
 * desenho da Gota do Hero (src/app/_home-client.tsx: gradiente `dg`/
 * `dshine`/`dborder`, mesmo path) miniaturizado para o avatar do painel do
 * Jarvis -- nenhum redesenho da identidade, nenhum GIF, nenhuma lib nova.
 * A reação por estado é só a classe CSS (.jarvis-gota-*, ver globals.css),
 * que já respeita prefers-reduced-motion no mesmo bloco das outras
 * animações da Gota (orbit/glow/signal).
 */
import type { JarvisGotaState } from "./gota-state";
export type { JarvisGotaState } from "./gota-state";

const STATE_CLASS: Record<JarvisGotaState, string> = {
  idle: "",
  thinking: "jarvis-gota-thinking",
  listening: "jarvis-gota-listening",
  speaking: "jarvis-gota-speaking",
};

export function JarvisGotaAvatar({ state, size = 28 }: { state: JarvisGotaState; size?: number }) {
  return (
    <div
      data-testid="jarvis-gota-avatar"
      data-state={state}
      className={`flex-shrink-0 ${STATE_CLASS[state]}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 200 260" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
        <defs>
          <linearGradient id="jarvisDg" x1="0.3" y1="0" x2="0.7" y2="1">
            <stop offset="0%" stopColor="#c4baff" />
            <stop offset="45%" stopColor="#7b6ef6" />
            <stop offset="100%" stopColor="#3a2a9a" />
          </linearGradient>
          <linearGradient id="jarvisDshine" x1="0" y1="0" x2="0.6" y2="0.6">
            <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        <path d="M100 22 C146 80 174 123 174 164 C174 215 141 247 100 247 C59 247 26 215 26 164 C26 123 54 80 100 22Z" fill="url(#jarvisDg)" />
        <path d="M70 58 C78 46 92 38 104 37 C92 78 74 112 63 143 C50 114 56 76 70 58Z" fill="url(#jarvisDshine)" />
      </svg>
    </div>
  );
}
