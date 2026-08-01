"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, ClipboardList,
  Copy, FileCheck2, ImageIcon, Layers, Loader2, PenLine, Send, Upload, Wand2,
} from "lucide-react";
import { CopyIdButton } from "@/components/copy-id-button";

type StepId = "brief" | "content" | "review" | "destination" | "visual";
type BriefMode = "manual" | "ai";
type SaveState = "idle" | "saving" | "saved" | "error";
type DestinationResult = { type: "calendar" | "production" | "approval"; id?: string; contentId?: string; existed?: boolean } | null;

export interface GuidedCreateDraft {
  schema_version?: number;
  current_step?: string;
  brief?: Record<string, string>;
  content?: Record<string, string>;
  visual?: {
    mode?: string;
    local_file_name?: string | null;
    local_file_type?: string | null;
    editor_draft_available?: boolean;
  };
  review_state?: string;
  source?: string;
  updated_at?: string;
}

interface GuidedCreateFlowProps {
  clientId: string;
  clientName: string;
  clientSegment: string | null;
  initialStep?: string | null;
  isSuperAdmin: boolean;
  initialDraft?: GuidedCreateDraft | null;
  initialContentId?: string | null;
}

// Sprint REC OS 3.0.1 (Fase 6/12): Visual Final agora é o último bloco
// criativo exibido, depois de Revisão & Aprovação e Destino &
// Especificações — antes ficava em 3º de 5, sugerindo que a revisão e o
// destino aconteciam sobre um visual ainda não definido. A navegação
// continua livre (os botões de step abaixo permitem pular para qualquer
// etapa a qualquer momento) — esta ordem define apenas a numeração e o
// fluxo padrão de "Avançar".
const steps: Array<{ id: StepId; label: string; desc: string }> = [
  { id: "brief",       label: "Ideia & Briefing",          desc: "Contexto, objetivo e conceito criativo" },
  { id: "content",     label: "Aplicação & Formato",       desc: "Texto, formato e roteiro quando aplicável" },
  { id: "review",      label: "Revisão & Aprovação",       desc: "Checklist interno e envio para aprovação" },
  { id: "destination", label: "Destino & Especificações",  desc: "Calendário, produção ou aprovação" },
  { id: "visual",      label: "Visual Final",              desc: "Imagem, arte ou EditorOS — último passo criativo" },
];

const validSteps = new Set<StepId>(steps.map((s) => s.id));

function normalizeStep(value?: string | null): StepId {
  if (value && validSteps.has(value as StepId)) return value as StepId;
  return "brief";
}

/**
 * Fase 10 (roteiro condicional): `brief.format` é texto livre (Post,
 * Reel, vídeo institucional...), não o enum estrito de
 * `contentFormatRequiresScript()` — normaliza e verifica por palavra-chave
 * em vez de igualdade exata, para não exigir que a pessoa digite o valor
 * canônico certinho.
 */
const DIACRITICS_PATTERN = new RegExp("[̀-ͯ]", "g");
function normalizeFormatText(value: string): string {
  return value.normalize("NFD").replace(DIACRITICS_PATTERN, "").toLowerCase();
}
const SCRIPT_KEYWORDS = ["video", "reel", "anuncio", "apresentacao", "locucao"];
function freeTextFormatRequiresScript(value: string): boolean {
  const normalized = normalizeFormatText(value);
  return SCRIPT_KEYWORDS.some((keyword) => normalized.includes(keyword));
}
function freeTextFormatUsesPageStructure(value: string): boolean {
  return normalizeFormatText(value).includes("carrossel");
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"];
const SESSION_IMG_PREFIX = "rec_os_visual_import_v1_";

function imgSessionKey(clientId: string, contentId: string) {
  return `${SESSION_IMG_PREFIX}${clientId}_${contentId}`;
}

function Field({
  label, value, onChange, placeholder, textarea,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean;
}) {
  const cls = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</span>
      {textarea
        ? <textarea className={cls} rows={4} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        : <input className={cls} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />}
    </label>
  );
}

