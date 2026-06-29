import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  CLIENT_VISIBLE_STATUSES,
  isMissingClientVisibilityColumn,
  isVisibleClientRecord,
} from "@/lib/client-visibility";

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

type ClientRow = {
  id: string;
  company_name: string | null;
  responsible_name: string | null;
  segment: string | null;
  status: string | null;
  owner_id: string | null;
  deleted_at?: string | null;
  archived_at?: string | null;
};

export async function getAdminContentOSClients(): Promise<AdminContentosClient[]> {
  try {
    const supabase = await createServerSupabaseClient();

    let clientsResult = await supabase
      .from("clients")
      .select("id, company_name, responsible_name, segment, status, owner_id, deleted_at, archived_at")
      .in("status", CLIENT_VISIBLE_STATUSES)
      .is("deleted_at", null)
      .is("archived_at", null)
      .order("company_name");

    if (clientsResult.error && isMissingClientVisibilityColumn(clientsResult.error)) {
      const fallbackClientsResult = await supabase
        .from("clients")
        .select("id, company_name, responsible_name, segment, status, owner_id")
        .in("status", CLIENT_VISIBLE_STATUSES)
        .order("company_name");
      clientsResult = fallbackClientsResult as typeof clientsResult;
    }

    const { data, error } = clientsResult;
    if (error || !data) return [];

    const visibleData = (data as ClientRow[]).filter(isVisibleClientRecord);
    const clientIds = visibleData.map((c) => c.id);
    if (clientIds.length === 0) return [];

    const [assetsRes, contextsRes, olaclickRes] = await Promise.all([
      supabase.from("client_meta_assets").select("client_id, asset_type").in("client_id", clientIds),
      supabase.from("client_context").select("client_id").in("client_id", clientIds),
      supabase.from("olaclick_connections").select("client_id").eq("status", "connected").in("client_id", clientIds),
    ]);

    const metaIds = new Set<string>();
    const instagramIds = new Set<string>();
    if (!assetsRes.error) {
      for (const a of assetsRes.data ?? []) {
        const asset = a as { client_id: string; asset_type: string };
        if (asset.asset_type === "facebook_page") metaIds.add(asset.client_id);
        if (asset.asset_type === "instagram_business") instagramIds.add(asset.client_id);
      }
    }

    const briefIds = new Set<string>();
    if (!contextsRes.error) {
      for (const c of contextsRes.data ?? []) briefIds.add((c as { client_id: string }).client_id);
    }

    const olaclickIds = new Set<string>();
    if (!olaclickRes.error) {
      for (const o of olaclickRes.data ?? []) olaclickIds.add((o as { client_id: string }).client_id);
    }

    return visibleData.map((c) => ({
      id: c.id,
      company_name: c.company_name,
      responsible_name: c.responsible_name,
      segment: c.segment,
      status: c.status,
      has_meta: metaIds.has(c.id),
      has_instagram: instagramIds.has(c.id),
      has_brief: briefIds.has(c.id),
      has_olaclick: olaclickIds.has(c.id),
      has_user: c.owner_id != null,
    }));
  } catch {
    return [];
  }
}

export async function validateContentOSClient(
  clientId: string,
): Promise<{ id: string; company_name: string | null } | null> {
  try {
    const supabase = await createServerSupabaseClient();

    let result = await supabase
      .from("clients")
      .select("id, company_name, status, deleted_at, archived_at")
      .eq("id", clientId)
      .in("status", CLIENT_VISIBLE_STATUSES)
      .is("deleted_at", null)
      .is("archived_at", null)
      .maybeSingle();

    if (result.error && isMissingClientVisibilityColumn(result.error)) {
      result = await supabase
        .from("clients")
        .select("id, company_name, status")
        .eq("id", clientId)
        .in("status", CLIENT_VISIBLE_STATUSES)
        .maybeSingle();
    }

    if (!result.data || !isVisibleClientRecord(result.data)) return null;

    return {
      id: result.data.id,
      company_name: result.data.company_name,
    };
  } catch {
    return null;
  }
}
