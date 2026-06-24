import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { redirect } from "next/navigation";
import { LeadsContent } from "./_client-content";

export default async function LeadsPage() {
  if (!isSupabaseConfigured) {
    return <LeadsContent leads={[]} isDemo />;
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

  let q = supabase
    .from("commercial_leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (role !== "admin") {
    q = q.or(`responsible_id.eq.${user.id},created_by.eq.${user.id}`);
  }

  const { data: leads } = await q;

  return <LeadsContent leads={leads ?? []} isDemo={false} />;
}
