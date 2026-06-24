import { AdminEquipeContent } from "./_client-content";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DbProfile } from "@/lib/supabase/types";

export default async function AdminEquipePage() {
  let serverProfiles: DbProfile[] | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    // Fetch team members: everyone whose primary role is NOT cliente/aluno
    const { data: teamData } = await supabase
      .from("profiles")
      .select("id, name, email, role, phone, avatar_url, created_at, is_test, archived_at")
      .not("role", "in", '("cliente","aluno")')
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    // Also include profiles whose primary role is cliente/aluno but have an
    // operational extra role in profile_roles (edge case: dual-role accounts)
    const { data: extraRoles } = await supabase
      .from("profile_roles")
      .select("user_id, role")
      .not("role", "in", '("cliente","aluno")');

    const extraUserIds = new Set((extraRoles ?? []).map((r: { user_id: string }) => r.user_id));
    const teamIds      = new Set((teamData ?? []).map((p) => p.id));
    const dualUserIds  = [...extraUserIds].filter((id) => !teamIds.has(id));

    let dualProfiles: DbProfile[] = [];
    if (dualUserIds.length > 0) {
      const { data: dp } = await supabase
        .from("profiles")
        .select("id, name, email, role, phone, avatar_url, created_at, is_test, archived_at")
        .in("id", dualUserIds)
        .is("deleted_at", null);
      dualProfiles = (dp as DbProfile[]) ?? [];
    }

    const combined = [...(teamData as DbProfile[] ?? []), ...dualProfiles];
    if (combined.length > 0) serverProfiles = combined;
  } catch {}

  return <AdminEquipeContent serverProfiles={serverProfiles} />;
}
