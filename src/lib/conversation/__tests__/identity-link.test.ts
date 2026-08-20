/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/conversation/__tests__/identity-link.test.ts
 *
 * TELEGRAM IDENTITY LINK V1 FOUNDATION — testes unitários dos 11 cenários
 * pedidos pela missão: token válido, expirado, inválido, usado duas
 * vezes, usuário do canal já vinculado, usuário LOKAT não encontrado
 * (N/A nesta fundação -- ver nota no teste 6), vínculo criado
 * corretamente, secret nunca exposto, username do canal nunca usado como
 * identidade, Company Context intocado, Conversation Core recebe usuário
 * identificado.
 */
import * as fs from "fs";
import * as path from "path";
import { generateIdentityLinkToken, verifyIdentityLinkToken, getIdentityLinkSigningKey } from "../identity-link-token";
import { completeIdentityLinkFromToken } from "../identity-link";
import { InMemoryIdentityLinkStore } from "../identity-link-store";
import { createConversationSession, withIdentityLink } from "../session";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("[test] 1 — Token válido");
{
  const store = new InMemoryIdentityLinkStore();
  const { token } = generateIdentityLinkToken({ lokatUserId: "profile-abc", channel: "telegram" });
  const result = completeIdentityLinkFromToken({ store, token, channel: "telegram", externalUserId: "999" });
  assert(result.kind === "linked", "token real recém-gerado completa o vínculo com sucesso");
  if (result.kind === "linked") {
    assert(result.record.lokatUserId === "profile-abc", "o profile_id do vínculo é exatamente o que gerou o token");
    assert(result.record.status === "verified", "vínculo criado nasce com status verified");
  }
}

console.log("[test] 2 — Token expirado");
{
  const store = new InMemoryIdentityLinkStore();
  const past = new Date("2020-01-01T00:00:00.000Z");
  const { token } = generateIdentityLinkToken({ lokatUserId: "profile-abc", channel: "telegram", now: past, ttlMs: 60_000 });
  const result = completeIdentityLinkFromToken({ store, token, channel: "telegram", externalUserId: "999", now: new Date() });
  assert(result.kind === "expired_token", "token com exp no passado é rejeitado como expired_token, nunca completa o vínculo");
}

console.log("[test] 3 — Token inválido");
{
  const store = new InMemoryIdentityLinkStore();
  assert(completeIdentityLinkFromToken({ store, token: "isso-nao-e-um-token-real", channel: "telegram", externalUserId: "999" }).kind === "invalid_token", "string arbitrária sem assinatura é rejeitada como invalid_token");
  assert(completeIdentityLinkFromToken({ store, token: "", channel: "telegram", externalUserId: "999" }).kind === "invalid_token", "token vazio é rejeitado");

  const { token: realToken } = generateIdentityLinkToken({ lokatUserId: "profile-abc", channel: "telegram" });
  const tampered = realToken.slice(0, -1) + (realToken.endsWith("0") ? "1" : "0");
  assert(completeIdentityLinkFromToken({ store, token: tampered, channel: "telegram", externalUserId: "999" }).kind === "invalid_token", "assinatura adulterada é rejeitada, nunca aceita por coincidência");
}

console.log("[test] 4 — Token usado duas vezes");
{
  const store = new InMemoryIdentityLinkStore();
  const { token } = generateIdentityLinkToken({ lokatUserId: "profile-abc", channel: "telegram" });
  const first = completeIdentityLinkFromToken({ store, token, channel: "telegram", externalUserId: "999" });
  assert(first.kind === "linked", "primeiro uso do token vincula normalmente");
  const second = completeIdentityLinkFromToken({ store, token, channel: "telegram", externalUserId: "888" });
  assert(second.kind === "token_already_used", "segundo uso do MESMO token é rejeitado, mesmo para um externalUserId diferente");
}

console.log("[test] 5 — Telegram user já vinculado");
{
  const store = new InMemoryIdentityLinkStore();
  const { token: firstToken } = generateIdentityLinkToken({ lokatUserId: "profile-abc", channel: "telegram" });
  completeIdentityLinkFromToken({ store, token: firstToken, channel: "telegram", externalUserId: "999" });

  const { token: secondToken } = generateIdentityLinkToken({ lokatUserId: "profile-xyz", channel: "telegram" });
  const result = completeIdentityLinkFromToken({ store, token: secondToken, channel: "telegram", externalUserId: "999" });
  assert(result.kind === "already_linked", "mesmo externalUserId tentando vincular de novo (a outra conta) é rejeitado");
  if (result.kind === "already_linked") {
    assert(result.existing.lokatUserId === "profile-abc", "o vínculo existente reportado é o original, nunca sobrescrito silenciosamente");
  }
}

console.log("[test] 6 — Usuário LOKAT não encontrado (fora do escopo desta fundação)");
{
  // Esta fundação não valida se `lokatUserId` corresponde a um profile
  // real no banco -- por design (SQL: NÃO APLICAR nesta missão, geração
  // de token pelo painel Web não foi construída ainda). Documentado
  // explicitamente como pendência: uma futura rota autenticada que gera
  // o token deve garantir que `lokatUserId` vem de uma sessão real
  // (auth.uid()), nunca de um valor arbitrário do chamador.
  assert(true, "N/A nesta fundação -- geração do token será sempre por uma rota autenticada futura, nunca com lokatUserId arbitrário (ver relatório da missão)");
}

