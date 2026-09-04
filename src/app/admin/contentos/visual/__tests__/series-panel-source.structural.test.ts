/**
 * Executar com: node .tmp/run-ts-test.cjs src/app/admin/contentos/visual/__tests__/series-panel-source.structural.test.ts
 * Prompt 18 (Creative Series Control & Asset Link Repair) — [TEST 01]
 * "criação não gera automaticamente" é, na prática, um contrato do
 * COMPONENTE React (_series-panel.tsx) -- sem harness de component
 * testing configurado neste projeto, o guard real e determinístico é
 * uma checagem de fonte (mesmo padrão já usado em
 * studio-neural-runtime.structural.test.ts pra "nenhum image provider
 * introduzido nesta patch"): a função createSeries() nunca pode conter
 * uma chamada de geração dentro do seu próprio corpo.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

const root = path.resolve(import.meta.dirname, "../../../../../..");
const filePath = path.join(root, "src/app/admin/contentos/visual/_series-panel.tsx");

/**
 * Acha o corpo real da função a partir da assinatura. Não basta contar
 * chaves a partir do primeiro "{" -- assinaturas com tipo de retorno
 * genérico (ex.: `Promise<{ ok: true; ... }>`) têm chaves ANTES do
 * corpo de verdade. Só conta como início do corpo um "{" encontrado
 * com parênteses/ângulos (parâmetros e generics) já balanceados.
 */
function extractFunctionBody(source: string, functionSignature: string): string {
  const start = source.indexOf(functionSignature);
  if (start === -1) throw new Error(`função "${functionSignature}" não encontrada em ${filePath}`);
  let parenDepth = 0; let angleDepth = 0; let bodyStart = -1; let i = start;
  for (; i < source.length; i++) {
    const ch = source[i];
    if (ch === "(") parenDepth++;
    else if (ch === ")") parenDepth--;
    else if (ch === "<") angleDepth++;
    else if (ch === ">") angleDepth--;
    else if (ch === "{" && parenDepth === 0 && angleDepth <= 0) { bodyStart = i; break; }
  }
  if (bodyStart === -1) throw new Error(`corpo de "${functionSignature}" não encontrado`);
  let depth = 0;
  for (i = bodyStart; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") { depth--; if (depth === 0) break; }
  }
  return source.slice(bodyStart, i + 1);
}

