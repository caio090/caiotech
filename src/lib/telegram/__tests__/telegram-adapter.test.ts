/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/telegram/__tests__/telegram-adapter.test.ts
 *
 * TELEGRAM ADAPTER V1 — testes unitários das funções puras: normalização
 * de Update, detecção de comando, validação do secret do webhook, decisão
 * de resposta (nunca lê dado privado sem Identity Link) e o client de
 * envio (sendMessage), com fetch mockado -- nenhum teste toca rede real
 * nem token real.
 */
import { normalizeTelegramUpdate, detectTelegramCommand } from "../normalize-update";
import { evaluateTelegramWebhookSecret } from "../webhook-security";
import { decideTelegramReply } from "../decide-reply";
import { isTelegramBotTokenConfigured, sendTelegramMessage } from "../client";
import { TelegramChannelAdapter } from "@/lib/conversation/adapters/telegram";
import { InMemoryIdentityLinkStore } from "@/lib/conversation/identity-link-store";
import type { TelegramUpdate } from "../types";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

function privateTextUpdate(text: string, overrides: Partial<TelegramUpdate> = {}): TelegramUpdate {
  return {
    update_id: 100001,
    message: {
      message_id: 555,
      from: { id: 987654321, username: "someuser", first_name: "Some" },
      chat: { id: 987654321, type: "private" },
      text,
    },
    ...overrides,
  };
}

