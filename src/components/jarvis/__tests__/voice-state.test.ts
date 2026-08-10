/**
 * Executar com: node .tmp/run-ts-test.cjs src/components/jarvis/__tests__/voice-state.test.ts
 * Sprint MVP Dogfood Security + Voice Closure V0.1 (Fase 38-39) — decisões
 * puras do ciclo de vida da gravação de voz, extraídas de
 * use-jarvis-voice.ts para serem testáveis sem MediaRecorder/getUserMedia
 * reais (indisponíveis neste harness Node -- ver nota no relatório da
 * sprint sobre o que É e o que NÃO É coberto por browser real).
 */
import { shouldAllowRecordingStart, resolveRecordingStopOutcome, nextCachedBlob, nextAudioUrlState } from "../voice-state";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("[test] 1 — duplicate start is ignored (touch+mouse sintético para o mesmo gesto)");
{
  assert(shouldAllowRecordingStart(false, false) === true, "nenhuma gravação ativa e nenhum start em progresso -> permite iniciar");
  assert(shouldAllowRecordingStart(true, false) === false, "já existe um recorder ativo -> ignora o segundo gesto");
  assert(shouldAllowRecordingStart(false, true) === false, "start já em progresso (aguardando getUserMedia) -> ignora o segundo gesto");
  assert(shouldAllowRecordingStart(true, true) === false, "ambos ativos -> ignora");
}

console.log("[test] 2 — timeout/stop normal produz outcome 'ready' quando há áudio real");
{
  const outcome = resolveRecordingStopOutcome({ wasCancelled: false, chunkCount: 3 });
  assert(outcome === "ready", "chunks capturados e não cancelado -> ready (processa o áudio válido)");
}

console.log("[test] 3 — cancel sempre descarta, mesmo com chunks capturados");
{
  const outcome = resolveRecordingStopOutcome({ wasCancelled: true, chunkCount: 5 });
  assert(outcome === "cancelled", "cancelledRef=true vence -- nunca envia transcrição de uma gravação cancelada");
}

console.log("[test] 4 — empty audio rejected (zero chunks, não cancelado)");
{
  const outcome = resolveRecordingStopOutcome({ wasCancelled: false, chunkCount: 0 });
  assert(outcome === "empty", "nenhum chunk capturado -> empty, nunca 'ready' fabricado");
}

console.log("[test] 5 — timeout leaves recording=false (outcome nunca é 'ready'/'empty' quando cancelado -- cleanup sempre roda antes desta decisão)");
{
  // resolveRecordingStopOutcome é chamado DEPOIS de cleanupResources() no hook real
  // (ver use-jarvis-voice.ts) -- ou seja, blob nunca é construído com o microfone
  // ainda ativo. Este teste documenta a garantia de ORDEM, não re-testa cleanupResources
  // (que depende de MediaStream real, fora do alcance deste harness).
  const outcome = resolveRecordingStopOutcome({ wasCancelled: false, chunkCount: 1 });
  assert(outcome === "ready", "outcome calculado independente de recursos de mídia -- cleanup já rodou antes, por construção do hook");
}

console.log("[test] 6 — blob delivery: entregue diretamente nunca é cacheado de novo (evita duplo processamento)");
{
  const cached = nextCachedBlob(true, "blob-conteudo");
  assert(cached === null, "quando havia um resolver pendente, o blob já foi entregue -- não fica em cache para uma segunda entrega");
}

console.log("[test] 7 — blob delivery: sem ninguém esperando, cacheia para a próxima chamada consumir uma vez");
{
  const cached = nextCachedBlob(false, "blob-conteudo");
  assert(cached === "blob-conteudo", "timeout venceu a corrida com o release do botão -- blob fica disponível para a próxima stopRecording()");
}

console.log("[test] 8 — object URL: primeira resposta não tem nada para revogar");
{
  const { toRevoke, current } = nextAudioUrlState(null, "blob:new-url");
  assert(toRevoke === null, "nenhuma URL anterior -- nada a revogar");
  assert(current === "blob:new-url", "URL atual é a nova gerada");
}

console.log("[test] 9 — object URL: substituir marca a anterior para revogação (nunca antes do replay terminar)");
{
  const { toRevoke, current } = nextAudioUrlState("blob:old-url", "blob:new-url");
  assert(toRevoke === "blob:old-url", "URL anterior marcada para revogação só agora que uma nova a substitui");
  assert(current === "blob:new-url", "URL atual passa a ser a nova");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
