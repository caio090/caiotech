import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/admin/clients/[id]/invite
// Gera um convite de cliente e retorna link copiável.
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { id: clientId } = await params;
    const body    = await req.json() as { email?: string };
    const email   = body.email?.trim();

    if (!email) {
      return NextResponse.json({ error: "E-mail é obrigatório." }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).maybeSingle();

    if (!profile || !["admin", "super_admin"].includes(profile.role ?? "")) {
      return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
    }

    // Verifica se o cliente existe
    const { data: client } = await supabase
      .from("clients").select("id, company_name").eq("id", clientId).maybeSingle();
    if (!client) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

    // Reutiliza convite pendente não expirado para o mesmo e-mail/cliente
    const { data: existing } = await supabase
      .from("client_invites")
      .select("token")
      .eq("client_id", clientId)
      .eq("email", email)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    let token: string;

    if (existing?.token) {
      token = existing.token as string;
    } else {
      const { data: invite, error: inviteErr } = await supabase
        .from("client_invites")
        .insert({
          client_id:  clientId,
          email,
          role:       "cliente",
          status:     "pending",
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_by: user.id,
        })
        .select("token")
        .single();

      if (inviteErr || !invite?.token) {
        // Se client_invites não existe ainda (SQL 42 não rodado), retorna link de fallback
        const fallbackToken = crypto.randomUUID();
        const hdrs = await headers();
        const origin = hdrs.get("origin") ?? hdrs.get("x-forwarded-proto")
          ? `${hdrs.get("x-forwarded-proto")}://${hdrs.get("host")}`
          : "https://lokat.app";
        return NextResponse.json({
          link:    `${origin}/convite/cliente/${fallbackToken}`,
          warning: "client_invites table not found — run SQL 42 first. Link is not persisted.",
        }, { status: 200 });
      }
      token = invite.token as string;
    }

    const hdrs   = await headers();
    const origin = hdrs.get("origin")
      ?? (hdrs.get("x-forwarded-proto")
        ? `${hdrs.get("x-forwarded-proto")}://${hdrs.get("host")}`
        : "https://lokat.app");

    const link = `${origin}/convite/cliente/${token}`;
    return NextResponse.json({ link, client_id: clientId }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
