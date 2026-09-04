/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/rec-os/studio/__tests__/visual-quality.structural.test.ts
 * Prompt 20 (Studio Visual Quality & Series Hydration Repair) — testes
 * de qualidade visual estrutural (Fase 46: "não medir beleza com teste
 * unitário, mas validar hierarquia/margem/overflow/colagem/texto/
 * logo/aspect ratio/separação peça-feed"). Cobre TEST 01/02/03/05 do
 * Part L.
 */
import fs from "node:fs";
import path from "node:path";
import { buildVidigalSystemInstructions } from "../skills/vidigal-png/instructions";
import { applyCompositionGuidance } from "../image/composition-guidance";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

const root = path.resolve(import.meta.dirname, "../../../../..");

async function main() {
  console.log("[test] [TEST 01] instructions.ts -- regra anti-colagem presente, prioridade igual à Regra Zero, cobre peça única E item de série");
  {
    const instructions = buildVidigalSystemInstructions([]);
    assert(/ANTI-COLAGEM/i.test(instructions), "regra anti-colagem nomeada explicitamente");
    assert(/UMA única composição visual coesa/i.test(instructions), "exige composição única/coesa");
    assert(/colagem, grid interno, contact sheet, moodboard, storyboard/i.test(instructions), "proíbe colagem/grid/contact sheet/moodboard/storyboard explicitamente");
    assert(/mosaico de várias fotos/i.test(instructions), "proíbe mosaico de várias fotos (o incidente real: 6 fotos numa peça só)");
    assert(/split-screen/i.test(instructions), "proíbe split-screen explicitamente");
  }

  console.log("[test] [TEST 02] instructions.ts -- Série/Feed NUNCA autorizam colagem; nunca instrui 'crie seis posts'/'monte um grid' numa peça individual");
  {
    const instructions = buildVidigalSystemInstructions([]);
    assert(/mesmo quando o contexto for uma Série ou um Feed/i.test(instructions), "deixa explícito que Série/Feed descrevem o CONJUNTO, nunca como desenhar uma peça");
    assert(/nunca escreva instruções como 'crie seis posts', 'monte um grid', 'feed com N peças'/i.test(instructions), "proíbe explicitamente as frases-gatilho do incidente real");
  }

  console.log("[test] [FASE 12] exceção explícita de colagem só quando o USER BRIEF pedir de verdade");
  {
    const instructions = buildVidigalSystemInstructions([]);
    assert(/ÚNICA exceção: se o USER BRIEF pedir explicitamente colagem, mosaico, split screen, antes\/depois, comparativo/i.test(instructions), "exceção existe, mas é explícita e restrita ao pedido do usuário");
  }

  console.log("[test] [TEST 05] composition-guidance -- headlineZone reserva negative space real na cena, ANTES do Background Guard");
  {
    const top = applyCompositionGuidance("cenário de café", "TOP");
    const bottom = applyCompositionGuidance("cenário de café", "BOTTOM");
    assert(top.startsWith("cenário de café"), "prompt original preservado no início");
    assert(/negative space in the top area/i.test(top), "TOP reserva espaço no topo");
    assert(/negative space in the bottom area/i.test(bottom), "BOTTOM reserva espaço embaixo");
    assert(top !== bottom, "zonas diferentes produzem instruções REALMENTE diferentes, nunca o mesmo texto");
    assert(/keep the main subject\/product away/i.test(top), "instrui manter o assunto principal longe da zona reservada pro texto (Fase 20)");
  }

  console.log("[test] [TEST 03] FeedPreview NUNCA chama o provider de imagem -- é só UI, organiza assets existentes");
  {
    const feedPreviewSource = fs.readFileSync(path.join(root, "src/components/rec-os/feed-preview.tsx"), "utf8");
    const feedPreviewGridSource = fs.readFileSync(path.join(root, "src/components/rec-os/feed-preview-grid.ts"), "utf8");
    assert(!/fetch\(/i.test(feedPreviewSource), "feed-preview.tsx nunca faz fetch");
    assert(!/studio\/images\/generate/i.test(feedPreviewSource), "feed-preview.tsx nunca chama o endpoint de geração");
    assert(!/fetch\(/i.test(feedPreviewGridSource), "feed-preview-grid.ts (lógica pura) nunca faz fetch");
  }

  console.log(`\n[result] ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
