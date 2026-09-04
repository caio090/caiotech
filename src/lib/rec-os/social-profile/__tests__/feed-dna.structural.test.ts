/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/rec-os/social-profile/__tests__/feed-dna.structural.test.ts
 * Prompt 13 (REC OS Core Experience) — resolveFeedDnaProfile/saveManualFeedDna
 * com um fake Supabase client (nunca rede/DB real).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveFeedDnaProfile, saveManualFeedDna } from "../feed-dna";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

function fakeSelectDb(row: unknown, error: { code?: string } | null = null) {
  const builder = {
    select: (_c: string) => builder,
    eq: (_c: string, _v: unknown) => builder,
    maybeSingle: async () => ({ data: row, error }),
  };
  return { from: (_t: string) => builder } as unknown as SupabaseClient;
}

function fakeUpsertDb(error: { code?: string } | null = null, savedRow?: Record<string, unknown>) {
  const calls: unknown[] = [];
  const builder = {
    upsert: (payload: unknown, _opts: unknown) => {
      calls.push(payload);
      return {
        select: (_cols: string) => ({
          single: async () => ({
            data: error ? null : (savedRow ?? { ...(payload as Record<string, unknown>), id: "fdna-1", created_at: "2026-01-01T00:00:00Z" }),
            error,
          }),
        }),
      };
    },
  };
  return { db: { from: (_t: string) => builder } as unknown as SupabaseClient, calls };
}

async function main() {
  console.log("[test] companyId null -- nunca resolve, nunca consulta DB");
  {
    const db = fakeSelectDb(null);
    const result = await resolveFeedDnaProfile(db, null);
    assert(result === null, "null explícito");
  }

  console.log("[test] tabela não existe (42P01) -- not_configured, nunca lança, nunca finge dado");
  {
    const db = fakeSelectDb(null, { code: "42P01" });
    const result = await resolveFeedDnaProfile(db, "company-1");
    assert(result?.status === "not_configured", "status not_configured quando a tabela ainda não existe");
  }

  console.log("[test] tabela existe, sem linha -- unset (nunca not_configured)");
  {
    const db = fakeSelectDb(null, null);
    const result = await resolveFeedDnaProfile(db, "company-1");
    assert(result?.status === "unset", "status unset quando a Company não tem Feed DNA definido ainda");
  }

  console.log("[test] linha existente -- projeta pro contrato canônico camelCase");
  {
    const row = {
      id: "fdna-1", client_id: "company-1", social_profile_id: "sp-1", pattern_type: "ALTERNATING",
      pattern_config: { notes: "foto/arte" }, dominant_palette: ["#111"], secondary_palette: [],
      photo_ratio: 0.5, graphic_ratio: 0.5, text_density: "media", logo_behavior: "discreto",
      background_behavior: "clean", composition_rhythm: "alternado", campaign_rhythm: null,
      content_mix: null, confidence: 0.82, source: "ai_suggested", user_override: false,
      last_analysis_at: "2026-01-01T00:00:00Z", updated_by: null, updated_at: "2026-01-01T00:00:00Z",
    };
    const db = fakeSelectDb(row, null);
    const result = await resolveFeedDnaProfile(db, "company-1");
    assert(result?.status === "resolved", "status resolved");
    if (result?.status === "resolved") {
      assert(result.profile.patternType === "ALTERNATING", "patternType preservado");
      assert(result.profile.userOverride === false, "userOverride refletido, aqui vindo de sugestão de IA");
      assert(result.profile.confidence === 0.82, "confidence carregada (Fase 42: baixa confiança nunca vira fato)");
    }
  }

  console.log("[test] saveManualFeedDna -- sempre source:manual e user_override:true, nunca escrito pela IA");
  {
    const { db, calls } = fakeUpsertDb(null);
    const result = await saveManualFeedDna(db, { companyId: "company-1", patternType: "CHECKERBOARD", updatedBy: "user-1" });
    assert(result.ok === true, "save bem-sucedido");
    const payload = calls[0] as Record<string, unknown>;
    assert(payload.source === "manual", "source sempre manual neste caminho");
    assert(payload.user_override === true, "user_override sempre true neste caminho -- manual > IA (Fase 32)");
    assert(payload.confidence === null, "confidence nula em override manual -- não é uma inferência");
  }

  console.log("[test] saveManualFeedDna -- secondaryPalette/compositionRhythm persistidos, e o profile salvo é devolvido pra UI (Prompt 16, refresh-proof sem round-trip extra)");
  {
    const { db, calls } = fakeUpsertDb(null);
    const result = await saveManualFeedDna(db, {
      companyId: "company-1", patternType: "COLUMN_RHYTHM", updatedBy: "user-1",
      dominantPalette: ["#111", "#222"], secondaryPalette: ["#eee"], compositionRhythm: "3 colunas fixas",
    });
    assert(result.ok === true, "save bem-sucedido");
    const payload = calls[0] as Record<string, unknown>;
    assert(JSON.stringify(payload.secondary_palette) === JSON.stringify(["#eee"]), "secondary_palette gravado");
    assert(payload.composition_rhythm === "3 colunas fixas", "composition_rhythm gravado");
    if (result.ok) {
      assert(result.profile.patternType === "COLUMN_RHYTHM", "profile devolvido reflete o patternType salvo, sem precisar de um segundo fetch");
    }
  }

  console.log("[test] saveManualFeedDna -- tabela ausente devolve erro específico, nunca genérico/silencioso");
  {
    const { db } = fakeUpsertDb({ code: "42P01" });
    const result = await saveManualFeedDna(db, { companyId: "company-1", patternType: "FREE", updatedBy: "user-1" });
    assert(result.ok === false, "falha explícita");
    if (!result.ok) assert(result.code === "FEED_DNA_STORAGE_NOT_CONFIGURED", "código específico -- nunca um erro genérico de banco");
  }

  console.log(`\n[result] ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
