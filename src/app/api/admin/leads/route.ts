import { NextResponse, type NextRequest } from "next/server";
import {
  createServerSupabaseClient,
  createRequiredSupabaseAdminClient,
  hasSupabaseServiceRoleKey,
} from "@/lib/supabase/server";

const ALLOWED_ROLES = new Set(["super_admin", "admin"]);

async function authorizeAdmin() {
  const supabase = await createServerSupabaseClient().catch(() => null);
  if (!supabase) return { error: "supabase_not_configured", status: 503 as const };

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "unauthenticated", status: 401 as const };

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role: string =
    (profileRow as { role?: string } | null)?.role ??
    (user.user_metadata?.role as string | undefined) ??
    (user.app_metadata?.role as string | undefined) ??
    "";

  if (!ALLOWED_ROLES.has(role)) return { error: "forbidden", status: 403 as const };
  return { ok: true as const };
}

export type UnifiedLead = {
  id: string;
  source: "waitlist" | "admin_signups_view";
  name: string;
  email: string;
  phone: string | null;
  account_type: string | null;
  role: string | null;
  status: string;
  segment: string | null;
  interest: string | null;
  city: string | null;
  social_or_site: string | null;
  created_at: string;
};

export async function GET(_req: NextRequest) {
  const auth = await authorizeAdmin();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, code: auth.error }, { status: auth.status });
  }

  if (!hasSupabaseServiceRoleKey()) {
    return NextResponse.json({ ok: false, code: "service_role_missing" }, { status: 503 });
  }

  const admin = createRequiredSupabaseAdminClient();
  const warnings: string[] = [];
  const leads: UnifiedLead[] = [];

  // ── 1. launch_waitlist ────────────────────────────────────────────────────
  const { data: waitlistRows, error: wErr } = await admin
    .from("launch_waitlist")
    .select("id, name, email, phone, account_type, status, segment, interest, city, social_or_site, created_at")
    .order("created_at", { ascending: false });

  if (wErr) {
    if (wErr.code === "42P01") {
      warnings.push("Tabela launch_waitlist não existe — rode o SQL 73.");
    } else {
      warnings.push(`launch_waitlist: ${wErr.message}`);
    }
  } else {
    for (const row of waitlistRows ?? []) {
      leads.push({
        id:            row.id,
        source:        "waitlist",
        name:          row.name,
        email:         row.email,
        phone:         row.phone ?? null,
        account_type:  row.account_type ?? null,
        role:          null,
        status:        row.status ?? "new",
        segment:       row.segment ?? null,
        interest:      row.interest ?? null,
        city:          row.city ?? null,
        social_or_site: row.social_or_site ?? null,
        created_at:    row.created_at,
      });
    }
  }

  // ── 2. admin_signups_view (legado) ────────────────────────────────────────
  const { data: signupRows, error: sErr } = await admin
    .from("admin_signups_view")
    .select("profile_id, name, email, role, source, lead_status");

  if (sErr) {
    warnings.push(`admin_signups_view: ${sErr.message} — fonte legada não disponível`);
  } else {
    for (const row of signupRows ?? []) {
      const alreadyInWaitlist = leads.some((l) => l.email?.toLowerCase() === row.email?.toLowerCase());
      if (alreadyInWaitlist) continue;
      leads.push({
        id:            row.profile_id,
        source:        "admin_signups_view",
        name:          row.name ?? "",
        email:         row.email ?? "",
        phone:         null,
        account_type:  null,
        role:          row.role ?? null,
        status:        row.lead_status ?? "legacy",
        segment:       null,
        interest:      null,
        city:          null,
        social_or_site: null,
        created_at:    "",
      });
    }
  }

  const summary = {
    total:     leads.length,
    waitlist:  leads.filter((l) => l.source === "waitlist").length,
    signups:   leads.filter((l) => l.source === "admin_signups_view").length,
    new:       leads.filter((l) => l.status === "new").length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    invited:   leads.filter((l) => l.status === "invited").length,
    accepted:  leads.filter((l) => l.status === "accepted").length,
    archived:  leads.filter((l) => l.status === "archived").length,
  };

  return NextResponse.json({
    ok: true,
    leads,
    summary,
    warnings: warnings.length > 0 ? warnings : undefined,
    debug: { sources: ["launch_waitlist", "admin_signups_view"], count: leads.length },
  });
}
