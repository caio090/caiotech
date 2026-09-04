/**
 * Executar com: node --import ./.tmp/preload-ts-loader.mjs scripts/qa/verify-studio-function-trace.ts
 * (ou `npm run qa:studio-trace` -- depois de `npm run build`)
 *
 * Prompt 07 (Studio Linux Runtime Fix) — Fase 19/20: BUILD GREEN != FUNCTION
 * WORKS (foi exatamente isso que causou o incidente de Production).
 *
 * Depois de `next build`, inspeciona o trace real gerado pelo Next
 * (route.js.nft.json) para a rota /api/studio/images/generate e
 * confirma que os arquivos nativos necessários para a PLATAFORMA ATUAL
 * (process.platform/arch -- linux-x64 quando rodado no runner de CI ou
 * na própria Vercel, darwin-arm64 quando rodado localmente neste Mac)
 * realmente estão presentes no trace -- nunca só "o pacote foi
 * importado".
 *
 * Nomes de pacote/arquivo são descobertos a partir do package.json/
 * node_modules instalados, nunca hardcoded -- se uma versão futura do
 * sharp/resvg mudar convenção de nomes, este script FALHA com uma
 * mensagem explicando o que procurou e não achou, nunca passa em
 * silêncio.
 *
 * Falha ausente = FAIL (exit 1), nunca warning.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const TRACE_PATH = join(ROOT, ".next/server/app/api/studio/images/generate/route.js.nft.json");

let failed = false;
function check(label: string, ok: boolean, detail?: string) {
  console.log(`[${ok ? "PASS" : "FAIL"}] ${label}${detail ? ` -- ${detail}` : ""}`);
  if (!ok) failed = true;
}

async function platformArchKey(): Promise<string> {
  // Mesma lógica de sharp/dist/libvips.cjs (runtimePlatformArch) --
  // replicada aqui (import dinâmico, nunca require -- este arquivo
  // roda como ESM) em vez de importar um caminho interno do sharp que
  // pode mudar de local entre versões. libc vazio = glibc (convenção
  // de nome do sharp: "linux-x64", não "linuxmusl-x64") -- é o alvo
  // real da Vercel; musl só entraria em jogo num runtime Alpine.
  let libc = "";
  if (process.platform === "linux") {
    try {
      const detectLibc = await import("detect-libc");
      libc = (detectLibc.isNonGlibcLinuxSync?.() ? detectLibc.familySync() : "") ?? "";
    } catch {
      libc = "";
    }
  }
  return `${process.platform}${libc}-${process.arch}`;
}

async function main() {
  if (!existsSync(TRACE_PATH)) {
    console.error(`[FAIL] trace não encontrado em ${TRACE_PATH} -- rode "npm run build" primeiro.`);
    process.exit(1);
  }

  const trace = JSON.parse(readFileSync(TRACE_PATH, "utf8")) as { files: string[] };
  const files: string[] = trace.files;
  const platformKey = await platformArchKey();
  console.log(`trace lido: ${files.length} arquivos, plataforma alvo: ${platformKey}`);
  console.log("");

  // --- Sharp: descobre a versão instalada realmente (nunca hardcoded) ---
  const sharpPkg = JSON.parse(readFileSync(join(ROOT, "node_modules/sharp/package.json"), "utf8")) as { version: string };
  console.log(`sharp instalado: ${sharpPkg.version}`);

  const sharpJsIncluded = files.some((f) => f.includes(`node_modules/sharp/`) && (f.endsWith(".cjs") || f.endsWith("package.json")));
  check("wrapper JS do sharp (node_modules/sharp/**) presente no trace", sharpJsIncluded);

  const sharpNativePkgPrefix = `@img/sharp-${platformKey}/`;
  const sharpNativeFile = files.find((f) => f.includes(sharpNativePkgPrefix) && f.endsWith(".node"));
  check(`addon nativo do sharp para ${platformKey} presente no trace`, Boolean(sharpNativeFile), sharpNativeFile ?? `procurado: **/${sharpNativePkgPrefix}**/*.node`);

  const libvipsPkgPrefix = `@img/sharp-libvips-${platformKey}/`;
  const libvipsBinary = files.find((f) => f.includes(libvipsPkgPrefix) && (f.endsWith(".so") || /\.so\.\d/.test(f) || f.endsWith(".dylib")));
  check(
    `biblioteca compartilhada real do libvips (@img/sharp-libvips-${platformKey}) presente no trace`,
    Boolean(libvipsBinary),
    libvipsBinary ?? `NENHUM .so/.dylib encontrado sob **/${libvipsPkgPrefix}** -- procurado entre ${files.filter((f) => f.includes("sharp-libvips")).length} arquivo(s) de sharp-libvips no trace. Se o sharp mudou a convenção de nome do pacote/arquivo, atualize este script.`,
  );

  console.log("");

  // --- Resvg: mesma lógica ---
  const resvgPkg = JSON.parse(readFileSync(join(ROOT, "node_modules/@resvg/resvg-js/package.json"), "utf8")) as { version: string };
  console.log(`@resvg/resvg-js instalado: ${resvgPkg.version}`);

  const resvgJsIncluded = files.some((f) => f.includes("@resvg/resvg-js/") && (f.endsWith(".js") || f.endsWith("package.json")));
  check("wrapper JS do resvg-js presente no trace", resvgJsIncluded);

  const resvgNativeFile = files.find((f) => f.includes(`@resvg/resvg-js-${platformKey}`) && f.endsWith(".node"));
  check(`binding N-API nativo do resvg-js para ${platformKey} presente no trace`, Boolean(resvgNativeFile), resvgNativeFile ?? `procurado: **/@resvg/resvg-js-${platformKey}/**/*.node`);

  console.log("");
  const bundleBytes = files.length; // proxy simples -- contagem, não soma de bytes (nft.json não traz size)
  console.log(`total de arquivos no trace desta rota: ${bundleBytes}`);

  console.log("");
  if (failed) {
    console.error("=== RESULTADO: FAIL -- trace da Function do Studio não contém tudo que o runtime nativo precisa ===");
    process.exit(1);
  }
  console.log("=== RESULTADO: PASS -- trace contém sharp/libvips/resvg nativos para a plataforma atual ===");
}

void main();
