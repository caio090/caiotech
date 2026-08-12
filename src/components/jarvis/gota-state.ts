/**
 * Sprint Command Center + Jarvis Context V1 (Gota no Jarvis) — decisão PURA
 * de qual estado visual a Gota deve assumir, extraída do painel para ser
 * testável sem DOM/React (mesmo padrão de voice-state.ts). Prioridade fixa
 * evita que dois estados "reajam" ao mesmo tempo: falar vence ouvir, ouvir
 * vence pensar, pensar vence o repouso.
 */
export type JarvisGotaState = "idle" | "thinking" | "listening" | "speaking";

export function resolveJarvisGotaState(chatStatus: string, voiceStatus: string): JarvisGotaState {
  if (voiceStatus === "speaking") return "speaking";
  if (voiceStatus === "listening") return "listening";
  if (chatStatus === "sending" || chatStatus === "streaming") return "thinking";
  return "idle";
}
