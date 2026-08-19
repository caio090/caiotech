import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { RecosDashboardContent } from "./_client-content";
import type { DbRecProject } from "@/lib/supabase/types";

export default async function AdminRecosPage() {
  let projects: DbRecProject[] = [];

  if (isSupabaseConfigured) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data } = await supabase
        .from("rec_projects")
        .select("*, clients(company_name)")
        .order("created_at", { ascending: false });
      projects = (data as DbRecProject[]) ?? [];
    } catch {}
  }

  return <RecosDashboardContent projects={projects} />;
}
