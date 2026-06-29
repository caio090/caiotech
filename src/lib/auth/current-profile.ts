import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export interface CurrentProfile {
  id: string;
  role: string | null;
  account_type: string | null;
  plan: string | null;
  user: User;
}

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, account_type, plan")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) return null;

  return {
    id: user.id,
    role: (profile as { role?: string | null }).role ?? null,
    account_type: (profile as { account_type?: string | null }).account_type ?? null,
    plan: (profile as { plan?: string | null }).plan ?? null,
    user,
  };
}
