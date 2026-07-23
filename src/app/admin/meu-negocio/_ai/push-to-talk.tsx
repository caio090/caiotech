"use client";

import { useRef, useState } from "react";
import { Mic, Loader2, Square } from "lucide-react";
import { generateId } from "../_shared";

type RecorderState = "idle" | "requesting-permission" | "recording" | "processing" | "error";

const MAX_RECORDING_MS = 60_000;

/**
 * Fase 13 — push-to-talk. No continuous Realtime conversation in this
 * sprint (explicitly out of scope); this is a single hold-to-record ->
 * transcribe -> editable text contract that a future Realtime flow can
 * extend without changing this component's public shape.
 */
export function PushToTalk({ onTranscribed }: { onTranscribed: (text: string) => void }) {
  const [state, setState] = useState<RecorderState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionIdRef = useRef(generateId("voice"));

  async function startRecording() {
    setErrorMessage(null);
    setTranscript("");
    setState("requesting-permission");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => sendRecording();
      mediaRecorderRef.current = recorder;
      recorder.start();
      setState("recording");
      timeoutRef.current = setTimeout(() => stopRecording(), MAX_RECORDING_MS);
    } catch {
      setState("error");
      setErrorMessage("Permissão de microfone negada ou nenhum microfone disponível.");
    }
  }

  function stopRecording() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setState("processing");
  }

  function cancelRecording() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (mediaRecorderRef.current) mediaRecorderRef.current.onstop = null;
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    chunksRef.current = [];
    setState("idle");
  }

  async function sendRecording() {
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    if (blob.size === 0) {
      setState("error");
      setErrorMessage("Áudio vazio — nada foi gravado.");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("sessionId", sessionIdRef.current);
      formData.append("audio", blob, "gravacao.webm");
      const res = await fetch("/api/motor-lokat/assistant/transcribe", { method: "POST", body: formData });
      if (res.status === 503) {
        setState("error");
        setErrorMessage("Assistente temporariamente indisponível.");
        return;
      }
      const body = await res.json() as { ok: boolean; text?: string; message?: string };
      if (!res.ok || !body.ok || !body.text) {
        setState("error");
        setErrorMessage(body.message ?? "Não foi possível transcrever o áudio.");
        return;
      }
      setTranscript(body.text);
      setState("idle");
    } catch {
      setState("error");
      setErrorMessage("Tempo esgotado ao transcrever o áudio.");
    }
  }

  return (
    <div className="space-y-2">
      <button
        onMouseDown={startRecording}
        onMouseUp={() => state === "recording" && stopRecording()}
        onMouseLeave={() => state === "recording" && stopRecording()}
        onTouchStart={startRecording}
        onTouchEnd={() => state === "recording" && stopRecording()}
        disabled={state === "requesting-permission" || state === "processing"}
        aria-label="Segurar para falar"
        className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl text-white w-full justify-center disabled:opacity-60"
        style={{ background: state === "recording" ? "#a83226" : "var(--business-accent)" }}
      >
        {state === "processing" ? <Loader2 className="w-4 h-4 animate-spin" /> : state === "recording" ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        {state === "recording" ? "Gravando... solte para enviar" : state === "processing" ? "Transcrevendo..." : state === "requesting-permission" ? "Solicitando permissão..." : "Segurar para falar"}
      </button>
      {state === "recording" && (
        <button onClick={cancelRecording} className="text-[10px] font-bold w-full text-center" style={{ color: "var(--business-muted)" }}>Cancelar gravação</button>
      )}
      {errorMessage && <p className="text-[11px] text-red-600">{errorMessage}</p>}
      {transcript && (
        <div className="space-y-1.5">
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={2}
            aria-label="Texto transcrito (editável)"
            className="w-full text-xs rounded-xl px-3 py-2 outline-none border resize-none"
            style={{ borderColor: "var(--business-border)", background: "var(--business-surface)" }}
          />
          <button
            onClick={() => onTranscribed(transcript)}
            className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white"
            style={{ background: "var(--business-accent)" }}
          >
            Interpretar e propor atualização
          </button>
        </div>
      )}
    </div>
  );
}
