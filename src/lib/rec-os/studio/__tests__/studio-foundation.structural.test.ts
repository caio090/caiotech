/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/rec-os/studio/__tests__/studio-foundation.structural.test.ts
 * Sprint REC OS Studio Foundation V0.1 (Fase 13) — cobre os 14 itens
 * exigidos pelo brief original. Importa e executa o Registry/Runtime
 * reais (não apenas grep de string) onde é comportamento executável;
 * usa leitura de arquivo só para os dois itens sobre AUSÊNCIA de
 * import (11/12), que não são observáveis em runtime sem tentar rodar
 * o módulo com rede desligada.
 *
 * V0.2 atualizou os testes 4/5/15 para os contratos evoluídos
 * (runtimeStatus agora é "connected", execute() tem a nova assinatura
 * StudioSkillExecutionRequest) -- ver
 * studio-neural-runtime.structural.test.ts para a cobertura dos 20
 * itens específicos da Fase 20 do brief V0.2 (execução real,
 * autorização de Company, validação de output, etc.).
 */
import * as fs from "fs";
import * as path from "path";
import {
  STUDIO_SKILL_REGISTRY,
  getStudioSkills,
  findStudioSkill,
  isStudioSkillContractAvailable,
  isStudioSkillRuntimeAvailable,
} from "../registry";
import { createNotConnectedRuntime } from "../runtime";
import { VIDIGAL_PNG_DELIVERY_STEPS } from "../skills/vidigal-png/instructions";

const root = process.cwd();
let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

