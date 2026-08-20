/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/conversation/__tests__/conversation-core.test.ts
 *
 * LOKAT OS — CONVERSATION CORE FOUNDATION V1 — testes unitários das
 * funções puras: matching de intenção, router (honestidade de maturidade),
 * ciclo de vida de sessão e Identity Link. Nenhum teste aqui toca rede/
 * banco -- tudo é função pura, testável sem infraestrutura.
 */
import { matchConversationIntent, listConversationIntents, findConversationIntentById } from "../intents";
import { routeConversationMessage, resolveDomainTarget } from "../router";
import {
  createConversationSession, withCompanyContext, withIntent, isSessionExpired,
  createIdentityLinkRequest, isIdentityLinkRequestExpired, completeIdentityLink,
  InMemoryConversationSessionStore,
} from "../session";
import { isConversationChannel, CHANNEL_REGISTRY } from "../channels";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("[test] matchConversationIntent — casamento determinístico, sem LLM");
{
  assert(matchConversationIntent("Quero vender mais")?.id === "growth", "'quero vender mais' casa com growth");
  assert(matchConversationIntent("quero criar uma campanha")?.id === "growth", "'criar campanha' casa com growth");
  assert(matchConversationIntent("Quero criar um vídeo")?.id === "content", "'criar um vídeo' casa com content");
  assert(matchConversationIntent("qual foi o último deploy?")?.id === "status", "'último deploy' casa com status (acento ignorado)");
  assert(matchConversationIntent("como está o estoque?")?.id === "meu_negocio", "'estoque' casa com meu_negocio");
  assert(matchConversationIntent("blablabla sem sentido nenhum") === null, "mensagem sem correspondência retorna null, nunca um chute");
  assert(matchConversationIntent("") === null, "mensagem vazia retorna null");
  assert(listConversationIntents().length === 6, "catálogo tem exatamente as 6 intents V1 do card");
  assert(findConversationIntentById("growth")?.moduleId === "rec_os_growth", "growth aponta para o moduleId real rec_os_growth");
}

console.log("[test] routeConversationMessage / resolveDomainTarget — nunca finge maturidade");
{
  const noMatch = routeConversationMessage("mensagem aleatória sem intenção nenhuma");
  assert(noMatch.intent === null && noMatch.domain === null, "sem intenção reconhecida, nenhum domínio é inventado");

  const growth = routeConversationMessage("quero criar campanha");
  assert(growth.intent?.id === "growth", "intent growth resolvida");
  assert(growth.domain?.moduleId === "rec_os_growth", "domínio aponta para rec_os_growth");
  assert(growth.domain?.maturity !== "production" && !!growth.domain?.honestNotice, "rec_os_growth não é production hoje -- aviso honesto presente, nunca omitido");

  const influenceTarget = resolveDomainTarget(findConversationIntentById("influence")!);
  assert(influenceTarget.maturity === "not_implemented" && !!influenceTarget.honestNotice, "influence_os é not_implemented -- nunca finge dado disponível");

  const meuNegocioTarget = resolveDomainTarget(findConversationIntentById("meu_negocio")!);
  assert(meuNegocioTarget.maturity === "preview" && !!meuNegocioTarget.honestNotice, "meu_negocio é preview (100% fixture) -- aviso honesto presente, nunca reportado como dado real");
}

console.log("[test] Ciclo de vida da sessão — funções puras, imutáveis");
{
  const now = new Date("2026-08-20T10:00:00.000Z");
  const s0 = createConversationSession({ id: "sess-1", channel: "telegram", externalUserId: "123456", now });
  assert(s0.status === "awaiting_company", "sessão nasce awaiting_company (sem empresa resolvida ainda)");
  assert(s0.lokatUserId === null && s0.companyId === null, "sessão nasce sem identidade/empresa vinculada");

  const later = new Date(now.getTime() + 1000);
  const s1 = withCompanyContext(s0, "company-abc", later);
  assert(s1.status === "active" && s1.companyId === "company-abc", "withCompanyContext ativa a sessão e fixa a empresa");
  assert(s0.status === "awaiting_company", "createConversationSession original não foi mutada (imutabilidade)");

  const s2 = withIntent(s1, "growth", later);
  assert(s2.currentIntentId === "growth", "withIntent fixa a intenção atual");

  const stale = new Date(now.getTime() + 1000 * 60 * 60); // 1h depois
  assert(isSessionExpired(s1, stale), "sessão parada há 1h expira com o TTL padrão (30min)");
  assert(!isSessionExpired(s1, later), "sessão recém-atualizada não expira");
}

console.log("[test] Identity Link — token temporário, nunca username como identidade");
{
  const now = new Date("2026-08-20T10:00:00.000Z");
  const request = createIdentityLinkRequest({ channel: "telegram", lokatUserId: "user-1", temporaryToken: "abc123", now });
  assert(!isIdentityLinkRequestExpired(request, now), "token recém-criado não está expirado");

  const expired = new Date(now.getTime() + 1000 * 60 * 60); // 1h depois (TTL padrão é 10min)
  assert(isIdentityLinkRequestExpired(request, expired), "token expira após o TTL padrão");

  const linked = completeIdentityLink(request, "telegram-numeric-id-999", now);
  assert(linked?.externalUserId === "telegram-numeric-id-999" && linked?.lokatUserId === "user-1", "vínculo completo usa o id numérico/estável do canal, nunca um username");

  const deniedByExpiry = completeIdentityLink(request, "telegram-numeric-id-999", expired);
  assert(deniedByExpiry === null, "vínculo é recusado quando o token já expirou");
}

console.log("[test] InMemoryConversationSessionStore — referência de teste, nunca persistência real");
{
  const store = new InMemoryConversationSessionStore();
  assert(store.get("nao-existe") === null, "get de sessão inexistente retorna null");
  const s = createConversationSession({ id: "sess-2", channel: "web", externalUserId: "web-user-1" });
  store.save(s);
  assert(store.get("sess-2")?.id === "sess-2", "save/get funcionam em memória");
  store.delete("sess-2");
  assert(store.get("sess-2") === null, "delete remove a sessão");
}

console.log("[test] Canais — registry e type guard");
{
  assert(isConversationChannel("telegram") && isConversationChannel("whatsapp") && isConversationChannel("web"), "os 3 canais válidos passam no type guard");
  assert(!isConversationChannel("discord"), "canal não registrado é rejeitado pelo type guard");
  assert(CHANNEL_REGISTRY.web.status === "implemented", "web é o único canal implemented hoje");
  // TELEGRAM ADAPTER V1: adapter/webhook/sender reais e testados, mas
  // setWebhook nunca foi chamado -- code_ready, não implemented ainda.
  assert(CHANNEL_REGISTRY.telegram.status === "code_ready", "telegram honestamente code_ready (código real e testado, sem tráfego real ainda)");
  assert(CHANNEL_REGISTRY.whatsapp.status === "not_connected", "whatsapp honestamente not_connected");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
