import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export async function getCurrentUser(): Promise<User | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user ?? null;
  } catch {
    return null;
  }
}

export function getRoleRedirect(role: string): string {
  const map: Record<string, string> = {
    admin:           "/admin/dashboard",
    operacional:     "/admin/dashboard",
    social_media:    "/contentos/home",
    designer:        "/contentos/home",
    editor:          "/contentos/home",
    videomaker:      "/contentos/home",
    gestor_trafego:  "/admin/dashboard",
    financeiro:      "/financeiro/pagamentos",
    cliente:         "/client/home",
    aluno:           "/academy/home",
  };
  return map[role] ?? "/login";
}