async function main() {
  const source = fs.readFileSync(filePath, "utf8");

  console.log("[test] [TEST 01] createSeries() só cria a estrutura -- NENHUMA chamada de geração dentro do próprio corpo");
  {
    const body = extractFunctionBody(source, "async function createSeries()");
    assert(/fetch\("\/api\/rec-os\/series"/.test(body), "createSeries() chama POST /api/rec-os/series (cria a estrutura)");
    assert(!/generateOneItemPersisted/.test(body), "createSeries() NUNCA chama generateOneItemPersisted");
    assert(!/runSeriesGeneration/.test(body), "createSeries() NUNCA chama runSeriesGeneration (orquestrador de fila)");
    assert(!/callImageProvider/.test(body), "createSeries() NUNCA chama o provider de imagem diretamente");
    assert(!/studio\/images\/generate/.test(body), "createSeries() NUNCA chama /api/studio/images/generate");
  }

  console.log("[test] geração só é alcançável via ações explícitas do usuário (handleGenerateOne/handleGenerateAll), nunca automaticamente");
  {
    assert(/function handleGenerateOne/.test(source), "existe uma ação explícita 'Gerar' por item");
    assert(/function handleGenerateAll/.test(source), "existe uma ação explícita 'Gerar todas'");
    // Nenhum useEffect deste arquivo pode chamar geração sozinho no mount/mudança de estado.
    const effectBlocks = [...source.matchAll(/useEffect\(\(\) => \{([\s\S]*?)\n  \}, \[/g)].map((m) => m[1]);
    for (const block of effectBlocks) {
      assert(!/generateOneItemPersisted|runSeriesGeneration|callImageProvider/.test(block), "nenhum useEffect dispara geração sozinho");
    }
  }

  console.log("[test] [TEST 04/P1-B] cancelPending() só toca items com status 'planned' localmente, nunca 'generating'");
  {
    const body = extractFunctionBody(source, "function cancelPending()");
    assert(/i\.status === "planned"/.test(body), "filtra explicitamente por status === 'planned' antes de cancelar");
  }

  console.log("[test] [P1-C] regenerateReady() nunca faz PATCH de status ANTES do resultado do provider (protege o asset antigo em caso de falha)");
  {
    const body = extractFunctionBody(source, "async function regenerateReady(item: CreativeSeriesItem)");
    const providerCallIndex = body.indexOf("callImageProvider(");
    const firstPatchIndex = body.indexOf("patchItem(");
    assert(providerCallIndex !== -1, "chama o provider");
    assert(firstPatchIndex !== -1, "eventualmente persiste (no sucesso)");
    assert(providerCallIndex < firstPatchIndex, "o provider é chamado ANTES de qualquer PATCH -- nunca marca o item como 'planned'/'generating' antes de saber o resultado, protegendo a imagem antiga em caso de falha");
  }

  console.log("[test] [TEST 05] generateOneItemPersisted() sempre termina num status TERMINAL persistido -- sucesso e falha do provider, nunca fica preso em 'generating'");
  {
    const body = extractFunctionBody(source, "async function generateOneItemPersisted(item: CreativeSeriesItem)");
    assert(/patchItem\(seriesId, working\.id, \{ status: "generating" \}\)/.test(body), "marca 'generating' (persistido) antes de chamar o provider");
    assert(/if \(!providerResult\.ok\) \{[\s\S]*?status: "error"/.test(body), "branch de FALHA do provider sempre persiste 'error' antes de retornar");
    assert(/status: "ready", imageDataUrl: providerResult\.url/.test(body), "branch de SUCESSO sempre persiste 'ready' (com o vínculo real de asset) antes de retornar");
  }

  console.log("[test] [PROMPT 20 P1] series_id explícito na URL é a fonte de verdade, SEMPRE checado antes da heurística 'recente'");
  {
    assert(/const urlSeriesId = searchParams\.get\("series_id"\)/.test(source), "lê series_id da URL (fonte canônica, Fase 04/05)");
    assert(/if \(urlSeriesId\) \{/.test(source), "prioriza series_id explícito sobre a busca de 'recente'");
    assert(/fetch\(`\/api\/rec-os\/series\/\$\{urlSeriesId\}`\)/.test(source), "hidrata pelo endpoint de série exata (autorizado por RLS), nunca confia no id sem checar o servidor");
    assert(/loaded\.series\.clientId !== clientId/.test(source), "Fase 07/08 -- nunca aceita uma série carregada que não pertence ao clientId do contexto atual");
    assert(/setSeriesIdInUrl\(null\)/.test(source), "limpa o id da URL quando a série é inválida/não pertence ao contexto -- nunca deixa um id morto lá");
  }

  console.log("[test] [PROMPT 20 P1] criar/continuar série sempre grava o series_id real na URL (nunca só em React state)");
  {
    const createBody = extractFunctionBody(source, "async function createSeries()");
    assert(/setSeriesIdInUrl\(created\.series\.series\.id/.test(createBody), "createSeries() grava o id real na URL assim que a série é criada");
    const continueBody = extractFunctionBody(source, "async function continueRecent()");
    assert(/setSeriesIdInUrl\(recent\.series\.id\)/.test(continueBody), "continueRecent() também grava o id na URL");
  }

  console.log("[test] [PROMPT 20 Fase 07] troca de Company invalida série de contexto anterior, nunca continua mostrando");
  {
    assert(/loadedSeriesClientIdRef\.current !== clientId\) resetSeries\(\)/.test(source), "effect dedicado reseta a série quando o clientId do contexto muda depois de já ter carregado uma série de outro dono");
  }

  console.log(`\n[result] ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
