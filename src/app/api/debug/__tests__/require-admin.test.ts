/**
 * Executar com: node .tmp/run-ts-test.cjs src/app/api/debug/__tests__/require-admin.test.ts
 * Security fix — proteger /api/debug/env-check e /api/debug/admin-client-test.
 * evaluateDebugAccess() é a decisão PURA (testável sem sessão/banco real),
 * mesmo padrão de resolveCompanyContextFromInputs() em
 * src/lib/company-context/resolve.ts. requireDebugAdmin() é o único ponto
 * assíncrono (busca user/role reais e delega a esta função) — não replicado
 * aqui por I/O real, coberto pelas checagens estruturais abaixo.
 */
import * as fs from "fs";
import * as path from "path";
import { evaluateDebugAccess } from "../_require-admin";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("[test] A — anônimo (sem sessão) é bloqueado");
{
  const decision = evaluateDebugAccess({ authenticated: false, role: null });
  assert(decision === "unauthenticated", "decisão = unauthenticated (mapeia para HTTP 401 em requireDebugAdmin)");
}

console.log("[test] B — autenticado sem role admin/super_admin é bloqueado");
{
  assert(evaluateDebugAccess({ authenticated: true, role: "cliente" }) === "forbidden", "role 'cliente' => forbidden");
  assert(evaluateDebugAccess({ authenticated: true, role: "operacional" }) === "forbidden", "role 'operacional' => forbidden");
  assert(evaluateDebugAccess({ authenticated: true, role: null }) === "forbidden", "role ausente (profile sem row) => forbidden, nunca allowed por omissão");
}

console.log("[test] C — admin autenticado é permitido");
{
  assert(evaluateDebugAccess({ authenticated: true, role: "admin" }) === "allowed", "role 'admin' => allowed");
}

console.log("[test] D — super_admin autenticado é permitido");
{
  assert(evaluateDebugAccess({ authenticated: true, role: "super_admin" }) === "allowed", "role 'super_admin' => allowed");
}

console.log("[test] E — payload autorizado (env-check/admin-client-test) nunca contém secret/token real");
{
  const envCheck = read("src/app/api/debug/env-check/route.ts");
  // serviceKey só pode aparecer como serviceKey.length / serviceKey.split (derivados
  // booleanos) -- nunca como valor bruto (chave "x: serviceKey" ou shorthand "serviceKey,").
  const rawLeak = /:\s*serviceKey\s*[,}]/.test(envCheck) || /(?<!\.)\bserviceKey\s*[,}]/.test(envCheck.replace(/serviceKey\.(length|split)/g, ""));
  assert(!rawLeak, "env-check nunca devolve a variável serviceKey inteira no payload, só booleanos derivados dela (.length/.split)");
  const adminClientTest = read("src/app/api/debug/admin-client-test/route.ts");
  // A string "SUPABASE_SERVICE_ROLE_KEY ausente..." é só uma mensagem de erro
  // legível -- o que importa é que o CÓDIGO nunca lê process.env.SUPABASE_SERVICE_ROLE_KEY
  // diretamente aqui, só via hasSupabaseServiceRoleKey()/createSupabaseAdminClient().
  assert(!/process\.env\.SUPABASE_SERVICE_ROLE_KEY/.test(adminClientTest), "admin-client-test nunca lê a env var diretamente (só via hasSupabaseServiceRoleKey())");
}

console.log("[test] F — ambas as rotas chamam requireDebugAdmin() antes de qualquer lógica de diagnóstico");
{
  const envCheck = read("src/app/api/debug/env-check/route.ts");
  assert(envCheck.includes('import { requireDebugAdmin } from "../_require-admin"'), "env-check importa o guard compartilhado");
  assert(/const denied = await requireDebugAdmin\(\);\s*\n\s*if \(denied\) return denied;/.test(envCheck), "env-check verifica o guard antes de montar a resposta");

  const adminClientTest = read("src/app/api/debug/admin-client-test/route.ts");
  assert(adminClientTest.includes('import { requireDebugAdmin } from "../_require-admin"'), "admin-client-test importa o guard compartilhado");
  assert(/const denied = await requireDebugAdmin\(\);\s*\n\s*if \(denied\) return denied;/.test(adminClientTest), "admin-client-test verifica o guard antes de montar a resposta");
}

console.log("[test] G — guard reutiliza autoridade canônica, nunca inventa uma segunda");
{
  const guard = read("src/app/api/debug/_require-admin.ts");
  assert(guard.includes('import { canAccessAdmin } from "@/lib/access-control"'), "reaproveita canAccessAdmin() já existente, não um Set local duplicado");
  assert(guard.includes('import { createServerSupabaseClient } from "@/lib/supabase/server"'), "usa a sessão real (createServerSupabaseClient), nunca query param/header customizado");
  assert(!/searchParams\.get\(["'`](admin|secret|key|token)["'`]\)/.test(guard), "nunca confia em query param para autorizar");
  assert(!/headers\.get\(["'`]x-/.test(guard), "nunca confia em header customizado inventado para autorizar");
}

console.log("[test] H — regressão: debug-client-link (referência canônica) não foi tocado");
{
  const reference = read("src/app/api/admin/debug-client-link/route.ts");
  assert(reference.includes('const ALLOWED_ROLES = new Set(["admin", "super_admin"]);'), "padrão original de debug-client-link permanece intacto, nenhuma regressão");
  assert(reference.includes('return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });'), "resposta 401 original preservada");
  assert(reference.includes('return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });'), "resposta 403 original preservada");
}

console.log("[test] I — src/proxy.ts continua deixando /api/debug/ passar (guard vive na rota, não no proxy)");
{
  const proxy = read("src/proxy.ts");
  assert(proxy.includes('"/api/debug/"'), "proxy não foi alterado — /api/debug/ continua público no proxy, a proteção real agora vive em cada rota (401/403 JSON, nunca redirect para /login em API)");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
