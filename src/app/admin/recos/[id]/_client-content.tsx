"use client";
import { useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Clapperboard, Film, MapPin, Calendar,
  FileText, Layers, List, ClipboardList, Image as ImageIcon,
  Download, Plus, Trash2, ExternalLink, Loader2, Check, X,
  ChevronDown, Sparkles, FolderOpen, Scissors,
} from "lucide-react";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { AttachmentUploader, type AttachmentValue } from "@/components/attachment-uploader";
import type {
  DbRecProject, DbRecScript, DbRecStoryboardFrame,
  DbRecReference, DbRecShotListItem, DbProjectAttachment,
} from "@/lib/supabase/types";

// ── Constants ────────────────────────────────────────────────────

const SHOT_TYPES = [
  "Plano aberto", "Plano médio", "Plano fechado", "Close", "Detalhe",
  "Plano sequência", "Over the shoulder", "POV", "Drone", "Plano de apoio",
];

const CAMERA_MOVEMENTS = [
  "Câmera fixa", "Pan", "Tilt", "Travelling", "Handheld",
  "Gimbal", "Dolly in", "Dolly out", "Zoom", "Slow motion",
  "Câmera subjetiva", "Drone",
];

const LENS_OPTIONS = [
  "Grande angular", "Normal", "Tele", "Macro",
  "24mm", "35mm", "50mm", "85mm",
  "Lente de detalhe", "Lente aberta",
];

const REF_TYPES = [
  "geral", "cena", "cor", "enquadramento", "movimento",
  "iluminacao", "edicao", "audio", "locacao",
];

const REF_TYPE_LABELS: Record<string, string> = {
  geral: "Geral", cena: "Cena", cor: "Cor", enquadramento: "Enquadramento",
  movimento: "Movimento", iluminacao: "Iluminação", edicao: "Edição",
  audio: "Áudio", locacao: "Locação",
};

const SHOT_STATUS = ["planejado", "gravar", "gravado", "refazer", "aprovado"];
const SHOT_STATUS_LABELS: Record<string, string> = {
  planejado: "Planejado", gravar: "Gravar", gravado: "Gravado",
  refazer: "Refazer", aprovado: "Aprovado",
};
const SHOT_STATUS_COLORS: Record<string, string> = {
  planejado: "bg-gray-100 text-gray-600",
  gravar:    "bg-blue-100 text-blue-700",
  gravado:   "bg-emerald-100 text-emerald-700",
  refazer:   "bg-orange-100 text-orange-700",
  aprovado:  "bg-indigo-100 text-indigo-700",
};

const IMAGE_STATUS_LABELS: Record<string, string> = {
  pendente:           "Pendente",
  descricao_pronta:   "Descrição pronta",
  referencia_anexada: "Referência anexada",
  aguardando_ia:      "Aguardando IA",
  gerada:             "Gerada",
  aprovada:           "Aprovada",
  substituir:         "Substituir",
};

const EMOTION_OPTIONS = [
  "Alegria", "Nostalgia", "Tensão", "Calma", "Empolgação",
  "Melancolia", "Confiança", "Urgência", "Inspiração", "Surpresa",
];

const TEMPERATURE_OPTIONS = [
  "Quente (tons amarelos/laranja)",
  "Frio (tons azuis/brancos)",
  "Neutro (tons naturais)",
  "Alto contraste",
];

const ILUMINACAO_OPTIONS = [
  "Natural (dia)",
  "Natural (golden hour)",
  "Natural (azul do entardecer)",
  "Estúdio suave",
  "Estúdio dramático",
  "Ambiente (prático)",
  "Low key",
  "High key",
  "Backlight",
  "Lateral",
];

const CLIMA_VISUAL_OPTIONS = [
  "Minimalista", "Colorido e vibrante", "Escuro e sombrio",
  "Claro e limpo", "Cinematográfico", "Documental",
  "Fashion/editorial", "Raw/orgânico",
];

const PALETA_OPTIONS = [
  "Tons terrosos", "Preto e branco", "Pastéis",
  "Neón", "Monocromático", "Complementares",
  "Análogos", "Vibrantes", "Dessaturados",
];

const ATTACHMENT_CATEGORIES = [
  { value: "roteiro",      label: "Roteiro" },
  { value: "bruto",        label: "Material bruto" },
  { value: "referencia",   label: "Referência visual" },
  { value: "cliente",      label: "Arquivo do cliente" },
  { value: "edicao",       label: "Edição / corte" },
  { value: "entregavel",   label: "Entregável final" },
  { value: "drive",        label: "Link de pasta (Drive)" },
  { value: "outros",       label: "Outros" },
];

const PROJECT_STATUS_OPTIONS = [
  { value: "em_andamento", label: "Em andamento" },
  { value: "em_producao",  label: "Em produção" },
  { value: "gravado",      label: "Gravado" },
  { value: "em_edicao",    label: "Em edição" },
  { value: "concluido",    label: "Concluído" },
  { value: "pausado",      label: "Pausado" },
  { value: "cancelado",    label: "Cancelado" },
];

const CHECKLIST_DEFAULTS = [
  "Câmera", "Lente", "Cartão de memória", "Bateria", "Tripé",
  "Gimbal", "Microfone", "Luz", "Rebatedor", "Power bank",
  "Notebook", "Autorização", "Figurino", "Props",
];

// ── Tab config ───────────────────────────────────────────────────

type TabId = "overview" | "roteiro" | "storyboard" | "shotlist" | "plano" | "referencias" | "arquivos" | "edicao" | "exportar";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "overview",   label: "Visão Geral",        icon: Clapperboard },
  { id: "roteiro",    label: "Roteiro",             icon: FileText },
  { id: "storyboard", label: "Storyboard",          icon: Layers },
  { id: "shotlist",   label: "Decupagem",           icon: List },
  { id: "plano",      label: "Plano de Gravação",   icon: ClipboardList },
  { id: "referencias",label: "Referências",         icon: ImageIcon },
  { id: "arquivos",   label: "Arquivos",            icon: FolderOpen },
  { id: "edicao",     label: "Plano de Edição",     icon: Scissors },
  { id: "exportar",   label: "Exportar",            icon: Download },
];

// ── Props ────────────────────────────────────────────────────────

interface Props {
  project:     DbRecProject;
  script:      DbRecScript | null;
  frames:      DbRecStoryboardFrame[];
  references:  DbRecReference[];
  shotList:    DbRecShotListItem[];
  attachments: DbProjectAttachment[];
}

// ── Main component ───────────────────────────────────────────────

