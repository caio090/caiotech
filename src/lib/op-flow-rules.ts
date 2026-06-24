import type { DbOperationalTask } from "@/lib/supabase/types";

// ── Attachment type ───────────────────────────────────────────

export interface TaskAttachment {
  task_id: string;
  attachment_url: string | null;
  is_final_file: boolean;
  asset_variant?: string | null;
  page_number?: number | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
  storage_path?: string | null;
  upload_source?: string | null;
  notes?: string | null;
}

// ── Required asset spec ───────────────────────────────────────

export interface RequiredAsset {
  variant: string;
  label: string;
  placeholder?: string;
  pageNumber?: number;
}

// ── Asset variant display labels ──────────────────────────────

export const ASSET_VARIANT_LABELS: Record<string, string> = {
  feed:          "Arte de Feed",
  stories:       "Arte de Stories",
  reels:         "Vídeo Reels",
  carousel_page: "Página do Carrossel",
  thumbnail:     "Thumbnail / Capa",
  ads:           "Criativo de Anúncio",
  print:         "Arquivo para Impressão",
  outdoor:       "Arquivo de Outdoor",
  banner:        "Arquivo de Banner",
  other:         "Arquivo da entrega",
  editable_file: "Arquivo Editável",
  raw_file:      "Arquivo Bruto",
};

// ── Format display labels ─────────────────────────────────────

export const FORMAT_LABELS: Record<string, string> = {
  feed:        "Feed",
  story:       "Stories",
  stories:     "Stories",
  reels:       "Reels",
  carousel:    "Carrossel",
  carrossel:   "Carrossel",
  campanha:    "Campanha / Tráfego",
  trafego:     "Tráfego",
  anuncio:     "Anúncio",
  thumbnail:   "Thumbnail",
  outdoor:     "Outdoor",
  banner:      "Banner",
  panfleto:    "Panfleto",
  cartaz:      "Cartaz",
  cardapio:    "Cardápio",
  fachada:     "Fachada",
  placa:       "Placa",
  adesivo:     "Adesivo",
  legenda:     "Legenda",
  roteiro:     "Roteiro",
  whatsapp:    "WhatsApp",
  "feed+stories":           "Feed + Stories",
  "feed+stories+trafego":   "Feed + Stories + Tráfego",
};

// ── Format → required assets ──────────────────────────────────

function buildCarouselAssets(count: number): RequiredAsset[] {
  return Array.from({ length: count }, (_, i) => ({
    variant:     "carousel_page",
    label:       `Página ${i + 1}`,
    placeholder: `Link da página ${i + 1} do carrossel…`,
    pageNumber:  i + 1,
  }));
}

function getAssetsForSingleFormat(fmt: string, task: DbOperationalTask): RequiredAsset[] {
  const brief = task.brief ?? {};
  switch (fmt) {
    case "feed":
      return [{ variant: "feed", label: "Arte de Feed", placeholder: "https://drive.google.com/…" }];
    case "story":
    case "stories":
      return [{ variant: "stories", label: "Arte de Stories", placeholder: "https://drive.google.com/…" }];
    case "reels":
      return [{ variant: "reels", label: "Vídeo Reels", placeholder: "https://drive.google.com/…" }];
    case "carousel":
    case "carrossel": {
      const count =
        task.carousel_pages_count ??
        (brief.carousel_pages_count as number | undefined) ??
        3;
      return buildCarouselAssets(count);
    }
    case "thumbnail":
      return [{ variant: "thumbnail", label: "Thumbnail / Capa", placeholder: "https://drive.google.com/…" }];
    case "campanha":
    case "trafego":
    case "anuncio":
    case "ads":
      return [{ variant: "ads", label: "Criativo de Anúncio", placeholder: "https://drive.google.com/…" }];
    case "outdoor":
      return [{ variant: "outdoor", label: "Arquivo de Outdoor", placeholder: "Link do arquivo final…" }];
    case "banner":
      return [{ variant: "banner", label: "Arquivo de Banner", placeholder: "Link do arquivo final…" }];
    case "panfleto":
    case "cartaz":
    case "cardapio":
    case "fachada":
    case "placa":
    case "adesivo":
    case "impresso":
      return [{ variant: "print", label: "Arquivo para Impressão", placeholder: "Link do arquivo final…" }];
    case "legenda":
    case "roteiro":
    case "whatsapp":
      return [];
    // Legacy composite strings
    case "feed+stories":
      return [
        { variant: "feed",    label: "Arte de Feed",    placeholder: "https://drive.google.com/…" },
        { variant: "stories", label: "Arte de Stories", placeholder: "https://drive.google.com/…" },
      ];
    case "feed+stories+trafego":
    case "feed+stories+ads":
    case "feed_stories":
      return [
        { variant: "feed",    label: "Arte de Feed",        placeholder: "https://drive.google.com/…" },
        { variant: "stories", label: "Arte de Stories",     placeholder: "https://drive.google.com/…" },
        { variant: "ads",     label: "Criativo de Anúncio", placeholder: "https://drive.google.com/…" },
      ];
    default:
      if (!fmt) return [];
      return [{ variant: "other", label: "Arquivo da entrega", placeholder: "https://drive.google.com/…" }];
  }
}

