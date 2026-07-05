import { NextResponse } from "next/server";
import {
  createRequiredSupabaseAdminClient,
  hasSupabaseServiceRoleKey,
} from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/current-profile";

// Returns all profiles for super_admin — uses service role to bypass RLS.
export async function GET() {
  try {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "super_admin") {
      return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });
  }

  if (!hasSupabaseServiceRoleKey()) {
    return NextResponse.json({ ok: false, reason: "service_role_missing" }, { status: 503 });
  }

  try {
    const admin = createRequiredSupabaseAdminClient();

    const { data: profiles, error: pe } = await admin
      .from("profiles")
      .select("id, email, name, role, account_type, account_status, created_at")
      .order("created_at", { ascending: false })
      .limit(300);

    if (pe || !profiles) {
      return NextResponse.json({ ok: false, reason: pe?.message ?? "profiles_error" }, { status: 500 });
    }

    // Enrich with non-deleted clients
    const { data: clients } = await admin
      .from("clients")
      .select("owner_id, company_name")
      .in("owner_id", profiles.map((p) => p.id))
      .is("deleted_at", null)
      .limit(300);

    const clientMap = new Map((clients ?? []).map((c) => [c.owner_id, c.company_name as string | null]));

    const accounts = profiles.map((p) => ({
      id:                  p.id,
      email:               p.email ?? null,
      name:                p.name ?? null,
      role:                p.role ?? null,
      account_type:        (p as Record<string, unknown>).account_type as string | null ?? null,
      account_status:      (p as Record<string, unknown>).account_status as string | null ?? "active",
      created_at:          p.created_at ?? null,
      company_name:        clientMap.get(p.id) ?? null,
      plan_slug:           null as string | null,
      coupon_code:         null as string | null,
      subscription_status: null as string | null,
    }));

    return NextResponse.json({ ok: true, accounts });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ ok: false, reason: msg }, { status: 500 });
  }
}
