import { NextResponse } from "next/server";
import { createServerSupabaseClient, createSupabaseAdminClient } from "@/lib/supabase/server";

const CLIENT_MANAGER_ROLES = new Set(["admin", "super_admin", "agency"]);

// GET /api/admin/clients/[id] — returns company_name for breadcrumb sync
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    const { data } = await supabase
      .from("clients")
      .select("id, company_name")
      .eq("id", id)
      .neq("status", "archived")
      .maybeSingle();
    if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ id: data.id, company_name: data.company_name });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// PATCH /api/admin/clients/[id]
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const body = await req.json() as Record<string, unknown>;
    const allowed = ["company_name", "responsible_name", "email", "phone", "segment", "status"];
    const update = Object.fromEntries(
      Object.entries(body).filter(([k]) => allowed.includes(k))
    );

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!CLIENT_MANAGER_ROLES.has(profile?.role ?? "")) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const admin = createSupabaseAdminClient() ?? supabase;
    const { error } = await admin
      .from("clients")
      .update(update)
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// DELETE /api/admin/clients/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!CLIENT_MANAGER_ROLES.has(profile?.role ?? "")) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const admin = createSupabaseAdminClient() ?? supabase;
    let result = await admin
      .from("clients")
      .update({ status: "archived", archived_at: new Date().toISOString() })
      .eq("id", id);

    if (result.error && result.error.code === "23514") {
      result = await admin
        .from("clients")
        .update({ status: "inactive", archived_at: new Date().toISOString() })
        .eq("id", id);
    }

    if (result.error && result.error.code === "23514") {
      result = await admin
        .from("clients")
        .update({ status: "pausado", archived_at: new Date().toISOString() })
        .eq("id", id);
    }

    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
