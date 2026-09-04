/**
 * Prompt 13 (REC OS Core Experience) — Fase 11/12/32/42/43/44: Feed DNA.
 *
 * Feed DNA NÃO substitui Company DNA (onboarding_profiles, "quem é a
 * empresa") nem Creative DNA (subconjunto de onboarding_profiles usado
 * por buildStudioCreativeBusinessContext, "como a marca se expressa
 * visualmente") -- representa como um perfil social específico organiza
 * sua expressão AO LONGO DO TEMPO (ritmo, padrão, densidade).
 *
 * REGRA CANÔNICA (Fase 12/32): MANUAL OVERRIDE > AI SUGGESTION, sempre.
 * Uma sugestão automática nunca sobrescreve silenciosamente um padrão
 * definido manualmente -- `userOverride: true` é permanente até o
 * próprio usuário mudar.
 *
 * PERSISTÊNCIA (Fase 59): a auditoria confirmou que não existe hoje
 * nenhuma tabela para Feed DNA -- este repositório não tem
 * `supabase/migrations/`, migrations são SQL manual revisado por humano
 * (docs/checklists/manual-supabase-v1.md). A migration real está
 * desenhada em docs/supabase/92-feed-dna-and-creative-series.sql, mas
 * NÃO foi executada nesta sprint (fora do escopo seguro de automação --
 * ver AÇÕES MANUAIS/WEB no relatório final). Por isso este resolver
 * nunca inventa dado: se a tabela ainda não existe (`42P01`), devolve
 * `status: "not_configured"` explicitamente -- nunca lança, nunca finge
 * um Feed DNA vazio como se fosse "sem padrão definido".
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type FeedDnaPatternType =
  | "FREE" | "ALTERNATING" | "CHECKERBOARD" | "COLUMN_RHYTHM"
  | "ROW_BLOCKS" | "COLOR_SEQUENCE" | "CAMPAIGN_BLOCKS" | "CUSTOM";

export type FeedDnaSource = "manual" | "ai_suggested";

export interface FeedDnaProfile {
  id: string;
  companyId: string;
  socialProfileId: string | null;
  patternType: FeedDnaPatternType;
  patternConfig: Record<string, unknown> | null;
  dominantPalette: string[];
  secondaryPalette: string[];
  photoRatio: number | null;
  graphicRatio: number | null;
  textDensity: string | null;
  logoBehavior: string | null;
  backgroundBehavior: string | null;
  compositionRhythm: string | null;
  campaignRhythm: string | null;
  contentMix: Record<string, unknown> | null;
  confidence: number | null;
  source: FeedDnaSource;
  userOverride: boolean;
  lastAnalysisAt: string | null;
  updatedBy: string | null;
  updatedAt: string;
}

export type ResolveFeedDnaResult =
  | { status: "not_configured"; companyId: string }
  | { status: "unset"; companyId: string }
  | { status: "resolved"; profile: FeedDnaProfile };

interface FeedDnaRow {
  id: string;
  client_id: string;
  social_profile_id: string | null;
  pattern_type: FeedDnaPatternType;
  pattern_config: Record<string, unknown> | null;
  dominant_palette: string[] | null;
  secondary_palette: string[] | null;
  photo_ratio: number | null;
  graphic_ratio: number | null;
  text_density: string | null;
  logo_behavior: string | null;
  background_behavior: string | null;
  composition_rhythm: string | null;
  campaign_rhythm: string | null;
  content_mix: Record<string, unknown> | null;
  confidence: number | null;
  source: FeedDnaSource;
  user_override: boolean;
  last_analysis_at: string | null;
  updated_by: string | null;
  updated_at: string;
}

function rowToProfile(row: FeedDnaRow): FeedDnaProfile {
  return {
    id: row.id, companyId: row.client_id, socialProfileId: row.social_profile_id,
    patternType: row.pattern_type, patternConfig: row.pattern_config,
    dominantPalette: row.dominant_palette ?? [], secondaryPalette: row.secondary_palette ?? [],
    photoRatio: row.photo_ratio, graphicRatio: row.graphic_ratio, textDensity: row.text_density,
    logoBehavior: row.logo_behavior, backgroundBehavior: row.background_behavior,
    compositionRhythm: row.composition_rhythm, campaignRhythm: row.campaign_rhythm,
    contentMix: row.content_mix, confidence: row.confidence, source: row.source,
    userOverride: row.user_override, lastAnalysisAt: row.last_analysis_at,
    updatedBy: row.updated_by, updatedAt: row.updated_at,
  };
}

const TABLE_MISSING_CODE = "42P01";

/** Nunca lança. `not_configured` = tabela ainda não existe (pendente de migration manual). `unset` = tabela existe, mas ninguém definiu Feed DNA pra esta Company ainda. */
export async function resolveFeedDnaProfile(db: SupabaseClient, companyId: string | null): Promise<ResolveFeedDnaResult | null> {
  if (!companyId) return null;
  try {
    const { data, error } = await db
      .from("feed_dna_profiles")
      .select("*")
      .eq("client_id", companyId)
      .maybeSingle();

    if (error) {
      if (error.code === TABLE_MISSING_CODE) return { status: "not_configured", companyId };
      return { status: "unset", companyId };
    }
    if (!data) return { status: "unset", companyId };
    return { status: "resolved", profile: rowToProfile(data as FeedDnaRow) };
  } catch {
    return { status: "not_configured", companyId };
  }
}

export interface SaveManualFeedDnaInput {
  companyId: string;
  patternType: FeedDnaPatternType;
  notes?: string;
  dominantPalette?: string[];
  updatedBy: string;
}

export type SaveFeedDnaResult = { ok: true } | { ok: false; error: string; code: "FEED_DNA_STORAGE_NOT_CONFIGURED" | "FEED_DNA_SAVE_FAILED" };

/**
 * Grava override manual (Fase 43: social manager pode editar sem IA).
 * `source` é SEMPRE "manual" aqui -- este caminho nunca é chamado pela
 * sugestão automática (Fase 12: sugestão nunca oficializa sozinha).
 */
export async function saveManualFeedDna(db: SupabaseClient, input: SaveManualFeedDnaInput): Promise<SaveFeedDnaResult> {
  try {
    const { error } = await db.from("feed_dna_profiles").upsert(
      {
        client_id: input.companyId,
        pattern_type: input.patternType,
        pattern_config: input.notes ? { notes: input.notes } : null,
        dominant_palette: input.dominantPalette ?? [],
        source: "manual",
        user_override: true,
        confidence: null,
        updated_by: input.updatedBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id" },
    );
    if (error) {
      if (error.code === TABLE_MISSING_CODE) {
        return { ok: false, code: "FEED_DNA_STORAGE_NOT_CONFIGURED", error: "O armazenamento de Feed DNA ainda não foi configurado neste ambiente. Peça a um admin para executar a migration pendente." };
      }
      return { ok: false, code: "FEED_DNA_SAVE_FAILED", error: "Não foi possível salvar o Feed DNA agora." };
    }
    return { ok: true };
  } catch {
    return { ok: false, code: "FEED_DNA_SAVE_FAILED", error: "Não foi possível salvar o Feed DNA agora." };
  }
}