export function RecosProjectContent({ project: initialProject, script: initialScript, frames: initialFrames, references: initialRefs, shotList: initialShots, attachments: initialAttachments }: Props) {
  const [tab, setTab]                   = useState<TabId>("overview");
  const [project, setProject]           = useState(initialProject);
  const [script, setScript]             = useState(initialScript);
  const [frames, setFrames]             = useState(initialFrames);
  const [references, setReferences]     = useState(initialRefs);
  const [shotList, setShotList]         = useState(initialShots);
  const [attachments, setAttachments]   = useState(initialAttachments);

  const clientName = project.clients?.[0]?.company_name;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/admin/recos"
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg font-black text-gray-900 truncate">{project.title}</h1>
            <p className="text-xs text-gray-400 flex items-center gap-2">
              <span className="capitalize">{project.project_type}</span>
              {clientName && <><span>·</span><span>{clientName}</span></>}
            </p>
          </div>
        </div>
        <ProjectStatusSelect project={project} onUpdate={(p) => setProject(p)} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none border-b border-gray-100">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0",
              tab === id
                ? "text-rose-600 border-b-2 border-rose-500 bg-rose-50"
                : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === "overview"    && <OverviewTab    project={project} frames={frames} shotList={shotList} references={references} />}
        {tab === "roteiro"     && <RoteiroTab     projectId={project.id} script={script} onSave={setScript} attachments={attachments} onUpdateAttachments={setAttachments} />}
        {tab === "storyboard"  && <StoryboardTab  projectId={project.id} frames={frames} onUpdate={setFrames} />}
        {tab === "shotlist"    && <ShotListTab    projectId={project.id} shotList={shotList} onUpdate={setShotList} />}
        {tab === "plano"       && <PlanoTab       project={project} />}
        {tab === "referencias" && <ReferenciasTab projectId={project.id} references={references} onUpdate={setReferences} />}
        {tab === "arquivos"    && <ArquivosTab    projectId={project.id} attachments={attachments} onUpdate={setAttachments} />}
        {tab === "edicao"      && <EdicaoTab      project={project} />}
        {tab === "exportar"    && <ExportarTab    project={project} />}
      </div>
    </div>
  );
}

// ── Project status select ─────────────────────────────────────────

function ProjectStatusSelect({ project, onUpdate }: { project: DbRecProject; onUpdate: (p: DbRecProject) => void }) {
  const [saving, setSaving] = useState(false);

  async function handleChange(newStatus: string) {
    if (!isSupabaseConfigured) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("rec_projects")
        .update({ status: newStatus })
        .eq("id", project.id)
        .select("*, clients(company_name)")
        .single();
      if (data) onUpdate(data as DbRecProject);
    } catch {}
    setSaving(false);
  }

  return (
    <div className="relative flex-shrink-0">
      <select
        value={project.status}
        onChange={(e) => handleChange(e.target.value)}
        disabled={saving}
        className="appearance-none pl-3 pr-7 py-2 rounded-xl border border-gray-200 text-xs font-bold bg-white outline-none focus:border-rose-400 cursor-pointer disabled:opacity-60"
      >
        {PROJECT_STATUS_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
      {saving
        ? <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 animate-spin" />
        : <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
      }
    </div>
  );
}

// ── Overview tab ─────────────────────────────────────────────────

