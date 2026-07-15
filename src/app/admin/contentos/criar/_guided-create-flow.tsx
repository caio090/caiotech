"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Copy,
  FileCheck2,
  ImageIcon,
  Layers,
  PenLine,
  Send,
  Upload,
  Wand2,
} from "lucide-react";

type StepId = "brief" | "content" | "visual" | "review" | "destination";
type BriefMode = "manual" | "ai";

interface GuidedCreateFlowProps {
  clientId: string;
  clientName: string;
  clientSegment: string | null;
  initialStep?: string | null;
  isSuperAdmin: boolean;
}

const steps: Array<{ id: StepId; label: string; desc: string }> = [
  { id: "brief", label: "Brief", desc: "Contexto e objetivo" },
  { id: "content", label: "Conteudo", desc: "Texto e estrutura" },
  { id: "visual", label: "Visual Final", desc: "Imagem, arte ou EditorOS" },
  { id: "review", label: "Revisao", desc: "Checklist antes de aprovar" },
  { id: "destination", label: "Destino", desc: "Calendario, producao ou aprovacao" },
];

const validSteps = new Set<StepId>(steps.map((step) => step.id));

function normalizeStep(value?: string | null): StepId {
  if (value && validSteps.has(value as StepId)) return value as StepId;
  return "brief";
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  textarea?: boolean;
}) {
  const cls = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</span>
      {textarea ? (
        <textarea className={cls} rows={4} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <input className={cls} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </label>
  );
}

function StepButton({
  step,
  index,
  active,
  done,
  onClick,
}: {
  step: (typeof steps)[number];
  index: number;
  active: boolean;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-[160px] flex-1 items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
        active
          ? "border-indigo-300 bg-indigo-50"
          : done
            ? "border-emerald-200 bg-emerald-50"
            : "border-gray-200 bg-white hover:bg-gray-50"
      }`}
    >
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
  clientId,
  clientName,
  clientSegment,
  initialStep,
  isSuperAdmin,
}: GuidedCreateFlowProps) {
  const [activeStep, setActiveStep] = useState<StepId>(() => normalizeStep(initialStep));
  const [briefMode, setBriefMode] = useState<BriefMode>("manual");
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [visualFileName, setVisualFileName] = useState("");
  const [brief, setBrief] = useState({
    objective: "",
    format: "Post estatico",
    campaign: "",
    offer: "",
    audience: "",
    message: "",
    cta: "",
    references: "",
    notes: "",
    deadline: "",
  });
  const [content, setContent] = useState({
    title: "",
    mainText: "",
    caption: "",
    script: "",
    slides: "",
    visualNotes: "",
  });

  const editorHref = `/admin/contentos/editor-os?client=${clientId}&return_to=${encodeURIComponent(`/admin/contentos/criar?client=${clientId}&step=visual`)}`;
  const currentIndex = steps.findIndex((step) => step.id === activeStep);
  const summary = useMemo(() => [
    ["Cliente", clientName],
    ["Segmento", clientSegment ?? "Nao informado"],
    ["Campanha", brief.campaign || "Nao definida"],
    ["Formato", brief.format || "Nao definido"],
    ["Prazo", brief.deadline || "Sem prazo"],
  ], [brief.campaign, brief.deadline, brief.format, clientName, clientSegment]);

  function setBriefField(key: keyof typeof brief, value: string) {
    setBrief((prev) => ({ ...prev, [key]: value }));
  }

  function setContentField(key: keyof typeof content, value: string) {
    setContent((prev) => ({ ...prev, [key]: value }));
  }

  function showSaved(message: string) {
    setSavedMessage(message);
    window.setTimeout(() => setSavedMessage(null), 2400);
  }

  function copyContent() {
    const text = [
      content.title,
      content.mainText,
      content.caption,
      content.script,
      content.slides,
    ].filter(Boolean).join("\n\n");
    void navigator.clipboard?.writeText(text || "Rascunho vazio");
    showSaved("Conteudo copiado para a area de transferencia.");
  }

  function next() {
    const idx = steps.findIndex((step) => step.id === activeStep);
    setActiveStep(steps[Math.min(steps.length - 1, idx + 1)].id);
  }

  function prev() {
    const idx = steps.findIndex((step) => step.id === activeStep);
    setActiveStep(steps[Math.max(0, idx - 1)].id);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-500">REC OS / Criar</p>
            <h1 className="mt-1 text-2xl font-black text-gray-950">Novo conteudo guiado</h1>
            <p className="mt-1 text-sm text-gray-500">
              Fluxo unico para brief, texto, visual, revisao e destino de publicacao.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
            <p className="font-bold text-gray-900">{clientName}</p>
            <p className="text-xs text-gray-500">{clientSegment ?? "Sem segmento"} · {clientId.slice(0, 8)}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {steps.map((step, index) => (
            <StepButton
              key={step.id}
              step={step}
              index={index}
              active={activeStep === step.id}
              done={index < currentIndex}
              onClick={() => setActiveStep(step.id)}
            />
          ))}
        </div>
      </section>

      {savedMessage && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {savedMessage}
        </div>
      )}

      {activeStep === "brief" && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900">1. Brief</h2>
              <p className="text-sm text-gray-500">Defina o que deve ser criado antes de abrir texto ou visual.</p>
            </div>
            <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1">
              <button type="button" onClick={() => setBriefMode("manual")} className={`rounded-lg px-3 py-2 text-xs font-bold ${briefMode === "manual" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500"}`}>
                Manual
              </button>
              <button type="button" onClick={() => setBriefMode("ai")} className={`rounded-lg px-3 py-2 text-xs font-bold ${briefMode === "ai" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500"}`}>
                IA assistida
              </button>
            </div>
          </div>

          {briefMode === "ai" && (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <Wand2 className="mt-0.5 h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-sm font-bold text-amber-900">Geracao por IA ainda nao configurada para producao.</p>
                  <p className="mt-1 text-xs text-amber-700">
                    O fluxo ja coleta comando, campanha, objetivo e referencias. O botao de gerar permanece bloqueado ate provider aprovado.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Objetivo" value={brief.objective} onChange={(v) => setBriefField("objective", v)} placeholder="Ex: vender combo de almoco, divulgar servico, reforcar autoridade" />
            <Field label="Formato" value={brief.format} onChange={(v) => setBriefField("format", v)} placeholder="Post, story, carrossel, reel, roteiro" />
            <Field label="Campanha" value={brief.campaign} onChange={(v) => setBriefField("campaign", v)} placeholder="Nome da campanha ou tema" />
            <Field label="Oferta / produto" value={brief.offer} onChange={(v) => setBriefField("offer", v)} placeholder="Produto, servico ou oferta principal" />
            <Field label="Publico" value={brief.audience} onChange={(v) => setBriefField("audience", v)} placeholder="Para quem este conteudo fala" />
            <Field label="CTA" value={brief.cta} onChange={(v) => setBriefField("cta", v)} placeholder="Chamar no WhatsApp, acessar link, pedir orcamento" />
            <Field label="Mensagem principal" textarea value={brief.message} onChange={(v) => setBriefField("message", v)} placeholder="Qual ideia precisa ficar clara?" />
            <Field label="Referencias" textarea value={brief.references} onChange={(v) => setBriefField("references", v)} placeholder="Links, marcas, exemplos ou observacoes visuais" />
            <Field label="Observacoes" textarea value={brief.notes} onChange={(v) => setBriefField("notes", v)} placeholder="Restrições, tom, palavras obrigatorias, nao usar..." />
            <Field label="Prazo" value={brief.deadline} onChange={(v) => setBriefField("deadline", v)} placeholder="Ex: publicar sexta, aprovar ate 18h" />
          </div>

          <div className="mt-5 flex justify-end gap-2">
            {briefMode === "ai" && (
              <button type="button" disabled className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-gray-200 bg-gray-100 px-4 py-2 text-sm font-bold text-gray-400">
                <Wand2 className="h-4 w-4" /> Gerar com IA indisponivel
              </button>
            )}
            <button type="button" onClick={next} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">
              Ir para conteudo <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      {activeStep === "content" && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900">2. Conteudo</h2>
              <p className="text-sm text-gray-500">Escreva a estrutura que sera revisada e enviada para visual.</p>
            </div>
            <button type="button" onClick={copyContent} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
              <Copy className="h-4 w-4" /> Copiar
            </button>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Titulo / headline" value={content.title} onChange={(v) => setContentField("title", v)} />
            <Field label="Legenda" value={content.caption} onChange={(v) => setContentField("caption", v)} />
            <Field label="Texto principal" textarea value={content.mainText} onChange={(v) => setContentField("mainText", v)} />
            <Field label="Roteiro" textarea value={content.script} onChange={(v) => setContentField("script", v)} />
            <Field label="Estrutura de slides" textarea value={content.slides} onChange={(v) => setContentField("slides", v)} />
            <Field label="Observacoes visuais" textarea value={content.visualNotes} onChange={(v) => setContentField("visualNotes", v)} />
          </div>
          <div className="mt-5 flex justify-between gap-2">
            <button type="button" onClick={prev} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50">
              <ArrowLeft className="h-4 w-4" /> Voltar ao brief
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={() => showSaved("Rascunho salvo localmente nesta sessao.")} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50">
                <ClipboardList className="h-4 w-4" /> Salvar rascunho
              </button>
              <button type="button" onClick={next} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">
                Ir para visual <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {activeStep === "visual" && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-5">
            <h2 className="text-lg font-black text-gray-900">3. Visual Final</h2>
            <p className="text-sm text-gray-500">Use upload manual, EditorOS ou aguarde provider de imagem aprovado.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <ImageIcon className="h-6 w-6 text-gray-500" />
              <p className="mt-3 text-sm font-bold text-gray-900">Gerar com IA</p>
              <p className="mt-1 text-xs text-gray-500">Bloqueado ate provider oficial ser configurado.</p>
              <button type="button" disabled className="mt-4 w-full cursor-not-allowed rounded-xl bg-gray-200 px-3 py-2 text-xs font-bold text-gray-400">
                Geracao indisponivel
              </button>
            </div>
            <label className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50 p-4">
              <Upload className="h-6 w-6 text-indigo-600" />
              <p className="mt-3 text-sm font-bold text-indigo-950">Importar visual</p>
              <p className="mt-1 text-xs text-indigo-700">Aceita PNG, JPG, WEBP e SVG. PDF entra em etapa futura.</p>
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.svg"
                className="mt-4 block w-full text-xs text-indigo-800"
                onChange={(event) => setVisualFileName(event.target.files?.[0]?.name ?? "")}
              />
              {visualFileName && <p className="mt-2 text-xs font-bold text-indigo-800">{visualFileName}</p>}
            </label>
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <Layers className="h-6 w-6 text-purple-600" />
              <p className="mt-3 text-sm font-bold text-gray-900">Editar no EditorOS</p>
              <p className="mt-1 text-xs text-gray-500">Abre o editor tecnico mantendo o cliente atual no retorno.</p>
              {isSuperAdmin ? (
                <Link href={editorHref} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-3 py-2 text-xs font-bold text-white hover:bg-purple-700">
                  <PenLine className="h-4 w-4" /> Abrir EditorOS
                </Link>
              ) : (
                <p className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">EditorOS restrito a super_admin.</p>
              )}
            </div>
          </div>
          <div className="mt-5 flex justify-between">
            <button type="button" onClick={prev} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
            <button type="button" onClick={next} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">
              Revisar <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      {activeStep === "review" && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-5">
            <h2 className="text-lg font-black text-gray-900">4. Revisao</h2>
            <p className="text-sm text-gray-500">Confirme o pacote antes de escolher o destino.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              {summary.map(([label, value]) => (
                <div key={label} className="border-b border-gray-200 py-2 last:border-b-0">
                  <p className="text-[10px] font-black uppercase text-gray-400">{label}</p>
                  <p className="text-sm font-semibold text-gray-800">{value}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="rounded-xl border border-gray-200 p-3">
                <p className="text-xs font-bold text-gray-500">Brief</p>
                <p className="mt-1 text-sm text-gray-800">{brief.objective || brief.message || "Brief ainda sem objetivo principal."}</p>
              </div>
              <div className="rounded-xl border border-gray-200 p-3">
                <p className="text-xs font-bold text-gray-500">Conteudo</p>
                <p className="mt-1 text-sm text-gray-800">{content.title || content.mainText || "Conteudo ainda sem texto principal."}</p>
              </div>
              <div className="rounded-xl border border-gray-200 p-3">
                <p className="text-xs font-bold text-gray-500">Visual</p>
                <p className="mt-1 text-sm text-gray-800">{visualFileName || "Sem arquivo importado. EditorOS pode ser usado para montar o visual final."}</p>
              </div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap justify-between gap-2">
            <button type="button" onClick={prev} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50">
              <ArrowLeft className="h-4 w-4" /> Voltar e editar
            </button>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => showSaved("Rascunho salvo para continuidade manual.")} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50">
                <ClipboardList className="h-4 w-4" /> Salvar rascunho
              </button>
              <button type="button" onClick={() => showSaved("Marcado para revisao interna. Persistencia definitiva fica para a proxima etapa.")} className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800 hover:bg-amber-100">
                <FileCheck2 className="h-4 w-4" /> Revisao interna
              </button>
              <button type="button" onClick={next} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">
                Enviar para destino <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {activeStep === "destination" && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-5">
            <h2 className="text-lg font-black text-gray-900">5. Destino</h2>
            <p className="text-sm text-gray-500">Escolha a proxima etapa sem publicar automaticamente.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Link href={`/admin/contentos/calendario?client=${clientId}`} className="rounded-2xl border border-gray-200 p-4 hover:bg-gray-50">
              <CalendarDays className="h-6 w-6 text-indigo-600" />
              <p className="mt-3 text-sm font-bold text-gray-900">Calendario</p>
              <p className="mt-1 text-xs text-gray-500">Planejar data e janela de publicacao.</p>
            </Link>
            <Link href={`/admin/contentos/producao?client=${clientId}`} className="rounded-2xl border border-gray-200 p-4 hover:bg-gray-50">
              <ClipboardList className="h-6 w-6 text-emerald-600" />
              <p className="mt-3 text-sm font-bold text-gray-900">Producao</p>
              <p className="mt-1 text-xs text-gray-500">Enviar para fila operacional.</p>
            </Link>
            <Link href={`/admin/contentos/aprovacoes?client=${clientId}`} className="rounded-2xl border border-gray-200 p-4 hover:bg-gray-50">
              <FileCheck2 className="h-6 w-6 text-amber-600" />
              <p className="mt-3 text-sm font-bold text-gray-900">Aprovacao</p>
              <p className="mt-1 text-xs text-gray-500">Revisar antes de compartilhar link.</p>
            </Link>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <Send className="h-6 w-6 text-gray-400" />
              <p className="mt-3 text-sm font-bold text-gray-700">Publicacao manual</p>
              <p className="mt-1 text-xs text-gray-500">Social Scheduler/Postiz ainda bloqueado por infraestrutura externa.</p>
            </div>
          </div>
          <div className="mt-5">
            <button type="button" onClick={prev} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50">
              <ArrowLeft className="h-4 w-4" /> Voltar para revisao
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
