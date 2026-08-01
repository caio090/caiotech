/**
 * Sprint REC OS 3.0.1 — fluxo criativo canônico. Este módulo REORGANIZA o
 * que já existe (status reais de `content_items`, já mapeados em
 * `src/lib/supabase/types.ts::dbStatusToUi` e `src/lib/rec-os-hub.ts`) —
 * não cria um segundo sistema de status. Nenhum valor persistido é
 * alterado; apenas o agrupamento visual em 4 macroetapas.
 */

// ── Macroetapas (Fase 3) ─────────────────────────────────────────────────────

export type RecOsMacroStage = "radar" | "criar" | "produzir" | "finalizar";

export interface RecOsWorkflowDefinition {
  id: RecOsMacroStage;
  label: string;
  description: string;
  order: number;
  sections: string[];
  supportedStatuses: string[];
  nextStage: RecOsMacroStage | "agendar_publicar" | null;
  previousStage: RecOsMacroStage | null;
  requiredCapabilities: string[];
  availability: "available" | "planned";
}

export const REC_OS_WORKFLOW_STAGES: RecOsWorkflowDefinition[] = [
  {
    id: "radar", label: "Radar", order: 1,
    description: "Origens e oportunidades ainda não convertidas em conteúdo.",
    sections: ["Radar"],
    supportedStatuses: [],
    nextStage: "criar", previousStage: null,
    requiredCapabilities: ["content.view"],
    availability: "available",
  },
  {
    id: "criar", label: "Criar", order: 2,
    description: "Ideia, Briefing & Conceito, Aplicação & Formato.",
    sections: ["Ideia & Briefing", "Aplicação & Formato"],
    supportedStatuses: ["ideia", "briefing", "roteiro"],
    nextStage: "produzir", previousStage: "radar",
    requiredCapabilities: ["content.create"],
    availability: "available",
  },
  {
    id: "produzir", label: "Produzir", order: 3,
    description: "Tarefas de produção adaptadas ao formato do conteúdo.",
    sections: ["Produção"],
    supportedStatuses: ["producao", "em_producao", "edicao"],
    nextStage: "finalizar", previousStage: "criar",
    requiredCapabilities: ["content.create"],
    availability: "available",
  },
  {
    id: "finalizar", label: "Finalizar", order: 4,
    description: "Revisão & Aprovação, Destino & Especificações, Visual Final — nesta ordem.",
    sections: ["Revisão & Aprovação", "Destino & Especificações", "Visual Final"],
    supportedStatuses: ["revisao_interna", "enviado_aprovacao", "alteracao_solicitada", "aprovado", "reprovado", "pronto_para_agendar"],
    nextStage: "agendar_publicar", previousStage: "produzir",
    requiredCapabilities: ["content.create"],
    availability: "available",
  },
];

export function findWorkflowStage(id: RecOsMacroStage): RecOsWorkflowDefinition | undefined {
  return REC_OS_WORKFLOW_STAGES.find((s) => s.id === id);
}

// ── Status canônicos e mapeamento para macroetapa (Fase 4) ──────────────────
// Preserva exatamente os valores reais persistidos — nenhum renomeado.

export const REC_OS_CANONICAL_STATUSES = [
  "ideia", "briefing", "roteiro", "producao", "edicao", "revisao_interna",
  "enviado_aprovacao", "alteracao_solicitada", "aprovado", "pronto_para_agendar",
  "agendado", "publicado", "reprovado",
] as const;

export type RecOsCanonicalStatus = (typeof REC_OS_CANONICAL_STATUSES)[number];

/** Aliases legados preservados — nunca removidos, apenas roteados para o mesmo agrupamento. */
export const REC_OS_STATUS_ALIASES: Record<string, RecOsCanonicalStatus> = {
  em_producao: "producao",
  ajuste: "alteracao_solicitada",
};

const STATUS_TO_STAGE: Record<RecOsCanonicalStatus, RecOsMacroStage | "agendar_publicar"> = {
  ideia: "criar", briefing: "criar", roteiro: "criar",
  producao: "produzir", edicao: "produzir",
  revisao_interna: "finalizar", enviado_aprovacao: "finalizar",
  alteracao_solicitada: "finalizar", aprovado: "finalizar",
  reprovado: "finalizar", pronto_para_agendar: "finalizar",
  agendado: "agendar_publicar", publicado: "agendar_publicar",
};

/** Resolve um status real (incluindo aliases legados) para sua macroetapa visual. Nunca altera o valor persistido. */
export function resolveMacroStage(status: string): RecOsMacroStage | "agendar_publicar" | null {
  const canonical = (REC_OS_STATUS_ALIASES[status] ?? status) as RecOsCanonicalStatus;
  return STATUS_TO_STAGE[canonical] ?? null;
}

// ── Radar → Criar (Fase 5) ───────────────────────────────────────────────────

export type ContentSeedSourceType =
  | "tendencia" | "data_sazonal" | "concorrencia" | "produto" | "estoque"
  | "campanha" | "diagnostico" | "solicitacao" | "resultado_anterior" | "ideia_manual";

export interface CreateContentSeed {
  id: string;
  workspaceId: string;
  clientId: string;
  campaignId: string | null;
  sourceType: ContentSeedSourceType;
  sourceId: string | null;
  title: string;
  summary: string;
  evidence: string;
  opportunity: string;
  objective: string;
  audience: string;
  productId: string | null;
  suggestedFormat: string | null;
  suggestedChannel: string | null;
  createdAt: string;
}

