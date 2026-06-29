import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getRoleHome, OPERACIONAL_ALLOWED } from "@/lib/access-control";

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL      ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Always public — no auth required
const PUBLIC_PATH_PREFIXES = [
  "/login", "/criar-conta", "/plataforma", "/planos", "/diagnostico",
  "/aprovar/", "/convite", "/equipe/solicitar-acesso", "/rec",
  "/api/meta/status", "/api/meta/callback", "/api/debug/env-check",
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
    (user.user_metadata?.role  as string | undefined) ??
    (user.app_metadata?.role   as string | undefined) ??
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
      pathname.startsWith("/admin")      ||
      pathname.startsWith("/operacional")||
      pathname.startsWith("/academy")    ||
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
