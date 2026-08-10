"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { shouldAllowRecordingStart, resolveRecordingStopOutcome, nextCachedBlob, nextAudioUrlState } from "./voice-state";

/**
 * Sprint MVP Experience Completion V0.1 (Missão 3, Fase 28-37) — Jarvis
 * Voice. Modo TURN_BASED_PUSH_TO_TALK (Fase 36: nada de Realtime/WebRTC
 * contínuo nesta sprint). Áudio nunca sai da memória do browser além do
 * upload direto ao endpoint de transcrição -- nenhum arquivo salvo local.
 *
 * Sprint MVP Dogfood Security + Voice Closure V0.1 (P1 #1) — corrige o gap
 * apontado pela auditoria CODEX WEB: `recorder.onstop` era atribuído só
 * dentro de `stopRecording()`, então o timeout automático de 60s (que
 * chama `.stop()` diretamente) disparava um `onstop` inexistente -- o
 * microfone e o MediaStream nunca eram liberados, e o estado ficava
 * inconsistente. `onstop`/`onerror` agora são atribuídos UMA VEZ em
 * `startRecording()`, e `cleanupResources()` (Fase 14) é a única função
 * responsável por liberar timer/stream/recorder -- idempotente, chamada em
 * todo caminho de saída (stop normal, timeout, cancel, error, unmount).
 */

export type JarvisVoiceStatus =
  | "idle" | "requesting_permission" | "listening" | "processing"
  | "transcribing" | "speaking" | "error";

export type JarvisVoiceErrorReason =
  | "permission_denied" | "no_microphone" | "unsupported" | "empty_audio"
  | "timeout" | "cancelled" | "network_error" | "transcription_error" | "speech_error";

const MAX_RECORDING_MS = 60_000;

function pickSupportedMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = ["audio/webm", "audio/mp4", "audio/ogg"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

export function useJarvisVoice() {
  const [status, setStatus] = useState<JarvisVoiceStatus>("idle");
  const [errorReason, setErrorReason] = useState<JarvisVoiceErrorReason | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioUrlRef = useRef<string | null>(null);
  /** Fase 19/20 — trava contra início duplicado (touchstart seguido de mousedown sintético). */
  const startInProgressRef = useRef(false);
  const cancelledRef = useRef(false);
  /** Fase 15 — resolve pendente de stopRecording(); pode ser null se o timeout parou a gravação antes do usuário soltar o botão. */
  const pendingStopResolveRef = useRef<((blob: Blob | null) => void) | null>(null);
  /** Guarda o blob quando onstop dispara sem ninguém esperando (timeout venceu a corrida com o release do botão). */
  const lastBlobRef = useRef<Blob | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  /**
   * Fase 14 — cleanupRecording(): idempotente, segura para chamadas
   * repetidas. Libera timer, stream/tracks e a referência do recorder --
   * nunca lança se já foi chamada antes.
   */
  const cleanupResources = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    stopStream();
    mediaRecorderRef.current = null;
    startInProgressRef.current = false;
  }, [stopStream]);

  /** Fase E4/E5 — segurar para falar. Resolve com o Blob gravado, ou null se cancelado/vazio. */
  const startRecording = useCallback(async (): Promise<void> => {
    // Fase 20 — single start lock: ignora um segundo gesto (touch+mouse sintético) para a mesma gravação.
    if (!shouldAllowRecordingStart(!!mediaRecorderRef.current, startInProgressRef.current)) return;
    startInProgressRef.current = true;
    setErrorReason(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      startInProgressRef.current = false;
      setStatus("error");
      setErrorReason("unsupported");
      return;
    }
    const mimeType = pickSupportedMimeType();
    if (!mimeType) {
      startInProgressRef.current = false;
      setStatus("error");
      setErrorReason("unsupported");
      return;
    }

    setStatus("requesting_permission");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      startInProgressRef.current = false;
      const name = (error as Error).name;
      setStatus("error");
      setErrorReason(name === "NotFoundError" ? "no_microphone" : "permission_denied");
      return;
    }

    // Fase 20 — outra tentativa pode ter vencido a corrida enquanto getUserMedia() aguardava permissão.
    if (mediaRecorderRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      startInProgressRef.current = false;
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];
    cancelledRef.current = false;
    lastBlobRef.current = null;

    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data); };

    // Fase 14/17 — atribuído UMA VEZ aqui, nunca dentro de stopRecording(): garante que o
    // timeout automático (que chama .stop() diretamente) sempre dispara a mesma limpeza.
    recorder.onstop = () => {
      const wasCancelled = cancelledRef.current;
      cancelledRef.current = false;
      const collectedChunks = chunksRef.current;
      chunksRef.current = [];
      const mimeTypeUsed = recorder.mimeType;

      cleanupResources();

      const resolvePending = pendingStopResolveRef.current;
      pendingStopResolveRef.current = null;

      const outcome = resolveRecordingStopOutcome({ wasCancelled, chunkCount: collectedChunks.length });

      if (outcome === "cancelled") {
        lastBlobRef.current = null;
        if (resolvePending) resolvePending(null);
        return;
      }

      const blob = outcome === "ready" ? new Blob(collectedChunks, { type: mimeTypeUsed }) : null;
      if (!blob || blob.size === 0) {
        setStatus("error");
        setErrorReason("empty_audio");
        lastBlobRef.current = null;
        if (resolvePending) resolvePending(null);
        return;
      }

      setStatus("processing");
      lastBlobRef.current = nextCachedBlob(!!resolvePending, blob);
      if (resolvePending) resolvePending(blob);
    };

    recorder.onerror = () => {
      // Fase 17 — erro do MediaRecorder nunca deixa o microfone ativo nem o estado preso.
      cancelledRef.current = true;
      if (recorder.state === "recording") {
        try { recorder.stop(); } catch { cleanupResources(); }
      } else {
        cleanupResources();
      }
      setStatus("error");
      setErrorReason("network_error");
      const resolvePending = pendingStopResolveRef.current;
      pendingStopResolveRef.current = null;
      if (resolvePending) resolvePending(null);
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    startInProgressRef.current = false;
    setStatus("listening");

    // Fase 15 — timeout de 60s chama .stop() diretamente; onstop (acima) SEMPRE
    // executa a limpeza completa e processa o áudio válido, mesmo que o usuário
    // ainda não tenha soltado o botão.
    timeoutRef.current = setTimeout(() => {
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    }, MAX_RECORDING_MS);
  }, [cleanupResources]);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder) {
        // Fase 15 — o timeout pode ter parado a gravação antes do usuário soltar o
        // botão: onstop já rodou e guardou o blob em vez de descartar a gravação.
        const blob = lastBlobRef.current;
        lastBlobRef.current = null;
        resolve(blob);
        return;
      }
      if (recorder.state !== "recording") {
        resolve(null);
        return;
      }
      pendingStopResolveRef.current = resolve;
      recorder.stop();
    });
  }, []);

  /** Fase 16 — cancelar nunca envia transcrição; sempre libera o microfone. */
  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      cancelledRef.current = true;
      recorder.stop(); // onstop cuida da limpeza e descarta o blob por causa de cancelledRef
    } else {
      cleanupResources();
    }
    pendingStopResolveRef.current = null;
    setStatus("idle");
    setErrorReason("cancelled");
  }, [cleanupResources]);

  /** Fase E7 — envia o Blob gravado para transcrição server-side. */
  const transcribe = useCallback(async (blob: Blob): Promise<string | null> => {
    setStatus("transcribing");
    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      const response = await fetch("/api/jarvis/transcribe", { method: "POST", body: formData });
      if (!response.ok) {
        setStatus("error");
        setErrorReason(response.status === 503 ? "network_error" : "transcription_error");
        return null;
      }
      const data = await response.json() as { text: string };
      return data.text;
    } catch {
      setStatus("error");
      setErrorReason("network_error");
      return null;
    }
  }, []);

  /** Fase E8/E9/22/23 — gera e reproduz a fala; nunca persiste; revoga a URL anterior ao trocar. */
  const speak = useCallback(async (text: string): Promise<boolean> => {
    setStatus("speaking");
    try {
      const response = await fetch("/api/jarvis/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) {
        setStatus("error");
        setErrorReason("speech_error");
        return false;
      }
      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      // Fase 23 — revoga a URL anterior só agora que uma NOVA resposta a substitui, nunca antes do replay terminar.
      const { toRevoke, current } = nextAudioUrlState(currentAudioUrlRef.current, url);
      if (toRevoke) URL.revokeObjectURL(toRevoke);
      currentAudioUrlRef.current = current;
      const audio = new Audio(url);
      audioElementRef.current = audio;
      audio.onended = () => setStatus("idle");
      try {
        await audio.play();
      } catch {
        // Fase E9 — autoplay bloqueado pelo browser: o botão "Ouvir resposta" cuida disso.
        setStatus("idle");
        return false;
      }
      return true;
    } catch {
      setStatus("error");
      setErrorReason("speech_error");
      return false;
    }
  }, []);

  const replay = useCallback(() => {
    audioElementRef.current?.play().catch(() => {});
  }, []);

  const stopPlayback = useCallback(() => {
    audioElementRef.current?.pause();
    setStatus("idle");
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setErrorReason(null);
  }, []);

  // Fase 18 — unmount: para tracks, limpa timers, para playback e revoga a URL de áudio atual.
  useEffect(() => {
    return () => {
      cleanupResources();
      audioElementRef.current?.pause();
      if (currentAudioUrlRef.current) {
        URL.revokeObjectURL(currentAudioUrlRef.current);
        currentAudioUrlRef.current = null;
      }
    };
  }, [cleanupResources]);

  return {
    status, errorReason, startRecording, stopRecording, cancelRecording,
    transcribe, speak, replay, stopPlayback, reset,
  };
}
