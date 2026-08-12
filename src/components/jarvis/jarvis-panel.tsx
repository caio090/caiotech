"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Zap, X, Send, Mic, Paperclip, Wand2, Copy, RotateCcw, Square,
  Volume2, Check, AlertTriangle, Loader2, Building2, ChevronDown, Globe2,
} from "lucide-react";
import { JARVIS_OPEN_EVENT, type JarvisOpenDetail } from "@/lib/jarvis/open-jarvis";
import { useAuthorizedCompanies } from "@/components/command-center/inline-company-picker";
import { useJarvisChat } from "./use-jarvis-chat";
import { useJarvisVoice } from "./use-jarvis-voice";
import { JarvisGotaAvatar } from "./gota-avatar";
import { resolveJarvisGotaState } from "./gota-state";

/**
 * Sprint MVP Experience Completion V0.1 (Parte C/D/E) — Jarvis.
 * Reaproveita o FAB roxo/índigo que já existia (antes "Lokat Voice",
 * resumo + atalhos sem chat/voz real) como entrada única do assistente --
 * nenhum segundo FAB criado. Desktop: painel lateral direito. Mobile:
 * bottom sheet. Estilo claro (cards brancos, bordas discretas) para ficar
 * consistente com o resto da área /admin (Escritório/Empresa/Projetos),
 * que já é clara -- não introduz um painel escuro destoante.
 */

const MIC_ERROR_LABEL: Record<string, string> = {
  permission_denied: "Permissão de microfone negada.",
  no_microphone: "Nenhum microfone encontrado.",
  unsupported: "Seu navegador não suporta gravação de áudio.",
  empty_audio: "Nenhum áudio foi capturado.",
  timeout: "Tempo de gravação esgotado.",
  cancelled: "Gravação cancelada.",
  network_error: "Não foi possível conectar ao servidor.",
  transcription_error: "Não foi possível transcrever o áudio.",
  speech_error: "Não foi possível gerar a resposta falada.",
};

const ACCEPTED_REPORT_TYPES = ".pdf,.png,.jpg,.jpeg,.csv,.txt";
const MAX_REPORT_BYTES = 8 * 1024 * 1024;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface JarvisContextSummary {
  mode?: "global" | "company";
  companyId?: string | null;
  companyName: string | null;
  surface: string;
  office: { todayCount: number; overdueCount: number; approvalsCount: number; calendarStatus: string } | null;
  activeProjectsCount: number;
}

/**
 * Sprint Command Center + Jarvis Context V1 (Problema 7) — o "Jarvis
 * Context" (Global ou uma Company específica) é independente do `?client=`
 * da página: a URL só serve de SEMENTE inicial (`manualSelection === null`
 * segue a página); depois que o usuário troca pelo seletor no cabeçalho, a
 * escolha manual passa a valer mesmo que a página mude -- nunca um
 * `router.push`/mudança de URL acontece aqui.
 */
type JarvisManualContext = { kind: "global" } | { kind: "company"; id: string; name: string | null } | null;

