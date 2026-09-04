/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/rec-os/studio/__tests__/studio-asset-lock.structural.test.ts
 * Sprint REC OS Studio Foundation V0.2.1 (patch: Vidigal Asset Lock +
 * Visual Hierarchy + Refinement) — cobre os 18 itens exigidos pelo
 * brief. buildVidigalSystemInstructions() não importa nenhum provider
 * (função pura), então roda sem mock de rede/openai.
 */
import * as fs from "fs";
import * as path from "path";
import { findStudioSkill } from "../registry";
import { buildVidigalSystemInstructions, VIDIGAL_PNG_DELIVERY_STEPS } from "../skills/vidigal-png/instructions";

const root = process.cwd();
let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

const vidigal = findStudioSkill("vidigal_png")!;
const instructions = buildVidigalSystemInstructions(vidigal.modules);

console.log("[test] 1/2 — Asset Lock presente e é regra anterior aos módulos");
{
  assert(/REGRA ZERO/.test(instructions) && /ASSET LOCK/.test(instructions), "REGRA ZERO / ASSET LOCK presente nas system instructions");
  const zeroIdx = instructions.indexOf("REGRA ZERO");
  const modulosIdx = instructions.indexOf("MÓDULOS ATIVOS");
  assert(zeroIdx > -1 && modulosIdx > -1 && zeroIdx < modulosIdx, "REGRA ZERO aparece ANTES de MÓDULOS ATIVOS -- regra transversal, acima da ativação modular");
}

console.log("[test] 3 — produto oficial não deve ser regenerado");
{
  assert(/produto\/logo\/ativo oficial NÃO foi regenerado|ativo oficial não é matéria-prima generativa/i.test(instructions), "instrui explicitamente que o ativo oficial não deve ser regenerado");
  assert(!/regenerar o (produto|ativo|logo) (é|como) (o )?padrão/i.test(instructions), "nunca trata regeneração do ativo como caminho padrão");
}

console.log("[test] 4 — generationPrompt deve preservar asset oficial quando aplicável");
{
  assert(/generationPrompt.*preserva|preservação do ativo.*generationPrompt|generationPrompt deve instruir a preservação/i.test(instructions), "generationPrompt é instruído a preservar o ativo e gerar só o entorno");
}

console.log("[test] 5/6 — hierarquia default imagem > headline > CTA > logo, logo como assinatura");
{
  assert(/1º Imagem/i.test(instructions) && /2º Headline/i.test(instructions) && /3º CTA/i.test(instructions) && /4º Logo/i.test(instructions), "hierarquia default 1-4 (imagem/headline/CTA/logo) registrada, na ordem certa");
  assert(/logo.*assinatura|assinatura.*logo/i.test(instructions), "logo é tratada como assinatura no padrão, não como protagonista");
}

console.log("[test] 7 — refinamento não equivale a adicionar efeitos");
{
  assert(/refinar NUNCA significa só adicionar efeito/i.test(instructions), "regra crítica de refinamento presente");
  for (const effect of ["glow", "partículas", "sombra", "textura", "elementos", "decoração", "saturação", "ruído"]) {
    assert(instructions.includes(effect), `lista explicitamente "${effect}" como NÃO sendo refinamento válido sozinho`);
  }
}

console.log("[test] 8 — referência serve para extrair regras, não copiar literalmente");
{
  assert(/extra(ir|ia) REGRAS/i.test(instructions), "instrui extrair regras da referência");
  assert(/nunca copie a peça literalmente|nunca da reprodução literal/i.test(instructions), "proíbe explicitamente cópia literal da referência");
}

console.log("[test] 9/10 — Motion e Quality Control continuam placeholder_contract, sem regra interna nova");
{
  const motion = vidigal.modules.find((m) => m.id === "motion");
  const qc = vidigal.modules.find((m) => m.id === "quality_control");
  assert(motion?.status === "placeholder_contract", "motion.status === 'placeholder_contract'");
  assert(qc?.status === "placeholder_contract", "quality_control.status === 'placeholder_contract'");
  assert(!/MOTION[\s\S]{0,80}(preserva|regenera|asset lock)/i.test(instructions.split("MÓDULOS PLACEHOLDER")[1] ?? ""), "nenhuma regra nova de Asset Lock foi escrita DENTRO do bloco de MOTION -- a regra é transversal, não modular");
}

