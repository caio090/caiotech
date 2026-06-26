import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// DELETE /api/admin/rec-projects/[id]
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

    if (!["admin", "agency"].includes(profile?.role ?? "")) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("rec_projects")
      .delete()
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