export function getRequiredAssetsForTask(task: DbOperationalTask): RequiredAsset[] {
  const brief = task.brief ?? {};

  // Hybrid format: read from brief.formats (array) — takes priority
  const hybridFormats = brief.formats as string[] | undefined;
  if (hybridFormats && hybridFormats.length > 0) {
    const assets: RequiredAsset[] = [];
    const seen = new Set<string>();
    for (const fmt of hybridFormats) {
      for (const asset of getAssetsForSingleFormat(fmt.toLowerCase().trim(), task)) {
        const key = asset.pageNumber != null ? `${asset.variant}_${asset.pageNumber}` : asset.variant;
        if (!seen.has(key)) {
          seen.add(key);
          assets.push(asset);
        }
      }
    }
    return assets;
  }

  // Fall back to task.format string
  const fmt = (task.format ?? "").toLowerCase().trim();
  return getAssetsForSingleFormat(fmt, task);
}

// ── Check helpers ─────────────────────────────────────────────

function isAssetSatisfied(req: RequiredAsset, taskAttachments: TaskAttachment[]): boolean {
  return taskAttachments.some((a) => {
    if (!a.attachment_url) return false;
    // Legacy attachment (no asset_variant) counts for any single-variant requirement
    if (!a.asset_variant) return true;
    // Carousel page: both variant and page number must match
    if (req.pageNumber != null) {
      return a.asset_variant === req.variant && a.page_number === req.pageNumber;
    }
    return a.asset_variant === req.variant;
  });
}

export function hasRequiredAttachments(
  task: DbOperationalTask,
  attachments: TaskAttachment[],
): boolean {
  const taskAttachments = attachments.filter((a) => a.task_id === task.id && a.is_final_file);
  const required = getRequiredAssetsForTask(task);
  if (required.length === 0) return true;
  if (taskAttachments.length === 0) return false;
  return required.every((req) => isAssetSatisfied(req, taskAttachments));
}

export function getMissingRequiredAssets(
  task: DbOperationalTask,
  attachments: TaskAttachment[],
): RequiredAsset[] {
  const taskAttachments = attachments.filter((a) => a.task_id === task.id && a.is_final_file);
  return getRequiredAssetsForTask(task).filter(
    (req) => !isAssetSatisfied(req, taskAttachments),
  );
}

export function getBlockingMessage(task: DbOperationalTask, attachments: TaskAttachment[]): string {
  const missing = getMissingRequiredAssets(task, attachments);
  if (missing.length === 0) return "";

  const fmt = (task.format ?? "").toLowerCase().trim();

  if (fmt === "feed")                            return "Anexe a arte de Feed antes de enviar para revisão.";
  if (fmt === "story" || fmt === "stories")      return "Anexe o arquivo de Stories antes de enviar para revisão.";
  if (fmt === "reels")                           return "Anexe o vídeo Reels antes de enviar para revisão.";
  if (fmt === "carousel" || fmt === "carrossel") return `Anexe todas as páginas do carrossel antes de enviar para revisão. Faltando: ${missing.map((r) => r.label).join(", ")}.`;
  if (fmt === "campanha" || fmt === "trafego")   return "Anexe o criativo de anúncio antes de enviar para revisão.";
  if (fmt === "outdoor")                         return "Anexe o arquivo final do outdoor antes de enviar para revisão.";
  if (fmt === "banner")                          return "Anexe o arquivo final do banner antes de enviar para revisão.";
  if (fmt === "feed+stories")                    return "Anexe as versões de Feed e Stories antes de enviar para revisão.";
  if (missing.length === 1)                      return `Antes de enviar para revisão, anexe: ${missing[0].label}.`;
  return `Faltam ${missing.length} arquivos obrigatórios: ${missing.map((r) => r.label).join(", ")}.`;
}

// ── Legacy helper (backward compat) ──────────────────────────

export function hasDeliveryAttachment(taskId: string, attachments: TaskAttachment[]): boolean {
  return attachments.some((a) => a.task_id === taskId && !!a.attachment_url && a.is_final_file);
}

// ── Guard functions ───────────────────────────────────────────

