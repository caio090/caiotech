/**
 * Executar com: node .tmp/run-ts-test.cjs src/components/jarvis/__tests__/gota-state.test.ts
 * Sprint Command Center + Jarvis Context V1 (Gota no Jarvis) — decisão pura
 * de estado visual da Gota (idle/thinking/listening/speaking), extraída
 * para ser testável sem DOM/React (mesmo padrão de voice-state.test.ts).
 */
import { resolveJarvisGotaState } from "../gota-state";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("[test] 1 — idle: sem chat em andamento e sem atividade de voz");
{
  assert(resolveJarvisGotaState("idle", "idle") === "idle", "chat idle + voice idle -> idle");
  assert(resolveJarvisGotaState("completed", "idle") === "idle", "chat completed + voice idle -> idle (resposta pronta, sem atividade nova)");
}

console.log("[test] 2 — thinking: reage durante o envio/streaming da resposta");
{
  assert(resolveJarvisGotaState("sending", "idle") === "thinking", "chat sending -> thinking");
  assert(resolveJarvisGotaState("streaming", "idle") === "thinking", "chat streaming -> thinking");
}

console.log("[test] 3 — listening: reage sutilmente enquanto o microfone ouve");
{
  assert(resolveJarvisGotaState("idle", "listening") === "listening", "voice listening -> listening, mesmo com chat idle");
}

console.log("[test] 4 — speaking: reação mais evidente quando voice.status === 'speaking'");
{
  assert(resolveJarvisGotaState("idle", "speaking") === "speaking", "voice speaking -> speaking");
  assert(resolveJarvisGotaState("completed", "speaking") === "speaking", "voice speaking vence mesmo com chat já completed (TTS tocando a resposta pronta)");
}

console.log("[test] 5 — estados nunca colidem: prioridade fixa speaking > listening > thinking > idle");
{
  assert(resolveJarvisGotaState("streaming", "speaking") === "speaking", "speaking vence thinking (streaming) quando os dois seriam candidatos");
  assert(resolveJarvisGotaState("streaming", "listening") === "listening", "listening vence thinking (streaming)");
  assert(resolveJarvisGotaState("sending", "speaking") === "speaking", "speaking vence thinking (sending)");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
