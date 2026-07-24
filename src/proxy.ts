import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getRoleHome, OPERACIONAL_ALLOWED } from "@/lib/access-control";
import { verifyPreviewSessionToken, WORKSPACE_PREVIEW_COOKIE } from "@/lib/workspaces/preview-session";
import { WORKSPACE_PREVIEW_READ_ONLY_CODE } from "@/lib/workspaces/assert-not-preview";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Fase 6 do hotfix 1.0.2 — defesa em profundidade, NÃO substitui os guards
 * explícitos por rota (src/lib/workspaces/assert-not-preview.ts). Proxy
 * roda no runtime Node.js por padrão nesta versão do Next.js (v16), então
 * pode reusar verifyPreviewSessionToken() diretamente — sem duplicar lógica
 * de criptografia, sem exigir Edge runtime.
 *
 * Este bloqueio é deliberadamente grosseiro: verifica só se o cookie de
 * preview é válido (assinatura + expiração), sem revalidar papel/workspace
 * no banco — essa revalidação completa continua sendo responsabilidade de
 * getWorkspacePreviewContext() dentro de cada rota. O objetivo aqui é uma
 * rede de segurança rápida contra qualquer rota mutável dentro dos
 * namespaces conhecidos que não tenha (ou ainda não tenha) o guard
 * explícito, não a fonte de verdade.
 */
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const MUTABLE_API_NAMESPACES = [
  "/api/admin/", "/api/client/", "/api/team/", "/api/payments/",
  "/api/olaclick/", "/api/meta/", "/api/billing/", "/api/ai/",
];

// Endpoints estritamente excluídos, com justificativa documentada:
//  - /api/admin/workspaces/preview: é o próprio ponto de entrada/saída do
//    preview (POST inicia, DELETE encerra) — bloqueá-lo tornaria impossível
//    sair de um preview uma vez dentro dele.
//  - /api/billing/coupons/validate: nunca faz insert/update/upsert/delete
//    (ver docs/workspace-mutation-inventory.md) — validação somente leitura
//    usada pela página pública /planos.
const MUTATION_GUARD_EXEMPT_PATHS = new Set([
  "/api/admin/workspaces/preview",
  "/api/billing/coupons/validate",
]);

function isMutableNamespace(pathname: string): boolean {
  return MUTABLE_API_NAMESPACES.some((ns) => pathname.startsWith(ns));
}

// Always public — no auth required
const PUBLIC_PATH_PREFIXES = [
    "/login", "/criar-conta", "/plataforma", "/planos", "/diagnostico",
    "/aprovar/", "/convite", "/equipe/solicitar-acesso", "/rec",
    "/pre-acesso", "/api/launch/",
    "/api/meta/status", "/api/meta/callback", "/api/debug/",
    "/api/leads/typebot", // public webhook — auth via LOKAT_TYPEBOT_WEBHOOK_SECRET header
  ];

function isPublic(pathname: string): boolean {
    if (pathname === "/") return true;
    return PUBLIC_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p));
}

function redirectTo(url: string, request: NextRequest) {
    return NextResponse.redirect(new URL(url, request.url));
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

  // Demo mode — no Supabase configured
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        return NextResponse.next();
  }

  // Public paths and static assets — pass through
  if (
        isPublic(pathname) ||
        pathname.startsWith("/_next") ||
        pathname.includes(".")
      ) {
        return NextResponse.next();
  }

  // Defesa em profundidade (Fase 6, hotfix 1.0.2) — ver comentário acima.
  if (
    MUTATING_METHODS.has(request.method) &&
    isMutableNamespace(pathname) &&
    !MUTATION_GUARD_EXEMPT_PATHS.has(pathname)
  ) {
    const previewToken = request.cookies.get(WORKSPACE_PREVIEW_COOKIE)?.value;
    const verified = verifyPreviewSessionToken(previewToken);
    if (verified.ok) {
      return NextResponse.json(
        { error: "Esta ação está indisponível no modo de visualização.", code: WORKSPACE_PREVIEW_READ_ONLY_CODE },
        { status: 403 }
      );
    }
  }

  // Build Supabase client with session refresh
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        cookies: {
                getAll() {
                          return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                          supabaseResponse = NextResponse.next({ request });
                          cookiesToSet.forEach(({ name, value, options }) =>
                                      supabaseResponse.cookies.set(name, value, options)
                                                       );
                },
        },
  });

  // Validate JWT — always use getUser (not getSession) on the server
  const {
        data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
        return redirectTo("/login", request);
  }

  // Read role from profiles (authoritative).
  // Falls back to JWT metadata so auth never silently downgrades a real user.
  const { data: profileRow } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

  const role: string =
        profileRow?.role ??
        (user.user_metadata?.role as string | undefined) ??
        (user.app_metadata?.role as string | undefined) ??
        "cliente";

  // ── Admin / Super Admin: can access everything ───────────────
  if (role === "admin" || role === "super_admin") {
        if (pathname.startsWith("/contentos/")) {
                return redirectTo(`/admin/contentos${pathname.slice("/contentos".length)}`, request);
        }
        return supabaseResponse;
  }

  // ── Cliente ─────────────────────────────────────────────────
  if (role === "cliente") {
        const blocked =
                pathname.startsWith("/contentos") ||
                pathname.startsWith("/admin") ||
                pathname.startsWith("/operacional")||
                pathname.startsWith("/academy") ||
                (pathname.startsWith("/financeiro") && !pathname.startsWith("/client/"));

      if (blocked) return redirectTo("/client/home", request);
        return supabaseResponse;
  }

  // ── Aluno ────────────────────────────────────────────────────
  if (role === "aluno") {
        if (!pathname.startsWith("/academy")) return redirectTo("/academy/home", request);
        return supabaseResponse;
  }

  // ── Operational roles (includes comercial & financeiro) ──────
  if (OPERACIONAL_ALLOWED.has(role)) {
        const home = getRoleHome(role);

      // Block admin area
      if (pathname.startsWith("/admin")) return redirectTo(home, request);
        // Block client portal
      if (pathname.startsWith("/client/")) return redirectTo(home, request);
        // Block academy
      if (pathname.startsWith("/academy")) return redirectTo(home, request);
        // Block full ContentOS — operacional uses /operacional/briefings
      if (pathname.startsWith("/contentos")) return redirectTo("/operacional/briefings", request);

      return supabaseResponse;
  }

  // Unknown role — pass through
  return supabaseResponse;
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
