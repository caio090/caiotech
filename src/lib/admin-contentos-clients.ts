import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface AdminContentosClient {
  id: string;
  company_name: string | null;
  responsible_name: string | null;
  segment: string | null;
  status: string | null;
  has_meta?: boolean;
  has_instagram?: boolean;
  has_brief?: boolean;
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
    const clients = (data ?? []) as AdminContentosClient[];

    // Enriquece com dados de client_meta_assets (SQL 37) e client_context (brief)
    const [assetsRes, contextsRes] = await Promise.all([
      supabase.from("client_meta_assets").select("client_id, asset_type"),
      supabase.from("client_context").select("client_id"),
    ]);

    const metaIds     = new Set<string>();
    const instagramIds = new Set<string>();
    if (!assetsRes.error) {
      (assetsRes.data ?? []).forEach((a: { client_id: string; asset_type: string }) => {
        if (a.asset_type === "facebook_page")      metaIds.add(a.client_id);
        if (a.asset_type === "instagram_business") instagramIds.add(a.client_id);
      });
    }

    const briefIds = new Set<string>();
    if (!contextsRes.error) {
      (contextsRes.data ?? []).forEach((c: { client_id: string }) => briefIds.add(c.client_id));
    }

    return clients.map((c) => ({
      ...c,
      has_meta:      metaIds.has(c.id),
      has_instagram: instagramIds.has(c.id),
      has_brief:     briefIds.has(c.id),
    }));
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
