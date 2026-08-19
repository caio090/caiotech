import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { canAccessAdmin } from "@/lib/access-control";

/**
 * Security fix (proteger rotas /api/debug/*) — mesmo padrão já usado em
 * src/app/api/admin/debug-client-link/route.ts (sessão real via
 * createServerSupabaseClient(), role lido de profiles), só que reaproveitando
 * a autoridade canônica canAccessAdmin() em vez de duplicar o Set local de
 * roles. Anônimo -> 401. Autenticado sem admin/super_admin -> 403. Nunca
 * confia em query param/header customizado -- só sessão real + role real.
 * Compartilhado apenas dentro do namespace /api/debug/ (nenhuma outra rota
 * tocada).
 *
 * Mesmo padrão de resolveCompanyContext()/resolveCompanyContextFromInputs()
 * (src/lib/company-context/resolve.ts): a decisão pura (evaluateDebugAccess,
 * testável sem sessão/banco) fica separada do único ponto assíncrono
 * (requireDebugAdmin, que busca user/role reais e delega a decisão).
 */
export type DebugAccessDecision = "allowed" | "unauthenticated" | "forbidden";

export function evaluateDebugAccess(inputs: { authenticated: boolean; role: string | null }): DebugAccessDecision {
  if (!inputs.authenticated) return "unauthenticated";
  if (!inputs.role || !canAccessAdmin(inputs.role)) return "forbidden";
  return "allowed";
}

export async function requireDebugAdmin(): Promise<NextResponse | null> {
  try {
    const session = await createServerSupabaseClient();
    const { data: { user } } = await session.auth.getUser();

    let role: string | null = null;
    if (user) {
      const { data: profile } = await session
        .from("profiles").select("role").eq("id", user.id).maybeSingle();
      role = (profile?.role as string | undefined) ?? null;
    }

    const decision = evaluateDebugAccess({ authenticated: !!user, role });
    if (decision === "unauthenticated") {
      return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });
    }
    if (decision === "forbidden") {
      return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
    }
    return null;
  } catch {
    return NextResponse.json({ ok: false, reason: "auth_error" }, { status: 500 });
  }
}