export function JarvisPanel() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageCompanyId = searchParams.get("client");

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [context, setContext] = useState<JarvisContextSummary | null>(null);
  const [manualSelection, setManualSelection] = useState<JarvisManualContext>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [attachment, setAttachment] = useState<{ name: string; type: string; size: number; dataBase64: string } | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const switcherRef = useRef<HTMLDivElement>(null);

  const activeCompanyId = manualSelection
    ? (manualSelection.kind === "company" ? manualSelection.id : null)
    : pageCompanyId;

  const { companies: authorizedCompanies } = useAuthorizedCompanies();

  const chat = useJarvisChat({ companyId: activeCompanyId, route: pathname });
  const voice = useJarvisVoice();

  function switchContext(next: JarvisManualContext) {
    setManualSelection(next);
    setSwitcherOpen(false);
    // Trocar de empresa/Global é uma troca de contexto real -- nunca mistura
    // o histórico em memória de um contexto com o resumo/dados de outro.
    chat.reset();
  }

  /* eslint-disable-next-line react-hooks/set-state-in-effect */
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    fetch("/api/jarvis/status").then((r) => r.json()).then((data) => setConfigured(Boolean(data.configured))).catch(() => setConfigured(false));
  }, []);

  const loadContext = useCallback(() => {
    const qs = activeCompanyId ? `?client=${encodeURIComponent(activeCompanyId)}` : "";
    fetch(`/api/jarvis/context${qs}`).then((r) => r.json()).then((data) => {
      if (data.ok) setContext(data);
    }).catch(() => {});
  }, [activeCompanyId]);

  useEffect(() => {
    if (open) loadContext();
  }, [open, loadContext]);

  useEffect(() => {
    if (!switcherOpen) return;
    function onOutside(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) setSwitcherOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [switcherOpen]);

  // Fase C4/B7 — outras páginas (ex.: Meu Escritório) abrem o painel via openJarvis().
  useEffect(() => {
    function handleOpen(event: Event) {
      const detail = (event as CustomEvent<JarvisOpenDetail>).detail ?? {};
      setOpen(true);
      if (detail.prompt) {
        void chat.send(detail.prompt);
      } else if (detail.voice) {
        void handleStartVoice();
      }
    }
    window.addEventListener(JARVIS_OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(JARVIS_OPEN_EVENT, handleOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSend() {
    const text = inputValue;
    const pendingAttachment = attachment ?? undefined;
    setInputValue("");
    setAttachment(null);
    await chat.send(text, pendingAttachment);
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setAttachmentError(null);
    if (file.size <= 0) { setAttachmentError("Arquivo vazio."); return; }
    if (file.size > MAX_REPORT_BYTES) { setAttachmentError("Arquivo maior que 8MB."); return; }
    const allowed = ["application/pdf", "image/png", "image/jpeg", "text/csv", "text/plain"];
    if (!allowed.includes(file.type)) { setAttachmentError("Formato não suportado (use PDF, PNG, JPG, CSV ou TXT)."); return; }
    const dataBase64 = await fileToBase64(file);
    setAttachment({ name: file.name, type: file.type, size: file.size, dataBase64 });
  }

  async function handleStartVoice() {
    await voice.startRecording();
  }

  async function handleStopVoice() {
    const blob = await voice.stopRecording();
    if (!blob) return;
    const text = await voice.transcribe(blob);
    if (!text) return;
    setInputValue(text);
    await chat.send(text);
  }

  const lastAssistantMessage = [...chat.messages].reverse().find((m) => m.role === "assistant" && m.content);

  async function handleSpeakLastResponse() {
    if (!lastAssistantMessage) return;
    await voice.speak(lastAssistantMessage.content);
  }

  if (!mounted) return null;

  const gotaState = resolveJarvisGotaState(chat.status, voice.status);

  const panelBody = (
    <div className="flex h-full flex-col bg-white" data-testid="jarvis-panel-body">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <JarvisGotaAvatar state={gotaState} size={28} />
          <div className="min-w-0 relative" ref={switcherRef}>
            <p className="text-sm font-bold text-gray-900">Jarvis</p>
            {/* Jarvis Context (Problema 7) — Global ou uma Company específica,
                independente do ?client= da página; a URL nunca muda aqui. */}
            <button
              type="button"
              onClick={() => setSwitcherOpen((v) => !v)}
              data-testid="jarvis-context-switcher"
              className="text-[10px] text-gray-400 hover:text-gray-600 truncate flex items-center gap-1"
            >
              {context?.mode === "company" ? <Building2 className="w-3 h-3 flex-shrink-0" /> : <Globe2 className="w-3 h-3 flex-shrink-0" />}
              <span className="truncate">{context?.mode === "company" ? (context.companyName ?? "Empresa") : "Global"}</span>
              <ChevronDown className="w-3 h-3 flex-shrink-0" />
            </button>
            {switcherOpen && (
              <div
                data-testid="jarvis-context-switcher-menu"
                className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-100 rounded-xl shadow-xl z-10 py-1 max-h-64 overflow-y-auto"
              >
                <button
                  type="button"
                  onClick={() => switchContext({ kind: "global" })}
                  data-testid="jarvis-context-option-global"
                  className="w-full flex items-center gap-2 text-left text-xs text-gray-700 hover:bg-gray-50 px-3 py-2"
                >
                  <Globe2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" /> Global
                </button>
                {(authorizedCompanies ?? []).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => switchContext({ kind: "company", id: c.id, name: c.name })}
                    data-testid="jarvis-context-option-company"
                    className="w-full flex items-center gap-2 text-left text-xs text-gray-700 hover:bg-gray-50 px-3 py-2 truncate"
                  >
                    <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" /> {c.name ?? "Empresa"}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <button onClick={() => setOpen(false)} aria-label="Fechar Jarvis" className="text-gray-400 hover:text-gray-700">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Status line */}
      <div className="px-4 py-1.5 border-b border-gray-50">
        <JarvisStatusLine chatStatus={chat.status} voiceStatus={voice.status} configured={configured} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" data-testid="jarvis-messages">
        {chat.messages.length === 0 && (
          <div className="text-center py-6">
            <p className="text-xs text-gray-400 mb-3">Pergunte algo, fale ou peça um resumo do seu dia.</p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {context && (
                <button
                  onClick={() => chat.send("Resumir meu dia")}
                  className="text-[11px] font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1.5 rounded-full hover:bg-indigo-100"
                >
                  Resumir meu dia
                </button>
              )}
              <button
                onClick={() => chat.send("O que tenho para fazer hoje?")}
                className="text-[11px] font-bold bg-gray-50 text-gray-600 px-2.5 py-1.5 rounded-full hover:bg-gray-100"
              >
                O que tenho hoje?
              </button>
              <button
                onClick={() => chat.send("Tem algo atrasado?")}
                className="text-[11px] font-bold bg-gray-50 text-gray-600 px-2.5 py-1.5 rounded-full hover:bg-gray-100"
              >
                Tem algo atrasado?
              </button>
            </div>
          </div>
        )}
        {chat.messages.map((message) => (
          <div key={message.id} data-testid="jarvis-message" data-role={message.role} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${message.role === "user" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-800"}`}>
              {message.content || (chat.status === "streaming" ? "···" : "")}
            </div>
          </div>
        ))}
        {chat.errorMessage && (
          <div className="flex items-start gap-1.5 text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-xl p-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {chat.errorMessage}
          </div>
        )}
        {voice.errorReason && (
          <div className="flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {MIC_ERROR_LABEL[voice.errorReason] ?? "Erro de voz."}
          </div>
        )}
      </div>

      {/* Message actions (cancel/repeat/copy/speak) */}
      {(chat.status === "streaming" || chat.status === "completed" || chat.status === "error") && (
        <div className="px-4 py-1.5 border-t border-gray-50 flex items-center gap-2">
          {chat.status === "streaming" ? (
            <button onClick={chat.cancel} data-testid="jarvis-cancel" className="text-[11px] font-bold text-red-600 flex items-center gap-1"><Square className="w-3 h-3" /> Cancelar</button>
          ) : (
            <>
              <button onClick={chat.repeat} data-testid="jarvis-repeat" className="text-[11px] font-bold text-gray-500 flex items-center gap-1 hover:text-gray-800"><RotateCcw className="w-3 h-3" /> Repetir</button>
              {lastAssistantMessage && (
                <>
                  <CopyButton text={lastAssistantMessage.content} />
                  <button onClick={handleSpeakLastResponse} data-testid="jarvis-speak" className="text-[11px] font-bold text-gray-500 flex items-center gap-1 hover:text-gray-800"><Volume2 className="w-3 h-3" /> Ouvir resposta</button>
                </>
              )}
            </>
          )}
        </div>
      )}

      {voice.status === "speaking" && (
        <div className="px-4 py-1.5 border-t border-gray-50 flex items-center gap-2">
          <button onClick={voice.stopPlayback} className="text-[11px] font-bold text-gray-500 flex items-center gap-1"><Square className="w-3 h-3" /> Parar</button>
          <button onClick={voice.replay} className="text-[11px] font-bold text-gray-500 flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Repetir áudio</button>
        </div>
      )}

      {/* Attachment preview */}
      {attachment && (
        <div className="px-4 py-1.5 flex items-center gap-2 text-[11px] text-gray-600 bg-gray-50 border-t border-gray-100">
          <Paperclip className="w-3 h-3" /> {attachment.name}
          <button onClick={() => setAttachment(null)} className="ml-auto text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
        </div>
      )}
      {attachmentError && <p className="px-4 py-1 text-[10px] text-red-500">{attachmentError}</p>}

      {/* Quick actions */}
      <div className="px-4 py-2 border-t border-gray-100 flex flex-wrap gap-1.5">
        <button onClick={() => fileInputRef.current?.click()} data-testid="jarvis-attach" className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-full hover:bg-gray-100">
          <Paperclip className="w-3 h-3" /> Anexar relatório
        </button>
        <button
          onClick={() => chat.send("Preencher comigo: analise os dados atuais desta empresa e proponha valores para os campos relevantes da página atual, sempre indicando origem e motivo. Não aplique nada automaticamente.")}
          data-testid="jarvis-fill"
          className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-full hover:bg-gray-100"
        >
          <Wand2 className="w-3 h-3" /> Preencher comigo
        </button>
        <input ref={fileInputRef} type="file" accept={ACCEPTED_REPORT_TYPES} className="hidden" onChange={handleFileSelect} />
      </div>

      {/* Input row */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2">
        <VoiceButton voiceStatus={voice.status} onStart={handleStartVoice} onStop={handleStopVoice} onCancel={voice.cancelRecording} disabled={configured === false} />
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder={configured === false ? "Jarvis indisponível (configuração ausente)" : "Pergunte algo ao Jarvis..."}
          disabled={configured === false}
          data-testid="jarvis-input"
          className="flex-1 text-xs rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-indigo-300 disabled:bg-gray-50 disabled:text-gray-400"
        />
        <button
          onClick={handleSend}
          disabled={!inputValue.trim() || configured === false || chat.status === "sending" || chat.status === "streaming"}
          data-testid="jarvis-send"
          className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-indigo-600 text-white rounded-xl disabled:opacity-30"
          aria-label="Perguntar"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        data-testid="jarvis-fab"
        className="fixed bottom-[5.5rem] md:bottom-6 right-4 md:right-6 z-50 w-12 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105"
        title="Jarvis"
        aria-label="Abrir Jarvis"
      >
        <Zap className="w-5 h-5" />
      </button>

      {open && (
        <>
          {/* Desktop: painel lateral direito */}
          <div className="hidden sm:block fixed top-0 right-0 h-full w-[380px] z-50 shadow-2xl border-l border-gray-100" data-testid="jarvis-panel-desktop">
            {panelBody}
          </div>
          {/* Mobile: bottom sheet */}
          <div className="sm:hidden fixed inset-0 z-50 flex flex-col justify-end">
            <div className="flex-1 bg-black/30" onClick={() => setOpen(false)} />
            <div className="h-[80vh] rounded-t-3xl overflow-hidden shadow-2xl" data-testid="jarvis-panel-mobile">
              <div className="flex justify-center py-1.5 bg-white"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>
              {panelBody}
            </div>
          </div>
        </>
      )}
    </>
  );
}

function JarvisStatusLine({
  chatStatus, voiceStatus, configured,
}: {
  chatStatus: string;
  voiceStatus: string;
  configured: boolean | null;
}) {
  if (configured === false) return <p className="text-[10px] font-bold text-amber-600">Indisponível — configuração de IA ausente.</p>;
  if (configured === null) return <p className="text-[10px] text-gray-400">Verificando disponibilidade...</p>;
  if (voiceStatus === "requesting_permission") return <p className="text-[10px] font-bold text-indigo-600">Pedindo permissão de microfone...</p>;
  if (voiceStatus === "listening") return <p className="text-[10px] font-bold text-red-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Ouvindo...</p>;
  if (voiceStatus === "processing" || voiceStatus === "transcribing") return <p className="text-[10px] font-bold text-indigo-600">Processando áudio...</p>;
  if (voiceStatus === "speaking") return <p className="text-[10px] font-bold text-indigo-600">Falando...</p>;
  if (chatStatus === "sending") return <p className="text-[10px] text-gray-400">Enviando...</p>;
  if (chatStatus === "streaming") return <p className="text-[10px] font-bold text-indigo-600">Pensando...</p>;
  return <p className="text-[10px] text-emerald-600 font-bold">Disponível</p>;
}

function VoiceButton({
  voiceStatus, onStart, onStop, onCancel, disabled,
}: {
  voiceStatus: string;
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;
  disabled?: boolean;
}) {
  const recording = voiceStatus === "listening";
  const busy = voiceStatus === "processing" || voiceStatus === "transcribing" || voiceStatus === "requesting_permission";

  if (busy) {
    return (
      <button disabled className="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-gray-100 text-gray-400 rounded-xl" aria-label="Processando">
        <Loader2 className="w-4 h-4 animate-spin" />
      </button>
    );
  }

  return (
    <button
      onMouseDown={recording ? undefined : onStart}
      onMouseUp={recording ? onStop : undefined}
      onTouchStart={recording ? undefined : onStart}
      onTouchEnd={recording ? onStop : undefined}
      onContextMenu={(e) => { if (recording) { e.preventDefault(); onCancel(); } }}
      disabled={disabled}
      data-testid="jarvis-voice-button"
      data-recording={recording}
      title="Segurar para falar"
      aria-label="Segurar para falar"
      className={`w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl transition-colors disabled:opacity-30 ${recording ? "bg-red-600 text-white animate-pulse" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
    >
      <Mic className="w-4 h-4" />
    </button>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
      data-testid="jarvis-copy"
      className="text-[11px] font-bold text-gray-500 flex items-center gap-1 hover:text-gray-800"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />} {copied ? "Copiado" : "Copiar"}
    </button>
  );
}
