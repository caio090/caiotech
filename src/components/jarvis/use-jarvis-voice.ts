"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Sprint MVP Experience Completion V0.1 (Missão 3, Fase 28-37) — Jarvis
 * Voice. Modo TURN_BASED_PUSH_TO_TALK (Fase 36: nada de Realtime/WebRTC
 * contínuo nesta sprint). Áudio nunca sai da memória do browser além do
 * upload direto ao endpoint de transcrição -- nenhum arquivo salvo local.
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
  const lastSpokenTextRef = useRef<string>("");

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  /** Fase E4/E5 — segurar para falar. Resolve com o Blob gravado, ou null se cancelado/vazio. */
  const startRecording = useCallback(async (): Promise<void> => {
    setErrorReason(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setErrorReason("unsupported");
      return;
    }
    const mimeType = pickSupportedMimeType();
    if (!mimeType) {
      setStatus("error");
      setErrorReason("unsupported");
      return;
    }

    setStatus("requesting_permission");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      const name = (error as Error).name;
      setStatus("error");
      setErrorReason(name === "NotFoundError" ? "no_microphone" : "permission_denied");
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data); };
    mediaRecorderRef.current = recorder;
    recorder.start();
    setStatus("listening");

    timeoutRef.current = setTimeout(() => {
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    }, MAX_RECORDING_MS);
  }, []);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state !== "recording") {
        resolve(null);
        return;
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      recorder.onstop = () => {
        stopStream();
        const blob = chunksRef.current.length > 0 ? new Blob(chunksRef.current, { type: recorder.mimeType }) : null;
        if (!blob || blob.size === 0) {
          setStatus("error");
          setErrorReason("empty_audio");
          resolve(null);
          return;
        }
        setStatus("processing");
        resolve(blob);
      };
      recorder.stop();
    });
  }, [stopStream]);

  const cancelRecording = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.onstop = () => stopStream();
      recorder.stop();
    } else {
      stopStream();
    }
    setStatus("idle");
    setErrorReason("cancelled");
  }, [stopStream]);

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

  /** Fase E8/E9 — gera e reproduz a fala; nunca persiste o áudio. */
  const speak = useCallback(async (text: string): Promise<boolean> => {
    lastSpokenTextRef.current = text;
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
      const audio = new Audio(url);
      audioElementRef.current = audio;
      try {
        await audio.play();
      } catch {
        // Fase E9 — autoplay bloqueado pelo browser: o botão "Ouvir resposta" cuida disso.
        setStatus("idle");
        return false;
      }
      audio.onended = () => setStatus("idle");
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

  return {
    status, errorReason, startRecording, stopRecording, cancelRecording,
    transcribe, speak, replay, stopPlayback, reset,
  };
}
