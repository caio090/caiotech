/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/rec-os/studio/__tests__/text-directives.structural.test.ts
 * Prompt 03 (Studio Release Fix) — P1: parseStudioTextDirectives/
 * resolveFinalText são puros, sem I/O.
 */
import { parseStudioTextDirectives, resolveFinalText } from "../text-directives";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

async function main() {
  console.log("[test] extrai Headline: no formato padrão");
  {
    const r = parseStudioTextDirectives("Divulgue o combo.\nHeadline: HOJE ATÉ MAIS TARDE\nCTA: CONFIRA O NOVO HORÁRIO");
    assert(r.headline === "HOJE ATÉ MAIS TARDE", "headline extraída ao pé da letra, maiúscula preservada");
    assert(r.cta === "CONFIRA O NOVO HORÁRIO", "cta extraída ao pé da letra");
    assert(!r.remainingBrief.includes("Headline:") && !r.remainingBrief.includes("CTA:"), "linhas de directive removidas do briefing restante");
    assert(r.remainingBrief.includes("Divulgue o combo."), "resto do briefing preservado");
  }

  console.log("[test] aceita Headline = (sinal de igual) e Título:");
  {
    assert(parseStudioTextDirectives("Headline = PROMOÇÃO RELÂMPAGO").headline === "PROMOÇÃO RELÂMPAGO", "aceita '=' como separador");
    assert(parseStudioTextDirectives("Título: PROMOÇÃO RELÂMPAGO").headline === "PROMOÇÃO RELÂMPAGO", "aceita rótulo 'Título'");
    assert(parseStudioTextDirectives("Titulo: SEM ACENTO").headline === "SEM ACENTO", "aceita 'Titulo' sem acento também");
  }

  console.log("[test] aceita Chamada: como sinônimo de CTA");
  {
    assert(parseStudioTextDirectives("Chamada: PEÇA AGORA").cta === "PEÇA AGORA", "aceita rótulo 'Chamada'");
  }

  console.log("[test] preserva byte-a-byte -- nunca reescreve capitalização/pontuação/acento");
  {
    const r = parseStudioTextDirectives("Headline: hoje até MAIS tarde!!! 30% OFF");
    assert(r.headline === "hoje até MAIS tarde!!! 30% OFF", "capitalização mista, pontuação e símbolo % preservados exatamente");
  }

  console.log("[test] sem directive -- headline/cta null, remainingBrief é o texto original");
  {
    const original = "Divulgue que hoje estamos abertos até 4h.";
    const r = parseStudioTextDirectives(original);
    assert(r.headline === null, "headline null quando não há directive");
    assert(r.cta === null, "cta null quando não há directive");
    assert(r.remainingBrief === original, "remainingBrief é idêntico ao original quando nada foi extraído");
  }

  console.log("[test] só a primeira ocorrência de cada label é usada (determinístico)");
  {
    const r = parseStudioTextDirectives("Headline: PRIMEIRA\nHeadline: SEGUNDA");
    assert(r.headline === "PRIMEIRA", "primeira linha vence, nunca a última sobrescreve");
  }

  console.log("[test] remove caracteres invisíveis perigosos (bidi override/zero-width/BOM), preserva o resto");
  {
    const withInvisible = "Headline: HOJE​ATÉ‮MAIS﻿TARDE";
    const r = parseStudioTextDirectives(withInvisible);
    assert(r.headline === "HOJEATÉMAISTARDE", "zero-width/bidi-override/BOM removidos, letras visíveis preservadas");
  }

  console.log("[test] limite de caracteres aplicado (headline 200, cta 80) sem lançar");
  {
    const longHeadline = "Headline: " + "A".repeat(500);
    const r = parseStudioTextDirectives(longHeadline);
    assert(r.headline?.length === 200, "headline truncada no limite de 200 caracteres");
    const longCta = "CTA: " + "B".repeat(500);
    const r2 = parseStudioTextDirectives(longCta);
    assert(r2.cta?.length === 80, "cta truncada no limite de 80 caracteres");
  }

  console.log("[test] resolveFinalText -- precedência estruturado > directive > sugestão");
  {
    assert(resolveFinalText("Estruturado", "Directive", "Sugestão") === "Estruturado", "campo estruturado sempre vence");
    assert(resolveFinalText(undefined, "Directive", "Sugestão") === "Directive", "directive vence quando não há campo estruturado");
    assert(resolveFinalText(undefined, null, "Sugestão") === "Sugestão", "sugestão só é usada quando nada mais foi informado");
    assert(resolveFinalText(undefined, null, null) === null, "null quando não há nada em nenhuma das 3 fontes");
    assert(resolveFinalText("  ", "Directive", "Sugestão") === "Directive", "campo estruturado só espaços em branco não conta como fornecido");
  }

  console.log(`\n[result] ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
