import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

    const { error } = await supabase
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

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
