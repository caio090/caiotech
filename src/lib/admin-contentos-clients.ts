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
  has_olaclick?: boolean;
  has_user?: boolean;
}

// Returns real clients from the clients table directly.
// Does NOT depend on v_real_clients (which requires profiles.role=cliente).
// Clients are business entities that exist independently of user accounts.
export async function getAdminContentOSClients(): Promise<AdminContentosClient[]> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("clients")
      .select("id, company_name, responsible_name, segment, status, owner_id")
      .in("status", ["active", "onboarding"])
      .order("company_name");

    if (error || !data) return [];

    const clientIds = (data as Array<{ id: string }>).map((c) => c.id);
    if (clientIds.length === 0) return [];

    const [assetsRes, contextsRes, olacheckRes] = await Promise.all([
      supabase.from("client_meta_assets").select("client_id, asset_type").in("client_id", clientIds),
      supabase.from("client_context").select("client_id").in("client_id", clientIds),
      supabase.from("olaclick_connections").select("client_id").eq("status", "connected").in("client_id", clientIds),
    ]);

    const metaIds      = new Set<string>();
    const instagramIds = new Set<string>();
    if (!assetsRes.error) {
      for (const a of assetsRes.data ?? []) {
        const asset = a as { client_id: string; asset_type: string };
        if (asset.asset_type === "facebook_page")      metaIds.add(asset.client_id);
        if (asset.asset_type === "instagram_business") instagramIds.add(asset.client_id);
      }
    }

    const briefIds = new Set<string>();
    if (!contextsRes.error) {
      for (const c of contextsRes.data ?? []) briefIds.add((c as { client_id: string }).client_id);
    }

    const olacheckIds = new Set<string>();
    if (!olacheckRes.error) {
      for (const o of olacheckRes.data ?? []) olacheckIds.add((o as { client_id: string }).client_id);
    }

    return (data as Array<{
      id: string; company_name: string | null; responsible_name: string | null;
      segment: string | null; status: string | null; owner_id: string | null;
    }>).map((c) => ({
      id:               c.id,
      company_name:     c.company_name,
      responsible_name: c.responsible_name,
      segment:          c.segment,
      status:           c.status,
      has_meta:         metaIds.has(c.id),
      has_instagram:    instagramIds.has(c.id),
      has_brief:        briefIds.has(c.id),
      has_olaclick:     olacheckIds.has(c.id),
      has_user:         c.owner_id != null,
    }));
  } catch {
    return [];
  }
}

// Validates that a clientId belongs to an active real client.
export async function validateContentOSClient(
  clientId: string,
): Promise<{ id: string; company_name: string | null } | null> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("v_real_clients")
      .select("id, company_name")
      .eq("id", clientId)
      .maybeSingle();

    if (!error) return data as { id: string; company_name: string | null } | null;

    // Fallback when v_real_clients still has the profiles join issue
    const { data: fallback } = await supabase
      .from("clients")
      .select("id, company_name")
      .eq("id", clientId)
      .in("status", ["active", "onboarding"])
      .maybeSingle();

    return fallback as { id: string; company_name: string | null } | null;
  } catch {
    return null;
  }
}