async function main() {
  console.log("[test] 1 — Studio Registry existe");
  {
    assert(Array.isArray(STUDIO_SKILL_REGISTRY), "STUDIO_SKILL_REGISTRY é um array");
    assert(getStudioSkills().length >= 1, "getStudioSkills() retorna pelo menos 1 skill");
  }

  console.log("[test] 2/3 — Vidigal está registrada, id = vidigal_png");
  const vidigal = findStudioSkill("vidigal_png");
  {
    assert(!!vidigal, "findStudioSkill('vidigal_png') encontra a skill");
    assert(vidigal?.id === "vidigal_png", "skill.id === 'vidigal_png'");
    assert(vidigal?.name === "Vidigal PNG", "skill.name === 'Vidigal PNG'");
  }

  console.log("[test] 4 — runtimeStatus = connected (V0.2: existe executor real ligado -- ver studio-neural-runtime.structural.test.ts para o contrato de execução)");
  {
    assert(vidigal?.runtimeStatus === "connected", "vidigal.runtimeStatus === 'connected'");
  }

  console.log("[test] 5 — available_contract não significa runtime disponível AGORA (depende do provider configurado no ambiente)");
  {
    assert(vidigal?.status === "available_contract", "vidigal.status === 'available_contract'");
    assert(!!vidigal && isStudioSkillContractAvailable(vidigal), "isStudioSkillContractAvailable(vidigal) === true");
    const hadKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    assert(!!vidigal && isStudioSkillRuntimeAvailable(vidigal) === false, "isStudioSkillRuntimeAvailable(vidigal) === false quando OPENAI_API_KEY ausente, mesmo com contrato disponível e runtimeStatus='connected'");
    process.env.OPENAI_API_KEY = "sk-test-fake-key-for-structural-test-only";
    assert(!!vidigal && isStudioSkillRuntimeAvailable(vidigal) === true, "isStudioSkillRuntimeAvailable(vidigal) === true quando OPENAI_API_KEY presente (só checa presença, nunca o valor)");
    if (hadKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = hadKey;
  }

  console.log("[test] 6 — oito módulos registrados");
  {
    assert(vidigal?.modules.length === 8, `vidigal.modules.length === 8 (encontrado ${vidigal?.modules.length})`);
    const expectedIds = ["core", "wollner_system", "kimura_identity", "gretel_content_system", "alencar_social_art_direction", "behance_radar", "motion", "quality_control"];
    for (const id of expectedIds) {
      assert(!!vidigal?.modules.some((m) => m.id === id), `módulo "${id}" presente`);
    }
  }

  console.log("[test] 7 — Motion permanece placeholder");
  {
    const motion = vidigal?.modules.find((m) => m.id === "motion");
    assert(motion?.status === "placeholder_contract", "motion.status === 'placeholder_contract'");
  }

  console.log("[test] 8 — Quality Control permanece placeholder");
  {
    const qc = vidigal?.modules.find((m) => m.id === "quality_control");
    assert(qc?.status === "placeholder_contract", "quality_control.status === 'placeholder_contract'");
  }

  console.log("[test] 9 — oito blocos de output existem (delivery steps)");
  {
    assert(VIDIGAL_PNG_DELIVERY_STEPS.length === 8, `VIDIGAL_PNG_DELIVERY_STEPS.length === 8 (encontrado ${VIDIGAL_PNG_DELIVERY_STEPS.length})`);
    assert(JSON.stringify(vidigal?.produces) === JSON.stringify(VIDIGAL_PNG_DELIVERY_STEPS.map((s) => s.id)), "vidigal.produces é derivado das mesmas 8 etapas, nunca uma lista paralela divergente");
    const expectedOrder = ["briefReading", "creativeDirection", "conceptualBasis", "visualStructure", "visualGuidelines", "generationPrompt", "variations", "adaptations"];
    assert(JSON.stringify(VIDIGAL_PNG_DELIVERY_STEPS.map((s) => s.id)) === JSON.stringify(expectedOrder), "as 8 etapas mantêm a ordem oficial do prompt mestre (seção 12)");
  }

  console.log("[test] 10 — freeformBrief suportado");
  {
    assert(!!vidigal?.supportedInputs.includes("freeformBrief"), "vidigal.supportedInputs inclui 'freeformBrief'");
  }

  console.log("[test] 11 — nenhum provider de IA importado pelo Studio (domínio puro)");
  {
    const studioFiles = [
      "src/lib/rec-os/studio/types.ts",
      "src/lib/rec-os/studio/registry.ts",
      "src/lib/rec-os/studio/runtime.ts",
      "src/lib/rec-os/studio/index.ts",
      "src/lib/rec-os/studio/skills/vidigal-png/manifest.ts",
      "src/lib/rec-os/studio/skills/vidigal-png/input.ts",
      "src/lib/rec-os/studio/skills/vidigal-png/output.ts",
      "src/lib/rec-os/studio/skills/vidigal-png/instructions.ts",
      "src/lib/rec-os/studio/skills/vidigal-png/index.ts",
    ];
    const forbidden = [/openai/i, /responses[-_]api/i, /google.*imagen/i, /dall-?e/i, /gpt-image/i, /anthropic/i, /image[-_]provider/i];
    for (const file of studioFiles) {
      const content = fs.readFileSync(path.join(root, file), "utf8");
      // Escopado às linhas de import/require reais -- nunca à prosa de
      // comentários que EXPLICA que o provider nunca é chamado (mesmo
      // bug de falso positivo já visto: um comentário dizendo "nunca
      // chama OpenAI" não pode reprovar o próprio teste que o confirma).
      const importLines = content.split("\n").filter((line) => /^\s*import\b|require\(/.test(line));
      for (const re of forbidden) {
        assert(!importLines.some((line) => re.test(line)), `${file}: nenhuma linha de import/require referencia ${re} (nenhum provider de IA/imagem)`);
      }
    }
  }

  console.log("[test] 12 — nenhum Supabase/next importado no domínio puro");
  {
    const studioFiles = [
      "src/lib/rec-os/studio/types.ts",
      "src/lib/rec-os/studio/registry.ts",
      "src/lib/rec-os/studio/runtime.ts",
      "src/lib/rec-os/studio/index.ts",
      "src/lib/rec-os/studio/skills/vidigal-png/manifest.ts",
      "src/lib/rec-os/studio/skills/vidigal-png/input.ts",
      "src/lib/rec-os/studio/skills/vidigal-png/output.ts",
      "src/lib/rec-os/studio/skills/vidigal-png/instructions.ts",
      "src/lib/rec-os/studio/skills/vidigal-png/index.ts",
    ];
    for (const file of studioFiles) {
      const content = fs.readFileSync(path.join(root, file), "utf8");
      assert(!/@supabase|from ["']next\//.test(content), `${file}: não importa Supabase nem next/* -- domínio puro, sem I/O`);
    }
  }

  console.log("[test] 13 — nenhuma rota nova /admin/contentos/studio");
  {
    const studioRoute = path.join(root, "src/app/admin/contentos/studio");
    assert(!fs.existsSync(studioRoute), "src/app/admin/contentos/studio NÃO existe -- /admin/contentos/visual é reaproveitada, nenhuma rota nova criada");
  }

  console.log("[test] 14 — EditorOS preservado, nenhum canvas paralelo criado");
  {
    assert(fs.existsSync(path.join(root, "src/app/admin/contentos/editor-os/CanvasEditor.tsx")), "CanvasEditor.tsx (EditorOS) continua existindo, intocado");
    assert(fs.existsSync(path.join(root, "src/app/admin/contentos/editor-os/EditorOSWorkspace.tsx")), "EditorOSWorkspace.tsx (EditorOS) continua existindo, intocado");
    const studioDirHasCanvas = fs.existsSync(path.join(root, "src/lib/rec-os/studio")) &&
      fs.readdirSync(path.join(root, "src/lib/rec-os/studio"), { recursive: true })
        .some((f) => String(f).toLowerCase().includes("canvas"));
    assert(!studioDirHasCanvas, "nenhum arquivo de canvas criado dentro do domínio Studio -- EditorOS continua o único canvas real");
  }

  console.log("[test] 15 — createNotConnectedRuntime nunca executa, sempre retorna STUDIO_AI_PROVIDER_UNAVAILABLE");
  {
    const runtime = createNotConnectedRuntime("vidigal_png");
    const result = await runtime.execute({ skillId: "vidigal_png", input: { freeformBrief: "teste" }, context: { company: null } });
    assert(result.status === "runtime_unavailable", "execute() retorna status 'runtime_unavailable'");
    assert(result.error?.code === "STUDIO_AI_PROVIDER_UNAVAILABLE", "execute() retorna error.code STUDIO_AI_PROVIDER_UNAVAILABLE");
    assert(result.output === null, "execute() nunca retorna output real -- sempre null");
    assert(result.runtime === "not_connected", "execute() reporta runtime === 'not_connected'");
  }

  console.log(`\n[result] ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
