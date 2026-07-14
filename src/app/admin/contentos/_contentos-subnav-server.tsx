import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ContentosSubNav } from "./_contentos-subnav";

export async function ContentosSubNavServer() {
  let role = "";
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      role = profile?.role ?? "";
    }
  } catch {}
  return <ContentosSubNav role={role} />;
}