function OverviewTab({ project, frames, shotList, references }: {
  project:    DbRecProject;
  frames:     DbRecStoryboardFrame[];
  shotList:   DbRecShotListItem[];
  references: DbRecReference[];
}) {
  const recDate = project.recording_date
    ? new Date(project.recording_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Project info */}
      <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-800">Dados do projeto</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Tipo",     value: project.project_type },
            { label: "Estilo",   value: project.style },
            { label: "Duração",  value: project.duration_estimate },
            { label: "Status",   value: project.status },
          ].map(({ label, value }) =>
            value ? (
              <div key={label}>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
                <p className="text-sm text-gray-700 capitalize mt-0.5">{value}</p>
              </div>
            ) : null
          )}
        </div>
        {project.location && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
            {project.location}
          </div>
        )}
        {recDate && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            Gravação: {recDate}
          </div>
        )}
        {project.objective && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Objetivo</p>
            <p className="text-sm text-gray-700 leading-relaxed">{project.objective}</p>
          </div>
        )}
        {project.notes && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Observações</p>
            <p className="text-sm text-gray-600 leading-relaxed">{project.notes}</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="space-y-3">
        {[
          { label: "Frames no storyboard", value: frames.length,     icon: Layers,     color: "text-rose-600" },
          { label: "Shots planejados",      value: shotList.length,   icon: List,       color: "text-indigo-600" },
          { label: "Referências",           value: references.length, icon: ImageIcon,  color: "text-amber-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <Icon className={cn("w-5 h-5 flex-shrink-0", color)} />
            <div>
              <p className="text-xl font-black text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Roteiro tab ─────────────────────────────────────────────────

function RoteiroTab({ projectId, script, onSave, attachments, onUpdateAttachments }: {
  projectId:             string;
  script:                DbRecScript | null;
  onSave:                (s: DbRecScript) => void;
  attachments:           DbProjectAttachment[];
  onUpdateAttachments:   (a: DbProjectAttachment[]) => void;
}) {
  const [mode, setMode]       = useState<"anexar" | "criar">(script?.script_type === "criado" ? "criar" : "anexar");
  const [text, setText]       = useState(script?.script_text ?? "");
  const [url, setUrl]         = useState(script?.script_url ?? "");
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  // Attachments state for "roteiro" category
  const scriptAttachments = attachments.filter((a) => a.category === "roteiro");
  const [attachInput,  setAttachInput]  = useState<AttachmentValue | null>(null);
  const [attachNotes,  setAttachNotes]  = useState("");
  const [attachSaving, setAttachSaving] = useState(false);
  const [deletingAtt,  setDeletingAtt]  = useState<string | null>(null);

  async function handleAddAttachment() {
    if (!isSupabaseConfigured || !attachInput) return;
    setAttachSaving(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("operational_attachments")
        .insert({
          rec_project_id:  projectId,
          attachment_url:  attachInput.url,
          attachment_name: attachInput.name,
          attachment_type: attachInput.type,
          attachment_size: attachInput.size ?? null,
          storage_path:    attachInput.storagePath ?? null,
          upload_source:   attachInput.source,
          category:        "roteiro",
          attachment_notes: attachNotes.trim() || null,
        })
        .select()
        .single();
      if (data) {
        onUpdateAttachments([data as DbProjectAttachment, ...attachments]);
        setAttachInput(null);
        setAttachNotes("");
      }
    } catch {}
    setAttachSaving(false);
  }

  async function handleDeleteAttachment(id: string) {
    if (!isSupabaseConfigured) return;
    setDeletingAtt(id);
    try {
      const supabase = createClient();
      await supabase.from("operational_attachments").delete().eq("id", id);
      onUpdateAttachments(attachments.filter((a) => a.id !== id));
    } catch {}
    setDeletingAtt(null);
  }

  async function handleSave() {
    if (!isSupabaseConfigured) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const payload  = {
        project_id:  projectId,
        script_text: text.trim() || null,
        script_url:  url.trim() || null,
        script_type: mode === "criar" ? "criado" : "anexado",
        status:      "rascunho",
      };
      let data: DbRecScript;
      if (script?.id) {
        const res = await supabase.from("rec_scripts").update(payload).eq("id", script.id).select().single();
        data = res.data as DbRecScript;
      } else {
        const res = await supabase.from("rec_scripts").insert(payload).select().single();
        data = res.data as DbRecScript;
      }
      if (data) { onSave(data); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    } catch {}
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="bg-white rounded-2xl border border-gray-100 p-1 flex gap-1 w-fit">
        {(["anexar", "criar"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all",
              mode === m ? "bg-rose-600 text-white" : "text-gray-500 hover:text-gray-800"
            )}
          >
            {m === "anexar" ? "Anexar roteiro existente" : "Criar do zero"}
          </button>
        ))}
      </div>

      {mode === "anexar" ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-800">Roteiro existente</h3>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Colar texto do roteiro</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Cole aqui o roteiro completo..."
              rows={12}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-rose-400 resize-y transition-colors font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Link do documento (Google Docs, Drive, Notion...)</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://docs.google.com/..."
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-rose-400 transition-colors"
            />
          </div>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir documento
            </a>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-800">Estrutura do roteiro</h3>
          {[
            { key: "inicio",        label: "Início",         ph: "Como o vídeo começa? Qual a primeira imagem ou fala?" },
            { key: "desenvolvimento",label: "Desenvolvimento", ph: "O que acontece no meio do vídeo? Qual a história contada?" },
            { key: "climax",        label: "Clímax / Momento forte", ph: "Qual o pico emocional ou de impacto do vídeo?" },
            { key: "encerramento",  label: "Encerramento",   ph: "Como o vídeo termina? Qual a sensação final?" },
            { key: "cta",           label: "CTA (opcional)", ph: "Existe uma chamada para ação? Ex: 'Acesse nosso site'" },
          ].map(({ key, label, ph }) => {
            const lineStart = text.indexOf(`[${key}]`);
            const sectionText = lineStart >= 0
              ? text.slice(lineStart + key.length + 2).split(/\[/)[0].trim()
              : "";
            return (
              <div key={key}>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">{label}</label>
                <textarea
                  value={sectionText}
                  onChange={(e) => {
                    const tag   = `[${key}]`;
                    const block = `${tag}\n${e.target.value}\n`;
                    const regex = new RegExp(`\\[${key}\\][^\\[]*`, "g");
                    if (text.includes(tag)) {
                      setText(text.replace(regex, block));
                    } else {
                      setText(text + (text ? "\n" : "") + block);
                    }
                  }}
                  placeholder={ph}
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-rose-400 resize-none transition-colors"
                />
              </div>
            );
          })}
        </div>
      )}

      {/* AI placeholder */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-rose-400 flex-shrink-0" />
        <div>
          <p className="text-xs font-bold text-white">Análise automática com IA</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Análise automática do roteiro será ativada quando a integração de IA estiver disponível.
          </p>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700 disabled:opacity-60 transition-colors"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
        {saved ? "Salvo!" : saving ? "Salvando..." : "Salvar roteiro"}
      </button>

      {/* Script attachments */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-gray-800">Anexos do roteiro</h3>
          <p className="text-xs text-gray-400 mt-0.5">PDF, DOC, links de referência e arquivos enviados pelo cliente.</p>
        </div>
        <AttachmentUploader
          label="Arquivo ou link"
          value={attachInput}
          onChange={setAttachInput}
          storagePathPrefix={`recos/${projectId}/roteiro`}
          placeholder="PDF, DOC, Google Docs, Drive, link de referência..."
        />
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Observação (opcional)</label>
          <input value={attachNotes} onChange={(e) => setAttachNotes(e.target.value)}
            placeholder="Ex: Versão revisada pelo cliente, roteiro final..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-400" />
        </div>
        <button onClick={handleAddAttachment} disabled={attachSaving || !attachInput}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 disabled:opacity-60 transition-colors">
          {attachSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          {attachSaving ? "Salvando..." : "Adicionar anexo"}
        </button>

        {scriptAttachments.length > 0 && (
          <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden">
            {scriptAttachments.map((att) => (
              <div key={att.id} className="flex items-center gap-3 px-4 py-3 group">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-800 truncate">
                    {att.attachment_name ?? att.attachment_url.replace(/^https?:\/\//, "").slice(0, 50)}
                  </p>
                  {att.attachment_notes && (
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">{att.attachment_notes}</p>
                  )}
                  {att.attachment_type && (
                    <p className="text-[10px] text-gray-300 mt-0.5">{att.attachment_type}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={att.attachment_url} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition-colors"
                    title="Abrir">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <a href={att.attachment_url} download
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Baixar">
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  <button onClick={() => handleDeleteAttachment(att.id)}
                    disabled={deletingAtt === att.id}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50"
                    title="Remover">
                    {deletingAtt === att.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {scriptAttachments.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">Nenhum anexo de roteiro ainda.</p>
        )}
      </div>
    </div>
  );
}

// ── Storyboard tab ───────────────────────────────────────────────

interface FrameFormData {
  title:              string;
  scene_number:       number;
  frame_number:       number;
  visual_description: string;
  dialogue:           string;
  action_notes:       string;
  shot_type:          string;
  camera_movement:    string;
  lens:               string;
  location:           string;
  duration_estimate:  string;
  reference_url:      string;
  image_url:          string;
  image_prompt:       string;
  image_status:       string;
  notes:              string;
  // visual direction (stored in metadata)
  emotion:            string;
  temperature_visual: string;
  iluminacao:         string;
  clima_visual:       string;
  paleta_cor:         string;
}

const EMPTY_FRAME: FrameFormData = {
  title: "", scene_number: 1, frame_number: 1,
  visual_description: "", dialogue: "", action_notes: "",
  shot_type: "", camera_movement: "", lens: "",
  location: "", duration_estimate: "", reference_url: "",
  image_url: "", image_prompt: "", image_status: "pendente", notes: "",
  emotion: "", temperature_visual: "", iluminacao: "", clima_visual: "", paleta_cor: "",
};

function StoryboardTab({ projectId, frames, onUpdate }: {
  projectId: string;
  frames:    DbRecStoryboardFrame[];
  onUpdate:  (f: DbRecStoryboardFrame[]) => void;
}) {
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState<DbRecStoryboardFrame | null>(null);
  const [form, setForm]           = useState<FrameFormData>(EMPTY_FRAME);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState<string | null>(null);

  function openNew() {
    const nextScene = frames.length > 0 ? Math.max(...frames.map((f) => f.scene_number)) : 1;
    const nextFrame = frames.filter((f) => f.scene_number === nextScene).length + 1;
    setForm({ ...EMPTY_FRAME, scene_number: nextScene, frame_number: nextFrame });
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(frame: DbRecStoryboardFrame) {
    const meta = (frame.metadata ?? {}) as Record<string, string>;
    setForm({
      title: frame.title ?? "",
      scene_number: frame.scene_number,
      frame_number: frame.frame_number,
      visual_description: frame.visual_description ?? "",
      dialogue: frame.dialogue ?? "",
      action_notes: frame.action_notes ?? "",
      shot_type: frame.shot_type ?? "",
      camera_movement: frame.camera_movement ?? "",
      lens: frame.lens ?? "",
      location: frame.location ?? "",
      duration_estimate: frame.duration_estimate ?? "",
      reference_url: frame.reference_url ?? "",
      image_url: frame.image_url ?? "",
      image_prompt: frame.image_prompt ?? "",
      image_status: frame.image_status,
      notes: frame.notes ?? "",
      emotion: meta.emotion ?? "",
      temperature_visual: meta.temperature_visual ?? "",
      iluminacao: meta.iluminacao ?? "",
      clima_visual: meta.clima_visual ?? "",
      paleta_cor: meta.paleta_cor ?? "",
    });
    setEditing(frame);
    setShowForm(true);
  }

  async function handleSave() {
    if (!isSupabaseConfigured) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { emotion, temperature_visual, iluminacao, clima_visual, paleta_cor, image_url, ...rest } = form;
      const metadata = { emotion, temperature_visual, iluminacao, clima_visual, paleta_cor };
      const payload  = { ...rest, image_url: image_url || null, metadata, project_id: projectId };

      let updated: DbRecStoryboardFrame[];
      if (editing) {
        const { data } = await supabase.from("rec_storyboard_frames").update(payload).eq("id", editing.id).select().single();
        updated = frames.map((f) => f.id === editing.id ? (data as DbRecStoryboardFrame) : f);
      } else {
        const { data } = await supabase.from("rec_storyboard_frames").insert(payload).select().single();
        updated = [...frames, data as DbRecStoryboardFrame].sort(
          (a, b) => a.scene_number - b.scene_number || a.frame_number - b.frame_number
        );
      }
      onUpdate(updated);
      setShowForm(false);
    } catch {}
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!isSupabaseConfigured) return;
    setDeleting(id);
    try {
      const supabase = createClient();
      await supabase.from("rec_storyboard_frames").delete().eq("id", id);
      onUpdate(frames.filter((f) => f.id !== id));
    } catch {}
    setDeleting(null);
  }

  const scenes = [...new Set(frames.map((f) => f.scene_number))].sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-800">Storyboard</h3>
          <p className="text-xs text-gray-400">{frames.length} quadro{frames.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Adicionar frame
        </button>
      </div>

      {/* AI placeholder */}
      <div className="bg-slate-800 rounded-xl p-3 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-rose-400 flex-shrink-0" />
        <p className="text-xs text-slate-300">
          <span className="font-bold">Sugerir cenas com IA</span>
          {" "}— será ativado quando a integração de IA estiver disponível.
        </p>
      </div>

      {frames.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <Layers className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-600 mb-1">Nenhum frame ainda</p>
          <p className="text-xs text-gray-400">Adicione o primeiro quadro do storyboard.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {scenes.map((sceneNum) => (
            <div key={sceneNum}>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                Cena {sceneNum}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {frames.filter((f) => f.scene_number === sceneNum).map((frame) => (
                  <FrameCard
                    key={frame.id}
                    frame={frame}
                    onEdit={() => openEdit(frame)}
                    onDelete={() => handleDelete(frame.id)}
                    deleting={deleting === frame.id}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Frame form modal */}
      {showForm && (
        <FrameFormModal
          form={form}
          setForm={setForm}
          editing={editing}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
          saving={saving}
        />
      )}
    </div>
  );
}

function FrameCard({ frame, onEdit, onDelete, deleting }: {
  frame:    DbRecStoryboardFrame;
  onEdit:   () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-rose-200 transition-colors group">
      {/* Image area */}
      <div className="h-28 bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center relative">
        {frame.image_url || frame.reference_url ? (
          <img
            src={frame.image_url || frame.reference_url || ""}
            alt={frame.title ?? "Frame"}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="text-center">
            <Film className="w-6 h-6 text-gray-300 mx-auto mb-1" />
            <p className="text-[10px] text-gray-400">
              {IMAGE_STATUS_LABELS[frame.image_status] ?? "Pendente"}
            </p>
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1">
          <span className="text-[10px] font-black bg-black/60 text-white px-1.5 py-0.5 rounded-lg">
            {frame.scene_number}.{frame.frame_number}
          </span>
        </div>
      </div>

      <div className="p-3 space-y-1.5">
        {frame.title && (
          <p className="text-xs font-bold text-gray-800 truncate">{frame.title}</p>
        )}
        {frame.visual_description && (
          <p className="text-[11px] text-gray-500 line-clamp-2">{frame.visual_description}</p>
        )}
        <div className="flex flex-wrap gap-1">
          {frame.shot_type && (
            <span className="text-[10px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded-lg font-medium">
              {frame.shot_type}
            </span>
          )}
          {frame.camera_movement && (
            <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-lg">
              {frame.camera_movement}
            </span>
          )}
          {frame.lens && (
            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-lg">
              {frame.lens}
            </span>
          )}
        </div>
        {frame.dialogue && (
          <p className="text-[11px] text-gray-400 italic line-clamp-1">&quot;{frame.dialogue}&quot;</p>
        )}
        <div className="flex gap-1 pt-1">
          <button
            onClick={onEdit}
            className="flex-1 py-1.5 rounded-lg text-[11px] font-bold text-gray-600 bg-gray-50 hover:bg-rose-50 hover:text-rose-600 transition-colors"
          >
            Editar
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function FrameFormModal({ form, setForm, editing, onSave, onClose, saving }: {
  form:     FrameFormData;
  setForm:  React.Dispatch<React.SetStateAction<FrameFormData>>;
  editing:  DbRecStoryboardFrame | null;
  onSave:   () => void;
  onClose:  () => void;
  saving:   boolean;
}) {
  const set = useCallback(<K extends keyof FrameFormData>(key: K, val: FrameFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, [setForm]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800">
            {editing ? "Editar frame" : "Novo frame"} — Cena {form.scene_number}.{form.frame_number}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          {/* Identificação */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Título</label>
              <input value={form.title} onChange={(e) => set("title", e.target.value)}
                placeholder="Nome da cena" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-400" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Cena #</label>
              <input type="number" min={1} value={form.scene_number} onChange={(e) => set("scene_number", Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-400" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Frame #</label>
              <input type="number" min={1} value={form.frame_number} onChange={(e) => set("frame_number", Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-400" />
            </div>
          </div>

          {/* Imagem do frame */}
          <AttachmentUploader
            label="Imagem do frame"
            value={form.image_url ? { url: form.image_url, name: "imagem-frame", type: "image/*", size: 0, source: "external_link" } : null}
            onChange={(v) => set("image_url", v?.url ?? "")}
            storagePathPrefix="recos/frames"
            placeholder="Link ou upload de imagem de referência para este frame"
          />

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Descrição visual *</label>
            <textarea value={form.visual_description} onChange={(e) => set("visual_description", e.target.value)}
              placeholder="Descreva o que a câmera deve ver neste quadro..." rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-400 resize-none" />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Fala / Narração</label>
            <input value={form.dialogue} onChange={(e) => set("dialogue", e.target.value)}
              placeholder="Fala do personagem ou narração off..." className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-400" />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Ação / Direção</label>
            <input value={form.action_notes} onChange={(e) => set("action_notes", e.target.value)}
              placeholder="O que acontece nesta cena? Direção de atores/pessoas..." className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-400" />
          </div>

          {/* Câmera */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Tipo de plano</label>
              <select value={form.shot_type} onChange={(e) => set("shot_type", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-400 bg-white">
                <option value="">Selecionar...</option>
                {SHOT_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Movimento câmera</label>
              <select value={form.camera_movement} onChange={(e) => set("camera_movement", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-400 bg-white">
                <option value="">Selecionar...</option>
                {CAMERA_MOVEMENTS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Lente</label>
              <select value={form.lens} onChange={(e) => set("lens", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-400 bg-white">
                <option value="">Selecionar...</option>
                {LENS_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Duração est.</label>
              <input value={form.duration_estimate} onChange={(e) => set("duration_estimate", e.target.value)}
                placeholder="Ex: 3s, 10s..." className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-400" />
            </div>
          </div>

          {/* Direção visual */}
          <div className="border border-gray-100 rounded-2xl p-4 space-y-3 bg-gray-50/50">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Direção visual</p>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Emoção</label>
              <div className="flex flex-wrap gap-1.5">
                {EMOTION_OPTIONS.map((e) => (
                  <button key={e} type="button" onClick={() => set("emotion", form.emotion === e ? "" : e)}
                    className={cn("px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all",
                      form.emotion === e ? "border-rose-500 bg-rose-50 text-rose-700" : "border-gray-200 text-gray-600 hover:border-rose-200 bg-white")}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Temperatura visual</label>
              <div className="flex flex-wrap gap-1.5">
                {TEMPERATURE_OPTIONS.map((t) => (
                  <button key={t} type="button" onClick={() => set("temperature_visual", form.temperature_visual === t ? "" : t)}
                    className={cn("px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all",
                      form.temperature_visual === t ? "border-amber-500 bg-amber-50 text-amber-700" : "border-gray-200 text-gray-600 hover:border-amber-200 bg-white")}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Iluminação</label>
              <select value={form.iluminacao} onChange={(e) => set("iluminacao", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-400 bg-white">
                <option value="">Selecionar...</option>
                {ILUMINACAO_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Clima visual</label>
              <div className="flex flex-wrap gap-1.5">
                {CLIMA_VISUAL_OPTIONS.map((c) => (
                  <button key={c} type="button" onClick={() => set("clima_visual", form.clima_visual === c ? "" : c)}
                    className={cn("px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all",
                      form.clima_visual === c ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600 hover:border-indigo-200 bg-white")}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Paleta de cor</label>
              <div className="flex flex-wrap gap-1.5">
                {PALETA_OPTIONS.map((p) => (
                  <button key={p} type="button" onClick={() => set("paleta_cor", form.paleta_cor === p ? "" : p)}
                    className={cn("px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all",
                      form.paleta_cor === p ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600 hover:border-emerald-200 bg-white")}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* IA e status */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Prompt para IA (futuro)</label>
            <input value={form.image_prompt} onChange={(e) => set("image_prompt", e.target.value)}
              placeholder="Descreva a imagem ideal para geração automática..." className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-400" />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Status da imagem</label>
            <select value={form.image_status} onChange={(e) => set("image_status", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-400 bg-white">
              {Object.entries(IMAGE_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Observações de direção</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)}
              placeholder="Detalhes técnicos, ajustes de luz, notas para o editor..." rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-400 resize-none" />
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={onSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 disabled:opacity-60 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? "Salvando..." : "Salvar frame"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Shot List tab ────────────────────────────────────────────────

function ShotListTab({ projectId, shotList, onUpdate }: {
  projectId: string;
  shotList:  DbRecShotListItem[];
  onUpdate:  (s: DbRecShotListItem[]) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({
    scene_number: 1, shot_number: 1,
    description: "", shot_type: "", angle: "",
    movement: "", lens: "", audio: "", equipment: "",
    location: "", duration_estimate: "", priority: "normal",
    status: "planejado", notes: "",
  });
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleSave() {
    if (!isSupabaseConfigured) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.from("rec_shot_list")
        .insert({ ...form, project_id: projectId })
        .select()
        .single();
      if (data) {
        onUpdate([...shotList, data as DbRecShotListItem].sort(
          (a, b) => a.scene_number - b.scene_number || a.shot_number - b.shot_number
        ));
        setShowForm(false);
      }
    } catch {}
    setSaving(false);
  }

  async function handleStatusChange(id: string, status: string) {
    if (!isSupabaseConfigured) return;
    try {
      const supabase = createClient();
      await supabase.from("rec_shot_list").update({ status }).eq("id", id);
      onUpdate(shotList.map((s) => s.id === id ? { ...s, status } : s));
    } catch {}
  }

  async function handleDelete(id: string) {
    if (!isSupabaseConfigured) return;
    setDeleting(id);
    try {
      const supabase = createClient();
      await supabase.from("rec_shot_list").delete().eq("id", id);
      onUpdate(shotList.filter((s) => s.id !== id));
    } catch {}
    setDeleting(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-800">Shot List</h3>
          <p className="text-xs text-gray-400">{shotList.length} plano{shotList.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Adicionar shot
        </button>
      </div>

      {shotList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <List className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-600 mb-1">Shot list vazia</p>
          <p className="text-xs text-gray-400">Adicione os planos técnicos da gravação.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Cena", "Shot", "Descrição", "Plano", "Movimento", "Lente", "Duração", "Status", ""].map((h) => (
                    <th key={h} className="text-left px-3 py-2.5 font-bold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {shotList.map((shot) => (
                  <tr key={shot.id} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2.5 font-bold text-gray-700">{shot.scene_number}</td>
                    <td className="px-3 py-2.5 text-gray-500">{shot.shot_number}</td>
                    <td className="px-3 py-2.5 text-gray-700 max-w-[200px] truncate">{shot.description ?? "—"}</td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{shot.shot_type ?? "—"}</td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{shot.movement ?? "—"}</td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{shot.lens ?? "—"}</td>
                    <td className="px-3 py-2.5 text-gray-500">{shot.duration_estimate ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      <select
                        value={shot.status}
                        onChange={(e) => handleStatusChange(shot.id, e.target.value)}
                        className={cn(
                          "text-[11px] font-bold px-2 py-1 rounded-lg border-0 outline-none cursor-pointer",
                          SHOT_STATUS_COLORS[shot.status] ?? "bg-gray-100 text-gray-600"
                        )}
                      >
                        {SHOT_STATUS.map((s) => (
                          <option key={s} value={s}>{SHOT_STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => handleDelete(shot.id)}
                        disabled={deleting === shot.id}
                        className="p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        {deleting === shot.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">Novo shot</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Cena #" type="number" value={String(form.scene_number)} onChange={(v) => setForm((f) => ({ ...f, scene_number: Number(v) }))} />
                <Field label="Shot #" type="number" value={String(form.shot_number)} onChange={(v) => setForm((f) => ({ ...f, shot_number: Number(v) }))} />
              </div>
              <Field label="Descrição" value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} placeholder="O que acontece neste plano?" />
              <div className="grid grid-cols-2 gap-2">
                <SelectField label="Plano" value={form.shot_type} options={SHOT_TYPES} onChange={(v) => setForm((f) => ({ ...f, shot_type: v }))} />
                <SelectField label="Movimento" value={form.movement} options={CAMERA_MOVEMENTS} onChange={(v) => setForm((f) => ({ ...f, movement: v }))} />
                <SelectField label="Lente" value={form.lens} options={LENS_OPTIONS} onChange={(v) => setForm((f) => ({ ...f, lens: v }))} />
                <Field label="Duração" value={form.duration_estimate} onChange={(v) => setForm((f) => ({ ...f, duration_estimate: v }))} placeholder="Ex: 5s" />
              </div>
              <Field label="Áudio" value={form.audio} onChange={(v) => setForm((f) => ({ ...f, audio: v }))} placeholder="Ambiência, diálogo, música..." />
              <Field label="Local" value={form.location} onChange={(v) => setForm((f) => ({ ...f, location: v }))} placeholder="Onde filmar este plano?" />
              <Field label="Observações" value={form.notes} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} placeholder="Detalhes técnicos..." />
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-60">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-500 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-400 transition-colors" />
    </div>
  );
}

function SelectField({ label, value, options, onChange }: {
  label: string; value: string; options: readonly string[]; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-500 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-400 bg-white">
        <option value="">—</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ── Plano de Gravação tab ─────────────────────────────────────────

function PlanoTab({ project }: { project: DbRecProject }) {
  const meta    = (project.metadata ?? {}) as Record<string, unknown>;
  const planMeta = (meta.plano ?? {}) as Record<string, unknown>;

  const [date,       setDate]      = useState(String(planMeta.date ?? project.recording_date ?? ""));
  const [time,       setTime]      = useState(String(planMeta.time ?? ""));
  const [location,   setLocation]  = useState(String(planMeta.location ?? project.location ?? ""));
  const [team,       setTeam]      = useState(String(planMeta.team ?? (project.team ?? []).join(", ")));
  const [equipment,  setEquipment] = useState(String(planMeta.equipment ?? ""));
  const [notes,      setNotes]     = useState(String(planMeta.notes ?? ""));
  const [checklist,  setChecklist] = useState<{ label: string; done: boolean }[]>(
    (planMeta.checklist as { label: string; done: boolean }[] | undefined) ??
    CHECKLIST_DEFAULTS.map((label) => ({ label, done: false }))
  );
  const [saving, setSaving]  = useState(false);
  const [saved,  setSaved]   = useState(false);

  function toggleCheck(i: number) {
    setChecklist((prev) => prev.map((item, idx) => idx === i ? { ...item, done: !item.done } : item));
  }

  async function handleSave() {
    if (!isSupabaseConfigured) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const newMeta  = { ...(project.metadata ?? {}), plano: { date, time, location, team, equipment, notes, checklist } };
      await supabase.from("rec_projects").update({ metadata: newMeta }).eq("id", project.id);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  }

  const done  = checklist.filter((c) => c.done).length;
  const total = checklist.length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Plan form */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-800">Dados da gravação</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Data</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-rose-400" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Horário</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-rose-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Local de gravação</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)}
              placeholder="Endereço ou descrição do local..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-rose-400" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Equipe envolvida</label>
            <input value={team} onChange={(e) => setTeam(e.target.value)}
              placeholder="Videomaker, editor, diretor, assistente..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-rose-400" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Equipamentos principais</label>
            <textarea value={equipment} onChange={(e) => setEquipment(e.target.value)}
              placeholder="Câmera, lentes, drone, microfone, luzes..."
              rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-rose-400 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Observações logísticas</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Acesso ao local, estacionamento, autorizações, contatos..."
              rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-rose-400 resize-none" />
          </div>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700 disabled:opacity-60 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
            {saved ? "Salvo!" : saving ? "Salvando..." : "Salvar plano"}
          </button>
        </div>

        {/* Checklist */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-800">Checklist de equipamentos</h3>
            <span className="text-xs font-bold text-rose-600">{done}/{total}</span>
          </div>
          <div className="space-y-2">
            {checklist.map((item, i) => (
              <button
                key={i}
                onClick={() => toggleCheck(i)}
                className={cn(
                  "w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors",
                  item.done ? "bg-emerald-50" : "bg-gray-50 hover:bg-gray-100"
                )}
              >
                <div className={cn(
                  "w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                  item.done ? "border-emerald-500 bg-emerald-500" : "border-gray-300"
                )}>
                  {item.done && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className={cn("text-xs font-medium", item.done ? "text-emerald-700 line-through" : "text-gray-700")}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Referências tab ───────────────────────────────────────────────

function ReferenciasTab({ projectId, references, onUpdate }: {
  projectId:  string;
  references: DbRecReference[];
  onUpdate:   (r: DbRecReference[]) => void;
}) {
  const [refType, setRefType]   = useState("geral");
  const [title,   setTitle]     = useState("");
  const [url,     setUrl]       = useState("");
  const [notes,   setNotes]     = useState("");
  const [saving,  setSaving]    = useState(false);
  const [deleting,setDeleting]  = useState<string | null>(null);

  async function handleAdd() {
    if (!isSupabaseConfigured || !url.trim()) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.from("rec_references")
        .insert({ project_id: projectId, reference_type: refType, title: title.trim() || null, url: url.trim(), notes: notes.trim() || null })
        .select()
        .single();
      if (data) {
        onUpdate([data as DbRecReference, ...references]);
        setUrl(""); setTitle(""); setNotes("");
      }
    } catch {}
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!isSupabaseConfigured) return;
    setDeleting(id);
    try {
      const supabase = createClient();
      await supabase.from("rec_references").delete().eq("id", id);
      onUpdate(references.filter((r) => r.id !== id));
    } catch {}
    setDeleting(null);
  }

  const REF_COLORS: Record<string, string> = {
    geral: "bg-gray-100 text-gray-600", cena: "bg-rose-100 text-rose-700",
    cor: "bg-amber-100 text-amber-700", enquadramento: "bg-indigo-100 text-indigo-700",
    movimento: "bg-blue-100 text-blue-700", iluminacao: "bg-yellow-100 text-yellow-700",
    edicao: "bg-orange-100 text-orange-700", audio: "bg-purple-100 text-purple-700",
    locacao: "bg-emerald-100 text-emerald-700",
  };

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <h3 className="text-sm font-bold text-gray-800">Adicionar referência</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {REF_TYPES.map((t) => (
            <button key={t} type="button" onClick={() => setRefType(t)}
              className={cn("px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all",
                refType === t ? "border-rose-500 bg-rose-50 text-rose-700" : "border-gray-200 text-gray-600 hover:border-rose-200")}>
              {REF_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Título (opcional)</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Referência de iluminação..." className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-400" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">URL / Link *</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..." className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-400" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Observação</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Por que esta referência é relevante?" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-400" />
        </div>
        <button onClick={handleAdd} disabled={saving || !url.trim()}
          className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 disabled:opacity-60 transition-colors">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          {saving ? "Adicionando..." : "Adicionar referência"}
        </button>
      </div>

      {/* References grid */}
      {references.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <ImageIcon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-600 mb-1">Nenhuma referência ainda</p>
          <p className="text-xs text-gray-400">Adicione links de imagens, vídeos e referências visuais.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {references.map((ref) => (
            <div key={ref.id} className="bg-white rounded-2xl border border-gray-100 p-4 group">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-lg", REF_COLORS[ref.reference_type] ?? "bg-gray-100 text-gray-600")}>
                  {REF_TYPE_LABELS[ref.reference_type] ?? ref.reference_type}
                </span>
                <button onClick={() => handleDelete(ref.id)} disabled={deleting === ref.id}
                  className="p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                  {deleting === ref.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                </button>
              </div>
              {ref.title && <p className="text-xs font-bold text-gray-800 mb-1 truncate">{ref.title}</p>}
              {ref.url && (
                <a href={ref.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-700 truncate mb-1">
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{ref.url.replace(/^https?:\/\//, "").slice(0, 40)}...</span>
                </a>
              )}
              {ref.notes && <p className="text-[11px] text-gray-500 line-clamp-2">{ref.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Arquivos tab ─────────────────────────────────────────────────

function ArquivosTab({ projectId, attachments, onUpdate }: {
  projectId:   string;
  attachments: DbProjectAttachment[];
  onUpdate:    (a: DbProjectAttachment[]) => void;
}) {
  const [category, setCategory] = useState("bruto");
  const [notes,    setNotes]    = useState("");
  const [attach,   setAttach]   = useState<AttachmentValue | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleAdd() {
    if (!isSupabaseConfigured || !attach) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("operational_attachments")
        .insert({
          rec_project_id:  projectId,
          attachment_url:  attach.url,
          attachment_name: attach.name,
          attachment_type: attach.type,
          attachment_size: attach.size ?? null,
          storage_path:    attach.storagePath ?? null,
          upload_source:   attach.source,
          category,
          attachment_notes: notes.trim() || null,
        })
        .select()
        .single();
      if (data) {
        onUpdate([data as DbProjectAttachment, ...attachments]);
        setAttach(null);
        setNotes("");
      }
    } catch {}
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!isSupabaseConfigured) return;
    setDeleting(id);
    try {
      const supabase = createClient();
      await supabase.from("operational_attachments").delete().eq("id", id);
      onUpdate(attachments.filter((a) => a.id !== id));
    } catch {}
    setDeleting(null);
  }

  const byCategory = ATTACHMENT_CATEGORIES.map((cat) => ({
    ...cat,
    items: attachments.filter((a) => a.category === cat.value),
  })).filter((g) => g.items.length > 0 || g.value === category);

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-800">Adicionar arquivo ou link</h3>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">Categoria</label>
          <div className="flex flex-wrap gap-1.5">
            {ATTACHMENT_CATEGORIES.map((cat) => (
              <button key={cat.value} type="button" onClick={() => setCategory(cat.value)}
                className={cn("px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all",
                  category === cat.value ? "border-rose-500 bg-rose-50 text-rose-700" : "border-gray-200 text-gray-600 hover:border-rose-200")}>
                {cat.label}
              </button>
            ))}
          </div>
        </div>
        <AttachmentUploader
          label="Arquivo ou link"
          value={attach}
          onChange={setAttach}
          storagePathPrefix={`recos/${projectId}`}
          placeholder="Link de Drive, Dropbox, YouTube ou envie um arquivo..."
        />
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Observação (opcional)</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Versão final aprovada, bruto da cena 3..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-400" />
        </div>
        <button onClick={handleAdd} disabled={saving || !attach}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 disabled:opacity-60 transition-colors">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          {saving ? "Salvando..." : "Adicionar"}
        </button>
      </div>

      {/* File list grouped by category */}
      {attachments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <FolderOpen className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-600 mb-1">Nenhum arquivo ainda</p>
          <p className="text-xs text-gray-400">Adicione links de Drive, arquivos brutos, entregáveis e mais.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {byCategory.filter((g) => g.items.length > 0).map((group) => (
            <div key={group.value} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <p className="text-[11px] font-black text-gray-500 uppercase tracking-wide">{group.label}</p>
              </div>
              <div className="divide-y divide-gray-50">
                {group.items.map((att) => (
                  <div key={att.id} className="flex items-center gap-3 px-4 py-3 group">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800 truncate">
                        {att.attachment_name ?? att.attachment_url.replace(/^https?:\/\//, "").slice(0, 50)}
                      </p>
                      {att.attachment_notes && (
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">{att.attachment_notes}</p>
                      )}
                    </div>
                    <a href={att.attachment_url} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors flex-shrink-0">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button onClick={() => handleDelete(att.id)} disabled={deleting === att.id}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0">
                      {deleting === att.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Plano de Edição tab ───────────────────────────────────────────

const EDICAO_CHECKLIST_DEFAULTS = [
  "Selecionar takes aprovados",
  "Editar sequência primária",
  "Inserir cortes e transições",
  "Adicionar trilha sonora",
  "Inserir legenda / texto",
  "Ajuste de cor (LUT / grading)",
  "Correção de áudio",
  "Motion graphics / vinheta",
  "Revisão interna",
  "Exportar versão para aprovação",
  "Ajustes pós-aprovação",
  "Exportar versão final",
  "Entrega ao cliente",
];

function EdicaoTab({ project }: { project: DbRecProject }) {
  const meta      = (project.metadata ?? {}) as Record<string, unknown>;
  const edicaoMeta = (meta.plano_edicao ?? {}) as Record<string, unknown>;

  const [software,    setSoftware]    = useState(String(edicaoMeta.software ?? ""));
  const [colorist,    setColorist]    = useState(String(edicaoMeta.colorist ?? ""));
  const [deadline,    setDeadline]    = useState(String(edicaoMeta.deadline ?? ""));
  const [style,       setStyle]       = useState(String(edicaoMeta.style ?? ""));
  const [transitions, setTransitions] = useState(String(edicaoMeta.transitions ?? ""));
  const [music,       setMusic]       = useState(String(edicaoMeta.music ?? ""));
  const [notes,       setNotes]       = useState(String(edicaoMeta.notes ?? ""));
  const [checklist,   setChecklist]   = useState<{ label: string; done: boolean }[]>(
    (edicaoMeta.checklist as { label: string; done: boolean }[] | undefined) ??
    EDICAO_CHECKLIST_DEFAULTS.map((label) => ({ label, done: false }))
  );
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  function toggleCheck(i: number) {
    setChecklist((prev) => prev.map((item, idx) => idx === i ? { ...item, done: !item.done } : item));
  }

  async function handleSave() {
    if (!isSupabaseConfigured) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const newMeta  = {
        ...(project.metadata ?? {}),
        plano_edicao: { software, colorist, deadline, style, transitions, music, notes, checklist },
      };
      await supabase.from("rec_projects").update({ metadata: newMeta }).eq("id", project.id);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  }

  const done  = checklist.filter((c) => c.done).length;
  const total = checklist.length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dados de edição */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-800">Plano de edição</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Software</label>
              <input value={software} onChange={(e) => setSoftware(e.target.value)}
                placeholder="Premiere, DaVinci, Final Cut..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-rose-400" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Deadline</label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-rose-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Editor / Colorista</label>
            <input value={colorist} onChange={(e) => setColorist(e.target.value)}
              placeholder="Nome do responsável pela edição..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-rose-400" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Estilo de edição</label>
            <input value={style} onChange={(e) => setStyle(e.target.value)}
              placeholder="Ex: Dinâmico, cinematográfico, documental..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-rose-400" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Transições</label>
            <input value={transitions} onChange={(e) => setTransitions(e.target.value)}
              placeholder="Ex: Corte seco, J-cut, L-cut, morph..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-rose-400" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Trilha / Música</label>
            <input value={music} onChange={(e) => setMusic(e.target.value)}
              placeholder="Link da música ou nome da trilha..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-rose-400" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Observações</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Instruções especiais, referências de corte, pacing..."
              rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-rose-400 resize-none" />
          </div>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700 disabled:opacity-60 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
            {saved ? "Salvo!" : saving ? "Salvando..." : "Salvar plano"}
          </button>
        </div>

        {/* Checklist de edição */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-800">Checklist de edição</h3>
            <span className="text-xs font-bold text-rose-600">{done}/{total}</span>
          </div>
          <div className="space-y-2">
            {checklist.map((item, i) => (
              <button key={i} onClick={() => toggleCheck(i)}
                className={cn("w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors",
                  item.done ? "bg-emerald-50" : "bg-gray-50 hover:bg-gray-100")}>
                <div className={cn("w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                  item.done ? "border-emerald-500 bg-emerald-500" : "border-gray-300")}>
                  {item.done && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className={cn("text-xs font-medium", item.done ? "text-emerald-700 line-through" : "text-gray-700")}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Exportar tab ─────────────────────────────────────────────────

function ExportarTab({ project: _project }: { project: DbRecProject }) {
  const exports = [
    { label: "PDF Completo",        desc: "Capa, roteiro, storyboard, shot list, plano de gravação",  icon: FileText },
    { label: "Word Editável",        desc: "Roteiro, cenas, storyboard em tabela, shot list, plano",   icon: FileText },
    { label: "PNG A4 Storyboard",   desc: "Layout A4 horizontal com quadros, descrições e falas",       icon: ImageIcon },
    { label: "PDF Storyboard",      desc: "Apenas quadros, descrições e diálogos",                     icon: Layers },
    { label: "Shot List PDF",       desc: "Lista técnica completa de planos",                           icon: List },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-1">Exportar projeto</h3>
        <p className="text-xs text-gray-400 mb-4">
          Gere documentos técnicos para a equipe de gravação.
        </p>
        <div className="space-y-2">
          {exports.map(({ label, desc, icon: Icon }) => (
            <button
              key={label}
              onClick={() => alert(`Exportação "${label}" será ativada na próxima fase.`)}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 hover:border-rose-200 hover:bg-rose-50/30 transition-all group text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0 group-hover:bg-rose-100 transition-colors">
                <Icon className="w-4 h-4 text-rose-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800">{label}</p>
                <p className="text-[11px] text-gray-400 truncate">{desc}</p>
              </div>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg flex-shrink-0">
                Em breve
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 flex items-center gap-3">
        <Download className="w-5 h-5 text-rose-400 flex-shrink-0" />
        <div>
          <p className="text-xs font-bold text-white">Exportação técnica</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Exportações em PDF, Word e PNG A4 horizontal serão ativadas na próxima fase da RecOS.
          </p>
        </div>
      </div>
    </div>
  );
}
