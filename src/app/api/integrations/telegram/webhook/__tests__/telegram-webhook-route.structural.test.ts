/**
 * Executar com: node .tmp/run-ts-test.cjs src/app/api/integrations/telegram/webhook/__tests__/telegram-webhook-route.structural.test.ts
 *
 * TELEGRAM ADAPTER V1 — verificação estática do route.ts (mesmo padrão de
 * src/app/api/debug/__tests__/require-admin.test.ts: a decisão pura já é
 * coberta por unit tests em src/lib/telegram/__tests__/, aqui só se prova
 * que a ROTA de fato usa essas funções, na ordem certa, e nunca vaza
 * secret/token nem cai em 500 por payload inválido).
 */
import * as fs from "fs";
import * as path from "path";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

const route = read("src/app/api/integrations/telegram/webhook/route.ts");

console.log("[test] A/B/C — validação de secret acontece antes de qualquer outra coisa, usando a função pura real");
{
  assert(route.includes("evaluateTelegramWebhookSecret"), "rota usa evaluateTelegramWebhookSecret() -- nunca reimplementa a comparação localmente");
  assert(route.includes('x-telegram-bot-api-secret-token'), "rota lê o header oficial do Telegram (X-Telegram-Bot-Api-Secret-Token)");
  assert(route.includes("process.env.TELEGRAM_WEBHOOK_SECRET"), "rota lê o secret de uma env var server-side, nunca hardcoded");
  assert(!/NEXT_PUBLIC_TELEGRAM/i.test(route), "nenhuma env NEXT_PUBLIC_* relacionada a Telegram -- nunca exposta ao client");
  assert(/fail_closed_no_secret_configured[\s\S]{0,200}status:\s*503/.test(route), "secret ausente => 503 (fail closed), antes de ler o body");
  assert(/rejected_invalid_secret[\s\S]{0,80}status:\s*401/.test(route), "secret incorreto => 401");
  const secretCheckIndex = route.indexOf("evaluateTelegramWebhookSecret");
  const bodyParseIndex = route.indexOf("req.json()");
  assert(secretCheckIndex > -1 && bodyParseIndex > -1 && secretCheckIndex < bodyParseIndex, "validação de secret acontece ANTES do parse do body -- nunca processa payload de origem não verificada");
}

console.log("[test] D — payload inválido nunca vira 500");
{
  assert(/try\s*\{[\s\S]*?req\.json\(\)[\s\S]*?\}\s*catch/.test(route), "parse do body está em try/catch -- JSON malformado nunca derruba a rota");
  assert(/catch[\s\S]{0,150}status:\s*400/.test(route), "payload inválido responde 400 controlado, nunca deixa a exceção subir");
}

console.log("[test] E — update não suportado nunca vira 500");
{
  assert(route.includes('normalized.kind === "unsupported"'), "rota trata explicitamente o caso 'unsupported' do normalizador");
  assert(/unsupported[\s\S]{0,400}status:\s*200/.test(route), "update não suportado responde 200 (ack), nunca 5xx -- evita retry infinito do Telegram");
}

console.log("[test] F — nenhum secret/token aparece em nenhuma resposta ao cliente");
{
  const jsonResponseBlocks = route.match(/NextResponse\.json\(\{[^}]*\}/g) ?? [];
  assert(jsonResponseBlocks.length > 0, "rota de fato usa NextResponse.json (sanidade do teste)");
  for (const block of jsonResponseBlocks) {
    assert(!/token|secret/i.test(block), `resposta JSON nunca inclui token/secret: ${block.slice(0, 60)}...`);
  }
  assert(!/console\.(log|error|warn)\([^)]*\.text\b/.test(route), "rota nunca loga o texto da mensagem do usuário");
  assert(!/console\.(log|error|warn)\([^)]*(TELEGRAM_BOT_TOKEN|TELEGRAM_WEBHOOK_SECRET)/.test(route), "rota nunca loga as env vars de token/secret");
}

console.log("[test] G — nenhuma leitura privada acontece na rota (delegada a decideTelegramReply, sem Identity Link)");
{
  assert(route.includes("decideTelegramReply"), "rota delega a decisão de resposta para decideTelegramReply() -- nunca decide inline");
  assert(!/resolveCompanyContext|listAuthorizedCompanies|createSupabaseAdminClient|createServerSupabaseClient/.test(route), "rota do webhook Telegram nunca chama Company Context/Supabase diretamente -- Identity Link ainda não existe, nada privado é lido aqui");
}

console.log("[test] Reutilização do Conversation Core — nunca duplicado dentro do Telegram");
{
  const decideReply = read("src/lib/telegram/decide-reply.ts");
  assert(decideReply.includes('from "@/lib/conversation/router"') && decideReply.includes("routeConversationMessage"), "decide-reply.ts importa e usa routeConversationMessage() real, nunca um matcher próprio");
  assert(!/const CATALOG|function matchConversationIntent/.test(decideReply), "nenhum catálogo de intenção duplicado dentro da camada Telegram");
}

console.log("[test] Sem lógica de negócio dentro do Adapter/rota (CHANNEL ADAPTER puro)");
{
  const ALL_TELEGRAM_SOURCE = [
    route,
    read("src/lib/telegram/types.ts"),
    read("src/lib/telegram/normalize-update.ts"),
    read("src/lib/telegram/webhook-security.ts"),
    read("src/lib/telegram/client.ts"),
    read("src/lib/telegram/reply-copy.ts"),
    read("src/lib/telegram/decide-reply.ts"),
    read("src/lib/conversation/adapters/telegram.ts"),
  ].join("\n");
  assert(!/rec_os_growth_planner|content_items|meu_negocio\.ai|campaign_engine/.test(ALL_TELEGRAM_SOURCE), "nenhuma lógica de domínio (Growth/Content/Meu Negócio) implementada dentro da camada Telegram");
  assert(!/CREATE TABLE|ALTER TABLE/i.test(ALL_TELEGRAM_SOURCE), "nenhum SQL de schema em nenhum arquivo da camada Telegram");
}

console.log("[test] Typebot nunca alterado por esta missão");
{
  const typebotRoute = read("src/app/api/leads/typebot/route.ts");
  assert(typebotRoute.includes("LOKAT_TYPEBOT_WEBHOOK_SECRET"), "rota do Typebot continua com seu próprio mecanismo de secret, intocada");
  assert(!typebotRoute.includes("telegram") && !typebotRoute.includes("Telegram"), "rota do Typebot não referencia Telegram -- fluxos independentes confirmados");
  const proxySrc = read("src/proxy.ts");
  assert(proxySrc.includes('"/api/leads/typebot"'), "entrada pública do Typebot no proxy continua presente, intocada");
  assert(proxySrc.includes('"/api/integrations/telegram/webhook"'), "nova entrada pública do Telegram adicionada ao proxy (necessária -- mesmo padrão do Typebot)");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
