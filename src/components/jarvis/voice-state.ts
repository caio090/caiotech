/**
 * Sprint MVP Dogfood Security + Voice Closure V0.1 (Fase 38) — decisões
 * puras extraídas de `use-jarvis-voice.ts` para serem testáveis sem
 * MediaRecorder/getUserMedia reais (indisponíveis neste harness Node).
 * O hook chama estas funções em vez de reimplementar a lógica inline --
 * comportamento idêntico, decisão isolada e testável.
 */

/** Fase 20 — nunca inicia uma segunda gravação para o mesmo gesto (touch+mouse sintético) nem enquanto uma já está em andamento. */
export function shouldAllowRecordingStart(hasActiveRecorder: boolean, startInProgress: boolean): boolean {
  return !hasActiveRecorder && !startInProgress;
}

export type RecordingStopOutcome = "cancelled" | "empty" | "ready";

/** Fase 16 — cancelado sempre descarta, independente de quantos chunks foram capturados. */
export function resolveRecordingStopOutcome(input: { wasCancelled: boolean; chunkCount: number }): RecordingStopOutcome {
  if (input.wasCancelled) return "cancelled";
  if (input.chunkCount === 0) return "empty";
  return "ready";
}

/**
 * Fase 15/19 — quando ninguém está esperando (stopRecording() ainda não foi
 * chamado porque o timeout de 60s venceu a corrida), o blob fica guardado
 * para a PRÓXIMA chamada consumir uma única vez -- nunca entregue duas
 * vezes (evita processar a mesma gravação duplicada por causa de um evento
 * de touch/mouse redundante).
 */
export function nextCachedBlob<T>(hasPendingResolver: boolean, blob: T): T | null {
  return hasPendingResolver ? null : blob;
}

/**
 * Fase 22/23 — decide qual Object URL revogar ao substituir a resposta
 * falada por uma nova. Nunca revoga a URL atual antes de uma NOVA existir
 * para tomar seu lugar.
 */
export function nextAudioUrlState(previousUrl: string | null, newUrl: string): { toRevoke: string | null; current: string } {
  return { toRevoke: previousUrl, current: newUrl };
}
