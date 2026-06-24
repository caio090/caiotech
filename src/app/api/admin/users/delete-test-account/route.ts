import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const MAIN_ADMIN_EMAIL = process.env.MAIN_ADMIN_EMAIL ?? "";

function createAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin env vars missing");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = (await request.json()) as { userId?: string };
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    // Auth check — must be admin
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, email")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prevent deleting own account
    if (userId === user.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    // Fetch target profile to verify it's a test account
    const { data: target } = await supabase
      .from("profiles")
      .select("email, is_test, role")
      .eq("id", userId)
      .maybeSingle();

    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Guard: only delete test accounts or accounts marked for deletion via soft-delete
    if (!target.is_test) {
      return NextResponse.json(
        { error: "Only test accounts can be hard-deleted via this endpoint" },
        { status: 400 },
      );
    }

    // Guard: never delete the main admin
    if (MAIN_ADMIN_EMAIL && target.email === MAIN_ADMIN_EMAIL) {
      return NextResponse.json({ error: "Cannot delete main admin account" }, { status: 400 });
    }

    const adminSupabase = createAdminSupabase();

    // Clean up related data first
    await adminSupabase.from("profile_roles").delete().eq("user_id", userId);
    await adminSupabase.from("clients").delete().eq("owner_id", userId);
    await adminSupabase.from("onboarding_profiles").delete().eq("user_id", userId);
    await adminSupabase.from("profiles").delete().eq("id", userId);

    // Hard delete from auth.users (requires service role)
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[delete-test-account]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
