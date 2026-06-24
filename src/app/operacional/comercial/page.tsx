import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { redirect } from "next/navigation";
import { ComercialDashboardContent } from "./_dashboard-content";

export default async function ComercialDashboardPage() {
  if (!isSupabaseConfigured) {
    return <ComercialDashboardContent leads={[]} meetings={[]} isDemo />;
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role ?? "";

  // Leads assigned to this user (or all if admin)
  let leadsQuery = supabase
    .from("commercial_leads")
    .select("id, company_name, contact_name, pipeline_stage, next_action_at, responsible_id")
    .not("pipeline_stage", "in", '("fechado","perdido")')
    .order("created_at", { ascending: false })
    .limit(20);

  if (role !== "admin") {
    leadsQuery = leadsQuery.eq("responsible_id", user.id);
  }

  // Meetings today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  let meetingsQuery = supabase
    .from("commercial_meetings")
    .select("id, title, scheduled_at, lead_id")
    .eq("status", "agendada")
    .gte("scheduled_at", todayStart.toISOString())
    .lte("scheduled_at", todayEnd.toISOString())
    .order("scheduled_at");

  if (role !== "admin") {
    meetingsQuery = meetingsQuery.eq("responsible_id", user.id);
  }

  const [leadsResult, meetingsResult] = await Promise.all([leadsQuery, meetingsQuery]);

  return (
    <ComercialDashboardContent
      leads={leadsResult.data ?? []}
      meetings={meetingsResult.data ?? []}
      isDemo={false}
    />
  );
}
