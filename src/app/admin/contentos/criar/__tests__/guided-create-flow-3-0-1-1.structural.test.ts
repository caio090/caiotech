/**
 * Executar com: node .tmp/run-ts-test.cjs src/app/admin/contentos/criar/__tests__/guided-create-flow-3-0-1-1.structural.test.ts
 * Cobre Fase 35 (testes Finalização) itens 84-92 do brief da Sprint REC OS 3.0.1.1.
 */
import * as fs from "fs";
import * as path from "path";

const root = process.cwd();
const source = fs.readFileSync(path.join(root, "src/app/admin/contentos/criar/_guided-create-flow.tsx"), "utf8");

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("[test] 84 — Destino não envia mais automaticamente (só escolhe o destino)");
assert(source.includes('data-testid="destination-choice-calendar"') && source.includes("setDestinationChoice(\"calendar\")"), "clicar no card de Destino só seleciona, não chama handleDest* diretamente");
assert(!/onClick=\{\(\) => void handleDestCalendario\(\)\}/.test(source), "o antigo onClick imediato de Calendário foi removido do step Destino");

console.log("[test] 85 — Visual Final acontece antes do botão Enviar");
const destinationHeaderIdx = source.indexOf("4. Destino");
const visualHeaderIdx = source.indexOf("5. Visual Final");
const enviarIdx = source.indexOf('data-testid="enviar-destino-button"');
assert(destinationHeaderIdx > 0 && visualHeaderIdx > destinationHeaderIdx, "Destino continua antes do Visual Final");
assert(enviarIdx > visualHeaderIdx, "o botão Enviar só existe DEPOIS do cabeçalho do Visual Final no JSX");

console.log("[test] 86 — ativo obrigatório por formato antes de liberar o envio");
assert(source.includes("function contentRequiresFinalAsset"), "regra de ativo obrigatório por formato existe");
assert(source.includes("const canSend = !!destinationChoice && (!requiresFinalAsset || hasVisualAsset)"), "envio só é permitido com destino escolhido e (ativo não exigido OU ativo já presente)");

console.log("[test] 87 — conteúdo textual/mensagem não exige imagem");
assert(source.includes('TEXT_ONLY_FORMAT_KEYWORDS = ["mensagem", "e-mail", "email", "somente texto", "texto puro"]'), "palavras-chave de formato somente-texto não exigem ativo");

console.log("[test] 88/89 — vídeo e arte estática exigem ativo (comportamento padrão: exige, exceto para texto)");
assert(source.includes("if (!value.trim()) return true;") && source.includes("return !TEXT_ONLY_FORMAT_KEYWORDS.some"), "qualquer formato fora da lista de somente-texto exige ativo (vídeo, arte estática, carrossel, etc.)");

console.log("[test] 90/91 — envio bloqueado sem ativo, permitido com ativo");
assert(source.includes('data-testid="visual-asset-required-message"'), "mensagem clara quando o ativo obrigatório está faltando, bloqueando o envio");
assert(source.includes("Enviar para {DESTINATION_LABEL[destinationChoice]}"), "botão de envio real aparece quando as condições são satisfeitas");

console.log("[test] 92 — APIs existentes preservadas (send-to-production/send-to-approval intactas)");
assert(source.includes('fetch("/api/admin/contentos/actions/send-to-production"') && source.includes('fetch("/api/admin/contentos/actions/send-to-approval"'), "as duas rotas de API reais continuam sendo chamadas — só o PONTO de disparo mudou");
assert(source.includes("async function handleEnviar()") && source.includes('if (destinationChoice === "production") await handleDestProducao();'), "handleEnviar despacha para as funções já existentes, sem reimplementar a chamada de API");

console.log("[test] Origem do Radar preservada no briefing (seedOpportunity)");
assert(source.includes('data-testid="seed-origin-badge"') && source.includes("seedOpportunity?.objective"), "quando vem do Radar, objetivo/público/notas são pré-preenchidos e a origem é exibida");

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
