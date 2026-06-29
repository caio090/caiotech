import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import {
  createServerSupabaseClient,
  createSupabaseAdminClient,
  hasSupabaseServiceRoleKey,
} from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const CLIENT_MANAGER_ROLES = new Set(["admin", "super_admin", "agency"]);
const SQL_42_MESSAGE = "Para gerar convite, rode docs/supabase/42-client-invites.sql no Supabase.";

function getOrigin(hdrs: Headers) {
  const directOrigin = hdrs.get("origin");
  if (directOrigin) return directOrigin;

  const proto = hdrs.get("x-forwarded-proto");
  const host = hdrs.get("host");
  if (proto && host) return `${proto}://${host}`;

  return "https://lokat.app";
}

// POST /api/admin/clients/[id]/invite
// Gera um convite real de cliente e retorna link copiavel.
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { id: clientId } = await params;
    const body = await req.json() as { email?: string };
    const email = body.email?.trim();

    if (!email) {
      return NextResponse.json({ error: "E-mail e obrigatorio." }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = (profile as { role?: string } | null)?.role ?? "";
    if (!CLIENT_MANAGER_ROLES.has(role)) {
      return NextResponse.json({ error: "Sem permissao." }, { status: 403 });
    }

    const serviceRolePresent = hasSupabaseServiceRoleKey();
    const admin = createSupabaseAdminClient();
    const db = admin ?? supabase;

    const { data: client, error: clientErr } = await db
      .from("clients")
      .select("id, company_name")
      .eq("id", clientId)
      .maybeSingle();

    if (clientErr) {
      console.error("[api/admin/clients/invite] erro ao buscar cliente", {
        clientId,
        role,
        serviceRolePresent,
        supabaseError: clientErr,
      });
    }
    if (!client) return NextResponse.json({ error: "Cliente nao encontrado." }, { status: 404 });

    const { data: existing, error: existingErr } = await db
      .from("client_invites")
      .select("token")
      .eq("client_id", clientId)
      .eq("email", email)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (existingErr?.code === "42P01") {
      return NextResponse.json({ error: SQL_42_MESSAGE, reason: "sql_pending" }, { status: 400 });
    }

    let token: string;
    if (existing?.token) {
      token = existing.token as string;
    } else {
      const { data: invite, error: inviteErr } = await db
        .from("client_invites")
        .insert({
          client_id: clientId,
          email,
          role: "cliente",
          status: "pending",
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_by: user.id,
        })
        .select("token")
        .single();

      if (inviteErr || !invite?.token) {
        console.error("[api/admin/clients/invite] erro ao gerar convite", {
          clientId,
          role,
          serviceRolePresent,
          supabaseError: inviteErr,
        });
        if (inviteErr?.code === "42P01") {
          return NextResponse.json({ error: SQL_42_MESSAGE, reason: "sql_pending" }, { status: 400 });
        }
        return NextResponse.json({
          error: "Nao foi possivel gerar convite. Verifique permissoes do banco ou SUPABASE_SERVICE_ROLE_KEY na Vercel.",
        }, { status: 500 });
      }
      token = invite.token as string;
    }

    const hdrs = await headers();
    const origin = getOrigin(hdrs);
    return NextResponse.json({ link: `${origin}/convite/cliente/${token}`, client_id: clientId }, { status: 200 });
  } catch (error) {
    console.error("[api/admin/clients/invite] erro interno", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
