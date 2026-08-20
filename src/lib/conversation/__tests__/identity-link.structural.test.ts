/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/conversation/__tests__/identity-link.structural.test.ts
 *
 * TELEGRAM IDENTITY LINK V1 FOUNDATION — verificação estática dos
 * requisitos de segurança/arquitetura da missão: nenhuma autorização
 * paralela criada, mesmo padrão de token HMAC de preview-session.ts
 * reutilizado (nunca inventado do zero), nenhum SQL aplicado, migration
 * proposta segue a convenção real de docs/supabase/.
 */
import * as fs from "fs";
import * as path from "path";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p: string) => fs.existsSync(path.join(root, p));

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

const CORE_FILES = [
  "src/lib/conversation/identity-link-token.ts",
  "src/lib/conversation/identity-link-store.ts",
  "src/lib/conversation/identity-link.ts",
];

console.log("[test] Estrutura da fundação criada");
for (const f of CORE_FILES) assert(exists(f), `${f} existe`);

const token = read("src/lib/conversation/identity-link-token.ts");
const store = read("src/lib/conversation/identity-link-store.ts");
const orchestrator = read("src/lib/conversation/identity-link.ts");
const types = read("src/lib/conversation/types.ts");
const ALL = [token, store, orchestrator].join("\n");

console.log("[test] Nenhuma autorização paralela criada (regra arquitetural item 6 da missão)");
{
  for (const forbidden of ["telegram_permissions", "telegram_company_access", "telegram_roles", "telegram_company_selector"]) {
    assert(!ALL.includes(forbidden), `nenhum arquivo desta fundação contém "${forbidden}"`);
  }
  assert(!orchestrator.includes("resolveCompanyContext") && !orchestrator.includes("listAuthorizedCompanies") && !orchestrator.includes("isCompanyAuthorizedForAdmin"), "identity-link.ts não resolve/duplica Company Context -- isso continua em context.ts, intocado");
}

console.log("[test] Token: mesmo padrão HMAC de preview-session.ts, nunca uma invenção nova");
{
  assert(token.includes("createHmac") && token.includes("timingSafeEqual") && token.includes("randomBytes") && token.includes("hkdfSync"), "usa os mesmos primitivos criptográficos (crypto nativo) já estabelecidos em preview-session.ts");
  assert(token.includes("CONVERSATION_IDENTITY_LINK_SECRET"), "env var dedicada e canal-agnóstica (não TELEGRAM_-prefixada) -- pronta para WhatsApp reusar");
  assert(!token.includes("jsonwebtoken") && !token.includes('from "jwt"'), "nenhuma lib de JWT nova instalada -- mesmo esquema stateless já usado no repositório");
  assert(/isRealProduction[\s\S]{0,120}VERCEL_ENV/.test(token), "fail-closed em Production real sem a env dedicada, mesmo modelo de preview-session.ts");
}

console.log("[test] Token nunca contém dado privado (nome/e-mail/telefone/username do canal)");
{
  assert(!/first_name|username|email|phone|telefone/i.test(token.replace(/\/\*\*[\s\S]*?\*\//g, "")), "código do token (fora de comentários) nunca referencia nome/username/e-mail/telefone");
  assert(token.includes("uid: input.lokatUserId"), "payload do token carrega só o profile_id (uid), nunca username/nome/e-mail");
}

console.log("[test] Estados de vínculo (PENDING/VERIFIED/REVOKED/EXPIRED) registrados honestamente");
{
  assert(types.includes('"verified" | "revoked"'), "IdentityLinkStatus modela verified/revoked -- pending/expired já cobertos por IdentityLinkRequest/isIdentityLinkRequestExpired()");
  assert(!orchestrator.includes('"revoked"') || orchestrator.includes("nunca dispar"), "revogação não é disparada por esta missão (item 12: 'não criar fluxo completo de revogação nesta fase')");
}

console.log("[test] Nenhum fluxo completo de revogação implementado");
{
  assert(!/function revokeIdentityLink|export function revoke/i.test(ALL), "nenhuma função de revogação exportada nesta missão");
}

console.log("[test] Store: apenas referência em memória, nunca uma tabela real");
{
  assert(store.includes("class InMemoryIdentityLinkStore") && store.includes("new Map"), "implementação é Map-based em memória");
  assert(!/from\s+["'][^"']*supabase[^"']*["']|createServerSupabaseClient\s*\(|createSupabaseAdminClient\s*\(/i.test(store), "store.ts não importa/instancia nenhum cliente Supabase (comentários de prosa mencionando 'Supabase' são esperados e não contam)");
  assert(!/CREATE TABLE|ALTER TABLE/i.test(ALL), "nenhum SQL de schema em nenhum arquivo da fundação");
}

console.log("[test] Migration proposta (nunca aplicada) segue a convenção real de docs/supabase/");
{
  assert(exists("docs/supabase/93-identity-links.sql"), "arquivo de migration proposta existe");
  const migration = read("docs/supabase/93-identity-links.sql");
  assert(/STATUS:\s*PROPOSTA\s*—?\s*NÃO EXECUTAR/i.test(migration), "header explícito 'STATUS: PROPOSTA — NÃO EXECUTAR', mesmo padrão de 86-provider-foundation.sql");
  assert(migration.includes("profile_id") && migration.includes("REFERENCES") && migration.includes("profiles(id)"), "FK aponta para profiles(id) (profile_id), nunca client_id/empresa -- confirmado pela auditoria desta missão");
  assert(!migration.includes("client_id"), "tabela de Identity Link nunca referencia client_id -- vínculo é só de usuário, Company Context é resolvido depois, separadamente");
  assert(migration.includes("ENABLE ROW LEVEL SECURITY"), "RLS habilitado, mesmo padrão de 86-provider-foundation.sql/91-company-diagnostic-roadmap.sql");
  assert(migration.includes("IF NOT EXISTS"), "idempotente (IF NOT EXISTS), mesmo padrão de todas as migrations amostradas");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