export function canSendToReview(
  task: DbOperationalTask,
  attachments: TaskAttachment[],
): { ok: boolean; reason?: string } {
  if (task.status !== "em_producao" && task.status !== "ajuste") {
    return { ok: false, reason: "A tarefa precisa estar em produção para ir à revisão." };
  }
  if (!hasRequiredAttachments(task, attachments)) {
    return { ok: false, reason: getBlockingMessage(task, attachments) };
  }
  return { ok: true };
}

export function canCompleteTask(
  task: DbOperationalTask,
  isAdmin: boolean,
): { ok: boolean; reason?: string } {
  if (isAdmin) return { ok: true };
  if (!["aprovado", "agendado"].includes(task.status)) {
    return { ok: false, reason: "A tarefa precisa ser aprovada internamente antes de ser concluída." };
  }
  return { ok: true };
}

// ── Role-specific attachment fields (fallback) ────────────────

export interface AttachmentField {
  key: string;
  label: string;
  placeholder: string;
  required?: boolean;
}

const ROLE_ATTACHMENT_FIELDS: Record<string, AttachmentField[]> = {
  designer: [
    { key: "url",          label: "Link da arte final",         placeholder: "https://drive.google.com/…", required: true },
    { key: "url_editavel", label: "Link do arquivo editável",   placeholder: "Link do Figma, PSD, AI…" },
  ],
  videomaker: [
    { key: "url",          label: "Link da captação",           placeholder: "https://drive.google.com/…", required: true },
    { key: "url_roteiro",  label: "Link do roteiro/storyboard", placeholder: "Link do documento…" },
  ],
  editor: [
    { key: "url",          label: "Link do vídeo final",        placeholder: "https://drive.google.com/…", required: true },
    { key: "url_thumb",    label: "Link da thumbnail",          placeholder: "Link da imagem…" },
  ],
  social_media: [
    { key: "url",           label: "Link ou print da publicação", placeholder: "https://instagram.com/p/…", required: true },
    { key: "legenda_final", label: "Legenda final utilizada",     placeholder: "Texto exato publicado…" },
  ],
  gestor_trafego: [
    { key: "url",            label: "Link/print da campanha",  placeholder: "https://business.facebook.com/…", required: true },
    { key: "status_anuncio", label: "Status do anúncio",       placeholder: "Ex: campanha ativa, pausada, veiculando…" },
  ],
};

const DEFAULT_ATTACHMENT_FIELDS: AttachmentField[] = [
  { key: "url", label: "Link do arquivo ou pasta", placeholder: "https://drive.google.com/…", required: true },
];

export function getAttachmentFields(role: string): AttachmentField[] {
  return ROLE_ATTACHMENT_FIELDS[role] ?? DEFAULT_ATTACHMENT_FIELDS;
}

// ── Next action resolver ──────────────────────────────────────

export interface NextAction {
  label: string;
  description: string;
  next?: string;
  blocked?: boolean;
  needsAttachment?: boolean;
}

export function getNextOperationalAction(
  task: DbOperationalTask,
  attachments: TaskAttachment[],
): NextAction {
  switch (task.status) {
    case "backlog":
      return { label: "Iniciar briefing", description: "Mova esta tarefa para o briefing para começar.", next: "briefing" };
    case "briefing":
      return { label: "Li e entendi o briefing", description: "Leia o briefing e confirme entendimento para iniciar a produção.", next: "em_producao" };
    case "em_producao": {
      if (!hasRequiredAttachments(task, attachments)) {
        return {
          label:           "Anexar entrega",
          description:     getBlockingMessage(task, attachments) || "Anexe a entrega para poder enviar à revisão interna.",
          needsAttachment: true,
        };
      }
      return { label: "Enviar para revisão", description: "Entrega anexada. Envie para revisão interna.", next: "revisao_interna" };
    }
    case "revisao_interna":
      return { label: "Aguardando revisão", description: "Aguarde a avaliação da revisão interna.", blocked: true };
    case "ajuste": {
      if (!hasRequiredAttachments(task, attachments)) {
        return {
          label:           "Corrigir e anexar",
          description:     "Corrija os ajustes e anexe a nova entrega antes de reenviar.",
          needsAttachment: true,
        };
      }
      return { label: "Reenviar para revisão", description: "Ajuste concluído e entrega anexada. Reenvie para revisão interna.", next: "revisao_interna" };
    }
    case "aguardando_cliente":
      return { label: "Aguardando cliente", description: "Aguardando aprovação ou feedback do cliente.", blocked: true };
    case "aprovado":
    case "agendado":
      return { label: "Marcar como concluído", description: "Entrega aprovada internamente. Conclua a demanda.", next: "concluido" };
    default:
      return { label: "Finalizado", description: "Esta demanda foi concluída.", blocked: true };
  }
}