function StepButton({ step, index, active, done, onClick }: {
  step: (typeof steps)[number]; index: number; active: boolean; done: boolean; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick}
      className={`flex min-w-[140px] flex-1 items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
        active ? "border-indigo-300 bg-indigo-50" : done ? "border-emerald-200 bg-emerald-50" : "border-gray-200 bg-white hover:bg-gray-50"
      }`}>
      <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black ${
        active ? "bg-indigo-600 text-white" : done ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-500"
      }`}>
        {done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
      </span>
      <span className="min-w-0">
        <span className={`block text-xs font-bold ${active ? "text-indigo-800" : "text-gray-800"}`}>{step.label}</span>
        <span className="block truncate text-[11px] text-gray-500">{step.desc}</span>
      </span>
    </button>
  );
}

export function GuidedCreateFlow({
  clientId, clientName, clientSegment,
  initialStep, isSuperAdmin,
  initialDraft, initialContentId,
}: GuidedCreateFlowProps) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState<StepId>(() =>
    normalizeStep(initialDraft?.current_step ?? initialStep)
  );
  const [briefMode, setBriefMode] = useState<BriefMode>("manual");

  // Persistence state
  const [contentId, setContentId] = useState<string | null>(initialContentId ?? null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Destination state
  const [destLoading, setDestLoading] = useState<string | null>(null);
  const [destResult, setDestResult] = useState<DestinationResult>(null);
  const [destError, setDestError] = useState<string | null>(null);

  // Visual file state
  const [visualFileName, setVisualFileName] = useState(initialDraft?.visual?.local_file_name ?? "");
  const [visualFileError, setVisualFileError] = useState<string | null>(null);
  const [visualHasSession, setVisualHasSession] = useState(false);

  // Form state
  const [brief, setBrief] = useState({
    objective: initialDraft?.brief?.objective ?? "",
    format:    initialDraft?.brief?.format ?? "Post estático",
    campaign:  initialDraft?.brief?.campaign ?? "",
    offer:     initialDraft?.brief?.offer ?? "",
    audience:  initialDraft?.brief?.audience ?? "",
    message:   initialDraft?.brief?.message ?? "",
    cta:       initialDraft?.brief?.cta ?? "",
    references:initialDraft?.brief?.references ?? "",
    notes:     initialDraft?.brief?.notes ?? "",
    deadline:  initialDraft?.brief?.deadline ?? "",
  });
  const [content, setContent] = useState({
    title:       initialDraft?.content?.title ?? "",
    mainText:    initialDraft?.content?.mainText ?? "",
    caption:     initialDraft?.content?.caption ?? "",
    script:      initialDraft?.content?.script ?? "",
    slides:      initialDraft?.content?.slides ?? "",
    visualNotes: initialDraft?.content?.visualNotes ?? "",
  });

  const currentIndex = steps.findIndex((s) => s.id === activeStep);

  // Check session storage for visual import when contentId is known
  useEffect(() => {
    if (!contentId) { setVisualHasSession(false); return; }
    try {
      const key = imgSessionKey(clientId, contentId);
      setVisualHasSession(!!sessionStorage.getItem(key));
    } catch { setVisualHasSession(false); }
  }, [clientId, contentId]);

  // ── Autosave debounce ──────────────────────────────────────────────────────
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstSave = useRef(!initialContentId);

  const buildDraftPayload = useCallback((): GuidedCreateDraft => ({
    current_step: activeStep,
    brief: { ...brief },
    content: { ...content },
    visual: {
      mode: visualFileName ? "local_file" : "none",
      local_file_name: visualFileName || null,
      local_file_type: null,
      editor_draft_available: false,
    },
    review_state: "draft",
  }), [activeStep, brief, content, visualFileName]);

  const persistDraft = useCallback(async (gc: GuidedCreateDraft, targetId: string | null): Promise<string | null> => {
    async function mapHttpError(res: Response): Promise<string> {
      // Fase 15 do hotfix 1.0.2 — o guard de preview retorna um code
      // dedicado (WORKSPACE_PREVIEW_READ_ONLY); esse caso precisa da
      // mensagem exata do ticket, não a genérica de "sem permissão".
      const body = await res.json().catch(() => null) as { code?: string } | null;
      if (body?.code === "WORKSPACE_PREVIEW_READ_ONLY") {
        return "Esta ação está indisponível no modo de visualização.";
      }
      if (res.status === 401) return "Sua sessão expirou. Entre novamente.";
      if (res.status === 403) return "Seu usuário não possui permissão para salvar este conteúdo.";
      if (res.status === 404) return "O cliente ou rascunho não foi encontrado.";
      if (res.status === 503) return "O serviço de salvamento está temporariamente indisponível.";
      return "Não foi possível salvar. Seus dados continuam nesta tela.";
    }

    if (!targetId) {
      const res = await fetch("/api/admin/contentos/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, guided_create: gc }),
      });
      if (!res.ok) throw new Error(await mapHttpError(res));
      const data = await res.json() as { id: string };
      return data.id;
    } else {
      const res = await fetch(`/api/admin/contentos/drafts/${targetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, guided_create: gc }),
      });
      if (!res.ok) throw new Error(await mapHttpError(res));
      return targetId;
    }
  }, [clientId]);

  const doSave = useCallback(async (gc: GuidedCreateDraft) => {
    setSaveState("saving");
    setSaveMessage("Salvando…");
    try {
      const newId = await persistDraft(gc, contentId);
      if (!newId) throw new Error("no_id");

      if (!contentId) {
        // First save — update URL and state
        setContentId(newId);
        isFirstSave.current = false;
        const url = new URL(window.location.href);
        url.searchParams.set("content_id", newId);
        url.searchParams.set("client", clientId);
        url.searchParams.set("step", gc.current_step ?? "brief");
        router.replace(url.pathname + url.search, { scroll: false });
      }

      const now = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      setSavedAt(now);
      setSaveState("saved");
      setSaveMessage(`Rascunho salvo no LOKAT OS às ${now}.`);
    } catch (e) {
      setSaveState("error");
      const msg = e instanceof Error ? e.message : "";
      setSaveMessage(msg || "Não foi possível salvar. Seus dados continuam nesta tela.");
    }
  }, [contentId, clientId, persistDraft, router]);

  // Debounced autosave (only after first manual save)
  useEffect(() => {
    if (isFirstSave.current || !contentId) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      void doSave(buildDraftPayload());
    }, 1400);
    return () => { if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brief, content, activeStep, visualFileName]);

  function setBriefField(key: keyof typeof brief, value: string) {
    setBrief((prev) => ({ ...prev, [key]: value }));
  }
  function setContentField(key: keyof typeof content, value: string) {
    setContent((prev) => ({ ...prev, [key]: value }));
  }

  function next() {
    const idx = steps.findIndex((s) => s.id === activeStep);
    const nextStep = steps[Math.min(steps.length - 1, idx + 1)];
    setActiveStep(nextStep.id);
    // Update URL step
    if (contentId) {
      const url = new URL(window.location.href);
      url.searchParams.set("step", nextStep.id);
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }
  function prev() {
    const idx = steps.findIndex((s) => s.id === activeStep);
    setActiveStep(steps[Math.max(0, idx - 1)].id);
  }

  function copyContent() {
    const text = [content.title, content.mainText, content.caption, content.script, content.slides]
      .filter(Boolean).join("\n\n");
    void navigator.clipboard?.writeText(text || "Rascunho vazio");
  }

  async function handleManualSave() {
    await doSave(buildDraftPayload());
  }

  async function handleReviewInterna() {
    if (!contentId) {
      await doSave(buildDraftPayload());
      return;
    }
    setSaveState("saving");
    setSaveMessage("Salvando…");
    try {
      const res = await fetch(`/api/admin/contentos/drafts/${contentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          status: "revisao_interna",
          guided_create: { ...buildDraftPayload(), review_state: "internal_review" },
        }),
      });
      if (!res.ok) throw new Error("patch_failed");
      const now = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      setSavedAt(now);
      setSaveState("saved");
      setSaveMessage(`Conteúdo marcado para revisão interna às ${now}.`);
    } catch {
      setSaveState("error");
      setSaveMessage("Não foi possível marcar revisão. Seus dados continuam nesta tela.");
    }
  }

  async function handleVisualFile(file: File) {
    setVisualFileError(null);
    if (!ALLOWED_MIME.includes(file.type)) {
      setVisualFileError("Tipo de arquivo não suportado. Use PNG, JPG ou WEBP.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setVisualFileError("Arquivo maior que 5 MB. Reduza o tamanho antes de importar.");
      return;
    }
    // Ensure draft is saved first
    let targetId = contentId;
    if (!targetId) {
      try {
        const newId = await persistDraft(buildDraftPayload(), null);
        if (!newId) throw new Error("no_id");
        setContentId(newId);
        targetId = newId;
        const url = new URL(window.location.href);
        url.searchParams.set("content_id", newId);
        url.searchParams.set("client", clientId);
        router.replace(url.pathname + url.search, { scroll: false });
      } catch {
        setVisualFileError("Salve o rascunho primeiro antes de importar a imagem.");
        return;
      }
    }

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        try {
          const payload = JSON.stringify({
            fileName: file.name,
            mimeType: file.type,
            size: file.size,
            dataUrl,
            createdAt: new Date().toISOString(),
          });
          sessionStorage.setItem(imgSessionKey(clientId, targetId!), payload);
          setVisualFileName(file.name);
          setVisualHasSession(true);
        } catch {
          setVisualFileError("Imagem maior do que o sessionStorage consegue guardar.");
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setVisualFileError("Erro ao ler o arquivo.");
    }
  }

  async function handleOpenEditor() {
    // Must have a saved draft before opening EditorOS
    let targetId = contentId;
    if (!targetId) {
      setSaveState("saving");
      setSaveMessage("Salvando antes de abrir EditorOS…");
      try {
        const newId = await persistDraft(buildDraftPayload(), null);
        if (!newId) throw new Error("no_id");
        setContentId(newId);
        targetId = newId;
        const now = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        setSaveState("saved");
        setSaveMessage(`Rascunho salvo às ${now}.`);
        const url = new URL(window.location.href);
        url.searchParams.set("content_id", newId);
        url.searchParams.set("client", clientId);
        router.replace(url.pathname + url.search, { scroll: false });
      } catch {
        setSaveState("error");
        setSaveMessage("Não foi possível salvar. EditorOS não foi aberto.");
        return;
      }
    }
    const returnTo = `/admin/contentos/criar?client=${clientId}&content_id=${targetId}&step=visual`;
    router.push(`/admin/contentos/editor-os?client=${clientId}&content_id=${targetId}&return_to=${encodeURIComponent(returnTo)}`);
  }

  // ── Destination handlers ───────────────────────────────────────────────────

  async function ensureSaved(): Promise<string | null> {
    if (contentId) return contentId;
    try {
      const newId = await persistDraft(buildDraftPayload(), null);
      if (!newId) return null;
      setContentId(newId);
      const url = new URL(window.location.href);
      url.searchParams.set("content_id", newId);
      url.searchParams.set("client", clientId);
      router.replace(url.pathname + url.search, { scroll: false });
      return newId;
    } catch { return null; }
  }

  async function handleDestCalendario() {
    setDestLoading("calendar"); setDestError(null);
    const id = await ensureSaved();
    setDestLoading(null);
    if (!id) { setDestError("Salve o rascunho antes de ir ao Calendário."); return; }
    router.push(`/admin/contentos/calendario?client=${clientId}&content_id=${id}`);
  }

  async function handleDestProducao() {
    setDestLoading("production"); setDestError(null);
    const id = await ensureSaved();
    if (!id) { setDestLoading(null); setDestError("Salve o rascunho antes de enviar para Produção."); return; }
    try {
      const res = await fetch("/api/admin/contentos/actions/send-to-production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_id: id, client_id: clientId }),
      });
      const data = await res.json() as { task_id?: string; existed?: boolean; error?: string };
      setDestLoading(null);
      if (!res.ok) { setDestError(data.error ?? "Erro ao criar tarefa."); return; }
      setDestResult({ type: "production", id: data.task_id, contentId: id, existed: data.existed });
    } catch { setDestLoading(null); setDestError("Erro de conexão."); }
  }

  async function handleDestAprovacao() {
    setDestLoading("approval"); setDestError(null);
    const id = await ensureSaved();
    if (!id) { setDestLoading(null); setDestError("Salve o rascunho antes de enviar para Aprovação."); return; }
    try {
      const dueDate = brief.deadline
        ? new Date(brief.deadline).toISOString().split("T")[0] !== "Invalid Date"
          ? new Date(brief.deadline).toISOString()
          : undefined
        : undefined;
      const res = await fetch("/api/admin/contentos/actions/send-to-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_id: id, client_id: clientId, due_date: dueDate }),
      });
      const data = await res.json() as { approval_id?: string; existed?: boolean; error?: string };
      setDestLoading(null);
      if (!res.ok) { setDestError(data.error ?? "Erro ao criar aprovação."); return; }
      setDestResult({ type: "approval", id: data.approval_id, contentId: id, existed: data.existed });
    } catch { setDestLoading(null); setDestError("Erro de conexão."); }
  }

  const summary = useMemo(() => [
    ["Cliente", clientName],
    ["Segmento", clientSegment ?? "Não informado"],
    ["Campanha", brief.campaign || "Não definida"],
    ["Formato", brief.format || "Não definido"],
    ["Prazo", brief.deadline || "Sem prazo"],
  ], [brief.campaign, brief.deadline, brief.format, clientName, clientSegment]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-500">REC OS / Criar</p>
            <h1 className="mt-1 text-2xl font-black text-gray-950">
              {contentId ? "Editar conteúdo" : "Novo conteúdo guiado"}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Fluxo único: Ideia &amp; Briefing → Aplicação &amp; Formato → Revisão &amp; Aprovação → Destino &amp; Especificações → Visual Final.
            </p>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
              <p className="font-bold text-gray-900">{clientName}</p>
              <p className="text-xs text-gray-500">{clientSegment ?? "Sem segmento"} · {clientId.slice(0, 8)}</p>
            </div>
            {contentId && (
              <p className="text-[10px] text-gray-400">ID: {contentId.slice(0, 8)}</p>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {steps.map((step, index) => (
            <StepButton key={step.id} step={step} index={index}
              active={activeStep === step.id} done={index < currentIndex}
              onClick={() => setActiveStep(step.id)} />
          ))}
        </div>
      </section>

      {/* Save status banner */}
      {saveMessage && (
        <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${
          saveState === "saved"  ? "border-emerald-100 bg-emerald-50 text-emerald-700" :
          saveState === "error"  ? "border-red-100 bg-red-50 text-red-700" :
          saveState === "saving" ? "border-blue-100 bg-blue-50 text-blue-700" :
          "border-gray-100 bg-gray-50 text-gray-600"
        }`}>
          <span className="flex items-center gap-2">
            {saveState === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
            {saveMessage}
          </span>
        </div>
      )}

      {/* STEP: Brief */}
      {activeStep === "brief" && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900">1. Ideia &amp; Briefing</h2>
              <p className="text-sm text-gray-500">O que comunicar, por que agora, para quem — e o conceito criativo que vem disso.</p>
            </div>
            <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1">
              <button type="button" onClick={() => setBriefMode("manual")}
                className={`rounded-lg px-3 py-2 text-xs font-bold ${briefMode === "manual" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500"}`}>
                Manual
              </button>
              <button type="button" onClick={() => setBriefMode("ai")}
                className={`rounded-lg px-3 py-2 text-xs font-bold ${briefMode === "ai" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500"}`}>
                IA assistida
              </button>
            </div>
          </div>

          {briefMode === "ai" && (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <Wand2 className="mt-0.5 h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-sm font-bold text-amber-900">Geração por IA ainda não configurada para produção.</p>
                  <p className="mt-1 text-xs text-amber-700">O fluxo coleta todos os campos. O botão permanece bloqueado até provider aprovado.</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Objetivo" value={brief.objective} onChange={(v) => setBriefField("objective", v)} placeholder="Ex: vender combo de almoço, divulgar serviço, reforçar autoridade" />
            <Field label="Formato" value={brief.format} onChange={(v) => setBriefField("format", v)} placeholder="Post, story, carrossel, reel, roteiro" />
            <Field label="Campanha" value={brief.campaign} onChange={(v) => setBriefField("campaign", v)} placeholder="Nome da campanha ou tema" />
            <Field label="Oferta / produto" value={brief.offer} onChange={(v) => setBriefField("offer", v)} placeholder="Produto, serviço ou oferta principal" />
            <Field label="Público" value={brief.audience} onChange={(v) => setBriefField("audience", v)} placeholder="Para quem este conteúdo fala" />
            <Field label="CTA" value={brief.cta} onChange={(v) => setBriefField("cta", v)} placeholder="Chamar no WhatsApp, acessar link, pedir orçamento" />
            <Field label="Mensagem principal" textarea value={brief.message} onChange={(v) => setBriefField("message", v)} placeholder="Qual ideia precisa ficar clara?" />
            <Field label="Referências" textarea value={brief.references} onChange={(v) => setBriefField("references", v)} placeholder="Links, marcas, exemplos ou observações visuais" />
            <Field label="Observações" textarea value={brief.notes} onChange={(v) => setBriefField("notes", v)} placeholder="Restrições, tom, palavras obrigatórias, não usar..." />
            <Field label="Prazo" value={brief.deadline} onChange={(v) => setBriefField("deadline", v)} placeholder="Ex: publicar sexta, aprovar até 18h" />
          </div>

          <div className="mt-5 flex justify-end gap-2">
            {briefMode === "ai" && (
              <button type="button" disabled
                className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-gray-200 bg-gray-100 px-4 py-2 text-sm font-bold text-gray-400">
                <Wand2 className="h-4 w-4" /> Gerar com IA indisponível
              </button>
            )}
            <button type="button" onClick={() => void handleManualSave()} disabled={saveState === "saving"}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
              {saveState === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
              Salvar rascunho
            </button>
            <button type="button" onClick={next}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">
              Ir para conteúdo <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      {/* STEP: Content */}
      {activeStep === "content" && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900">2. Aplicação &amp; Formato</h2>
              <p className="text-sm text-gray-500">Escreva a estrutura que será revisada e aprovada antes do visual.</p>
            </div>
            <button type="button" onClick={copyContent}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
              <Copy className="h-4 w-4" /> Copiar
            </button>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Título / headline" value={content.title} onChange={(v) => setContentField("title", v)} />
            <Field label="Legenda" value={content.caption} onChange={(v) => setContentField("caption", v)} />
            <Field label="Texto principal" textarea value={content.mainText} onChange={(v) => setContentField("mainText", v)} />
            {freeTextFormatRequiresScript(brief.format) && (
              <Field label="Roteiro" textarea value={content.script} onChange={(v) => setContentField("script", v)} placeholder="Obrigatório para vídeo, Reel, anúncio em vídeo ou apresentação narrada" />
            )}
            {freeTextFormatUsesPageStructure(brief.format) && (
              <Field label="Estrutura de slides" textarea value={content.slides} onChange={(v) => setContentField("slides", v)} placeholder="Página a página: copy, hierarquia e CTA de cada slide do carrossel" />
            )}
            {!freeTextFormatRequiresScript(brief.format) && !freeTextFormatUsesPageStructure(brief.format) && (
              <p className="lg:col-span-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-[11px] text-gray-500">
                Roteiro e estrutura de slides aparecem automaticamente quando o formato (definido em Ideia &amp; Briefing) for vídeo, Reel, anúncio em vídeo, apresentação ou carrossel.
              </p>
            )}
            <Field label="Observações visuais" textarea value={content.visualNotes} onChange={(v) => setContentField("visualNotes", v)} />
          </div>
          <div className="mt-5 flex justify-between gap-2">
            <button type="button" onClick={prev}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50">
              <ArrowLeft className="h-4 w-4" /> Voltar ao brief
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={() => void handleManualSave()} disabled={saveState === "saving"}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
                {saveState === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                Salvar rascunho
              </button>
              <button type="button" onClick={next}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">
                Ir para revisão <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* STEP: Review */}
      {activeStep === "review" && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-5">
            <h2 className="text-lg font-black text-gray-900">3. Revisão &amp; Aprovação</h2>
            <p className="text-sm text-gray-500">Confirme o pacote e marque para revisão interna antes de escolher o destino.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              {summary.map(([label, value]) => (
                <div key={label} className="border-b border-gray-200 py-2 last:border-b-0">
                  <p className="text-[10px] font-black uppercase text-gray-400">{label}</p>
                  <p className="text-sm font-semibold text-gray-800">{value}</p>
                </div>
              ))}
              {contentId && (
                <div className="border-b border-gray-200 py-2 last:border-b-0">
                  <p className="text-[10px] font-black uppercase text-gray-400">ID</p>
                  <p className="text-xs font-mono text-gray-500">{contentId.slice(0, 8)}</p>
                </div>
              )}
              {savedAt && (
                <div className="pt-2">
                  <p className="text-[10px] text-gray-400">Salvo às {savedAt}</p>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="rounded-xl border border-gray-200 p-3">
                <p className="text-xs font-bold text-gray-500">Brief</p>
                <p className="mt-1 text-sm text-gray-800">{brief.objective || brief.message || "Brief ainda sem objetivo principal."}</p>
              </div>
              <div className="rounded-xl border border-gray-200 p-3">
                <p className="text-xs font-bold text-gray-500">Conteúdo</p>
                <p className="mt-1 text-sm text-gray-800">{content.title || content.mainText || "Conteúdo ainda sem texto principal."}</p>
              </div>
              <div className="rounded-xl border border-gray-200 p-3">
                <p className="text-xs font-bold text-gray-500">Visual</p>
                <p className="mt-1 text-sm text-gray-800">
                  {visualFileName
                    ? `${visualFileName} — Imagem temporária neste navegador.`
                    : "Sem arquivo importado. EditorOS pode ser usado para montar o visual final."}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap justify-between gap-2">
            <button type="button" onClick={prev}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50">
              <ArrowLeft className="h-4 w-4" /> Voltar e editar
            </button>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void handleManualSave()} disabled={saveState === "saving"}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
                {saveState === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                Salvar rascunho
              </button>
              <button type="button" onClick={() => void handleReviewInterna()} disabled={saveState === "saving"}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-60">
                <FileCheck2 className="h-4 w-4" /> Revisão interna
              </button>
              <button type="button" onClick={next}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">
                Enviar para destino <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* STEP: Destination */}
      {activeStep === "destination" && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-5">
            <h2 className="text-lg font-black text-gray-900">4. Destino &amp; Especificações</h2>
            <p className="text-sm text-gray-500">Escolha a próxima etapa sem publicar automaticamente. Defina o destino antes do Visual Final.</p>
          </div>

          {destError && (
            <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {destError}
            </div>
          )}

          {destResult?.type === "production" && (
            <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 space-y-2">
              <p className="font-semibold">
                {destResult.existed
                  ? "Este conteúdo já possui uma tarefa de produção."
                  : "Tarefa de produção criada."}
              </p>
              {destResult.id && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium">Tarefa:</span>
                  <span className="font-mono break-all">{destResult.id}</span>
                  <CopyIdButton id={destResult.id} label="Copiar ID da tarefa" />
                </div>
              )}
              {destResult.contentId && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium">Conteúdo:</span>
                  <span className="font-mono break-all">{destResult.contentId}</span>
                  <CopyIdButton id={destResult.contentId} label="Copiar ID do conteúdo" />
                </div>
              )}
              <a
                href={`/admin/contentos/producao?client=${clientId}${destResult.contentId ? `&content_id=${destResult.contentId}` : ""}${destResult.id ? `&task=${destResult.id}` : ""}`}
                className="inline-block text-xs font-bold underline"
              >
                Ver em Produção →
              </a>
            </div>
          )}

          {destResult?.type === "approval" && (
            <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800 space-y-2">
              <p className="font-semibold">
                {destResult.existed
                  ? "Este conteúdo já possui uma aprovação em andamento."
                  : "Aprovação criada com sucesso."}
              </p>
              {destResult.id && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium">Aprovação:</span>
                  <span className="font-mono break-all">{destResult.id}</span>
                  <CopyIdButton id={destResult.id} label="Copiar ID da aprovação" />
                </div>
              )}
              {destResult.contentId && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium">Conteúdo:</span>
                  <span className="font-mono break-all">{destResult.contentId}</span>
                  <CopyIdButton id={destResult.contentId} label="Copiar ID do conteúdo" />
                </div>
              )}
              <a
                href={`/admin/contentos/aprovacoes?client=${clientId}${destResult.contentId ? `&content_id=${destResult.contentId}` : ""}${destResult.id ? `&approval=${destResult.id}` : ""}`}
                className="inline-block text-xs font-bold underline"
              >
                Ver em Aprovações →
              </a>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <button type="button" onClick={() => void handleDestCalendario()} disabled={destLoading === "calendar"}
              className="rounded-2xl border border-gray-200 p-4 text-left hover:bg-gray-50 disabled:opacity-60">
              {destLoading === "calendar" ? <Loader2 className="h-6 w-6 animate-spin text-indigo-600" /> : <CalendarDays className="h-6 w-6 text-indigo-600" />}
              <p className="mt-3 text-sm font-bold text-gray-900">Calendário</p>
              <p className="mt-1 text-xs text-gray-500">Planejar data e janela de publicação.</p>
            </button>

            <button type="button" onClick={() => void handleDestProducao()} disabled={!!destLoading}
              className="rounded-2xl border border-gray-200 p-4 text-left hover:bg-gray-50 disabled:opacity-60">
              {destLoading === "production" ? <Loader2 className="h-6 w-6 animate-spin text-emerald-600" /> : <ClipboardList className="h-6 w-6 text-emerald-600" />}
              <p className="mt-3 text-sm font-bold text-gray-900">Produção</p>
              <p className="mt-1 text-xs text-gray-500">Enviar para fila operacional.</p>
            </button>

            <button type="button" onClick={() => void handleDestAprovacao()} disabled={!!destLoading}
              className="rounded-2xl border border-gray-200 p-4 text-left hover:bg-gray-50 disabled:opacity-60">
              {destLoading === "approval" ? <Loader2 className="h-6 w-6 animate-spin text-amber-600" /> : <FileCheck2 className="h-6 w-6 text-amber-600" />}
              <p className="mt-3 text-sm font-bold text-gray-900">Aprovação</p>
              <p className="mt-1 text-xs text-gray-500">Revisar antes de compartilhar link.</p>
            </button>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <Send className="h-6 w-6 text-gray-400" />
              <p className="mt-3 text-sm font-bold text-gray-700">Publicação manual</p>
              <p className="mt-1 text-xs text-gray-500">Publicação automática ainda não configurada.</p>
            </div>
          </div>
          <div className="mt-5 flex justify-between gap-2">
            <button type="button" onClick={prev}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50">
              <ArrowLeft className="h-4 w-4" /> Voltar para revisão
            </button>
            <button type="button" onClick={next}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">
              Ir para Visual Final <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      {/* STEP: Visual (Fase 12/15 — último bloco criativo) */}
      {activeStep === "visual" && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-5">
            <h2 className="text-lg font-black text-gray-900">5. Visual Final</h2>
            <p className="text-sm text-gray-500">Último passo criativo. Use upload manual, EditorOS ou aguarde provider de imagem aprovado.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {/* IA */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <ImageIcon className="h-6 w-6 text-gray-500" />
              <p className="mt-3 text-sm font-bold text-gray-900">Gerar com IA</p>
              <p className="mt-1 text-xs text-gray-500">A geração de imagem ainda não está disponível neste ambiente.</p>
              <button type="button" disabled
                className="mt-4 w-full cursor-not-allowed rounded-xl bg-gray-200 px-3 py-2 text-xs font-bold text-gray-400">
                Geração indisponível
              </button>
            </div>

            {/* Upload local */}
            <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50 p-4">
              <Upload className="h-6 w-6 text-indigo-600" />
              <p className="mt-3 text-sm font-bold text-indigo-950">Importar visual</p>
              <p className="mt-1 text-xs text-indigo-700">PNG, JPG ou WEBP · máx. 5 MB</p>
              <input type="file" accept=".png,.jpg,.jpeg,.webp"
                className="mt-4 block w-full text-xs text-indigo-800"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleVisualFile(f);
                }} />
              {visualFileName && !visualFileError && (
                <p className="mt-2 text-xs font-bold text-indigo-800">{visualFileName}</p>
              )}
              {visualHasSession && (
                <p className="mt-1 text-[10px] text-indigo-500">
                  Imagem temporária neste navegador. Não salva no servidor.
                </p>
              )}
              {visualFileError && (
                <p className="mt-2 text-xs text-red-600">{visualFileError}</p>
              )}
            </div>

            {/* EditorOS */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <Layers className="h-6 w-6 text-purple-600" />
              <p className="mt-3 text-sm font-bold text-gray-900">Editar no EditorOS</p>
              <p className="mt-1 text-xs text-gray-500">Salva o rascunho e abre o editor mantendo o cliente.</p>
              {isSuperAdmin ? (
                <button type="button" onClick={() => void handleOpenEditor()} disabled={saveState === "saving"}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-3 py-2 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-60">
                  {saveState === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
                  Abrir EditorOS
                </button>
              ) : (
                <p className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
                  EditorOS restrito a super_admin.
                </p>
              )}
              {contentId && (
                <p className="mt-2 text-[10px] text-gray-400">
                  Projeto visual salvo neste navegador pelo EditorOS.
                </p>
              )}
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between gap-2">
            <button type="button" onClick={prev}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50">
              <ArrowLeft className="h-4 w-4" /> Voltar para destino
            </button>
            <p className="text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="mr-1 inline h-4 w-4" /> Último passo criativo — agendar ou publicar acontece em Calendário/Produção/Aprovação (passo anterior).
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
