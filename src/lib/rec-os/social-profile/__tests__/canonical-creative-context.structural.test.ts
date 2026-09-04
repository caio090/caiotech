/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/rec-os/social-profile/__tests__/canonical-creative-context.structural.test.ts
 * Prompt 13 (REC OS Core Experience) — resolveCanonicalCreativeContext.
 *
 * Cobertura desta sprint: caminho Free Creation Mode (companyId null),
 * que não toca o DB em nenhum dos três resolvers compostos (confirmado
 * lendo buildStudioCreativeBusinessContext/resolveSocialProfileContext/
 * resolveFeedDnaProfile -- todos retornam cedo com companyId null). O
 * caminho com Company real já é coberto individualmente pelos testes de
 * cada resolver (resolve.structural.test.ts, feed-dna.structural.test.ts)
 * e pela suite existente de create-studio-visual -- uma integração
 * completa com fake DB triplo não foi construída nesta sprint (escopo).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveCanonicalCreativeContext } from "../canonical-creative-context";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

async function main() {
  console.log("[test] Free Creation Mode (companyId null) -- composição inteira degrada com segurança, nunca toca o DB");
  {
    const neverCalledDb = {
      from() { throw new Error("nunca deveria consultar o DB em Free Creation Mode"); },
    } as unknown as SupabaseClient;

    const ctx = await resolveCanonicalCreativeContext(neverCalledDb, null, null);
    assert(ctx.companyId === null, "companyId null preservado");
    assert(ctx.companyDna.company === null, "companyDna.company null em Free Mode");
    assert(ctx.socialProfile === null, "socialProfile null em Free Mode (nunca contexto social sem Company)");
    assert(ctx.feedDna === null, "feedDna null em Free Mode");
    assert(ctx.strategicDna === null, "strategicDna explicitamente null -- débito documentado, nunca inventado");
    assert(ctx.campaign === null, "campaign explicitamente null -- não existe entidade canônica de Campaign nesta base (Fase 59)");
    assert(Array.isArray(ctx.recentPosts) && ctx.recentPosts.length === 0, "recentPosts vazio, nunca dado fabricado");
    assert(Array.isArray(ctx.plannedPosts) && ctx.plannedPosts.length === 0, "plannedPosts vazio, nunca dado fabricado");
    assert(ctx.slot === null, "slot null -- nenhuma sugestão de próximo slot sem Feed DNA/histórico reais");
  }

  console.log(`\n[result] ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