console.log("[test] 11 — os 8 outputs permanecem inalterados (ids e ordem)");
{
  const expectedOrder = ["briefReading", "creativeDirection", "conceptualBasis", "visualStructure", "visualGuidelines", "generationPrompt", "variations", "adaptations"];
  assert(VIDIGAL_PNG_DELIVERY_STEPS.length === 8, "continuam exatamente 8 blocos de output");
  assert(JSON.stringify(VIDIGAL_PNG_DELIVERY_STEPS.map((s) => s.id)) === JSON.stringify(expectedOrder), "ids e ordem dos 8 blocos inalterados por esta patch");
}

console.log("[test] 12/13/16 — skill continua sem provider hardcoded; nenhum image provider introduzido; runtime continua textual");
{
  const skillFiles = [
    "src/lib/rec-os/studio/skills/vidigal-png/manifest.ts",
    "src/lib/rec-os/studio/skills/vidigal-png/input.ts",
    "src/lib/rec-os/studio/skills/vidigal-png/output.ts",
    "src/lib/rec-os/studio/skills/vidigal-png/instructions.ts",
  ];
  for (const file of skillFiles) {
    const content = fs.readFileSync(path.join(root, file), "utf8");
    assert(!/openai/i.test(content), `${file}: nunca menciona "openai"`);
  }
  const executorContent = fs.readFileSync(path.join(root, "src/lib/rec-os/studio/skills/vidigal-png/neural-executor.ts"), "utf8");
  assert(!/\.images\.(generate|edit|createVariation)/.test(executorContent), "neural-executor.ts continua sem nenhuma chamada a client.images.* -- nenhum image provider introduzido por esta patch");
  assert(/responses\.create/.test(executorContent), "neural-executor.ts continua chamando só responses.create (texto estruturado)");
}

console.log("[test] 14/17 — nenhuma persistência/SQL criada por ESTA patch (Asset Lock, text runtime only)");
{
  // Prompt 16 (REC OS Persistence Completion) adicionou de propósito
  // persistência real ao Studio (Feed DNA/Série Visual/assets gerados)
  // -- SQL 92/93 são deliberados, revisados, documentados no relatório
  // daquele prompt, nunca "esta patch" (Asset Lock, sprint anterior,
  // text-runtime-only). Este teste continua útil como guarda-corpo
  // contra SQL NOVO e não documentado aparecendo sem querer -- por
  // isso vira um allowlist explícito em vez de "zero arquivos".
  const supabaseDir = path.join(root, "docs/supabase");
  const KNOWN_STUDIO_SQL = new Set([
    "92-feed-dna-and-creative-series.sql", "92-feed-dna-and-creative-series-rollback.sql",
    "93-studio-visual-assets-storage.sql", "93-studio-visual-assets-storage-rollback.sql",
  ]);
  const studioSql = fs.readdirSync(supabaseDir).filter((f) => /studio/i.test(f) && f.endsWith(".sql"));
  const unexpected = studioSql.filter((f) => !KNOWN_STUDIO_SQL.has(f));
  assert(unexpected.length === 0, `nenhum arquivo SQL de Studio NÃO documentado -- encontrado: ${unexpected.join(", ")}`);
}

console.log("[test] 15 — endpoint permanece único (nenhuma rota nova)");
{
  const executeDir = path.join(root, "src/app/api/studio/skills");
  const entries = fs.readdirSync(executeDir);
  assert(JSON.stringify(entries) === JSON.stringify(["execute"]), "src/app/api/studio/skills/ continua com uma única subpasta de rota (execute)");
}

console.log("[test] 18 — nenhum novo resolver de Company (route.ts continua usando só resolveCompanyContext)");
{
  const routeContent = fs.readFileSync(path.join(root, "src/app/api/studio/skills/execute/route.ts"), "utf8");
  assert(routeContent.includes('from "@/lib/company-context/resolve"'), "route.ts continua importando o resolver canônico");
  assert(!/resolveStudioCompany|validateVidigalCompany/.test(routeContent), "nenhum resolver de Company paralelo foi introduzido");
}

console.log("[test] instruction builder e master prompt não divergem nas seções-chave");
{
  const masterPrompt = fs.readFileSync(path.join(root, "docs/product-roadmap/vidigal-png-master-prompt.txt"), "utf8");
  assert(masterPrompt.includes("REGRA ZERO"), "master prompt também documenta REGRA ZERO");
  assert(masterPrompt.includes("ASSET LOCK"), "master prompt também documenta ASSET LOCK");
  assert(masterPrompt.includes("HIERARQUIA VISUAL DEFAULT"), "master prompt também documenta a hierarquia default");
  assert(masterPrompt.includes("REFINAMENTO"), "master prompt também documenta refinamento");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