// ── Aplicação & Formato (Fase 9) ─────────────────────────────────────────────

export type ContentPurpose =
  | "vender" | "informar" | "educar" | "posicionar" | "captar_lead"
  | "lancar" | "reativar" | "aumentar_ticket" | "divulgar_evento" | "comunicacao_interna";

export const CONTENT_PURPOSE_LABEL: Record<ContentPurpose, string> = {
  vender: "Vender", informar: "Informar", educar: "Educar", posicionar: "Posicionar",
  captar_lead: "Captar lead", lancar: "Lançar", reativar: "Reativar",
  aumentar_ticket: "Aumentar ticket", divulgar_evento: "Divulgar evento",
  comunicacao_interna: "Comunicação interna",
};

export type ContentFormat =
  | "arte_estatica" | "carrossel" | "story" | "reel" | "video" | "anuncio"
  | "banner" | "outdoor" | "telao" | "impresso" | "email" | "mensagem" | "apresentacao";

export const CONTENT_FORMAT_LABEL: Record<ContentFormat, string> = {
  arte_estatica: "Arte estática", carrossel: "Carrossel", story: "Story", reel: "Reel",
  video: "Vídeo", anuncio: "Anúncio", banner: "Banner", outdoor: "Outdoor", telao: "Telão",
  impresso: "Impresso", email: "E-mail", mensagem: "Mensagem", apresentacao: "Apresentação",
};

// ── Roteiro condicional (Fase 10) ────────────────────────────────────────────

const FORMATS_REQUIRING_SCRIPT = new Set<ContentFormat>(["video", "reel", "anuncio", "apresentacao"]);

/**
 * Roteiro aparece para vídeo/Reel/anúncio em vídeo/apresentação narrada —
 * nunca obrigatório para arte estática/banner/outdoor/telão/impresso.
 * Carrossel usa estrutura de páginas + copy, não "roteiro" (Fase 10).
 */
export function contentFormatRequiresScript(format: ContentFormat | string | null | undefined): boolean {
  if (!format) return false;
  return FORMATS_REQUIRING_SCRIPT.has(format as ContentFormat);
}

export function contentFormatUsesPageStructure(format: ContentFormat | string | null | undefined): boolean {
  return format === "carrossel";
}

// ── Handoff para o EditorOS (Fase 16) ────────────────────────────────────────

export interface EditorAssetHandoff {
  workspaceId: string;
  clientId: string;
  contentId: string;
  campaignId: string | null;
  assetId: string | null;
  assetSource: "upload" | "arsenal" | "fotografia" | "template" | "geracao_ia" | "editor_os";
  fileUrl: string | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  format: ContentFormat | null;
  destination: string | null;
  briefingId: string | null;
  conceptId: string | null;
  copy: string | null;
  restrictions: string[];
  returnRoute: string;
  createdAt: string;
}

/** O handoff exige um ativo real (upload, Arsenal ou rascunho do EditorOS) — nunca abre o canvas vazio. */
export function isEditorAssetHandoffReady(handoff: Pick<EditorAssetHandoff, "assetId" | "fileUrl">): boolean {
  return Boolean(handoff.assetId || handoff.fileUrl);
}

// ── Mídia & Tráfego (Fase 22) ────────────────────────────────────────────────

export interface PaidMediaBrief {
  workspaceId: string;
  campaignId: string;
  contentIds: string[];
  objective: string;
  audience: string;
  channel: string;
  budget: number | null;
  period: string | null;
  destinationUrl: string | null;
  tracking: string | null;
  creativeRequirements: string;
  restrictions: string[];
  expectedResult: string;
  status: "draft" | "ready" | "handed_off";
}

// ── Calendário contextual (Fase 23) ──────────────────────────────────────────

export interface CalendarNavigationContext {
  workspaceId: string;
  clientId: string | null;
  campaignId: string | null;
  contentId: string | null;
  month: string | null;
  filters: Record<string, string>;
  returnRoute: string;
}

export function buildCalendarNavigationUrl(base: string, context: CalendarNavigationContext): string {
  const params = new URLSearchParams();
  if (context.clientId) params.set("client", context.clientId);
  if (context.campaignId) params.set("campaign", context.campaignId);
  if (context.contentId) params.set("content_id", context.contentId);
  if (context.month) params.set("month", context.month);
  for (const [key, value] of Object.entries(context.filters)) params.set(key, value);
  params.set("return_to", context.returnRoute);
  return `${base}?${params.toString()}`;
}

// ── Scanner de camadas (Fase 18) ─────────────────────────────────────────────

export type ScannerAvailability = "unavailable" | "experimental" | "compatible" | "blocked" | "ready_for_controlled_merge";

export const EDITOR_OS_LAYER_SCANNER_STATUS: { availability: ScannerAvailability; label: string; reason: string } = {
  availability: "experimental",
  label: "Experimental",
  reason: "Branch feat/editor-os-layer-scanner-v1 auditada nesta sprint (ver docs/editor-os/layer-scanner-integration-audit.md) — nunca mergeada, nunca integrada ao EditorOS real. Nenhuma simulação de camadas ou OCR é executada na interface atual.",
};