async function main() {
  console.log("[test] 1 — normalização de update válido (PRIVATE TEXT MESSAGE)");
  {
    const result = normalizeTelegramUpdate(privateTextUpdate("quero vender mais"));
    assert(result.kind === "message", "update privado com texto normaliza para 'message'");
    if (result.kind === "message") {
      assert(result.message.channel === "telegram", "channel = telegram");
      assert(result.message.text === "quero vender mais", "texto preservado");
    }
  }

  console.log("[test] 2 — ausência de text (foto/voice/document/etc.)");
  {
    const update: TelegramUpdate = {
      update_id: 2,
      message: { message_id: 1, from: { id: 1 }, chat: { id: 1, type: "private" } },
    };
    const result = normalizeTelegramUpdate(update);
    assert(result.kind === "unsupported", "message sem text é unsupported, nunca crash");
  }

  console.log("[test] 3 — /start (sem payload)");
  {
    assert(detectTelegramCommand("/start").kind === "start", "'/start' é reconhecido como comando start");
    const cmd = detectTelegramCommand("/start");
    assert(cmd.kind === "start" && cmd.payload === null, "sem payload, payload é null");
  }

  console.log("[test] 4 — /start <payload>");
  {
    const cmd = detectTelegramCommand("/start abc123token");
    assert(cmd.kind === "start" && cmd.payload === "abc123token", "payload extraído corretamente");
    const cmdWithBotName = detectTelegramCommand("/start@LokatBot xyz789");
    assert(cmdWithBotName.kind === "start" && cmdWithBotName.payload === "xyz789", "sufixo @BotName não quebra a extração do payload");
  }

  console.log("[test] 5 — /help");
  {
    assert(detectTelegramCommand("/help").kind === "help", "'/help' reconhecido");
    assert(detectTelegramCommand("/help me").kind === "help", "'/help' com texto adicional ainda reconhecido");
    assert(detectTelegramCommand("mensagem normal").kind === "text", "mensagem comum nunca é confundida com comando");
  }

  console.log("[test] 6 — private chat aceito");
  {
    const result = normalizeTelegramUpdate(privateTextUpdate("oi"));
    assert(result.kind === "message", "chat.type private é suportado nesta V1");
  }

  console.log("[test] 7 — group update ignorado (nunca crash, nunca 500)");
  {
    const groupUpdate: TelegramUpdate = {
      update_id: 4,
      message: { message_id: 1, from: { id: 1 }, chat: { id: -100123, type: "group" }, text: "oi" },
    };
    assert(normalizeTelegramUpdate(groupUpdate).kind === "unsupported", "chat.type 'group' é unsupported nesta V1");
    const channelUpdate: TelegramUpdate = { update_id: 3, channel_post: { message_id: 1, chat: { id: 1, type: "channel" }, text: "post" } };
    assert(normalizeTelegramUpdate(channelUpdate).kind === "unsupported", "update sem 'message' (ex.: channel_post) é unsupported, nunca lança exceção");
  }

  console.log("[test] 8 — malformed update (sem crash)");
  {
    assert(normalizeTelegramUpdate({ update_id: 1 } as TelegramUpdate).kind === "unsupported", "update sem message nenhum não lança exceção");
    assert(TelegramChannelAdapter.parseInbound(null) === null, "parseInbound(null) retorna null, nunca lança exceção");
    assert(TelegramChannelAdapter.parseInbound("string aleatoria") === null, "parseInbound(string) retorna null, nunca lança exceção");
    assert(TelegramChannelAdapter.parseInbound({}) === null, "parseInbound({}) retorna null (sem message)");
  }

  console.log("[test] 9/10 — externalUserId e chatId (chat privado: chat.id == from.id)");
  {
    const result = normalizeTelegramUpdate(privateTextUpdate("teste"));
    if (result.kind === "message") {
      assert(result.message.externalUserId === "987654321", "externalUserId extraído de from.id, sempre string");
      assert(result.message.externalConversationId === "987654321", "externalConversationId (chat.id) == externalUserId em chat privado");
    } else {
      assert(false, "resultado deveria ser 'message'");
    }
    const inbound = TelegramChannelAdapter.parseInbound(privateTextUpdate("teste 2"));
    assert(inbound?.externalUserId === "987654321", "TelegramChannelAdapter.parseInbound expõe o mesmo externalUserId");
  }

  console.log("[test] Ausência de Identity Link — nenhuma leitura privada é decidida sem vínculo");
  {
    const baseMsg = { channel: "telegram" as const, externalUserId: "1", externalConversationId: "1", metadata: { messageId: "1", updateId: "1" } };
    const store = new InMemoryIdentityLinkStore();
    assert(decideTelegramReply({ ...baseMsg, text: "/start" }, { kind: "start", payload: null }, store).includes("sendo preparada"), "/start sem token explica honestamente como conectar");
    assert(decideTelegramReply({ ...baseMsg, text: "/start abc" }, { kind: "start", payload: "abc" }, store).toLowerCase().includes("código"), "/start <token inválido> rejeita honestamente, nunca finge vínculo completo");
    assert(decideTelegramReply({ ...baseMsg, text: "/help" }, { kind: "help" }, store).includes("campanhas"), "/help lista capacidades");

    const growthReply = decideTelegramReply({ ...baseMsg, text: "quero vender mais" }, { kind: "text" }, store);
    assert(growthReply.toLowerCase().includes("vinculada"), "intenção de domínio (growth) nunca lê dado -- sempre exige conta vinculada");

    const meuNegocioReply = decideTelegramReply({ ...baseMsg, text: "qual o cmv" }, { kind: "text" }, store);
    assert(meuNegocioReply.toLowerCase().includes("vinculada"), "intenção meu_negocio também nunca lê dado sem vínculo");

    const unknownReply = decideTelegramReply({ ...baseMsg, text: "blablabla" }, { kind: "text" }, store);
    assert(unknownReply.includes("/help"), "mensagem sem intenção reconhecida sugere /help, nunca inventa resposta");
  }

  console.log("[test] Webhook secret — fail closed / rejeitado / aceito");
  {
    assert(evaluateTelegramWebhookSecret("qualquer-coisa", undefined) === "fail_closed_no_secret_configured", "secret não configurado => fail closed, MESMO com header presente");
    assert(evaluateTelegramWebhookSecret(null, undefined) === "fail_closed_no_secret_configured", "secret não configurado e sem header => ainda fail closed");
    assert(evaluateTelegramWebhookSecret("errado", "correto123") === "rejected_invalid_secret", "secret incorreto é rejeitado");
    assert(evaluateTelegramWebhookSecret(null, "correto123") === "rejected_invalid_secret", "header ausente com secret configurado é rejeitado, nunca aceito por omissão");
    assert(evaluateTelegramWebhookSecret("correto123", "correto123") === "accepted", "secret correto é aceito");
  }

  console.log("[test] 11/12/13/14 — sendTelegramMessage (fetch mockado, token nunca exposto)");
  {
    const originalFetch = global.fetch;
    const originalEnv = process.env.TELEGRAM_BOT_TOKEN;

    delete process.env.TELEGRAM_BOT_TOKEN;
    assert(!isTelegramBotTokenConfigured(), "isTelegramBotTokenConfigured() = false sem env");
    const notConfiguredBeforeSet = await sendTelegramMessage({ chatId: "999", text: "olá" });
    assert(notConfiguredBeforeSet.ok === false && notConfiguredBeforeSet.error === "not_configured", "sem TELEGRAM_BOT_TOKEN, sendTelegramMessage nunca tenta a chamada e retorna not_configured");

    try {
      process.env.TELEGRAM_BOT_TOKEN = "FAKE_TEST_TOKEN_NEVER_REAL";
      assert(isTelegramBotTokenConfigured(), "isTelegramBotTokenConfigured() = true com env setada");

      let capturedUrl = "";
      let capturedBody: unknown = null;
      (global as unknown as { fetch: typeof fetch }).fetch = (async (url: string, init?: RequestInit) => {
        capturedUrl = url;
        capturedBody = init?.body ? JSON.parse(init.body as string) : null;
        return { ok: true } as Response;
      }) as typeof fetch;

      const okResult = await sendTelegramMessage({ chatId: "999", text: "olá" });
      assert(okResult.ok === true, "sendTelegramMessage retorna ok=true em resposta 200");
      assert(capturedUrl.includes("FAKE_TEST_TOKEN_NEVER_REAL"), "a URL real da API contém o token (esperado -- é assim que o Bot API funciona)");
      assert((capturedBody as { chat_id: string })?.chat_id === "999" && (capturedBody as { text: string })?.text === "olá", "payload enviado tem chat_id e text corretos");

      (global as unknown as { fetch: typeof fetch }).fetch = (async () => ({ ok: false, status: 401 } as Response)) as typeof fetch;
      const apiErrorResult = await sendTelegramMessage({ chatId: "999", text: "olá" });
      assert(apiErrorResult.ok === false && apiErrorResult.error === "telegram_api_error", "erro da API do Telegram é reportado como telegram_api_error");
      assert(!JSON.stringify(apiErrorResult).includes("FAKE_TEST_TOKEN_NEVER_REAL"), "resultado do erro NUNCA contém o token, mesmo em falha da API");

      (global as unknown as { fetch: typeof fetch }).fetch = (async () => { throw new Error("fetch failed: ECONNREFUSED"); }) as typeof fetch;
      const networkErrorResult = await sendTelegramMessage({ chatId: "999", text: "olá" });
      assert(networkErrorResult.ok === false && networkErrorResult.error === "network_error", "falha de rede é reportada como network_error");
      assert(!JSON.stringify(networkErrorResult).includes("FAKE_TEST_TOKEN_NEVER_REAL"), "resultado de erro de rede NUNCA contém o token");
    } finally {
      global.fetch = originalFetch;
      if (originalEnv === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
      else process.env.TELEGRAM_BOT_TOKEN = originalEnv;
    }
  }

  console.log(`\n[result] ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
