import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  createRequiredSupabaseAdminClient,
  hasSupabaseServiceRoleKey,
} from "@/lib/supabase/server";

export type AdminDb = ReturnType<typeof createRequiredSupabaseAdminClient>;

export interface AdminContentOSContext {
  user: { id: string };
  role: string;
  adminDb: AdminDb;
}

/**
 * Validates the session (authClient only), confirms admin/super_admin role,
 * then returns a service-role adminDb for database writes.
 * Never uses service role for identity resolution.
 */
export async function requireAdminContentOSContext(): Promise<
  AdminContentOSContext | NextResponse
> {
  if (!hasSupabaseServiceRoleKey()) {
    return NextResponse.json(
      { error: "Serviço temporariamente indisponível." },
      { status: 503 }
    );
  }

  let authClient: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  try {
    authClient = await createServerSupabaseClient();
  } catch {
    return NextResponse.json(
      { error: "Serviço temporariamente indisponível." },
      { status: 503 }
    );
  }

  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: profile } = await authClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Perfil não encontrado." }, { status: 401 });
  }
  if (profile.role !== "admin" && profile.role !== "super_admin") {
    return NextResponse.json(
      { error: "Sem permissão para esta operação." },
      { status: 403 }
    );
  }

  let adminDb: AdminDb;
  try {
    adminDb = createRequiredSupabaseAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Serviço temporariamente indisponível." },
      { status: 503 }
    );
  }

  return { user: { id: user.id }, role: profile.role as string, adminDb };
}

/**
 * Confirms client exists and is not soft-deleted/archived.
 * Uses adminDb so it bypasses RLS — ownership is enforced by the caller.
 */
export async function validateAdminClient(
  adminDb: AdminDb,
  clientId: string
): Promise<boolean> {
  if (!clientId) return false;

  const { data, error } = await adminDb
    .from("clients")
    .select("id, deleted_at, archived_at")
    .eq("id", clientId)
    .maybeSingle();

  if (error) {
    // Column may not exist in this DB revision — fall back to existence check only
    const { data: fallback } = await adminDb
      .from("clients")
      .select("id")
      .eq("id", clientId)
      .maybeSingle();
    return !!fallback;
  }

  if (!data) return false;
  const row = data as { id: string; deleted_at?: string | null; archived_at?: string | null };
  return !row.deleted_at && !row.archived_at;
}
