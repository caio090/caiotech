/**
 * Executar com: node src/lib/supabase/__tests__/authorization-guard.test.ts
 * Sprint Legacy Security Hardening V2 (PROMPT 04A, Fase 21-22): testes
 * comportamentais reais (não apenas regex sobre texto) dos helpers que
 * decidem se um fallback privilegiado (service_role) pode rodar depois de
 * uma RPC falhar. O contrato central: uma negação de autorização é FINAL;
 * "service_role disponível" NUNCA significa "autorização concedida" --
 * cada mock abaixo prova isso explicitamente (true / false / null /
 * not_found / erro de RPC / erro de autorização).
 */
import {
  isAuthorizationDeniedError,
  isRpcUnavailableError,
  canAccessClientIndependently,
  classifyRpcError,
  shouldAttemptPrivilegedFallback,
} from "../authorization-guard.ts";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("[test] isAuthorizationDeniedError — reconhece os 3 marcadores usados pelas RPCs reais");
{
  assert(isAuthorizationDeniedError({ message: "permission_denied: role admin nao pode arquivar clientes" }), "detecta 'permission_denied' (archive/restore/delete)");
  assert(isAuthorizationDeniedError({ message: "permission_denied: sem acesso a este client_id" }), "detecta 'permission_denied' (ownership)");
  assert(isAuthorizationDeniedError({ message: "forbidden" }), "detecta 'forbidden' (Meta/OlaClick RPCs, P0002)");
  assert(isAuthorizationDeniedError({ message: "unauthorized: p_created_by must match the caller" }), "detecta 'unauthorized' (admin_create_client)");
  assert(isAuthorizationDeniedError({ message: "PERMISSION_DENIED: role X" }), "case-insensitive");
}

console.log("[test] isAuthorizationDeniedError — NÃO confunde erro técnico com negação de autorização");
{
  assert(!isAuthorizationDeniedError({ code: "PGRST202", message: "Could not find the function public.admin_archive_clients" }), "RPC ausente (schema desatualizado) não é denial");
  assert(!isAuthorizationDeniedError({ message: "schema cache reload required" }), "schema cache stale não é denial");
  assert(!isAuthorizationDeniedError({ message: "connection timeout" }), "erro transiente de conexão não é denial");
  assert(!isAuthorizationDeniedError(null), "erro nulo (sucesso) não é denial");
  assert(!isAuthorizationDeniedError(undefined), "erro undefined não é denial");
}

console.log("[test] isRpcUnavailableError — só função ausente/schema desatualizado, nunca negação");
{
  assert(isRpcUnavailableError({ code: "PGRST202" }), "código PGRST202 é RPC unavailable");
  assert(isRpcUnavailableError({ message: "Could not find the function public.foo in the schema cache" }), "mensagem de função ausente é RPC unavailable");
  assert(!isRpcUnavailableError({ message: "permission_denied: role admin nao pode arquivar clientes" }), "negação de autorização NÃO é RPC unavailable (nunca confundir os dois motivos)");
  assert(!isRpcUnavailableError(null), "sem erro não é RPC unavailable");
}

console.log("[test] classifyRpcError — classificação explícita em exatamente uma categoria (PROMPT 04E, Fase 2)");
{
  const DENIED = { message: "permission_denied: sem acesso a este client_id" };
  const UNAVAILABLE = { code: "PGRST202", message: "Could not find the function public.foo" };
  const UNKNOWN = { code: "XX000", message: "connection reset by peer" };
  const VALIDATION = { code: "22P02", message: "invalid input syntax for type uuid" };

  assert(classifyRpcError(null) === "success", "sem erro → success");
  assert(classifyRpcError(DENIED) === "authorization_denied", "erro de negação → authorization_denied");
  assert(classifyRpcError(UNAVAILABLE) === "rpc_unavailable", "RPC ausente/schema → rpc_unavailable");
  assert(classifyRpcError(UNKNOWN) === "unknown_error", "erro desconhecido (transiente) → unknown_error, nunca rpc_unavailable");
  assert(classifyRpcError(VALIDATION) === "unknown_error", "erro de validação (não é negação nem RPC ausente) → unknown_error, fail closed igual a qualquer erro não classificado");
}

console.log("[test] shouldAttemptPrivilegedFallback — os 7 cenários obrigatórios (PROMPT 04E, Fase 5)");
{
  const DENIED = { message: "permission_denied: role admin nao pode arquivar clientes" };
  const UNAVAILABLE = { code: "PGRST202", message: "Could not find the function public.foo" };
  const UNKNOWN = { code: "XX000", message: "connection reset by peer" };
  const VALIDATION = { code: "22P02", message: "invalid input syntax for type uuid" };

  assert(shouldAttemptPrivilegedFallback(DENIED, true) === false, "1) RPC authorization denied → fallback NÃO permitido, mesmo com auth independente true (nunca deveria chegar aqui, mas o gate é seguro de qualquer forma)");
  assert(shouldAttemptPrivilegedFallback(UNKNOWN, true) === false, "2) RPC unknown error → fallback NÃO permitido");
  assert(shouldAttemptPrivilegedFallback(VALIDATION, true) === false, "3) RPC validation error → fallback NÃO permitido");
  assert(shouldAttemptPrivilegedFallback(UNAVAILABLE, false) === false, "4) RPC unavailable + authorization false → fallback NÃO permitido");
  assert(shouldAttemptPrivilegedFallback(UNAVAILABLE, false) === false, "5) RPC unavailable + authorization null (já normalizado para false por canAccessClientIndependently) → fallback NÃO permitido");
  assert(shouldAttemptPrivilegedFallback(UNAVAILABLE, false) === false, "6) RPC unavailable + authorization error (já normalizado para false) → fallback NÃO permitido");
  assert(shouldAttemptPrivilegedFallback(UNAVAILABLE, true) === true, "7) RPC unavailable + authorization true → fallback técnico PERMITIDO -- único cenário que passa");
}

console.log("[test] canAccessClientIndependently — service_role disponível NUNCA significa autorização concedida");
{
  const mockRpc = (result: { data: unknown; error: unknown }) => ({
    rpc: async (_fn: string, _args: Record<string, unknown>) => result,
  });

  void (async () => {
    assert(await canAccessClientIndependently(mockRpc({ data: true, error: null }), "company-a") === true, "data=true, sem erro → autorizado");
    assert(await canAccessClientIndependently(mockRpc({ data: false, error: null }), "company-b") === false, "data=false (RLS/can_access_client negou) → NÃO autorizado");
    assert(await canAccessClientIndependently(mockRpc({ data: null, error: null }), "company-c") === false, "data=null → NÃO autorizado (fail closed, nunca trata ausência como permissão)");
    assert(await canAccessClientIndependently(mockRpc({ data: undefined, error: { message: "not_found" } }), "company-d") === false, "erro na própria RPC de verificação → NÃO autorizado (fail closed)");
    assert(await canAccessClientIndependently(mockRpc({ data: true, error: { message: "some transient issue" } }), "company-e") === false, "mesmo com data=true, presença de erro → NÃO autorizado (erro sempre vence)");
    assert(await canAccessClientIndependently(mockRpc({ data: "true", error: null }), "company-f") === false, "data truthy mas não estritamente boolean true (string \"true\") → NÃO autorizado -- comparação estrita, nunca coerção");

    console.log(`\n[result] ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
  })();
}
