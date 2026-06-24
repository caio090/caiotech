import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface AdminContentosClient {
  id: string;
  company_name: string | null;
  responsible_name: string | null;
  segment: string | null;
  status: string | null;
}

/**
 * Returns only verified real clients via the v_real_clients view.
 * Excludes operacional, admin, aluno, test, archived, and deleted accounts.
 * Safe to call on any admin server page.
 */
export async function getAdminContentOSClients(): Promise<AdminContentosClient[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("v_real_clients")
      .select("id, company_name, responsible_name, segment, status")
      .order("company_name");
    return (data ?? []) as AdminContentosClient[];
  } catch {
    return [];
  }
}

/**
 * Validates that a given client_id belongs to a real client.
 * Returns the client record or null if invalid/not found.
 */
export async function validateContentOSClient(
  clientId: string,
): Promise<{ id: string; company_name: string | null } | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("v_real_clients")
      .select("id, company_name")
      .eq("id", clientId)
      .maybeSingle();
    return data as { id: string; company_name: string | null } | null;
  } catch {
    return null;
  }
}
