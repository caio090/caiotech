/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/rec-os/studio/render/__tests__/fonts.structural.test.ts
 * Prompt 01 (Studio Visual Engine) — ensureStudioFontFiles materializa
 * as fontes reais (base64 embutido) em disco de forma idempotente, e
 * só sharp/resvg-js são importados pelo compositor (isolamento --
 * mesmo princípio já usado em image-runtime.ts para o SDK de imagem).
 */
import * as fs from "fs";
import * as path from "path";
import { ensureStudioFontFiles } from "../fonts";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

const root = process.cwd();

async function main() {
  console.log("[test] materializa 6 arquivos .ttf reais em disco");
  {
    const paths = ensureStudioFontFiles();
    assert(paths.length === 6, "6 arquivos de fonte materializados (4 pesos Space Grotesk + 2 Space Mono)");
    for (const p of paths) {
      assert(fs.existsSync(p), `arquivo existe: ${p}`);
      const bytes = fs.readFileSync(p);
      assert(bytes.length > 1000, `arquivo não está vazio/truncado: ${p}`);
      assert(bytes[0] === 0x00 && bytes[1] === 0x01 && bytes[2] === 0x00 && bytes[3] === 0x00, `assinatura TTF válida: ${p}`);
    }
  }

  console.log("[test] chamadas repetidas são idempotentes (memoizado -- não re-escreve a cada geração)");
  {
    const first = ensureStudioFontFiles();
    const second = ensureStudioFontFiles();
    assert(JSON.stringify(first) === JSON.stringify(second), "mesmos caminhos devolvidos em chamadas repetidas");
  }

  console.log("[test] isolamento -- só compositor.ts/reference-analysis.ts importam SDKs pesados (sharp/resvg-js/openai) no domínio render/");
  {
    const dir = path.join(root, "src/lib/rec-os/studio/render");
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.includes("__tests__"));
    for (const file of files) {
      const content = fs.readFileSync(path.join(dir, file), "utf8");
      const importsSharp = /^import .*from ["']sharp["']/m.test(content);
      const importsResvg = /^import .*from ["']@resvg\/resvg-js["']/m.test(content);
      const importsOpenAI = /^import .*from ["']openai["']/m.test(content);
      if (file === "compositor.ts") {
        assert(importsSharp && importsResvg, "compositor.ts importa sharp e resvg-js (esperado -- é o único lugar que deve)");
      } else if (file === "text-fit.ts") {
        assert(importsResvg && !importsSharp, "text-fit.ts só importa resvg-js (medição), nunca sharp");
      } else if (file === "reference-analysis.ts") {
        assert(importsOpenAI && !importsSharp && !importsResvg, "reference-analysis.ts só importa openai");
      } else {
        assert(!importsSharp && !importsResvg && !importsOpenAI, `${file} não importa nenhum SDK pesado (domínio puro/orquestração leve)`);
      }
    }
  }

  console.log(`\n[result] ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