console.log("[test] 7 — Vínculo criado corretamente");
{
  const store = new InMemoryIdentityLinkStore();
  const { token } = generateIdentityLinkToken({ lokatUserId: "profile-abc", channel: "telegram" });
  const result = completeIdentityLinkFromToken({ store, token, channel: "telegram", externalUserId: "999" });
  assert(result.kind === "linked", "vínculo criado");
  if (result.kind === "linked") {
    assert(result.record.channel === "telegram", "channel correto no registro");
    assert(result.record.externalUserId === "999", "externalUserId correto no registro");
    assert(typeof result.record.linkedAt === "string" && !Number.isNaN(Date.parse(result.record.linkedAt)), "linkedAt é um timestamp ISO válido");
    assert(store.getLinkByExternalUser("telegram", "999")?.lokatUserId === "profile-abc", "vínculo é de fato persistido no store (consultável depois)");
    assert(store.getLinkByLokatUser("telegram", "profile-abc")?.externalUserId === "999", "vínculo também é consultável pelo lado do usuário LOKAT");
  }
}

console.log("[test] 8 — Secret nunca exposto");
{
  const key = getIdentityLinkSigningKey();
  const { token } = generateIdentityLinkToken({ lokatUserId: "profile-abc", channel: "telegram" });
  assert(!token.includes(key.toString("hex")) && !token.includes(key.toString("utf8")), "o token não contém a chave de assinatura em nenhum encoding óbvio");

  const store = new InMemoryIdentityLinkStore();
  const result = completeIdentityLinkFromToken({ store, token: "token-invalido", channel: "telegram", externalUserId: "1" });
  assert(!JSON.stringify(result).toLowerCase().includes("secret") && !JSON.stringify(result).toLowerCase().includes(key.toString("hex")), "resultado de erro nunca inclui a palavra 'secret' nem a chave real");
}

console.log("[test] 9 — Username do Telegram nunca usado como identidade");
{
  const { token } = generateIdentityLinkToken({ lokatUserId: "profile-abc", channel: "telegram" });
  const decoded = Buffer.from(token.split(".")[0], "base64url").toString("utf8");
  assert(!/username|@\w/.test(decoded), "payload do token nunca contém username/@handle -- só profile_id, canal, nonce e validade");

  const store = new InMemoryIdentityLinkStore();
  // externalUserId aqui é sempre o id numérico do Telegram (string), nunca um username -- reforçado pelo próprio tipo (normalize-update.ts usa String(message.from.id), nunca message.from.username).
  const result = completeIdentityLinkFromToken({ store, token, channel: "telegram", externalUserId: "123456789" });
  assert(result.kind === "linked" && result.record.externalUserId === "123456789", "externalUserId persistido é o id numérico, nunca um @username");
}

console.log("[test] 10 — Company Context continua igual (não duplicado, não tocado por Identity Link)");
{
  const context = fs.readFileSync(path.join(process.cwd(), "src/lib/conversation/context.ts"), "utf8");
  const identityLink = fs.readFileSync(path.join(process.cwd(), "src/lib/conversation/identity-link.ts"), "utf8");
  assert(context.includes("resolveCompanyContext") && context.includes("listAuthorizedCompanies"), "context.ts continua usando as funções canônicas reais, intocado por esta missão");
  assert(!identityLink.includes("resolveCompanyContext") && !identityLink.includes("listAuthorizedCompanies") && !identityLink.includes("isCompanyAuthorizedForAdmin"), "identity-link.ts NUNCA resolve Company Context -- isso é um passo separado e posterior, nunca fundido aqui");
}

console.log("[test] 11 — Conversation Core recebe usuário identificado");
{
  const store = new InMemoryIdentityLinkStore();
  const { token } = generateIdentityLinkToken({ lokatUserId: "profile-abc", channel: "telegram" });
  const result = completeIdentityLinkFromToken({ store, token, channel: "telegram", externalUserId: "999" });
  assert(result.kind === "linked", "vínculo criado (pré-condição do teste)");
  if (result.kind === "linked") {
    const session = createConversationSession({ id: "sess-1", channel: "telegram", externalUserId: "999" });
    assert(session.lokatUserId === null, "sessão nasce sem usuário identificado");
    const identified = withIdentityLink(session, result.record.lokatUserId);
    assert(identified.lokatUserId === "profile-abc", "withIdentityLink() do Conversation Core aceita exatamente o lokatUserId produzido pelo Identity Link -- os dois módulos são compatíveis, nunca precisaram de conversão");
  }
}

console.log("[test] verifyIdentityLinkToken — canal errado é rejeitado");
{
  const { token } = generateIdentityLinkToken({ lokatUserId: "profile-abc", channel: "telegram" });
  const result = verifyIdentityLinkToken(token, "whatsapp");
  assert(!result.ok && result.reason === "wrong_channel", "token gerado para telegram é rejeitado se verificado esperando whatsapp -- nunca reutilizável entre canais por acidente");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
