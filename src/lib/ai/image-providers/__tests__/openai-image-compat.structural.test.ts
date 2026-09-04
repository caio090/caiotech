/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/ai/image-providers/__tests__/openai-image-compat.structural.test.ts
 * Prompt 09 (Studio Image Provider Compatibility) — resolveOpenAIImageModelFamily/
 * buildOpenAIImageRequest são puros, sem I/O.
 */
import { resolveOpenAIImageModelFamily, buildOpenAIImageRequest } from "../openai-image-compat";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

async function main() {
  console.log("[test] resolveOpenAIImageModelFamily -- família correta por modelo real do SDK instalado");
  {
    assert(resolveOpenAIImageModelFamily("dall-e-2") === "dall_e_2", "dall-e-2");
    assert(resolveOpenAIImageModelFamily("dall-e-3") === "dall_e_3", "dall-e-3");
    assert(resolveOpenAIImageModelFamily("gpt-image-1") === "gpt_image", "gpt-image-1");
    assert(resolveOpenAIImageModelFamily("gpt-image-1-mini") === "gpt_image", "gpt-image-1-mini");
    assert(resolveOpenAIImageModelFamily("gpt-image-1.5") === "gpt_image", "gpt-image-1.5");
    assert(resolveOpenAIImageModelFamily("gpt-image-2") === "gpt_image", "gpt-image-2");
    assert(resolveOpenAIImageModelFamily("gpt-image-2-2026-04-21") === "gpt_image", "gpt-image-2-2026-04-21");
    assert(resolveOpenAIImageModelFamily("chatgpt-image-latest") === "gpt_image", "chatgpt-image-latest");
    assert(resolveOpenAIImageModelFamily("nao-existe-esse-modelo") === "unknown", "modelo desconhecido nunca ganha família inventada");
  }

  console.log("[test] [PRODUCTION_INCIDENT_OPENAI_RESPONSE_FORMAT] nenhuma família envia response_format, nunca");
  {
    for (const model of ["gpt-image-1", "gpt-image-2", "dall-e-2", "dall-e-3"]) {
      const result = buildOpenAIImageRequest({ model, prompt: "x", aspectRatio: "1:1" });
      assert(result.ok, `${model}: build não falha`);
      if (result.ok) {
        assert(!("response_format" in result.request), `${model}: response_format NUNCA está no request (causa raiz do incidente real de Production)`);
      }
    }
  }

  console.log("[test] GPT Image -- só parâmetros válidos pra essa família (matriz)");
  {
    const result = buildOpenAIImageRequest({ model: "gpt-image-1", prompt: "cenário", aspectRatio: "9:16", highRes: true, outputCount: 3 });
    assert(result.ok, "build ok");
    if (result.ok) {
      assert(result.family === "gpt_image", "família correta");
      assert(result.request.model === "gpt-image-1", "model preservado");
      assert(result.request.size === "1024x1536", "size 9:16 mapeado pro preset real do GPT Image");
      assert(result.request.quality === "high", "highRes:true -> quality high (vocabulário real do GPT Image)");
      assert(result.request.n === 3, "n respeitado dentro do limite");
      assert(!("style" in result.request), "style nunca enviado pro GPT Image (só dall-e-3 suporta)");
      assert(!("response_format" in result.request), "response_format nunca enviado");
    }
  }

  console.log("[test] GPT Image -- quality auto quando highRes ausente");
  {
    const result = buildOpenAIImageRequest({ model: "gpt-image-1-mini", prompt: "x", aspectRatio: "1:1" });
    assert(result.ok && result.request.quality === "auto", "quality auto (vocabulário real do GPT Image, nunca 'hd'/'standard')");
  }

  console.log("[test] DALL-E 3 -- só parâmetros válidos pra essa família, n sempre 1");
  {
    const result = buildOpenAIImageRequest({ model: "dall-e-3", prompt: "x", aspectRatio: "16:9", highRes: true, outputCount: 5 });
    assert(result.ok, "build ok");
    if (result.ok) {
      assert(result.family === "dall_e_3", "família correta");
      assert(result.request.size === "1792x1024", "size 16:9 mapeado pro preset real do dall-e-3");
      assert(result.request.quality === "hd", "highRes:true -> quality hd (vocabulário real do dall-e-3, nunca 'high')");
      assert(result.request.n === 1, "n sempre 1 pro dall-e-3, mesmo pedindo mais (documentado: 'only n=1 is supported')");
      assert(!("background" in result.request), "background nunca enviado pro dall-e-3 (só GPT Image)");
      assert(!("moderation" in result.request), "moderation nunca enviado pro dall-e-3 (só GPT Image)");
      assert(!("output_format" in result.request), "output_format nunca enviado pro dall-e-3 (só GPT Image)");
    }
  }

  console.log("[test] DALL-E 3 -- quality standard quando highRes ausente");
  {
    const result = buildOpenAIImageRequest({ model: "dall-e-3", prompt: "x", aspectRatio: "1:1" });
    assert(result.ok && result.request.quality === "standard", "quality standard (vocabulário real do dall-e-3)");
  }

  console.log("[test] DALL-E 2 -- sempre quadrado (limitação real do modelo, nunca contornada)");
  {
    for (const ar of ["1:1", "9:16", "16:9", "4:5", "1.91:1"] as const) {
      const result = buildOpenAIImageRequest({ model: "dall-e-2", prompt: "x", aspectRatio: ar });
      assert(result.ok && result.request.size === "1024x1024", `dall-e-2 (${ar}): size sempre 1024x1024`);
      assert(result.ok && result.request.quality === "standard", `dall-e-2 (${ar}): quality sempre standard (única opção real)`);
    }
  }

  console.log("[test] modelo desconhecido -- falha explícita, nunca compatibilidade inventada");
  {
    const result = buildOpenAIImageRequest({ model: "modelo-futuro-inexistente", prompt: "x", aspectRatio: "1:1" });
    assert(!result.ok, "build falha explicitamente");
    if (!result.ok) assert(typeof result.error === "string" && result.error.length > 0, "mensagem de erro explicativa presente");
  }

  console.log(`\n[result] ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
